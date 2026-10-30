import { useState } from 'react';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  UserCheck,
  ShoppingBag,
  Gift,
  Receipt,
  LogOut,
  AlertTriangle,
  Menu,
  X,
  Image as ImageIcon,
  Ticket,
  Settings,
  Share2
} from 'lucide-react';
import logoImage from '../../../assets/LOGO.png';

const MENU_GROUPS = [
  {
    label: 'Menu Utama',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard },
      { name: 'Manajemen Wilayah', icon: ShieldCheck },
      { name: 'Admin Wilayah', icon: UserCheck },
    ],
  },
  {
    label: 'Manajemen Lanjutan',
    items: [
      { name: 'Konfigurasi Tarif', icon: ShoppingBag },
      { name: 'Manajemen Merchandise', icon: Gift },
      { name: 'Manajemen Banner', icon: ImageIcon },
      { name: 'Voucher', icon: Ticket },
      { name: 'Sosial Link', icon: Share2 },
      { name: 'Audit & Keuangan', icon: Receipt },
      { name: 'User Governance', icon: Users },
      { name: 'Pengaturan Akun', icon: Settings },
    ],
  },
];

export default function SuperadminSidebar({ activeMenu = 'Dashboard', onMenuSelect, onLogout }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleConfirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      if (onLogout) onLogout();
    }, 400);
  };

  const handleMenuSelect = (name) => {
    onMenuSelect && onMenuSelect(name);
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

      <aside className={`w-64 h-screen bg-gradient-to-b from-[#0c2353] via-[#10367D] to-[#18458f] border-r border-blue-400/20 shadow-2xl text-white flex flex-col justify-between p-5 fixed left-0 top-0 font-sans overflow-y-auto z-40 transition-transform duration-300 print:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div>
          <div className="mb-8 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={logoImage}
                alt="Logo Nebeng"
                className="h-8 w-8 object-contain shrink-0 filter brightness-0 invert"
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
                        onClick={() => handleMenuSelect(item.name)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition text-left cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#10367D] font-bold shadow-md'
                            : 'text-white/85 font-medium hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#10367D]' : 'text-white/80'}`} />
                        {item.name}
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
        message="Apakah Anda yakin ingin mengakhiri sesi aktif ini? Anda harus masuk kembali untuk mengakses panel superadmin."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        icon={LogOut}
        isLoading={isLoggingOut}
      />
        </>
  );
}
