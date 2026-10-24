import { useLocation } from 'react-router-dom';
import { Bell, ChevronRight, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BusinessHeader() {
  const location = useLocation();
  const { user } = useAuth();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="h-14 bg-white/85 backdrop-blur-md border-b border-neutral-100/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-[14px] font-medium text-gray-500">
        <span className="text-gray-400 capitalize">Nebeng</span>
        {pathSegments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1.5 capitalize">
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className={index === pathSegments.length - 1 ? 'font-bold text-brand-600' : 'text-gray-600'}>
              {segment.replace(/-/g, ' ')}
            </span>
          </div>
        ))}
      </nav>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* Status System Security Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[12px] font-bold text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>AES-256 Encrypted</span>
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifikasi Sistem"
          className="relative p-2 rounded-xl text-gray-500 hover:bg-slate-subtle hover:text-brand-600 transition cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-4 w-px bg-slate-border" />

        {/* User Role Badge */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-[14px] border border-brand-100">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[13px] font-bold text-gray-800 leading-tight">
              {user?.name || 'Operator Sesi'}
            </p>
            <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
              {user?.role || 'Akses Terverifikasi'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}