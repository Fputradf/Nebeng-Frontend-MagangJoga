import { useState } from 'react';
import {
  UserCheck,
  Compass,
  Ticket,
  Gift,
  User,
  LogOut,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Menu,
  X,
  Bell,
  BellOff,
} from 'lucide-react';
import logoAsset from '../../../assets/logo.png';
import { useNotification } from '../../../context/NotificationContext';
import { useToast } from '../../../context/ToastContext';

export default function CustomerSidebar({
  activeMenu = 'Cari & Booking Trip',
  isCustomerVerified = false,
  customerProfile = null,
  onMenuSelect,
  onLogout,
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const toast = useToast();

  const {
    fcmToken,
    permission,
    notificationSupported,
    errorMessage,
    requestPermission,
    registerToken,
  } = useNotification();

  const handleTogglePush = async () => {
    console.log('CLICK toggle notif');
    console.log('[CustomerSidebar] TOGGLE CLICKED - fcmToken:', fcmToken, 'notificationSupported:', notificationSupported, 'permission:', permission, 'errorMessage:', errorMessage);
    
    try {
      if (fcmToken) {
        console.log('[CustomerSidebar] Token already exists');
        toast.info('Notifikasi sudah aktif. Logout untuk menonaktifkan.');
        return;
      }
      
      if (!notificationSupported) {
        console.log('[CustomerSidebar] Notifications not supported');
        toast.error('Browser tidak mendukung notifikasi');
        return;
      }
      
      if (permission === 'denied') {
        console.log('[CustomerSidebar] Permission denied');
        toast.error('Notifikasi ditolak. Aktifkan di pengaturan browser.');
        return;
      }
      
      console.log('[CustomerSidebar] Calling requestPermission...');
      const hasPermission = await requestPermission();
      console.log('[CustomerSidebar] Permission result:', hasPermission);
      
      if (hasPermission) {
        console.log('[CustomerSidebar] Calling registerToken...');
        const success = await registerToken();
        console.log('[CustomerSidebar] Register token result:', success);
        if (success) {
          toast.success('Notifikasi berhasil diaktifkan!');
        } else {
          toast.error(errorMessage || 'Gagal mendaftarkan token notifikasi.');
        }
      } else {
        toast.error('Izin notifikasi ditolak. Aktifkan di pengaturan browser.');
      }
    } catch (err) {
      console.error('[CustomerSidebar] Gagal mengubah notifikasi:', err);
      toast.error(err.message || 'Gagal mengubah status notifikasi.');
    }
  };

  const MENU_GROUPS = [
    {
      label: 'Menu Utama',
      items: [
        ...(!isCustomerVerified
          ? [
              {
                name: 'Onboarding Biometrik',
                icon: UserCheck,
                locked: false,
                label: 'Onboarding Biometrik',
              },
            ]
          : []),
        { name: 'Cari & Booking Trip', icon: Compass, locked: !isCustomerVerified },
      ],
    },
    {
      label: 'Transaksi & Rewards',
      items: [
        { name: 'Tickets & Digital QR', icon: Ticket, locked: !isCustomerVerified },
        { name: 'Rewards & Penukaran', icon: Gift, locked: !isCustomerVerified },
      ],
    },
    {
      label: 'Akun',
      items: [
        { name: 'Profil Saya', icon: User, locked: !isCustomerVerified },
      ],
    },
  ];

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (onLogout) {
        await onLogout();
      }
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleMenuSelect = (item) => {
    if (item.locked) return;
    if (onMenuSelect) onMenuSelect(item.name);
    setIsMobileOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        aria-label="Buka menu navigasi"
        className="lg:hidden fixed top-4 left-4 z-20 w-11 h-11 rounded-xl bg-white shadow-card border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
        />
      )}

      <aside className={`w-64 h-screen bg-[#0a1e3c] text-white flex flex-col justify-between p-5 fixed left-0 top-0 shadow-soft-lg overflow-y-auto z-40 transition-transform duration-300 font-sans print:hidden select-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div>
          <div className="mb-8 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={logoAsset}
                alt="Logo Nebeng"
                className="h-8 w-8 object-contain shrink-0 filter brightness-0 invert"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo.png';
                }}
              />
              <span className="font-bold text-white text-lg tracking-tight leading-none">
                Nebeng
              </span>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              aria-label="Tutup menu navigasi"
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {customerProfile?.fullName && (
            <div className="mx-2 mb-5 p-3 rounded-lg bg-white/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                {customerProfile?.photoDataUrl ? (
                  <img src={customerProfile.photoDataUrl} alt="Foto Profil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {customerProfile.fullName}
                </p>
                <p
                  className={`text-xs font-bold flex items-center gap-1 ${
                    isCustomerVerified ? 'text-[#74B4D9]' : 'text-white/50'
                  }`}
                >
                  {isCustomerVerified ? <ShieldCheck size={12} /> : <Lock size={12} />}
                  {isCustomerVerified ? 'Terverifikasi' : 'Belum Terverifikasi'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5 px-3">
                  {group.label}
                </p>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeMenu === item.name;
                    return (
                      <button
                        key={item.name}
                        disabled={item.locked}
                        onClick={() => handleMenuSelect(item)}
                        title={
                          item.locked
                            ? isCustomerVerified
                              ? 'Verifikasi biometrik sudah selesai'
                              : 'Selesaikan verifikasi biometrik untuk membuka menu ini'
                            : undefined
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left ${
                          isActive
                            ? 'bg-white text-[#0a1e3c] font-bold shadow-soft cursor-default'
                            : item.locked
                            ? 'text-white/40 font-medium cursor-not-allowed opacity-60'
                            : 'text-white/80 font-medium hover:bg-white/10 hover:text-white cursor-pointer'
                        }`}
                      >
                        <IconComponent
                          className={`w-4 h-4 ${
                            isActive ? 'text-[#0a1e3c]' : item.locked ? 'text-white/30' : 'text-white/70'
                          }`}
                        />
                        <span className="flex-1">{item.label || item.name}</span>
                        {item.locked &&
                          (isCustomerVerified ? (
                            <ShieldCheck className="w-3 h-3 text-[#74B4D9]" />
                          ) : (
                            <Lock className="w-3 h-3 text-white/30" />
                          ))}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5 border-t border-white/10 space-y-3">
          <button
            onClick={() => {
              console.log('CLICK toggle notif (CustomerSidebar JSX)');
              handleTogglePush();
            }}
            disabled={permission === 'denied' || !!errorMessage}
            aria-label={fcmToken ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer border ${
              fcmToken
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'
            } ${errorMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {fcmToken ? (
              <Bell className="w-4 h-4 shrink-0" />
            ) : (
              <BellOff className="w-4 h-4 shrink-0" />
            )}
            <span>{fcmToken ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}</span>
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            aria-label="Keluar Sistem"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition cursor-pointer border border-white/10"
          >
            <LogOut className="w-4 h-4 text-white shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 text-gray-900">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-[17px] font-bold text-gray-900">
                Konfirmasi Keluar Sistem
              </h3>
              <p className="text-[13px] font-normal text-gray-500">
                Apakah Anda yakin ingin mengakhiri
                sesi aktif ini? Anda harus masuk kembali
                untuk mengakses portal pelanggan.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-semibold rounded-full transition cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold rounded-full transition shadow-sm shadow-rose-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    Ya, Keluar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
