import { useEffect, useState } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { BASE_URL } from '../../config/env';
import logoAsset from '../../assets/LOGO.png';
import NotificationBell from '../ui/NotificationBell';
import { useAppConfig } from '../../context/AppConfigContext';

const formatTanggal = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function getWaktu(jam) {
  if (jam >= 4 && jam < 11) return 'pagi';
  if (jam >= 11 && jam < 15) return 'siang';
  if (jam >= 15 && jam < 19) return 'sore';
  return 'malam';
}

function resolveFileUrl(path) {
  if (!path) return null;
  if (/^(blob:|data:|https?:\/\/)/.test(path)) return path;
  const base = apiClient.defaults.baseURL ? apiClient.defaults.baseURL.replace('/api', '') : BASE_URL;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2';

export default function AppTopbar({ profile, roleLabel, onProfileClick, onToggleSidebar, basePath }) {
  const { appName, appLogo } = useAppConfig();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const fullName = profile?.fullName || profile?.name || 'Pengguna';
  const firstName = fullName.split(' ')[0];
  const avatarUrl = resolveFileUrl(profile?.avatarUrl || profile?.avatar || profile?.photoDataUrl);

  const initial = (fullName || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-dashed border-brand-500/25 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 sm:h-[72px] items-center gap-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Buka menu navigasi"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-soft transition active:scale-95 hover:bg-slate-50 ${FOCUS}`}
            >
              <Menu className="h-5 w-5 text-brand-600" />
            </button>
          )}
          <img
            src={appLogo || logoAsset}
            alt={appName || 'Logo'}
            className="h-7 w-7 shrink-0 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = logoAsset;
            }}
          />
          <span className="hidden font-display text-lg font-extrabold leading-none text-brand-500 min-[380px]:inline truncate max-w-[150px]">
            {appName || 'Nebeng'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-brand-500/70 sm:block">
            {formatTanggal.format(now)}
          </p>
          <p className="truncate font-display text-sm font-bold leading-tight text-brand-700 sm:text-lg hidden sm:block">
            <span>Selamat {getWaktu(now.getHours())}</span>
            {firstName ? `, ${firstName}` : ''}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <NotificationBell basePath={basePath} />

          <button
            type="button"
            onClick={onProfileClick}
            aria-label="Profil pengguna"
            className={`flex items-center gap-3 rounded-2xl border border-dashed border-brand-500/30 bg-brand-50/40 p-1.5 transition hover:bg-brand-50/70 hover:border-brand-500/50 sm:pr-3.5 ${FOCUS}`}
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-500 font-display text-sm font-bold text-white shadow-soft ring-2 ring-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            <div className="hidden text-left min-[420px]:block">
              <p className="max-w-[140px] truncate text-xs font-bold leading-tight text-brand-900 sm:max-w-[180px]">
                {fullName}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500">
                {roleLabel}
              </p>
            </div>

            <ChevronDown className="hidden h-4 w-4 text-brand-500 min-[420px]:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
