import { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Bell, X, Check, ShieldCheck, Sparkles } from 'lucide-react';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';

// Inner component — modal kustom elegan non-template
export default function NotificationPermissionRequest() {
  const {
    permission,
    requestPermission,
    notificationSupported,
    errorMessage,
  } = useNotification();

  const [isRequesting, setIsRequesting] = useState(false);

  // Sudah granted atau denied — tidak perlu tampil
  if (permission === 'granted' || permission === 'denied') {
    return null;
  }

  // Sudah pernah di-dismiss oleh user
  if (localStorage.getItem('notification_permission_dismissed') === 'true') {
    return null;
  }

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        console.log('[NotificationPermissionRequest] Izin diberikan pengguna');
      }
    } catch (error) {
      console.error('Error saat meminta izin notifikasi:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_permission_dismissed', 'true');
    // Force re-render dengan memicu event storage atau state lokal
    window.dispatchEvent(new Event('storage'));
  };

  if (errorMessage && !notificationSupported) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-['Inter']">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-neutral-100 relative overflow-hidden flex flex-col space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dekorasi Aksen Latar Belakang */}
        <div 
          className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: PRIMARY_COLOR }}
        />

        {/* Tombol Close */}
        <button
          onClick={handleDismiss}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Brand */}
        <div className="flex items-center gap-3.5 pt-1">
          <div 
            className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-md relative"
            style={{ backgroundColor: `${PRIMARY_COLOR}12` }}
          >
            <Bell className="w-6 h-6 animate-bounce" style={{ color: PRIMARY_COLOR }} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">
              <Sparkles className="w-3 h-3" />
              <span>Nebeng Real-Time</span>
            </div>
            <h3 className="text-[19px] font-bold text-neutral-900 leading-tight">
              Aktifkan Notifikasi Web
            </h3>
          </div>
        </div>

        {/* Deskripsi & Manfaat */}
        <div className="space-y-2 text-[13px] text-neutral-600 leading-relaxed bg-neutral-50/70 p-3.5 rounded-2xl border border-neutral-100">
          <p className="font-medium text-neutral-700">
            Dapatkan pembaruan langsung tanpa harus membuka ulang aplikasi:
          </p>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Pesan baru masuk dari Mitra atau Pelanggan</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Status keberangkatan, tracking GPS, dan scan pos</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Konfirmasi pembayaran & pelepasan dana escrow aman</span>
            </div>
          </div>
        </div>

        {/* Keamanan Privacy Badge */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
          <span>Izin dapat diatur atau dinonaktifkan kapan saja melalui browser.</span>
        </div>

        {/* Tombol Aksi */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isRequesting}
            className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-[13px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            Nanti Saja
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={isRequesting}
            className="flex-1 py-3 px-4 rounded-xl text-white text-[13px] font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: PRIMARY_COLOR }}
            onMouseEnter={(e) => {
              if (!isRequesting) e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
            }}
          >
            {isRequesting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Izinkan Sekarang'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
