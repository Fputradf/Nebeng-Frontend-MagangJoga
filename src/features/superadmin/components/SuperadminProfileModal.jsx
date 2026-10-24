import { BASE_URL } from '../../../config/env';
import { useState, useEffect } from 'react';
import { X, Mail, ShieldCheck, UserCircle, Settings } from 'lucide-react';
import apiClient from '../../../services/apiClient';

const formatRole = (role) => {
  if (!role) return 'Superadmin';
  return role
    .split(/[-_ ]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function SuperadminProfileModal({ isOpen, onClose, session, role, superadminProfile, onSettingsClick }) {
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function fetchModalProfile() {
      try {
        const res = await apiClient.get('/auth/me');
        if (isMounted && res?.data) {
          setDbUser(res.data);
        }
      } catch (err) {
        console.error('Gagal memuat profil modal dari database:', err);
      }
    }
    fetchModalProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = dbUser?.name || superadminProfile?.name || session?.name || session?.fullName || session?.username || 'Admin';
  const displayEmail = dbUser?.email || superadminProfile?.email || session?.email || '';
  const displayRole = formatRole(dbUser?.role || role || session?.role);
  const initials = displayName.slice(0, 2).toUpperCase();

  let avatarUrl = '';
  const rawAvatar = dbUser?.avatar || superadminProfile?.photoDataUrl || '';
  if (rawAvatar) {
    const baseURL = apiClient.defaults.baseURL 
      ? apiClient.defaults.baseURL.replace('/api', '') 
      : BASE_URL;
    avatarUrl = rawAvatar.startsWith('http') ? rawAvatar : `${baseURL}${rawAvatar}`;
  }

  const handleGoToSettings = () => {
    onClose?.();
    onSettingsClick?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[22px] max-w-sm w-full p-6 shadow-2xl space-y-5 text-gray-900">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-[19px] font-bold text-neutral-800">Profil Saya</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full object-cover border border-neutral-200 shrink-0 shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-[21px] shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[17px] font-semibold text-neutral-800 truncate">{displayName}</p>
            <p className="text-[14px] text-neutral-400 truncate">{displayRole}</p>
          </div>
        </div>

        <div className="space-y-2.5 text-[15px]">
          <div className="flex items-center gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <Mail size={14} className="text-neutral-400 shrink-0" />
            <span className="text-neutral-700 truncate">{displayEmail || 'Email tidak tersedia'}</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <ShieldCheck size={14} className="text-neutral-400 shrink-0" />
            <span className="text-neutral-700">{displayRole}</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <UserCircle size={14} className="text-neutral-400 shrink-0" />
            <span className="text-neutral-700">{dbUser?.id || session?.id || session?.username || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[15px] font-semibold rounded-full transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={handleGoToSettings}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-900 hover:bg-brand-950 text-white text-[15px] font-semibold rounded-full transition cursor-pointer"
          >
            <Settings size={14} /> Pengaturan Akun
          </button>
        </div>
      </div>
    </div>
  );
}