import { useState, useEffect } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  MessageCircle,
  MapPin,
  ExternalLink,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
  Car,
  User,
  Shield,
  Loader2,
  X,
} from 'lucide-react';
import alertSoundPlayer from '../../../utils/alertSound';
import emergencyService from '../../../services/emergencyService';
import { useToast } from '../../../context/ToastContext';

export default function EmergencySosAlertModal({
  isOpen,
  onClose,
  alertData,
  onResolved,
}) {
  const toast = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mulai suara alarm sirine saat modal darurat terbuka
  useEffect(() => {
    if (isOpen) {
      setIsMuted(false);
      alertSoundPlayer.startEmergencySiren();
    } else {
      alertSoundPlayer.stop();
    }

    return () => {
      alertSoundPlayer.stop();
    };
  }, [isOpen]);

  const toggleSound = () => {
    if (isMuted) {
      alertSoundPlayer.startEmergencySiren();
      setIsMuted(false);
    } else {
      alertSoundPlayer.stop();
      setIsMuted(true);
    }
  };

  // Tutup dengan Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        alertSoundPlayer.stop();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !alertData) return null;

  const customer = alertData.customer || {};
  const trip = alertData.trip || {};
  const driver = trip.mitra || {};
  const vehicle = trip.vehicle || {};
  const lat = alertData.latitude || trip.originPoint?.latitude || -7.7956;
  const lng = alertData.longitude || trip.originPoint?.longitude || 110.3695;
  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await emergencyService.resolveSosAlert(alertData.id, {
        status: resolveStatus,
        notes: adminNotes.trim() || undefined,
      });

      alertSoundPlayer.stop();
      toast.success(
        resolveStatus === 'RESOLVED'
          ? 'Insiden SOS berhasil ditandai selesai/aman.'
          : 'Laporan SOS ditandai sebagai alarm palsu.',
        { title: 'Status Diperbarui' }
      );

      if (onResolved) {
        onResolved(alertData.id);
      }
      onClose();
    } catch (err) {
      console.error('[Emergency Modal Resolve Error]', err);
      toast.error(err.response?.data?.message || 'Gagal memperbarui status SOS.', {
        title: 'Gagal',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-alert-title"
    >
      <div className="relative w-full max-w-2xl bg-neutral-900 border-2 border-rose-500 rounded-2xl shadow-2xl text-white flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Darurat Pinned */}
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-rose-900/60 bg-neutral-900/95 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-600/40 animate-pulse">
              <AlertOctagon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-[10px] font-black uppercase tracking-wider text-white">
                  PRIORITAS TINGGI
                </span>
                <span className="text-xs text-neutral-400 font-mono truncate">
                  ID #{alertData.id}
                </span>
              </div>
              <h2 id="emergency-alert-title" className="text-base sm:text-xl font-black text-rose-400 tracking-tight mt-0.5 truncate leading-tight">
                PERINGATAN SOS DARURAT AKTIF
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? 'Bunyikan alarm sirene' : 'Bisukan alarm sirene'}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-neutral-400" /> : <Volume2 className="w-5 h-5 text-rose-400 animate-bounce" />}
            </button>
            <button
              type="button"
              onClick={() => {
                alertSoundPlayer.stop();
                onClose();
              }}
              aria-label="Tutup jendela peringatan"
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body + Sticky Footer */}
        <form onSubmit={handleResolve} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-4 space-y-3.5">
            {/* Ringkasan Kategori & Waktu */}
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-300 uppercase tracking-wider">Kategori:</span>
                <span className="font-bold text-white px-2 py-0.5 rounded bg-rose-900/80 border border-rose-700">
                  {alertData.category || 'Keadaan Darurat'}
                </span>
              </div>
              <div className="text-neutral-400">
                Waktu: <span className="text-neutral-200 font-semibold">{alertData.createdAt ? new Date(alertData.createdAt).toLocaleTimeString('id-ID') : 'Baru saja'}</span>
              </div>
            </div>

            {alertData.notes && (
              <div className="p-3 rounded-xl bg-neutral-800/90 border border-neutral-700 text-xs text-neutral-300">
                <span className="font-bold text-neutral-400 block mb-0.5">Catatan Customer:</span>
                <p className="italic font-medium text-white">"{alertData.notes}"</p>
              </div>
            )}

            {/* Grid Informasi Pihak Terlibat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Kartu Customer */}
              <div className="p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700 space-y-2.5">
                <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                  <User className="w-4 h-4 text-sky-400" />
                  <span>Pelanggan (Korban)</span>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-white truncate">{customer.name || 'Pelanggan Nebeng'}</p>
                  <p className="text-xs text-neutral-400 font-mono truncate">{customer.phone || customer.email || '-'}</p>
                </div>
                <div className="flex gap-2 pt-0.5">
                  {customer.phone && (
                    <>
                      <a
                        href={`tel:${customer.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition min-h-[40px]"
                      >
                        <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Telepon</span>
                      </a>
                      <a
                        href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition min-h-[40px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">WhatsApp</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Kartu Driver & Kendaraan */}
              <div className="p-3.5 rounded-xl bg-neutral-800/80 border border-neutral-700 space-y-2.5">
                <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                  <Car className="w-4 h-4 text-emerald-400" />
                  <span>Mitra Driver & Kendaraan</span>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-white truncate">{driver.name || 'Mitra Driver'}</p>
                  <p className="text-xs text-neutral-400 truncate">
                    {vehicle.model ? `${vehicle.model} (${vehicle.color || '-'})` : 'Kendaraan'}{' '}
                    <span className="font-mono font-bold text-amber-400">[{vehicle.plateNumber || '-'}]</span>
                  </p>
                </div>
                <div className="flex gap-2 pt-0.5">
                  {driver.phone && (
                    <a
                      href={`tel:${driver.phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold transition min-h-[40px]"
                    >
                      <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Hubungi Driver ({driver.phone})</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Lokasi GPS & Navigasi */}
            <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">GPS: {lat}, {lng}</span>
                </div>
                <p className="text-neutral-400 truncate">
                  Rute: {trip.originPoint?.name || 'Asal'} ➔ {trip.destinationPoint?.name || 'Tujuan'}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
                <a
                  href="tel:112"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold transition min-h-[40px]"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Panggil 112</span>
                </a>
              </div>
            </div>

            {/* Form Penyelesaian Insiden */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Tindakan Resolusi Petugas / Admin:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolveStatus('RESOLVED')}
                  className={`flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl border text-xs font-bold transition min-h-[42px] cursor-pointer ${
                    resolveStatus === 'RESOLVED'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                      : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="text-center">Ditangani / Situasi Aman (RESOLVED)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolveStatus('FALSE_ALARM')}
                  className={`flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl border text-xs font-bold transition min-h-[42px] cursor-pointer ${
                    resolveStatus === 'FALSE_ALARM'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span className="text-center">Alarm Palsu / Salah Pencet (FALSE ALARM)</span>
                </button>
              </div>

              <div>
                <label htmlFor="admin-resolve-notes" className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Catatan Penanganan:
                </label>
                <input
                  id="admin-resolve-notes"
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Contoh: Sudah dikontak, penumpang dijemput aparat / Driver membantu ganti ban"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-rose-500 min-h-[40px]"
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 border-t border-neutral-800 bg-neutral-900/95 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => {
                alertSoundPlayer.stop();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs min-h-[40px] cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              Tutup Sementara
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[40px] disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-900/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Konfirmasi Selesai / Aman</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

