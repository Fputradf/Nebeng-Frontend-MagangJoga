# Push Notification Implementation - Nebeng Frontend

## Overview
This document describes the push notification system implementation for the Nebeng frontend using Firebase Cloud Messaging (FCM).

## What Was Implemented

### 1. Firebase Configuration
- **File**: `src/config/firebase.js`
- Configured Firebase SDK with project credentials for `nebeng-99cb7`

### 2. Notification Service
- **File**: `src/services/notificationService.js`
- API functions for:
  - `registerDeviceToken()` - Register FCM token with backend
  - `unregisterDeviceToken()` - Unregister on logout
  - `getNotificationPreferences()` - Fetch user preferences
  - `updateNotificationPreferences()` - Update user preferences
  - `getNotificationHistory()` - Fetch notification history with pagination

### 3. Notification Context
- **File**: `src/context/NotificationContext.jsx`
- Provides notification state and functions to the entire app
- Features:
  - Permission request handling
  - FCM token management
  - Foreground notification handling
  - Navigation based on notification type
  - Notification history management
  - Unread count tracking

### 4. Service Worker
- **File**: `public/firebase-messaging-sw.js`
- Handles background notifications
- Click-to-navigate functionality based on notification type
- Auto-registered on app initialization

### 5. UI Components

#### Notification Permission Request
- **File**: `src/features/notifications/NotificationPermissionRequest.jsx`
- Bottom popup requesting notification permission
- Can be dismissed by user
- Shows only once (stored in localStorage)

#### Notification Settings
- **File**: `src/features/notifications/NotificationSettings.jsx`
- Toggle switches for:
  - Push notifications (general)
  - Email notifications
  - Order notifications
  - Trip notifications
  - Chat notifications
  - Payment notifications
  - Promotion notifications
- Real-time save to backend

#### Notification History
- **File**: `src/features/notifications/NotificationHistory.jsx`
- Displays all notifications with:
  - Title and body
  - Timestamp (relative time format)
  - Notification type badge
  - Status indicator (sent/failed)
  - Click-to-navigate functionality
- Pagination support (load more)

### 6. Integration
- **File**: `src/components/NotificationAuthHandler.jsx`
- Automatically registers/unregisters FCM token on login/logout
- **File**: `src/main.jsx`
- Added NotificationProvider wrapping the app
- **File**: `src/App.jsx`
- Added notification routes for all user roles:
  - `/notifications` - Notification history
  - `/notifications/settings` - Notification settings
- Added NotificationPermissionRequest component globally

## Routes Added

All user roles now have access to:
- `/notifications` - View notification history
- `/notifications/settings` - Manage notification preferences

## Notification Types & Navigation

| Type | Description | Navigation Target (Customer) | Navigation Target (Mitra) |
|------|-------------|------------------------------|-------------------------|
| `order_created` | Order successfully created | `/customer/tickets` | `/mitra/trip` |
| `order_paid` | Payment successful | `/customer/tickets` | `/mitra/trip` |
| `order_cancelled` | Order cancelled | `/customer/tickets` | `/mitra/trip` |
| `trip_started` | Trip started | `/customer/tickets` | `/mitra/trip` |
| `trip_arrived` | Trip arrived at destination | `/customer/tickets` | `/mitra/trip` |
| `trip_completed` | Trip completed | `/customer/tickets` | `/mitra/trip` |
| `checkpoint_scanned` | QR check-in | `/customer/tickets` | `/mitra/trip` |
| `chat_message` | New chat message | `/customer/chat` | `/mitra/chat` |
| `payment_success` | Payment successful | `/customer/tickets` | `/mitra/saldo` |
| `payment_failed` | Payment failed | `/customer/tickets` | `/mitra/saldo` |
| `escrow_released` | Escrow funds released | `/customer/tickets` | `/mitra/saldo` |
| `reward_earned` | Reward points earned | `/customer/rewards` | N/A |
| `reward_redeemed` | Reward points redeemed | `/customer/rewards` | N/A |
| `verification_approved` | Verification approved | `/customer/profile/pengaturan` | `/mitra/onboarding` |
| `verification_rejected` | Verification rejected | `/customer/profile/pengaturan` | `/mitra/onboarding` |
| `trip_booking_request` | New booking request | N/A | `/mitra/trip` |

## How It Works

### 1. User Login Flow
1. User logs in successfully
2. `NotificationAuthHandler` detects authentication
3. Automatically requests notification permission (if not granted)
4. Obtains FCM token from Firebase
5. Registers token with backend via `/notifications/register-device`
6. Token stored in localStorage for persistence

### 2. Receiving Notifications

#### Foreground (App Open)
- `onMessage` listener in NotificationContext catches notifications
- Updates unread count
- Navigates to appropriate screen based on notification type

#### Background (App Minimized)
- Service worker handles notification
- Shows system notification
- Clicking notification opens app and navigates to target screen

#### Background (App Closed)
- Service worker handles notification
- Shows system notification
- Clicking notification opens app and navigates to target screen

### 3. User Logout Flow
1. User logs out
2. `NotificationAuthHandler` detects logout
3. Unregisters FCM token from backend via `/notifications/unregister-device`
4. Removes token from localStorage

## Using the Notification Context

```javascript
import { useNotification } from '../context/NotificationContext';

function MyComponent() {
  const {
    fcmToken,
    permission,
    preferences,
    history,
    loading,
    unreadCount,
    requestPermission,
    registerToken,
    unregisterToken,
    fetchPreferences,
    updateNotificationPreferences,
    fetchHistory,
    setUnreadCount
  } = useNotification();

  // Example: Request permission
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      await registerToken();
    }
  };

  // Example: Update preferences
  const handleUpdatePreferences = async () => {
    await updateNotificationPreferences({
      enablePushNotifications: true,
      orderNotifications: true,
      chatNotifications: false
    });
  };

  // Example: Fetch history
  const handleFetchHistory = async () => {
    await fetchHistory(50, 0);
  };
}
```

## Testing Checklist

### Device Token Registration
- [ ] Register device token on login
- [ ] Verify token is saved in backend
- [ ] Test token refresh scenario

### Notification Reception
- [ ] Create an order and verify notification received
- [ ] Complete a payment and verify notification received
- [ ] Send a chat message and verify notification received
- [ ] Scan QR checkpoint and verify notification received

### Navigation
- [ ] Tap on notification and verify correct screen opens
- [ ] Test with app in foreground state
- [ ] Test with app in background state
- [ ] Test with app killed (not running) state

### Preferences
- [ ] Disable specific notification types
- [ ] Verify notifications are not received for disabled types
- [ ] Re-enable and verify notifications resume

### Notification History
- [ ] Fetch notification history
- [ ] Test pagination (load more)
- [ ] Verify data integrity

### Permission Flow
- [ ] Test permission request popup
- [ ] Test "Allow" button
- [ ] Test "Nanti" (dismiss) button
- [ ] Verify popup doesn't show again after dismissal

## Troubleshooting

### Notifications Not Received
1. Check if device token is registered (browser console)
2. Verify Firebase project configuration
3. Check notification preferences are enabled
4. Verify JWT token is valid
5. Check backend logs for errors

### Token Registration Fails
1. Verify network connectivity
2. Check if JWT token is valid
3. Verify API endpoint is correct
4. Check if user is authenticated

### Navigation Not Working
1. Check if notification data is correct
2. Verify screen names match navigation structure
3. Test with app in different states (foreground, background, killed)

### Permission Denied
1. User may have denied notification permission
2. Show settings to enable permission manually
3. Handle gracefully with in-app notifications

### Web Push Not Working
1. Verify VAPID key is correct
2. Check if service worker is registered
3. Verify HTTPS is used (required for web push)
4. Check browser compatibility
5. **Important**: Ensure VAPID key is configured in Firebase Console:
   - Go to Firebase Console → Project Settings → Cloud Messaging
   - Under "Web configuration", click "Generate key pair" if not present
   - The VAPID key in the code should match what's in Firebase Console
   - If you get "push service error", the VAPID key may need to be regenerated in Firebase Console

## Important Notes

1. **HTTPS Required**: Web push notifications require HTTPS in production. Local development works on `http://localhost`.

2. **Service Worker**: The service worker file (`firebase-messaging-sw.js`) must be in the `public` folder and be served from the root.

3. **VAPID Key**: The VAPID key is included in the code and is required for web push notifications.

4. **Browser Compatibility**: 
   - Chrome/Edge: Full support
   - Firefox: Full support
   - Safari: Limited support (may not work in all scenarios)

5. **Permission Persistence**: Permission is stored in the browser. Once granted/denied, the user must change it in browser settings.

## Files Created/Modified

### Created:
- `src/config/firebase.js` - Firebase configuration
- `src/services/notificationService.js` - API functions
- `src/context/NotificationContext.jsx` - Notification state management
- `src/components/NotificationAuthHandler.jsx` - Auth integration
- `src/features/notifications/NotificationSettings.jsx` - Settings UI
- `src/features/notifications/NotificationHistory.jsx` - History UI
- `src/features/notifications/NotificationPermissionRequest.jsx` - Permission UI
- `src/features/notifications/index.js` - Export file
- `public/firebase-messaging-sw.js` - Service worker

### Modified:
- `src/main.jsx` - Added NotificationProvider
- `src/App.jsx` - Added notification routes and permission component
- `package.json` - Added firebase dependency

## Next Steps

1. Add notification badge to navigation bar showing unread count
2. Implement in-app toast notifications for foreground messages
3. Add notification sound customization
4. Implement notification grouping for similar messages
5. Add notification search functionality
6. Create notification analytics dashboard

## Support

For backend-related issues or questions, contact the backend team.
For frontend issues, refer to Firebase documentation: https://firebase.google.com/docs/cloud-messaging
