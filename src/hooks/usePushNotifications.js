// DEPRECATED: This hook is no longer used. We use FCM (Firebase Cloud Messaging) only now.
// The web push API (PushManager) was conflicting with FCM and causing token invalidation.
// This file is kept for reference but should not be imported or used.

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getActiveRegistration = async () => {
    console.log('[Push] Mencari service worker registration...');
    // Daftarkan jika belum terdaftar
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      console.log('[Push] Mendaftarkan /firebase-messaging-sw.js baru...');
      reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }
    // Tunggu registration ready
    const readyReg = await navigator.serviceWorker.ready;
    console.log('[Push] Service worker aktif ditemukan:', readyReg.scope, readyReg.active?.scriptURL);
    return readyReg;
  };

  const enablePush = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Push notifications tidak didukung oleh browser ini.');
      console.error('[Push]', err);
      throw err;
    }

    setIsLoading(true);

    try {
      // 1. Izin notifikasi
      console.log('[Push Step 1] Memeriksa permission...');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      console.log('[Push Step 1] Permission result:', permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Izin notifikasi ditolak oleh pengguna.');
      }

      // 2. Ambil service worker registration yang aktif
      console.log('[Push Step 2] Mengambil active service worker...');
      const swRegistration = await getActiveRegistration();

      // 3. Ambil VAPID Public Key dari backend
      console.log('[Push Step 3] Mengambil VAPID Public Key dari backend...');
      const resKey = await apiClient.get('/notifications/push/public-key');
      const publicKey = resKey.data?.publicKey || resKey.data;

      if (!publicKey || typeof publicKey !== 'string') {
        throw new Error('VAPID Public Key tidak valid dari server.');
      }
      console.log('[Push Step 3] VAPID Public Key didapat (panjang string):', publicKey.length);

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      console.log('[Push Step 3] VAPID Key terkonversi (panjang bytes):', convertedVapidKey.length);

      // 4. Subscribe ke PushManager browser
      console.log('[Push Step 4] Memanggil swRegistration.pushManager.subscribe...');
      let subscription = await swRegistration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }
      console.log('[Push Step 4] Subscription berhasil dibuat:', subscription.endpoint);

      // 5. Ekstraksi keys dan kirim ke backend
      console.log('[Push Step 5] Mengirim subscription ke backend...');
      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error('Gagal mengekstrak kunci enkripsi p256dh / auth dari subscription.');
      }

      const payload = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh,
          auth,
        },
        userAgent: navigator.userAgent,
      };

      const resSub = await apiClient.post('/notifications/push/subscribe', payload);
      console.log('[Push Step 5] Respons simpan subscription:', resSub.status, resSub.data);

      setIsSubscribed(true);
      console.log('[Push Selesai] Push notification berhasil diaktifkan sepenuhnya!');
      return subscription;
    } catch (error) {
      console.error('[Push Gagal]', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const disablePush = useCallback(async () => {
    if (!isSupported) return;

    setIsLoading(true);

    try {
      console.log('[Push] Menonaktifkan push notification...');
      const swRegistration = await navigator.serviceWorker.ready;
      const subscription = await swRegistration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe di browser
        await subscription.unsubscribe();
        console.log('[Push] Browser unsubscribed');

        // Hapus dari backend database
        await apiClient.delete('/notifications/push/subscribe', {
          data: { endpoint: subscription.endpoint },
        });
        console.log('[Push] Backend subscription dihapus');
      }

      setIsSubscribed(false);
      console.log('[Push] Push notification berhasil dimatikan');
    } catch (error) {
      console.error('[Push] Gagal mematikan push:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const swRegistration = await navigator.serviceWorker.ready;
      const subscription = await swRegistration.pushManager.getSubscription();
      const hasSub = !!subscription;
      setIsSubscribed(hasSub);
      return hasSub;
    } catch (error) {
      console.warn('[Push] Gagal memeriksa status subscription:', error);
      return false;
    }
  }, [isSupported]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    enablePush,
    disablePush,
    checkSubscriptionStatus,
  };
};
