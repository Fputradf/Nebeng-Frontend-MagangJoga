import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import defaultLogo from '../assets/LOGO.png';
import defaultLogoDark from '../assets/LOGO-dark.png';

const AppConfigContext = createContext(null);

const STORAGE_KEY = 'nebeng_app_config';
const CONFIG_VERSION = 3;
const DEFAULT_FAVICON = '/favicon.png?v=3';

const DEFAULT_CONFIG = {
  appName: 'SatuRute',
  appLogo: defaultLogo,
  appLogoDark: defaultLogoDark,
  appFavicon: DEFAULT_FAVICON,
  appTagline: 'Platform Ekosistem Transportasi & Logistik Antarkota',
  isCustom: false,
};

function resolveAsset(value, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  // Ignore stale hashed Vite bundle URLs from previous builds
  if (/^\/assets\/LOGO/i.test(trimmed) && trimmed !== fallback) {
    return fallback;
  }
  return trimmed;
}

function parseSavedConfig(raw) {
  const parsed = JSON.parse(raw);
  if (parsed.version !== CONFIG_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_CONFIG;
  }
  const resolvedName = parsed.appName?.trim();
  return {
    appName: (resolvedName && resolvedName !== 'Nebeng') ? resolvedName : DEFAULT_CONFIG.appName,
    appLogo: resolveAsset(parsed.appLogo, DEFAULT_CONFIG.appLogo),
    appLogoDark: resolveAsset(parsed.appLogoDark, DEFAULT_CONFIG.appLogoDark),
    appFavicon: resolveAsset(parsed.appFavicon, DEFAULT_CONFIG.appFavicon),
    appTagline: parsed.appTagline || DEFAULT_CONFIG.appTagline,
    isCustom: Boolean(parsed.isCustom),
  };
}

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return parseSavedConfig(saved);
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
            setConfig(parseSavedConfig(e.newValue));
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

  // Sinkronisasi favicon & apple-touch-icon di <head>
  useEffect(() => {
    const href = config.appFavicon || DEFAULT_FAVICON;
    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink) {
      iconLink.setAttribute('href', href);
    }
    const appleLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleLink) {
      appleLink.setAttribute('href', href);
    }
  }, [config.appFavicon]);

  const updateConfig = useCallback((newValues) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        ...newValues,
        appLogo: resolveAsset(newValues.appLogo ?? prev.appLogo, DEFAULT_CONFIG.appLogo),
        appLogoDark: resolveAsset(newValues.appLogoDark ?? prev.appLogoDark, DEFAULT_CONFIG.appLogoDark),
        appFavicon: resolveAsset(newValues.appFavicon ?? prev.appFavicon, DEFAULT_CONFIG.appFavicon),
        isCustom: true,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...updated,
          version: CONFIG_VERSION,
          // Jangan simpan URL bundle default agar pembaruan aset bawaan tetap berlaku
          appLogo: updated.appLogo === DEFAULT_CONFIG.appLogo ? '' : updated.appLogo,
          appLogoDark: updated.appLogoDark === DEFAULT_CONFIG.appLogoDark ? '' : updated.appLogoDark,
          appFavicon: updated.appFavicon === DEFAULT_CONFIG.appFavicon ? '' : updated.appFavicon,
        }));
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
    appLogoDark: config.appLogoDark,
    appFavicon: config.appFavicon,
    appTagline: config.appTagline,
    isCustom: config.isCustom,
    defaultLogo,
    defaultLogoDark,
    defaultFavicon: DEFAULT_FAVICON,
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
