import { useEffect } from 'react';
import { useAppConfig } from '../context/AppConfigContext';

/**
 * Hook untuk mengatur judul tab browser secara dinamis.
 * Otomatis menggunakan appName dari konfigurasi superadmin sebagai prefix.
 *
 * @param {string} pageTitle - Judul halaman (misal: "Dashboard", "Login")
 *
 * @example
 * usePageTitle('Dashboard'); // → "Nebeng - Dashboard"
 * usePageTitle();            // → "Nebeng"
 */
export function usePageTitle(pageTitle) {
  const { setPageTitle } = useAppConfig();

  useEffect(() => {
    setPageTitle(pageTitle);
  }, [pageTitle, setPageTitle]);
}

