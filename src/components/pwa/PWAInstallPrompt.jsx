import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import logoImg from '../../assets/LOGO.png';

const DISMISS_KEY = 'nebeng_pwa_prompt_dismissed_until';
const COOLDOWN_DAYS = 3;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Cek apakah sudah running dalam mode PWA Standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      return;
    }

    // Cek cooldown dismissal
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // Cek apakah perangkat iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pada iOS, jika bukan standalone dan belum dismiss, munculkan prompt khusus iOS
    if (isAppleDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSGuide(false);
    const cooldownTime = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(cooldownTime));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-50 bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100 overflow-hidden p-1.5">
          <img src={logoImg} alt="Nebeng" className="w-full h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Pasang Aplikasi Nebeng</h4>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 -mr-1 rounded-lg"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Akses cepat tanpa browser, update perjalanan langsung, dan hemat kuota di jalan.
          </p>

          {showIOSGuide ? (
            <div className="mt-3 p-2.5 bg-purple-50/70 rounded-xl text-xs text-purple-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 text-purple-600" /> Cara pasang di iOS / Safari:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-purple-800">
                <li>Ketuk ikon <b>Bagikan (Share)</b> di Safari</li>
                <li>Pilih <b>Tambah ke Layar Utama (Add to Home Screen)</b></li>
              </ol>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm shadow-purple-200 transition-colors"
              >
                {isIOS ? <Smartphone className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                {isIOS ? 'Petunjuk Pasang' : 'Pasang Sekarang'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Nanti
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
