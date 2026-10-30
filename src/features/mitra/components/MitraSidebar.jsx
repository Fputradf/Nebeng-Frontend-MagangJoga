import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useState } from 'react';
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

export default function MitraSidebar({
  activeMenu = 'Dashboard Mitra',
  onMenuSelect,
  onLogout,
  isVerified = false
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const MENU_GROUPS = [
    {
      label: 'Menu Utama',
      items: [
        { name: 'Dashboard Mitra', icon: LayoutDashboard, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
        ...(!isVerified ? [{ name: 'Onboarding & Verifikasi', icon: UserCheck, locked: false, label: 'Onboarding & Verifikasi' }] : []),
      ],
    },
    {
      label: 'Manajemen Trip',
      items: [
        { name: 'Kelola Trip & Jadwal', icon: Calendar, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
        { name: 'Digital QR Trip', icon: QrCode, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
      ],
    },
    {
      label: 'Keuangan & Komunikasi',
      items: [
        { name: 'Saldo & Komisi', icon: Wallet, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
        { name: 'Chat Pelanggan', icon: MessageSquare, locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
        { name: 'Pusat Bantuan & FAQ', icon: HelpCircle, locked: false },
      ],
    },
    {
      label: 'Pengaturan',
      items: [
        { name: 'Pengaturan Akun', icon: Settings,
locked: !isVerified, lockMessage: 'Fitur terkunci. Memerlukan verifikasi Admin Regional.' },
      ],
    },
  ];

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Gagal mencabut token di server:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      if (onLogout) onLogout();
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

      <aside className={`w-64 h-screen bg-gradient-to-b from-[#0c2353] via-[#10367D] to-[#18458f] text-white flex flex-col justify-between p-5 fixed left-0 top-0 shadow-2xl border-r border-blue-400/20 overflow-y-auto z-40 transition-transform duration-300 font-sans print:hidden select-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
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

          <div className="space-y-6">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200/60 mb-2.5 px-3">
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
                        title={item.locked ? item.lockMessage : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition text-left ${
                          isActive
                            ? 'bg-white text-[#10367D] font-bold shadow-md cursor-default'
                            : item.locked
                            ? 'text-white/40 font-medium cursor-not-allowed opacity-60'
                            : 'text-white/85 font-medium hover:bg-white/10 hover:text-white cursor-pointer'
                        }`}
                      >
                        <IconComponent
                          className={`w-4 h-4 ${
                            isActive
                              ? 'text-[#10367D]'
                              : item.locked
                              ? 'text-white/30'
                              : 'text-white/80'
                          }`}
                        />
                        <span className="flex-1">{item.label || item.name}</span>
                        {item.name === 'Onboarding & Verifikasi' && isVerified ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : item.locked ? (
                          <Lock className="w-3 h-3 text-white/40 shrink-0" />
                        ) : null}
                      </button>
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
