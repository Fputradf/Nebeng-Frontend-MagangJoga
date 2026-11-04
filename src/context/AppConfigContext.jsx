import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import defaultLogo from '../assets/LOGO.png';

const AppConfigContext = createContext(null);

const STORAGE_KEY = 'nebeng_app_config';

const DEFAULT_CONFIG = {
  appName: 'Nebeng',
  appLogo: defaultLogo,
  appTagline: 'Platform Ekosistem Transportasi & Logistik Antarkota',
  isCustom: false,
};

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          appName: parsed.appName?.trim() || DEFAULT_CONFIG.appName,
          appLogo: parsed.appLogo || DEFAULT_CONFIG.appLogo,
          appTagline: parsed.appTagline || DEFAULT_CONFIG.appTagline,
          isCustom: Boolean(parsed.isCustom),
        };
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi aplikasi dari localStorage:', err);
    }
    return DEFAULT_CONFIG;
  });

  // Sinkronisasi jika tab lain mengubah localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            setConfig({
              appName: parsed.appName?.trim() || DEFAULT_CONFIG.appName,
              appLogo: parsed.appLogo || DEFAULT_CONFIG.appLogo,
              appTagline: parsed.appTagline || DEFAULT_CONFIG.appTagline,
              isCustom: Boolean(parsed.isCustom),
            });
          } else {
            setConfig(DEFAULT_CONFIG);
          }
        } catch {
          // ignore parsing error
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sinkronisasi document.title dengan appName
  useEffect(() => {
    const name = config.appName || DEFAULT_CONFIG.appName;
    // Ganti seluruh nama brand di title dengan nama yang aktif
    document.title = document.title.replace(/Nebeng/gi, name);
  }, [config.appName]);

  const updateConfig = useCallback((newValues) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        ...newValues,
        isCustom: true,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Gagal menyimpan konfigurasi aplikasi ke localStorage:', err);
      }
      return updated;
    });
  }, []);

  const resetConfig = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Gagal mereset konfigurasi aplikasi:', err);
    }
    setConfig(DEFAULT_CONFIG);
  }, []);

  // Helper: set judul tab browser dengan prefix appName
  const setPageTitle = useCallback((pageTitle) => {
    const name = config.appName || DEFAULT_CONFIG.appName;
    document.title = pageTitle ? `${name} - ${pageTitle}` : name;
  }, [config.appName]);

  const value = {
    appName: config.appName,
    appLogo: config.appLogo,
    appTagline: config.appTagline,
    isCustom: config.isCustom,
    defaultLogo,
    defaultName: DEFAULT_CONFIG.appName,
    defaultTagline: DEFAULT_CONFIG.appTagline,
    updateConfig,
    resetConfig,
    setPageTitle,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}
