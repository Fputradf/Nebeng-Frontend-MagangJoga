import { useState } from 'react';
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
  Image as ImageIcon
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
      { name: 'Audit & Keuangan', icon: Receipt },
      { name: 'User Governance', icon: Users },
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

      <aside className={`w-64 h-screen bg-[#0a1e3c] text-white flex flex-col justify-between p-5 fixed left-0 top-0 shadow-soft-lg overflow-y-auto z-40 transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
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
                        onClick={() => handleMenuSelect(item.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#0a1e3c] font-bold shadow-soft'
                            : 'text-white/80 font-medium hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-[#0a1e3c]' : 'text-white/70'}`} />
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
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition cursor-pointer border border-white/10"
          >
            <LogOut className="w-4 h-4 text-white shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-modal space-y-6 text-slate-900">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl mx-auto flex items-center justify-center shadow-soft">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Konfirmasi Keluar Sistem</h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Apakah Anda yakin ingin mengakhiri sesi aktif ini? Anda harus masuk kembali untuk mengakses panel superadmin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition shadow-soft cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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