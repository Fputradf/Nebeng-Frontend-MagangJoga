import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// Set ke true untuk mengaktifkan registrasi token notifikasi
const ENABLE_NOTIFICATION_REGISTRATION = true;

export function NotificationAuthHandler() {
  const { isAuthenticated } = useAuth();
  const { registerToken, unregisterToken, permission } = useNotification();
  const hasAttemptedRegistration = useRef(false);

  useEffect(() => {
    if (!ENABLE_NOTIFICATION_REGISTRATION) return;

    if (isAuthenticated) {
      if (!hasAttemptedRegistration.current && permission === 'granted') {
        hasAttemptedRegistration.current = true;
        registerToken();
      }
    } else {
      hasAttemptedRegistration.current = false;
      unregisterToken();
    }
  }, [isAuthenticated, permission, registerToken, unregisterToken]);

  return null;
}
