import { useState } from 'react';
import defaultIllustration from '../../assets/auth-illustration.png';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
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
}) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans antialiased overflow-x-hidden">
      {/* =========================
          LEFT PANEL - FULL-SIZE HERO ILLUSTRATION (Desktop)
      ========================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 min-h-screen relative flex-col justify-between p-8 xl:p-12 bg-gradient-to-br from-brand-700 via-brand-500 to-[#10367D] text-white overflow-hidden shrink-0">
        {/* Decorative blur lights */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full bg-accent/20 blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        {/* Top Header on Left */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Escrow Terintegrasi</span>
          </span>
          <span className="text-xs text-blue-200 font-medium tracking-wide">
            Platform Resmi Antarkota
          </span>
        </div>

        {/* Center Illustration + Floating Badges + Feature Badges DIRECTLY BELOW IMAGE */}
        <div className="relative z-10 my-auto py-4 flex flex-col items-center w-full">
          <div className="relative w-full max-w-md aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-3 group">
            <img
              src={illustration}
              alt={illustrationAlt}
              className="w-full h-full object-cover rounded-2xl transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent rounded-2xl" />

            {/* Floating Glass Pill inside Illustration */}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-accent text-brand-900 flex items-center justify-center font-black shrink-0 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Perjalanan Hemat & Pengiriman Cepat</p>
                  <p className="text-[10px] text-blue-100">Solusi nebeng antar kota terpercaya di Indonesia</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Badges DIRECTLY UNDER THE IMAGE (as requested) */}
          <div className="w-full max-w-md mt-4 grid grid-cols-3 gap-2 px-1">
            <div className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] text-blue-50 font-medium shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Verifikasi Pos</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] text-blue-50 font-medium shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Dompet Digital</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] text-blue-50 font-medium shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Tarif Transparan</span>
            </div>
          </div>
        </div>

        {/* Empty placeholder or subtle quote at bottom to balance vertical space */}
        <div className="relative z-10 text-center text-xs text-blue-200/80">
          <span>&copy; {new Date().getFullYear()} {brandName}. Layanan Terverifikasi.</span>
        </div>
      </div>

      {/* =========================
          RIGHT PANEL - FULL-SIZE FORM AREA
      ========================== */}
      <div className="flex-1 min-h-screen flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-8 xl:px-14 py-4 sm:py-6 bg-gradient-to-b from-white via-slate-50/60 to-blue-50/20 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] overflow-y-auto">
        {/* Top Bar with Mode Switcher & Logo on the Right Corner */}
        <div className={`w-full ${maxWidth} mx-auto flex items-center justify-between pb-3 border-b border-slate-200/60 shrink-0`}>
          {onSwitchMode && (authMode === 'login' || authMode === 'register') ? (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={authMode === 'login' ? undefined : onSwitchMode}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={authMode === 'register' ? undefined : onSwitchMode}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
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
                className="w-8 h-8 object-contain drop-shadow-sm"
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
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm sm:shadow-card hover:shadow-card-hover transition-all duration-200">
            {children}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className={`w-full ${maxWidth} mx-auto pt-2.5 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-slate-400 shrink-0`}>
          <span>&copy; {new Date().getFullYear()} {brandName}. Semua hak dilindungi.</span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="hover:text-blue-600 transition cursor-pointer font-medium"
            >
              Bantuan
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-blue-600 transition cursor-pointer font-medium"
            >
              Privasi
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="hover:text-blue-600 transition cursor-pointer font-medium"
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
