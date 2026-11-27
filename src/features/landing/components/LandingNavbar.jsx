import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAppConfig } from '../../../context/AppConfigContext';
import { useAuth } from '../../../context/AuthContext';
import logoAsset from '../../../assets/LOGO.png';
import logoDarkAsset from '../../../assets/LOGO-dark.png';

const NAV_LINKS = [
  { id: 'tentang', label: 'Tentang' },
  { id: 'layanan', label: 'Layanan' },
  { path: '/mitra-driver', label: 'Mitra Driver' },
  { path: '/mitra-pos', label: 'Mitra Pos' },
  { path: '/faq', label: 'FAQ' },
  { path: '/syarat-ketentuan', label: 'Syarat & Ketentuan' },
];

const ROLE_HOME_MAP = {
  admin: '/admin/dashboard',
  regional: '/regional/dashboard',
  operator: '/operator-pos/dashboard',
  mitra: '/mitra/dashboard',
  customer: '/customer',
};

export default function LandingNavbar({
  isLight = true,
  isScrolled = false,
  fixed = false,
  onSectionClick,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, appLogo } = useAppConfig();
  const { isAuthenticated, role } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandName = appName || 'SatuRute';
  const dashboardPath = ROLE_HOME_MAP[role] || '/customer';

  const handleLogoClick = () => {
    setMobileMenuOpen(false);
    if (location.pathname === '/' || location.pathname === '/landing') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleNavClick = (item) => {
    setMobileMenuOpen(false);
    if (item.path) {
      navigate(item.path);
      return;
    }
    if (onSectionClick) {
      onSectionClick(item.id);
    } else {
      navigate('/', { state: { scrollTo: item.id } });
    }
  };

  const headerBgClass = isLight
    ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
    : isScrolled
      ? 'bg-brand-950/90 backdrop-blur-md border-b border-white/10 shadow-lg'
      : 'bg-transparent';

  return (
    <header
      className={`${fixed ? 'fixed' : 'sticky'} top-0 inset-x-0 z-40 transition-colors duration-200 ${headerBgClass}`}
    >
      <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo & Brand */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none group"
        >
          <img
            src={isLight ? appLogo || logoAsset : logoDarkAsset}
            alt={brandName}
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = isLight ? logoAsset : logoDarkAsset;
            }}
          />
          <span
            className={`font-display text-lg sm:text-xl font-extrabold tracking-tight transition-colors ${
              isLight ? 'text-brand-700' : 'text-white'
            }`}
          >
            {brandName}
          </span>
        </button>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Navigasi Utama">
          {NAV_LINKS.map((item) => {
            const isActiveRoute = item.path && location.pathname === item.path;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                  isLight
                    ? isActiveRoute
                      ? 'text-brand-600'
                      : 'text-slate-800 hover:text-brand-600'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Auth CTA */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm border border-white/15 transition active:scale-95 cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm border border-white/15 transition active:scale-95 cursor-pointer"
            >
              Masuk
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Buka menu navigasi"
          className={`md:hidden inline-flex items-center justify-center rounded-lg p-2 transition cursor-pointer ${
            isLight
              ? 'text-slate-800 hover:bg-slate-100'
              : 'text-white/90 hover:bg-white/10'
          }`}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden backdrop-blur-lg border-b px-4 py-4 space-y-2 ${
            isLight
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-brand-950/95 border-white/10 text-slate-200'
          }`}
        >
          {NAV_LINKS.map((item) => {
            const isActiveRoute = item.path && location.pathname === item.path;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                  isLight
                    ? isActiveRoute
                      ? 'bg-brand-50 text-brand-700'
                      : 'hover:bg-slate-100 text-slate-800'
                    : 'hover:bg-white/10 text-white/90'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div
            className={`pt-2 border-t flex flex-col gap-2 ${
              isLight ? 'border-slate-200' : 'border-white/10'
            }`}
          >
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(dashboardPath);
                }}
                className="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition cursor-pointer"
              >
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition cursor-pointer"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
