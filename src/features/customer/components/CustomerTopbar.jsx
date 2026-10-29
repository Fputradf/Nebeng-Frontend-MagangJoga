import { useEffect, useState } from 'react';

import { BASE_URL } from '../../../config/env';
import apiClient from '../../../services/apiClient';
import logoAsset from '../../../assets/logo.png';
import NotificationBell from '../../../components/ui/NotificationBell';

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



export default function CustomerTopbar({ profile, onProfileClick }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        if (isMounted && response.data) {
          setUserData(response.data);
        }
      } catch { /* ignore */ }
    };
    loadInitialData();
    return () => { isMounted = false; };
  }, []);

  const displayName = userData?.name || profile?.fullName || 'Customer';
  const firstName = displayName.split(' ')[0];
  const now = new Date();

  const rawPhoto =
    userData?.avatar ||
    userData?.photoDataUrl ||
    profile?.avatar ||
    profile?.photoDataUrl ||
    '';

  const getFullFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseURL = apiClient.defaults.baseURL
      ? apiClient.defaults.baseURL.replace('/api', '')
      : BASE_URL; // Fallback if no BASE_URL imported
    return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const photoUrl = getFullFileUrl(rawPhoto);

  return (
    <div className="text-[#10367D] pl-4 pr-4 sm:pr-6 lg:px-8 pt-4 pb-4 flex items-center justify-between sticky top-0 z-10 font-['Inter'] bg-white/85 backdrop-blur-md border-b border-neutral-100/80">
      <div className="flex items-center gap-2.5 lg:hidden">
        <img
          src={logoAsset}
          alt="Logo Nebeng"
          className="h-8 w-8 object-contain shrink-0"
        />
        <span className="font-bold text-[23px] tracking-wide leading-none">
          Nebeng
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#10367D]/70">
          {formatTanggal.format(now)}
        </p>
        <p className="truncate font-bold text-xl leading-tight text-[#10367D]">
          {sapaan(now.getHours())}
          {firstName ? `, ${firstName}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <button
          onClick={onProfileClick}
          className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#10367D] flex items-center justify-center text-white hover:bg-[#0C2C66] transition font-bold text-[17px] cursor-pointer overflow-hidden"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
          ) : (
            firstName.charAt(0).toUpperCase()
          )}
        </button>
      </div>
    </div>
  );
}



