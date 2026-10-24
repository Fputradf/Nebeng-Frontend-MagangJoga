import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { messaging } from '../config/firebase';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { io } from 'socket.io-client';
import { BASE_URL } from '../config/env';
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getNotificationPreferences,
  updateNotificationPreferences as updatePreferencesAPI,
  getNotificationHistory,
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadAPI,
  markAllAsRead as markAllAsReadAPI,
  markConversationAsRead as markConversationAsReadAPI,
} from '../services/notificationService';
import apiClient from '../services/apiClient';
// usePushNotifications deprecated - we use FCM only now
// import { usePushNotifications } from '../hooks/usePushNotifications';

// Set ke true untuk mengaktifkan semua fitur notifikasi
const ENABLE_NOTIFICATIONS = true;

// VAPID Key dari Firebase Console > Project Settings > Cloud Messaging > Web configuration
// Ganti dengan VAPID key yang baru dari Firebase Console
const VAPID_KEY = 'BLH95QB3jkP8vO5o4K8wYnjcsqEax7EeTpYerRdXXgOd7pexJx3bkD8b6WKnJ574QRRWHYkJdOHnQ4meroq0lbE';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [preferences, setPreferences] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCountByType, setUnreadCountByType] = useState({ total: 0, chat_message: 0 });
  const [notificationSupported, setNotificationSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const socketRef = useRef(null);
  const processedNotificationIds = useRef(new Set());

  // Guard for FCM token generation - prevent parallel calls
  const tokenGenerationRef = useRef(null);

  // Guard for socket connection - prevent multiple connections
  const socketConnectedRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (!ENABLE_NOTIFICATIONS) return false;

    console.log('[NotificationContext] requestPermission called');
    try {
      if (!('Notification' in window)) {
        console.log('[NotificationContext] Notification API not supported');
        setNotificationSupported(false);
        setErrorMessage('Browser tidak mendukung notifikasi');
        return false;
      }

      // Cek apakah berjalan di HTTPS atau localhost
      const isSecureContext = window.isSecureContext;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (!isSecureContext && !isLocalhost) {
        console.log('[NotificationContext] Not secure context and not localhost');
        setNotificationSupported(false);
        setErrorMessage('Notifikasi hanya berjalan di HTTPS atau localhost');
        return false;
      }

      const currentPermission = Notification.permission;
      console.log('[NotificationContext] Current permission:', currentPermission);
      
      if (currentPermission === 'granted') {
        console.log('[NotificationContext] Permission already granted');
        setPermission('granted');
        return true;
      }

      if (currentPermission === 'denied') {
        console.log('[NotificationContext] Permission denied');
        setPermission('denied');
        setErrorMessage('Notifikasi ditolak. Aktifkan di pengaturan browser.');
        return false;
      }

      console.log('[NotificationContext] Requesting permission...');
      const permissionResult = await Notification.requestPermission();
      console.log('[NotificationContext] Permission result:', permissionResult);
      setPermission(permissionResult);
      return permissionResult === 'granted';
    } catch (error) {
      console.error('[NotificationContext] Error requesting notification permission:', error);
      setErrorMessage('Gagal meminta izin notifikasi');
      return false;
    }
  }, []);

  const getFCMToken = useCallback(async () => {
    if (!ENABLE_NOTIFICATIONS) return null;

    // Guard: Return existing promise if already in progress
    if (tokenGenerationRef.current) {
      return tokenGenerationRef.current;
    }

    const generationPromise = (async () => {
      try {
        if (permission !== 'granted') return null;

        // Register service worker jika belum terdaftar
        let swRegistration;
        if ('serviceWorker' in navigator) {
          try {
            // Cek apakah sudah ada registration
            const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
            if (existingRegistration) {
              swRegistration = existingRegistration;
            } else {
              swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            }

            // Tunggu service worker aktif
            if (swRegistration.installing) {
              await new Promise((resolve) => {
                swRegistration.installing.addEventListener('statechange', (e) => {
                  if (e.target.state === 'activated') {
                    resolve();
                  }
                });
              });
            } else if (swRegistration.waiting) {
              await swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          } catch (swError) {
            console.error('Service Worker registration failed:', swError);
            setErrorMessage('Gagal mendaftarkan service worker: ' + swError.message);
            return null;
          }
        } else {
          console.error('Service Worker not supported');
          setErrorMessage('Browser tidak mendukung service worker');
          return null;
        }

        let token;
        try {
          // If token was previously cached as the invalid legacy token, force reset it
          const cachedToken = localStorage.getItem('fcm_token');
          if (cachedToken && cachedToken.startsWith('ds4Y4XZon')) {
            try {
              await deleteToken(messaging);
              localStorage.removeItem('fcm_token');
              console.log('[NotificationContext] Stale token reset successfully');
            } catch (delErr) {
              console.warn('[NotificationContext] Could not delete cached token:', delErr);
            }
          }

          token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });
        } catch (vapidError) {
          console.error('VAPID key error:', vapidError);
          try {
            token = await getToken(messaging, { serviceWorkerRegistration: swRegistration });
          } catch (noVapidError) {
            console.error('FCM token generation failed:', noVapidError);
            setErrorMessage('Gagal membuat token notifikasi: ' + noVapidError.message);
            return null;
          }
        }

        setFcmToken(token);
        return token;
      } catch (error) {
        console.error('Error getting FCM token:', error);
        setErrorMessage('Gagal mendapatkan token notifikasi: ' + error.message);
        return null;
      } finally {
        // Clear the ref after completion
        tokenGenerationRef.current = null;
      }
    })();

    tokenGenerationRef.current = generationPromise;
    return generationPromise;
  }, [permission]);

  // Auto-retry FCM token ketika permission baru granted
  useEffect(() => {
    if (permission === 'granted' && !fcmToken && ENABLE_NOTIFICATIONS) {
      getFCMToken();
    }
  }, [permission, fcmToken, getFCMToken]);

  // Auto-register token after login (when we have auth token)
  useEffect(() => {
    if (fcmToken && ENABLE_NOTIFICATIONS) {
      const registerTokenWithBackend = async () => {
        try {
          console.log('Auto-registering FCM token with backend:', fcmToken);
          await registerDeviceToken(fcmToken, 'web');
          localStorage.setItem('fcm_token', fcmToken);
          console.log('FCM token auto-registered successfully');
        } catch (apiError) {
          console.error('Failed to auto-register FCM token:', apiError);
          // Don't show error to user, will retry on next login
        }
      };
      registerTokenWithBackend();
    }
  }, [fcmToken]);

  const registerToken = useCallback(async () => {
    console.log('[NotificationContext] registerToken called');
    try {
      setLoading(true);
      console.log('[NotificationContext] Calling requestPermission...');
      const hasPermission = await requestPermission();
      console.log('[NotificationContext] Permission result:', hasPermission);
      
      if (!hasPermission) {
        console.log('[NotificationContext] Permission not granted, aborting');
        return false;
      }

      console.log('[NotificationContext] Calling getFCMToken...');
      const token = await getFCMToken();
      console.log('[NotificationContext] FCM token result:', token ? 'YES' : 'NO');
      
      if (token) {
        try {
          console.log('[NotificationContext] Registering token with backend:', token);
          await registerDeviceToken(token, 'web');
          localStorage.setItem('fcm_token', token);
          console.log('[NotificationContext] Token registered successfully with backend');
          return true;
        } catch (apiError) {
          console.error('[NotificationContext] Failed to register token with backend:', apiError);
          console.error('[NotificationContext] Error response:', apiError.response?.data);
          console.error('[NotificationContext] Error status:', apiError.response?.status);
          console.error('[NotificationContext] Full error:', apiError);
          localStorage.setItem('fcm_token', token);
          setErrorMessage('Gagal mendaftarkan token ke server: ' + (apiError.response?.data?.message || apiError.message));
          return false;
        }
      }
      console.log('[NotificationContext] No token available, aborting');
      return false;
    } catch (error) {
      console.error('[NotificationContext] Error registering device token:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [requestPermission, getFCMToken]);

  const unregisterToken = useCallback(async () => {
    try {
      const token = fcmToken || localStorage.getItem('fcm_token');
      if (token) {
        await unregisterDeviceToken(token);
        localStorage.removeItem('fcm_token');
        setFcmToken(null);
      }
    } catch (error) {
      console.error('Error unregistering device token:', error);
    }
  }, [fcmToken]);

  const fetchPreferences = useCallback(async () => {
    try {
      const data = await getNotificationPreferences();
      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }, []);

  const updateNotificationPreferences = useCallback(async (newPreferences) => {
    try {
      const data = await updatePreferencesAPI(newPreferences);
      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 50, offset = 0) => {
    try {
      const data = await getNotificationHistory(limit, offset);
      if (offset === 0) {
        setHistory(data);
      } else {
        setHistory(prev => [...prev, ...data]);
      }
      return data;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }, []);

  // Fetch user notifications (new)
  const fetchNotifications = useCallback(async (type = null, page = 1, limit = 20) => {
    try {
      setLoading(true);
      const data = await getNotifications(type, page, limit);

      if (page === 1) {
        setNotifications(data);
      } else {
        setNotifications(prev => [...prev, ...data]);
      }
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const counts = await getUnreadCount();
      setUnreadCountByType(counts);
      setUnreadCount(counts.total || 0);
      return counts;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { total: 0, chat_message: 0 };
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markAsReadAPI(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [fetchUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadAPI();
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [fetchUnreadCount]);

  // Mark conversation notifications as read
  const markConversationAsRead = useCallback(async (conversationId) => {
    try {
      await markConversationAsReadAPI(conversationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.conversationId === conversationId ? { ...notif, isRead: true } : notif
        )
      );
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking conversation notifications as read:', error);
    }
  }, [fetchUnreadCount]);

  const handleNotificationNavigation = useCallback((data) => {
    const { type, orderId, tripId } = data;
    switch (type) {
      case 'order_created':
      case 'order_paid':
      case 'order_cancelled':
        if (orderId) window.location.href = '/customer/tickets';
        break;
      case 'trip_started':
      case 'trip_arrived':
      case 'trip_completed':
      case 'checkpoint_scanned':
        if (tripId) window.location.href = '/customer/tickets';
        break;
      case 'chat_message':
        window.location.href = '/customer/chat';
        break;
      case 'payment_success':
      case 'payment_failed':
      case 'escrow_released':
        window.location.href = '/customer/tickets';
        break;
      case 'reward_earned':
      case 'reward_redeemed':
        window.location.href = '/customer/rewards';
        break;
      case 'verification_approved':
      case 'verification_rejected':
        window.location.href = '/customer/profile/pengaturan';
        break;
      default:
        window.location.href = '/customer/notifications';
    }
  }, []);

  // Listener notifikasi foreground
  useEffect(() => {
    if (!ENABLE_NOTIFICATIONS) return;

    const unsubscribe = onMessage(messaging, async (payload) => {
      console.log('FCM foreground message received:', payload);
      setUnreadCount(prev => prev + 1);

      // Show notification in foreground
      if (payload.notification) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(payload.notification.title || 'Pesan Baru', {
            body: payload.notification.body,
            data: payload.data,
            icon: '/favicon.svg',
            requireInteraction: true,
          });
        }
      }

      if (payload.data) {
        handleNotificationNavigation(payload.data);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleNotificationNavigation]);

  // Service worker — dikelola Firebase getToken()
  useEffect(() => {
    if (!ENABLE_NOTIFICATIONS) return;

    // Register service worker on mount (only once)
    if ('serviceWorker' in navigator) {
      // Cek apakah sudah ada registration
      navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
        .then((existingRegistration) => {
          if (existingRegistration) {
            console.log('Service Worker already registered:', existingRegistration);
          } else {
            console.log('Registering new Service Worker...');
            return navigator.serviceWorker.register('/firebase-messaging-sw.js');
          }
        })
        .then((registration) => {
          if (registration) {
            console.log('Service Worker registered:', registration);
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Socket.io connection for realtime notifications
  useEffect(() => {
    if (!ENABLE_NOTIFICATIONS) return;

    // Guard: prevent multiple socket connections
    if (socketConnectedRef.current || socketRef.current?.connected) {
      return;
    }

    // Get auth token from storage
    const getAuthToken = () => {
      try {
        const raw = localStorage.getItem('nebeng_auth') || sessionStorage.getItem('nebeng_auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.token || parsed.accessToken || parsed.access_token;
      } catch {
        return null;
      }
    };

    const token = getAuthToken();
    if (!token) {
      console.log('[Notification Socket] No token found, skipping connection');
      return;
    }

    const socketUrl = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
      : BASE_URL;

    const socket = io(`${socketUrl}/notifications`, {
      auth: (cb) => cb({ token: getAuthToken() }), // Function to always get fresh token
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    socketConnectedRef.current = true;

    socket.on('connect', () => {
      console.log('[Notification Socket] Connected');
      fetchUnreadCount();
    });

    socket.on('notification:new', async ({ notification, unreadCount }) => {
      // Deduplicate based on notification ID
      if (processedNotificationIds.current.has(notification.id)) {
        return;
      }

      processedNotificationIds.current.add(notification.id);

      // Show Desktop/System Web Notification if permission is granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const swReg = await navigator.serviceWorker.getRegistration();
          const notifOptions = {
            body: notification.body || '',
            icon: '/favicon.svg',
            tag: notification.conversationId ? `chat-${notification.conversationId}` : `notif-${notification.id}`,
            data: notification.data || {},
          };

          if (swReg && swReg.showNotification) {
            swReg.showNotification(notification.title || 'Nebeng', notifOptions);
          } else {
            new Notification(notification.title || 'Nebeng', notifOptions);
          }
        } catch (notifErr) {
          console.warn('[Notification Socket] Could not trigger desktop popup:', notifErr);
        }
      }

      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);

      // Update unread count
      setUnreadCountByType(prev => ({
        ...prev,
        total: unreadCount.total || prev.total + 1,
        chat_message: unreadCount.chat_message || (notification.type === 'chat_message' ? prev.chat_message + 1 : prev.chat_message),
      }));
      setUnreadCount(prev => unreadCount.total || prev + 1);

      // Update document title
      if (unreadCount.total > 0) {
        document.title = `(${unreadCount.total}) Nebeng`;
      }
    });

    socket.on('notification:unread-count', ({ unreadCount }) => {
      console.log('[Notification Socket] Unread count updated:', unreadCount);
      setUnreadCountByType(unreadCount);
      setUnreadCount(unreadCount.total || 0);

      if (unreadCount.total > 0) {
        document.title = `(${unreadCount.total}) Nebeng`;
      } else {
        document.title = 'Nebeng';
      }
    });

    socket.on('disconnect', () => {
      console.log('[Notification Socket] Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Notification Socket] Connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('notification:new');
        socketRef.current.off('notification:unread-count');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.disconnect();
        socketRef.current = null;
        socketConnectedRef.current = false;
      }
    };
  }, [fetchUnreadCount]);

  // BroadcastChannel for cross-tab sync
  useEffect(() => {
    const channel = new BroadcastChannel('notifications');

    channel.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'markAsRead':
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === data.notificationId ? { ...notif, isRead: true } : notif
            )
          );
          fetchUnreadCount();
          break;
        case 'markAllAsRead':
          setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
          fetchUnreadCount();
          break;
        case 'newNotification':
          if (!processedNotificationIds.current.has(data.notification.id)) {
            processedNotificationIds.current.add(data.notification.id);
            setNotifications(prev => [data.notification, ...prev]);
            setUnreadCountByType(data.unreadCount);
            setUnreadCount(data.unreadCount.total);
          }
          break;
      }
    };

    return () => {
      channel.close();
    };
  }, [fetchUnreadCount]);

  // Fetch initial data on mount
  useEffect(() => {
    if (ENABLE_NOTIFICATIONS) {
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  const value = {
    fcmToken,
    permission,
    preferences,
    history,
    loading,
    unreadCount,
    notifications,
    unreadCountByType,
    notificationSupported,
    errorMessage,
    requestPermission,
    registerToken,
    unregisterToken,
    fetchPreferences,
    updateNotificationPreferences,
    fetchHistory,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    markConversationAsRead,
    setUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
