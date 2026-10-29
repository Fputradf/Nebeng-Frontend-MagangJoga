import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useState } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Truck,
  ShieldCheck,
  Navigation,
  FileText,
  LogOut,
  AlertTriangle,
  Menu,
  X,
  Settings,
  Headset,
} from 'lucide-react';

import logoImage from '../../../assets/LOGO.png';

const MENU_GROUPS = [
  {
    label: 'Menu Utama',
    items: [
      {
        name: 'Dashboard Wilayah',
        icon: LayoutDashboard,
      },
      {
        name: 'Pos Mitra & Terminal',
        icon: MapPin,
      },
      {
        name: 'Armada & Kurir',
        icon: Truck,
      },
    ],
  },
  {
    label: 'Operasional & Keamanan',
    items: [
      {
        name: 'Verifikasi ID & Face',
        icon: ShieldCheck,
      },
      {
        name: 'Pemantauan Trip',
        icon: Navigation,
      },
      {
        name: 'Laporan Keuangan',
        icon: FileText,
      },
      {
        name: 'Bantuan Chat Wilayah',
        icon: Headset,
      },
      {
        name: 'Pengaturan Akun',
        icon: Settings,
      },
    ],
  },
];

export default function RegionalSidebar({
  activeMenu = 'Dashboard Wilayah',
  onMenuSelect,
  onLogout,
}) {
  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [isMobileOpen, setIsMobileOpen] =
    useState(false);

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
      {/* MOBILE MENU BUTTON */}
      <button
        onClick={() => setIsMobileOpen(true)}
        aria-label="Buka menu navigasi"
        className="lg:hidden fixed top-4 left-4 z-20 w-11 h-11 rounded-2xl bg-white shadow-md border border-neutral-100 flex items-center justify-center text-[#10367D]"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* MOBILE OVERLAY */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          w-64
          h-screen
          bg-gradient-to-b from-[#0c2353] via-[#10367D] to-[#18458f] border-r border-blue-400/20 shadow-2xl text-white flex flex-col justify-between p-5 fixed left-0 top-0
          overflow-y-auto
          z-40
          transition-transform
          duration-300
          font-sans
          ${
            isMobileOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
          lg:translate-x-0
        `}
      >
        <div>
          {/* LOGO */}
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

            {/* MOBILE CLOSE */}
            <button
              onClick={() =>
                setIsMobileOpen(false)
              }
              aria-label="Tutup menu navigasi"
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* MENU GROUPS */}
          <div className="space-y-6">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200/60 mb-2.5 px-3">
                  {group.label}
                </p>

                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const IconComponent =
                      item.icon;

                    const isActive =
                      activeMenu === item.name;

                    return (
                      <button
                        key={item.name}
                        onClick={() =>
                          handleMenuSelect(item.name)
                        }
                        className={`
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3.5 py-3 rounded-xl
                          text-sm
                          transition
                          text-left
                          cursor-pointer
                          ${
                            isActive
                              ? 'bg-white text-[#10367D] font-bold shadow-md'
                              : 'text-white/85 font-medium hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <IconComponent
                          className={`
                            w-4 h-4
                            ${
                              isActive ? 'text-[#10367D]' : 'text-white/80'
                            }
                          `}
                        />

                        {item.name}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* LOGOUT */}
        <div className="pt-5 border-t border-white/10">
          <button
            onClick={() =>
              setShowLogoutModal(true)
            }
            aria-label="Keluar Sistem"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition cursor-pointer border border-white/10 shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-white shrink-0" />

            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* LOGOUT MODAL */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Konfirmasi Keluar Sistem"
        message="Apakah Anda yakin ingin mengakhiri sesi aktif ini? Anda harus masuk kembali untuk mengakses panel regional."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        icon={LogOut}
        isLoading={isLoggingOut}
      />
    </>
  );
}
