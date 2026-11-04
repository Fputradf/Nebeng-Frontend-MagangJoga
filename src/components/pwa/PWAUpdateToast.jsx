import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAUpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service Worker terdaftar:', r);
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker gagal mendaftar:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <aside
      aria-label="Notifikasi Pembaruan Aplikasi"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 transition-all duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">Versi Baru Tersedia</h4>
          <p className="text-xs text-slate-300 mt-1">
            Fitur dan pembaruan sistem terbaru sudah siap digunakan.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleUpdate}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
            >
              Muat Ulang
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Nanti Saja
            </button>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Tutup notifikasi pembaruan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
