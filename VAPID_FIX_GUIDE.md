# How to Fix VAPID Key Error in Firebase

## Problem
You're seeing this error:
```
Error getting FCM token: AbortError: Registration failed - push service error
```

This happens when the VAPID key is not properly configured in Firebase Console.

## Solution: Configure VAPID Key in Firebase Console

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **nebeng-99cb7**

### Step 2: Navigate to Cloud Messaging Settings
1. Click the **gear icon** (⚙️) next to "Project Overview" to go to **Project Settings**
2. Click on the **Cloud Messaging** tab

### Step 3: Configure Web Push Certificates
1. Scroll down to the **Web configuration** section
2. Look for **Web Push certificates** section
3. You should see two fields:
   - **Public key** (this is your VAPID public key)
   - **Private key** (auto-generated, you don't need to enter this)

### Step 4: Generate New Key Pair (if needed)
If you don't see keys or want to generate new ones:
1. Click the **Generate key pair** button
2. Firebase will generate a new VAPID key pair
3. Copy the **Public key** that appears

### Step 5: Update Your Code
1. Open `src/context/NotificationContext.jsx`
2. Replace the VAPID_KEY with the public key from Firebase Console:
```javascript
const VAPID_KEY = 'YOUR_NEW_PUBLIC_KEY_FROM_FIREBASE_CONSOLE';
```

### Step 6: Test
1. Clear your browser cache and localStorage
2. Refresh the page
3. Try to log in again
4. Check the console for successful token generation

## Alternative: Disable VAPID (Temporary)

If you want to disable notifications temporarily while fixing the VAPID key:

### Option 1: Disable Notification Registration
Comment out the notification registration in `NotificationAuthHandler.jsx`:

```javascript
export function NotificationAuthHandler() {
  const { isAuthenticated } = useAuth();
  // const { registerToken, unregisterToken } = useNotification();

  useEffect(() => {
    if (isAuthenticated) {
      // registerToken(); // Temporarily disabled
    } else {
      // unregisterToken(); // Temporarily disabled
    }
  }, [isAuthenticated, registerToken, unregisterToken]);

  return null;
}
```

### Option 2: Make Notifications Optional
The system already handles this gracefully now. If notifications fail, the app will continue to work normally, just without push notifications.

## Why This Happens

VAPID (Voluntary Application Server Identification) keys are required for web push notifications to work. They:
- Authenticate your server with the push service
- Ensure only your server can send notifications to your users
- Are required by browsers for security

The error occurs because either:
1. No VAPID key is configured in Firebase Console
2. The VAPID key in your code doesn't match Firebase Console
3. The service worker is not properly registered

## Verification

After fixing, you should see in console:
```
FCM token generated successfully with VAPID key
Device token registered successfully
```

## Need Help?

If you're still having issues:
1. Check Firebase Console → Project Settings → Cloud Messaging
2. Ensure your Firebase project ID matches: `nebeng-99cb7`
3. Ensure you're using HTTPS (required for web push)
4. Check browser console for detailed error messages

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Firebase VAPID Key Setup](https://firebase.google.com/docs/cloud-messaging/js/client#configure_vapid_key)
