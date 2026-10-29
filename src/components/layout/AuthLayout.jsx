import { useState } from 'react';
import defaultIllustration from '../../assets/auth-illustration.png';
import { ShieldCheck, MapPin, CheckCircle2, Navigation } from 'lucide-react';
import SocialIcon from '../ui/SocialIcon';
import GuestHelpModal from './GuestHelpModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

export default function AuthLayout({
  children,
  logo,
  brandName = 'Nebeng',
  title,
  subtitle,
  illustration = defaultIllustration,
  illustrationAlt = 'Ilustrasi layanan Nebeng',
  authMode = 'login',
  onSwitchMode,
  maxWidth = 'max-w-xl',
  socialLinks = [],
}) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans antialiased overflow-x-hidden">
      {/* =========================
          LEFT PANEL - FULL-SIZE HERO ILLUSTRATION (Desktop)
      ========================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 min-h-screen relative flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-brand-700 via-brand-500 to-[#10367D] text-white shrink-0">
        {/* Top Header on Left */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Escrow Terintegrasi</span>
          </span>
          <span className="text-xs text-blue-100 font-medium tracking-wide">
            Platform Resmi Antarkota
          </span>
        </div>

        {/* Center Illustration + Value Cards DIRECTLY BELOW IMAGE */}
        <div className="relative z-10 my-auto py-4 flex flex-col items-center w-full">
          <div className="relative w-full max-w-md aspect-4/3 rounded-3xl overflow-hidden shadow-xl border border-white/20 bg-slate-900/30 p-2.5 group">
            <img
              src={illustration}
              alt={illustrationAlt}
              width={448}
              height={336}
              fetchpriority="high"
              className="w-full h-full object-cover rounded-2xl transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent rounded-2xl" />

            {/* Info Pill inside Illustration */}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-slate-950/80 backdrop-blur-xs border border-white/20 text-white shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-accent text-brand-900 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Perjalanan Hemat & Pengiriman Cepat</p>
                  <p className="text-[10px] text-blue-100">Solusi nebeng antar kota terpercaya di Indonesia</p>
                </div>
              </div>
            </div>
          </div>

          {/* Value Badges DIRECTLY UNDER THE IMAGE with distinct purpose & icons */}
          <div className="w-full max-w-md mt-4 grid grid-cols-3 gap-2 px-1">
            <div className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 border border-white/15 text-[11px] text-blue-50 font-medium shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Verifikasi Pos</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 border border-white/15 text-[11px] text-blue-50 font-medium shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Proteksi Escrow</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 border border-white/15 text-[11px] text-blue-50 font-medium shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Tarif Transparan</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar on Left Panel */}
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-100">
          {socialLinks && socialLinks.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {socialLinks.slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.platform || 'Media Sosial'}
                  title={item.platform}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center p-1.5 transition-all hover:scale-105 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <SocialIcon
                    platform={item.platform}
                    iconType="preset"
                    logoUrl={item.logoUrl}
                    className="w-3.5 h-3.5 fill-current"
                  />
                </a>
              ))}
            </div>
          ) : (
            <span />
          )}
          <span>&copy; {new Date().getFullYear()} {brandName}. Layanan Terverifikasi.</span>
        </div>
      </div>

      {/* =========================
          RIGHT PANEL - FULL-SIZE FORM AREA
      ========================== */}
      <div className="flex-1 min-h-screen flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-8 xl:px-14 py-4 sm:py-6 bg-slate-50/50 overflow-y-auto">
        {/* Top Bar with Mode Switcher & Logo on the Right Corner */}
        <div className={`w-full ${maxWidth} mx-auto flex items-center justify-between pb-3 border-b border-slate-200 shrink-0`}>
          {onSwitchMode && (authMode === 'login' || authMode === 'register') ? (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={authMode === 'login' ? undefined : onSwitchMode}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
                  authMode === 'login'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={authMode === 'register' ? undefined : onSwitchMode}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
                  authMode === 'register'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Baru
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Logo on the Right Corner */}
          <div className="flex items-center gap-2">
            {logo && (
              <img
                src={logo}
                alt={brandName}
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            )}
            <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#10367D]">
              {brandName}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`w-full ${maxWidth} mx-auto my-auto py-2 sm:py-3`}>
          {/* Form Header */}
          <div className="text-center sm:text-left mb-3">
            {title && (
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200">
            {children}
          </div>
        </div>

        {/* Bottom Footer - High Contrast WCAG AA compliant */}
        <div className={`w-full ${maxWidth} mx-auto pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 shrink-0`}>
          <span>&copy; {new Date().getFullYear()} {brandName}. Semua hak dilindungi.</span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-slate-600 hover:text-brand-700 transition cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
            >
              Bantuan
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="text-slate-600 hover:text-brand-700 transition cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
            >
              Privasi
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-slate-600 hover:text-brand-700 transition cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
            >
              Syarat & Ketentuan
            </button>
          </span>
        </div>
      </div>

      {/* Guest Modals */}
      <GuestHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onNavigateLogin={() => {
          if (authMode !== 'login' && onSwitchMode) onSwitchMode();
        }}
        onNavigateRegister={() => {
          if (authMode !== 'register' && onSwitchMode) onSwitchMode();
        }}
      />

      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </main>
  );
}
