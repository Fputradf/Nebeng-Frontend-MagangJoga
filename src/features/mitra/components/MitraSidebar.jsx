import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  QrCode,
  Wallet,
  MessageSquare,
  LogOut,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Menu,
  X,
  Settings,
  HelpCircle,
} from 'lucide-react';
import logoAsset from '../../../assets/logo.png';
import apiClient from '../../../services/apiClient';
import { useAppConfig } from '../../../context/AppConfigContext';

export default function MitraSidebar({
  activeMenu = 'Dashboard Mitra',
  onMenuSelect,
  onLogout,
  isVerified = false, isOpen: propIsOpen, onClose: propOnClose }) {
  const { appName, appLogo } = useAppConfig();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof propIsOpen === 'boolean';
  const isMobileOpen = isControlled ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (isControlled) {
      if (propOnClose) propOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, isControlled, propOnClose]);

  const MENU_GROUPS = [
    {
      label: 'Menu Utama',
      items: [
        { name: 'Dashboard Mitra', slug: 'dashboard', icon: LayoutDashboard, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
        ...(!isVerified ? [{ name: 'Onboarding & Verifikasi', slug: 'onboarding', icon: UserCheck, locked: false, label: 'Onboarding & Verifikasi' }] : []),
      ],
    },
    {
      label: 'Operasional & Layanan',
      items: [
        { name: 'Manajemen Trip & Pesanan', slug: 'trip', icon: Calendar, locked: !isVerified, lockMessage: 'Selesaikan verifikasi untuk menerima pesanan.' },
        { name: 'Tampilkan QR Code', slug: 'qr', icon: QrCode, locked: !isVerified, lockMessage: 'QR Code aktif setelah verifikasi disetujui.' },
        { name: 'Saldo & Pendapatan', slug: 'saldo', icon: Wallet, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
        { name: 'Chat Penumpang', slug: 'chat', icon: MessageSquare, locked: !isVerified, lockMessage: 'Fitur chat aktif untuk mitra terverifikasi.' },
        { name: 'Pusat Bantuan', slug: 'bantuan', icon: HelpCircle, locked: false },
        { name: 'Pengaturan Akun', slug: 'profile/pengaturan', icon: Settings, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
      ],
    },
  ];

  const handleConfirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      if (onLogout) onLogout();
    }, 400);
  };

  const handleMenuSelect = (item) => {
    if (item.locked) return;
    onMenuSelect && onMenuSelect(item.slug || item.name);
    handleClose();
  };

  return (
    <>
      {!isControlled && (
        <button
          onClick={() => setInternalOpen(true)}
          aria-label="Buka menu navigasi"
          className="lg:hidden fixed top-4 left-4 z-20 w-11 h-11 rounded-2xl bg-white shadow-soft border border-slate-200 flex items-center justify-center text-[#10367D] hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {isMobileOpen && (
        <div
          onClick={handleClose}
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity" aria-hidden="true"
        />
      )}

      <aside className={`w-64 h-screen bg-gradient-to-b from-[#0c2353] via-[#10367D] to-[#18458f] text-white flex flex-col justify-between p-5 fixed left-0 top-0 shadow-2xl border-r border-blue-400/20 overflow-y-auto z-50 transition-transform duration-300 font-sans print:hidden select-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div>
          <div className="mb-8 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={appLogo || logoAsset}
                alt={`Logo ${appName || 'Nebeng'}`}
                className="h-8 w-8 object-contain shrink-0 filter brightness-0 invert"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo.png';
                }}
              />
              <span className="font-bold text-white text-lg tracking-tight leading-none truncate max-w-[140px]">
                {appName || 'Nebeng'}
              </span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Tutup menu navigasi"
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200/60 mb-2.5 px-3">
                  {group.label}
                </p>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeMenu === item.name || activeMenu === item.slug;
                    return (
                      <div key={item.name} className="relative group">
                        <button
                          onClick={() => handleMenuSelect(item)}
                          disabled={item.locked}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm transition text-left ${
                            item.locked
                              ? 'text-white/40 cursor-not-allowed hover:bg-white/5'
                              : isActive
                              ? 'bg-white text-[#10367D] font-bold shadow-md cursor-pointer'
                              : 'text-white/85 font-medium hover:bg-white/10 hover:text-white cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent
                              className={`w-4 h-4 ${
                                item.locked
                                  ? 'text-white/30'
                                  : isActive
                                  ? 'text-[#10367D]'
                                  : 'text-white/80'
                              }`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.locked && (
                            <Lock className="w-3.5 h-3.5 text-white/40" />
                          )}
                        </button>
                        {item.locked && (
                          <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 w-52 p-2.5 bg-neutral-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl border border-neutral-700/50 pointer-events-none">
                            <p className="font-semibold text-amber-400 mb-0.5">Akses Dibatasi</p>
                            <p className="text-neutral-300 leading-relaxed text-[11px]">{item.lockMessage}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5 border-t border-white/10">
          <button
            onClick={() => setShowLogoutModal(true)}
            aria-label="Keluar Sistem"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition cursor-pointer border border-white/10 shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-white shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Konfirmasi Keluar Sistem"
        message="Apakah Anda yakin ingin mengakhiri sesi aktif ini? Anda harus masuk kembali untuk mengakses panel mitra."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        icon={LogOut}
        isLoading={isLoggingOut}
      />
    </>
  );
}
