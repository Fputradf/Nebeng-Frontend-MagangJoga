import { useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Ticket,
  Wallet,
  Gift,
  LayoutDashboard,
  Route,
  QrCode,
  ScanLine,
  ClipboardList,
  ArrowLeftRight,
  Building2,
  ShieldCheck,
  Globe2,
  CircleDollarSign,
  Users,
  Menu,
} from 'lucide-react';

const ROLE_NAV_ITEMS = {
  customer: [
    { label: 'Cari Trip', path: '/customer/booking', icon: Compass },
    { label: 'Tiket Saya', path: '/customer/tickets', icon: Ticket },
    { label: 'Dompet', path: '/customer/wallet', icon: Wallet },
    { label: 'Rewards', path: '/customer/rewards', icon: Gift },
    { label: 'Menu', isMenuToggle: true, icon: Menu },
  ],
  mitra: [
    { label: 'Dashboard', path: '/mitra/dashboard', icon: LayoutDashboard },
    { label: 'Trip', path: '/mitra/trip', icon: Route },
    { label: 'QR Trip', path: '/mitra/qr', icon: QrCode },
    { label: 'Saldo', path: '/mitra/saldo', icon: Wallet },
    { label: 'Menu', isMenuToggle: true, icon: Menu },
  ],
  operator: [
    { label: 'Dashboard', path: '/operator-pos/dashboard', icon: LayoutDashboard },
    { label: 'Scanner', path: '/operator-pos/scanner', icon: ScanLine },
    { label: 'Manifes', path: '/operator-pos/manifest', icon: ClipboardList },
    { label: 'Handover', path: '/operator-pos/handover', icon: ArrowLeftRight },
    { label: 'Menu', isMenuToggle: true, icon: Menu },
  ],
  regional: [
    { label: 'Dashboard', path: '/regional/dashboard', icon: LayoutDashboard },
    { label: 'Trip Order', path: '/regional/trip-order', icon: Route },
    { label: 'Pos & Armada', path: '/regional/pos-mitra', icon: Building2 },
    { label: 'Verifikasi', path: '/regional/verifikasi', icon: ShieldCheck },
    { label: 'Menu', isMenuToggle: true, icon: Menu },
  ],
  superadmin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Wilayah', path: '/admin/wilayah', icon: Globe2 },
    { label: 'Tarif', path: '/admin/tarif', icon: CircleDollarSign },
    { label: 'Governance', path: '/admin/governance', icon: Users },
    { label: 'Menu', isMenuToggle: true, icon: Menu },
  ],
};

function inferRoleFromPath(pathname) {
  if (pathname.startsWith('/customer')) return 'customer';
  if (pathname.startsWith('/mitra')) return 'mitra';
  if (pathname.startsWith('/operator-pos')) return 'operator';
  if (pathname.startsWith('/regional')) return 'regional';
  if (pathname.startsWith('/admin')) return 'superadmin';
  return null;
}

export default function AppBottomNav({ role: propRole, onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();

  const role = propRole || inferRoleFromPath(location.pathname);
  if (!role || !ROLE_NAV_ITEMS[role]) {
    return null;
  }

  const navItems = ROLE_NAV_ITEMS[role];
  const currentPath = location.pathname.replace(/\/$/, '');

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(16,54,125,0.08)] print:hidden select-none"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="grid h-16 grid-cols-5 items-stretch px-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive =
            !item.isMenuToggle &&
            item.path &&
            (currentPath === item.path || currentPath.startsWith(item.path + '/'));

          const handleClick = () => {
            if (item.isMenuToggle) {
              if (onOpenSidebar) onOpenSidebar();
            } else if (item.path) {
              navigate(item.path);
            }
          };

          return (
            <button
              key={item.label || idx}
              type="button"
              onClick={handleClick}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex flex-col items-center justify-center gap-1 py-1.5 transition-all duration-150 active:scale-90 ${
                isActive ? 'text-brand-500' : 'text-slate-500 hover:text-brand-600'
              }`}
            >
              {/* Active pill background indicator */}
              <div
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 shadow-xs'
                    : 'bg-transparent text-slate-500 group-hover:bg-slate-100/60'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
              </div>

              <span
                className={`max-w-[4.2rem] truncate text-[11px] leading-tight tracking-tight transition-colors ${
                  isActive ? 'font-bold text-brand-700' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

