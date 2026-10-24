importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBoXUQO5lhBt9qIrW_66EZCCsEXvdFarkE",
  authDomain: "nebeng-99cb7.firebaseapp.com",
  projectId: "nebeng-99cb7",
  storageBucket: "nebeng-99cb7.firebasestorage.app",
  messagingSenderId: "463441720786",
  appId: "1:463441720786:web:b38be5f55082437980c40b",
  measurementId: "G-7XX9S7850K"
});

const messaging = firebase.messaging();

// Skip waiting and claim clients immediately to activate new SW version
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  console.log('Background notification received:', payload);

  const notificationTitle = payload.notification?.title || 'Nebeng';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/firebase-logo.png',
    data: payload.data,
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = getNotificationUrl(data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

function getNotificationUrl(data) {
  const { type, orderId, tripId, conversationId } = data;

  switch (type) {
    case 'order_created':
    case 'order_paid':
    case 'order_cancelled':
      return '/customer/tickets';
    case 'trip_started':
    case 'trip_arrived':
    case 'trip_completed':
    case 'checkpoint_scanned':
      return '/customer/tickets';
    case 'chat_message':
      return '/customer/chat';
    case 'payment_success':
    case 'payment_failed':
    case 'escrow_released':
      return '/customer/tickets';
    case 'reward_earned':
    case 'reward_redeemed':
      return '/customer/rewards';
    case 'verification_approved':
    case 'verification_rejected':
      return '/customer/profile/pengaturan';
    case 'trip_booking_request':
      return '/customer/tickets';
    default:
      return '/customer/notifications';
  }
}
