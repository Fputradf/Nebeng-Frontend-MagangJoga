import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// Set ke true untuk mengaktifkan registrasi token notifikasi
const ENABLE_NOTIFICATION_REGISTRATION = false;

export function NotificationAuthHandler() {
  const { isAuthenticated } = useAuth();
  const { registerToken, unregisterToken } = useNotification();
  const hasAttemptedRegistration = useRef(false);

  useEffect(() => {
    if (!ENABLE_NOTIFICATION_REGISTRATION) return;

    if (isAuthenticated && !hasAttemptedRegistration.current) {
      hasAttemptedRegistration.current = true;
      registerToken();
    } else if (!isAuthenticated) {
      hasAttemptedRegistration.current = false;
      unregisterToken();
    }
  }, [isAuthenticated, registerToken, unregisterToken]);

  return null;
}
