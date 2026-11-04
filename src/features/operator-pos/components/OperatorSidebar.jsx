import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  QrCode,
  LogOut,
  ClipboardList,
  Menu,
  X,
  BookOpen,
  Settings,
} from 'lucide-react';
import logoAsset from '../../../assets/logo.png';
import { useAppConfig } from '../../../context/AppConfigContext';

export default function OperatorSidebar({
  activeMenu = 'Dashboard',
  onMenuSelect,
  onLogout,
  isOpen: propIsOpen,
  onClose: propOnClose,
}) {
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
      label: 'Menu',
      items: [
        { name: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
        { name: 'Kehadiran', path: 'manifest', icon: ClipboardList },
        { name: 'Scan QR', path: 'scanner', icon: QrCode },
      ],
    },
    {
      label: 'Lainnya',
      items: [
        { name: 'Panduan', path: 'guide', icon: BookOpen },
        { name: 'Pengaturan', path: 'pengaturan', icon: Settings },
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
    onMenuSelect && onMenuSelect(item.name, item.path);
    handleClose();
  };

  return (
    <>
      {!isControlled && (
        <button
          onClick={() => setInternalOpen(true)}
          aria-label="Buka menu navigasi"
          className="lg:hidden fixed top-4 left-4 z-20 w-11 h-11 rounded-xl bg-white shadow-card border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {isMobileOpen && (
        <div
          onClick={handleClose}
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 h-screen bg-gradient-to-b from-[#0c2353] via-[#10367D] to-[#18458f] border-r border-blue-400/20 shadow-2xl text-white flex flex-col justify-between p-5 fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300 font-sans print:hidden select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
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
                    const isActive = activeMenu === item.name || activeMenu === item.path;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleMenuSelect(item)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition text-left cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#10367D] font-bold shadow-md'
                            : 'text-white/85 font-medium hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <IconComponent
                          className={`w-4 h-4 ${isActive ? 'text-[#10367D]' : 'text-white/80'}`}
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

        <div className="pt-5 border-t border-white/10">
          <button
            onClick={() => setShowLogoutModal(true)}
            aria-label="Keluar"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition cursor-pointer border border-white/10 shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-white shrink-0" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun ini?"
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        icon={LogOut}
        isLoading={isLoggingOut}
      />
    </>
  );
}
