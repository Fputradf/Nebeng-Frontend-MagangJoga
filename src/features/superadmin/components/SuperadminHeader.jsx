import { BASE_URL } from '../../../config/env';
import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  UserCircle,
  Settings
} from 'lucide-react';
import apiClient from '../../../services/apiClient';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return initials.toUpperCase();
};

const formatRole = (role) => {
  if (!role) return 'Superadmin';
  return role
    .split(/[-_ ]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function SuperadminHeader({ session, role, superadminProfile, onViewProfile, onSettingsClick }) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dbUser, setDbUser] = useState(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [systemWarnings, setSystemWarnings] = useState([]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const warningCount = systemWarnings.length;

  const markAllNotifsAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchHeaderProfile() {
      try {
        const res = await apiClient.get('/auth/me');
        if (isMounted && res?.data) {
          setDbUser(res.data);
        }
      } catch (err) {
        console.error('Gagal memuat profil header dari database:', err);
      }
    }
    fetchHeaderProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = dbUser?.name || superadminProfile?.name || session?.name || session?.fullName || session?.username || 'Admin';
  const displayRole = formatRole(dbUser?.role || role || session?.role);
  const displayEmail = dbUser?.email || superadminProfile?.email || session?.email || '';
  
  let avatarUrl = '';
  const rawAvatar = dbUser?.avatar || superadminProfile?.photoDataUrl || '';
  if (rawAvatar) {
    const baseURL = apiClient.defaults.baseURL 
      ? apiClient.defaults.baseURL.replace('/api', '') 
      : BASE_URL;
    avatarUrl = (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')) ? rawAvatar : `${baseURL}${rawAvatar}`;
  }

  return (
    <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-neutral-100/80 flex items-center justify-end gap-2 sm:gap-3 pl-14 lg:pl-0 h-14 px-4 sm:px-6 lg:px-8">
      {/* Tombol Peringatan Sistem */}
      <button
        onClick={() => {
          setShowWarningModal(true);
          setShowNotifDropdown(false);
        }}
        aria-label="Peringatan Sistem"
        className="relative w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-amber-600 transition shadow-sm cursor-pointer shrink-0"
      >
        <AlertTriangle className={`w-4 h-4 ${warningCount > 0 ? 'text-amber-500' : 'text-neutral-500'}`} />
        {warningCount > 0 && (
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        )}
      </button>

      {/* Tombol Notifikasi */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setShowNotifDropdown(!showNotifDropdown);
            setShowWarningModal(false);
          }}
          aria-label="Notifikasi"
          className="relative w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-brand-900 transition shadow-sm cursor-pointer shrink-0"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          )}
        </button>

        {showNotifDropdown && (
          <div className="absolute right-0 top-12 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden animate-in fade-in duration-150">
            <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-neutral-800">Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="text-[14px] font-semibold bg-brand-900/10 text-brand-900 px-2 py-0.5 rounded-full">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllNotifsAsRead} className="text-[14px] font-medium text-brand-900 hover:underline cursor-pointer">
                  Tandai dibaca
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-50">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className={`p-3 hover:bg-neutral-50 transition cursor-pointer ${n.unread ? 'bg-brand-50' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[15px] font-semibold text-neutral-800">{n.title}</p>
                      <span className="text-[13px] text-neutral-400">{n.time}</span>
                    </div>
                    <p className="text-[14px] text-neutral-500 leading-relaxed">{n.desc}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-neutral-500 text-[15px]">
                  Tidak ada notifikasi baru.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profil Pengguna */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
          aria-label="Menu Profil"
          aria-expanded={showProfileMenu}
        >
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-10 h-10 sm:w-9 sm:h-9 rounded-full object-cover border border-neutral-200 shadow-sm" />
            ) : (
              <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-[16px]">
                {getInitials(displayName)}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[15px] font-semibold text-neutral-800 leading-tight">{displayName}</span>
            <span className="text-[14px] text-neutral-400 leading-tight">{displayRole}</span>
          </div>
          <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-neutral-400" />
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-[16px] shrink-0">
                  {getInitials(displayName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-neutral-800 truncate">{displayName}</p>
                <p className="text-[13px] text-neutral-400 truncate">{displayEmail || displayRole}</p>
              </div>
            </div>
            <div className="py-1.5">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onViewProfile && onViewProfile();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[15px] font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                <UserCircle size={15} /> Profil Saya
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onSettingsClick && onSettingsClick();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[15px] font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                <Settings size={15} /> Pengaturan Akun
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Peringatan Sistem */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-gray-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={20} />
                <h3 className="text-[19px] font-bold text-neutral-800">Peringatan Sistem Terbaru</h3>
              </div>
              <button onClick={() => setShowWarningModal(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {systemWarnings.length > 0 ? (
                systemWarnings.map((warning, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[15px] font-semibold text-amber-900">{warning.title}</p>
                      <p className="text-[14px] text-amber-700 mt-0.5 leading-relaxed">{warning.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-neutral-500 text-[15px]">
                  Tidak ada peringatan sistem saat ini.
                </div>
              )}
            </div>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 bg-brand-900 text-white text-[14px] font-semibold rounded-full hover:bg-brand-950 transition cursor-pointer"
            >
              Tutup & Evaluasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}