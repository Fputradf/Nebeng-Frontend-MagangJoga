import { useNotification } from '../../context/NotificationContext';
import { Bell, X, ArrowRight, AlertCircle } from 'lucide-react';

// Fitur notifikasi dinonaktifkan sementara — ubah ke true untuk mengaktifkan
const ENABLE_NOTIFICATION_REQUEST = true;

// Inner component — hook dipanggil di sini agar aman di dalam Provider
export default function NotificationPermissionRequest() {
  const {
    permission,
    requestPermission,
    registerToken,
    notificationSupported,
    errorMessage,
  } = useNotification();

  // Sudah granted atau denied — tidak perlu tampil
  if (permission === 'granted' || permission === 'denied') {
    return null;
  }

  // Sudah pernah di-dismiss oleh user
  if (localStorage.getItem('notification_permission_dismissed') === 'true') {
    return null;
  }

  const handleAllow = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        // Token will be registered after login
        console.log('Notification permission granted. Token will be registered after login.');
      }
    } catch (error) {
      console.error('Error in handleAllow:', error);
      alert('Terjadi kesalahan saat mengaktifkan notifikasi: ' + error.message);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_permission_dismissed', 'true');
  };

  // Notifikasi tidak didukung browser ini
  if (errorMessage && !notificationSupported) {
    return (
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-yellow-50 rounded-xl shadow-lg border border-yellow-200 p-4 z-50">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-yellow-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Notifikasi Tidak Tersedia</h3>
            <p className="text-xs text-gray-600 mb-3">{errorMessage}</p>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Popup izin notifikasi
  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">Aktifkan Notifikasi</h3>
          <p className="text-xs text-gray-600 mb-3">
            Dapatkan notifikasi real-time untuk pesanan, perjalanan, dan pembayaran Anda.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAllow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Izinkan <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
