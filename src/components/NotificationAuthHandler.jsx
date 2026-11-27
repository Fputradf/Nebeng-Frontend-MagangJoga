import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// Set ke true untuk mengaktifkan registrasi token notifikasi
const ENABLE_NOTIFICATION_REGISTRATION = true;

export function NotificationAuthHandler() {
  const { isAuthenticated } = useAuth();
  const {
    registerToken,
    unregisterToken,
    permission,
    connectSocket,
    disconnectSocket,
    fetchUnreadCount,
  } = useNotification();
  const hasAttemptedRegistration = useRef(false);

  useEffect(() => {
    if (!ENABLE_NOTIFICATION_REGISTRATION) return;

    if (isAuthenticated) {
      connectSocket();
      fetchUnreadCount();
      if (!hasAttemptedRegistration.current && permission === 'granted') {
        hasAttemptedRegistration.current = true;
        registerToken();
      }
    } else {
      hasAttemptedRegistration.current = false;
      disconnectSocket();
      unregisterToken();
    }
  }, [
    isAuthenticated,
    permission,
    registerToken,
    unregisterToken,
    connectSocket,
    disconnectSocket,
    fetchUnreadCount,
  ]);

  return null;
}
