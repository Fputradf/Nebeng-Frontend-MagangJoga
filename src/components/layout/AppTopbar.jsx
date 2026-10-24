import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { BASE_URL } from '../../config/env';
import logoAsset from '../../assets/LOGO.png';
import NotificationBell from '../ui/NotificationBell';

const formatTanggal = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function sapaan(jam) {
  if (jam >= 4 && jam < 11) return 'Selamat pagi';
  if (jam >= 11 && jam < 15) return 'Selamat siang';
  if (jam >= 15 && jam < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function resolveFileUrl(path) {
  if (!path) return null;
  if (/^(blob:|data:|https?:\/\/)/.test(path)) return path;
  const base = apiClient.defaults.baseURL ? apiClient.defaults.baseURL.replace('/api', '') : BASE_URL;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

/**
 * Topbar bersama semua role.
 * `profile` boleh berbentuk apa saja dari AuthContext (name/fullName, avatar/photoDataUrl).
 * Kalau nama tidak ada di profile, diambil dari /auth/me.
 * Tepi bawah berupa garis rute putus-putus dengan satu titik tujuan: motif identitas Nebeng.
 */
export default function AppTopbar({ profile, roleLabel, onProfileClick }) {
  const [me, setMe] = useState(null);
  const hasName = Boolean(profile?.name || profile?.fullName);

  useEffect(() => {
    if (hasName) return undefined;
    let alive = true;
    apiClient
      .get('/auth/me')
      .then((res) => alive && setMe(res?.data || null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hasName]);

  const fullName = profile?.name || profile?.fullName || me?.name || '';
  const displayName = fullName || roleLabel || 'Pengguna';
  const firstName = fullName.split(' ')[0];
  const photoUrl = resolveFileUrl(profile?.avatar || profile?.photoDataUrl || me?.avatar);
  const now = new Date();

  return (
    <header className="sticky top-0 z-20 border-b border-dashed border-brand-500/25 bg-white/80 backdrop-blur-md">
      <div className="flex h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 lg:hidden">
          <img src={logoAsset} alt="" className="h-8 w-8 shrink-0 object-contain" />
          <span className="font-display text-xl font-extrabold leading-none text-brand-500">Nebeng</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500/70">
            {formatTanggal.format(now)}
          </p>
          <p className="truncate font-display text-xl font-bold leading-tight text-brand-700">
            {sapaan(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />

          <span aria-hidden="true" className="hidden h-8 w-px bg-slate-200 sm:block" />

          <button
            type="button"
            onClick={onProfileClick}
            aria-label={`Buka profil ${displayName}`}
            className={`flex h-12 cursor-pointer items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 shadow-soft transition hover:border-brand-500/30 hover:shadow-card sm:pr-3.5 ${FOCUS}`}
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight text-slate-900">
                {displayName}
              </span>
              {roleLabel && (
                <span className="mt-0.5 inline-block rounded-full bg-brand-500/10 px-2 py-px text-[11px] font-semibold leading-tight text-brand-500">
                  {roleLabel}
                </span>
              )}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[5px] left-4 h-2.5 w-2.5 rounded-full border-2 border-brand-500 bg-accent sm:left-6 lg:left-8"
      />
    </header>
  );
}