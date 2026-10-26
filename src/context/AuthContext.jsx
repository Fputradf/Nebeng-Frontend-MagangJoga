import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);
const STORAGE_KEY = 'nebeng_auth';

function readStoredSession() {
  try {
    const persistedRaw = localStorage.getItem(STORAGE_KEY);
    if (persistedRaw) {
      return { session: JSON.parse(persistedRaw), persisted: true };
    }
  } catch {
    // Data tersimpan korup/format lama — abaikan dan lanjut cek sessionStorage.
  }

  try {
    const temporaryRaw = sessionStorage.getItem(STORAGE_KEY);
    if (temporaryRaw) {
      return { session: JSON.parse(temporaryRaw), persisted: false };
    }
  } catch {
    // Sama seperti di atas — abaikan dan anggap belum login.
  }

  return { session: null, persisted: false };
}

export function AuthProvider({ children }) {
  const [{ session, persisted }, setAuthState] = useState(readStoredSession);
  // true setelah /auth/me selesai dicek (berhasil maupun gagal) untuk sesi customer
  const [customerStatusChecked, setCustomerStatusChecked] = useState(false);

  const login = useCallback((role, extra = {}, remember = false) => {
    const isCustomerApproved =
      role === 'customer' &&
      String(
        extra.user?.statusVerification ||
          extra.customerProfile?.statusVerification ||
          ''
      ).toLowerCase() === 'approved';

    const nextSession = {
      role,
      loggedInAt: Date.now(),
      ...(role === 'customer'
        ? {
            customerVerified: isCustomerApproved,
            customerProfile: extra.user || extra.customerProfile || null,
          }
        : {}),
      ...extra,
    };

    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      localStorage.removeItem(STORAGE_KEY);
    }

    // Jika sudah verified dari data login, tandai customerStatusChecked true
    setCustomerStatusChecked(isCustomerApproved);
    setAuthState({ session: nextSession, persisted: remember });
    // Emit event for push notification resubscription
    window.dispatchEvent(new CustomEvent('nebeng-login'));
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data) {
        const verified =
          String(res.data.statusVerification ?? '').toLowerCase() === 'approved';

        setAuthState((prev) => {
          if (!prev.session) return prev;
          const nextSession = {
            ...prev.session,
            customerVerified: verified,
            customerProfile: { ...prev.session.customerProfile, ...res.data },
          };
          const storage = prev.persisted ? localStorage : sessionStorage;
          storage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
          return { ...prev, session: nextSession };
        });
      }
    } catch (err) {
      console.error('Gagal memperbarui AuthStatus:', err);
    } finally {
      setCustomerStatusChecked(true);
    }
  }, []);

  // Sinkronkan status verifikasi customer dengan server saat app dimuat / setelah login.
  useEffect(() => {
    if (session?.role === 'customer') {
      checkAuthStatus();
    }
  }, [session?.role, checkAuthStatus]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch (err) {
      console.error('Gagal mengirim permintaan logout ke server:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      setCustomerStatusChecked(false);
      setAuthState({ session: null, persisted: false });
      // Emit event for push notification cleanup
      window.dispatchEvent(new CustomEvent('nebeng-logout'));
    }
  }, []);

  const markCustomerVerified = useCallback((profileData = {}) => {
    setAuthState((prev) => {
      if (!prev.session) return prev;
      const nextSession = {
        ...prev.session,
        customerVerified: true,
        customerProfile: { ...prev.session.customerProfile, ...profileData },
      };

      const storage = prev.persisted ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return { ...prev, session: nextSession };
    });
  }, []);

  const updateCustomerProfile = useCallback((patch) => {
    setAuthState((prev) => {
      if (!prev.session) return prev;
      const nextSession = {
        ...prev.session,
        customerProfile: { ...prev.session.customerProfile, ...patch },
      };
      const storage = prev.persisted ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return { ...prev, session: nextSession };
    });
  }, []);

  const updateAdminProfile = useCallback((patch) => {
    setAuthState((prev) => {
      if (!prev.session) return prev;
      const nextSession = {
        ...prev.session,
        adminProfile: { ...prev.session.adminProfile, ...patch },
      };
      const storage = prev.persisted ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return { ...prev, session: nextSession };
    });
  }, []);

  const updateMitraProfile = useCallback((patch) => {
    setAuthState((prev) => {
      if (!prev.session) return prev;
      const nextSession = {
        ...prev.session,
        mitraProfile: { ...prev.session.mitraProfile, ...patch },
      };
      const storage = prev.persisted ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return { ...prev, session: nextSession };
    });
  }, []);

  const updateSuperadminProfile = useCallback((patch) => {
    setAuthState((prev) => {
      if (!prev.session) return prev;
      const nextSession = {
        ...prev.session,
        superadminProfile: { ...prev.session.superadminProfile, ...patch },
      };
      const storage = prev.persisted ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return { ...prev, session: nextSession };
    });
  }, []);

  const value = {
    session,
    isAuthenticated: !!session,
    role: session?.role ?? null,
    sessionPersisted: persisted,
    // Untuk non-customer selalu true, supaya guard tidak menunggu tanpa ujung.
    statusChecked: session?.role !== 'customer' || customerStatusChecked,
    isCustomerVerified: !!session?.customerVerified,
    customerProfile: session?.customerProfile ?? null,
    adminProfile: session?.adminProfile ?? null,
    mitraProfile: session?.mitraProfile ?? null,
    superadminProfile: session?.superadminProfile ?? null,
    user: session?.customerProfile || session?.adminProfile || session?.mitraProfile || session?.superadminProfile || session || null,
    login,
    logout,
    markCustomerVerified,
    checkAuthStatus,
    updateCustomerProfile,
    updateAdminProfile,
    updateMitraProfile,
    updateSuperadminProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- pola context umum (Provider + hook satu file), konsisten dengan ToastContext
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return ctx;
}