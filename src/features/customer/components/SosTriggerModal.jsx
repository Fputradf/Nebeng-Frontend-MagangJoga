import { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  X,
  PhoneCall,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import emergencyService from '../../../services/emergencyService';

const SOS_CATEGORIES = [
  { id: 'ancaman_kejahatan', label: 'Ancaman Kejahatan / Pelecehan', icon: '🚨' },
  { id: 'kecelakaan', label: 'Kecelakaan Lalu Lintas', icon: '💥' },
  { id: 'emergency', label: 'Keadaan Darurat Lainnya', icon: '⚠️' },
];

export default function SosTriggerModal({ isOpen, onClose, ticket }) {
  // Step 1: Peringatan Pertama (1/2) - Pencegahan Tidak Sengaja Tertekan
  // Step 2: Konfirmasi Akhir (2/2) - Peringatan Siaran Sinyal & Detail
  // Step 3: Berhasil Terkirim
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('ancaman_kejahatan');
  const [notes, setNotes] = useState('');
  const [gpsStatus, setGpsStatus] = useState('detecting'); // detecting, acquired, fallback, error
  const [coordinates, setCoordinates] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isFinalConfirming, setIsFinalConfirming] = useState(false);
  const confirmTimeoutRef = useRef(null);
  const modalRef = useRef(null);

  // Bersihkan timer konfirmasi saat unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  // Ambil lokasi GPS saat modal terbuka atau berpindah ke step 2
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setErrorMessage(null);
      setNotes('');
      setIsFinalConfirming(false);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      return;
    }

    setGpsStatus('detecting');
    setErrorMessage(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus('acquired');
        },
        (err) => {
          console.warn('[SOS Modal] Geolocation error:', err);
          const fallbackLat = ticket?.originCoord?.lat || -7.7956;
          const fallbackLng = ticket?.originCoord?.lng || 110.3695;
          setCoordinates({ lat: fallbackLat, lng: fallbackLng });
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = ticket?.originCoord?.lat || -7.7956;
      const fallbackLng = ticket?.originCoord?.lng || 110.3695;
      setCoordinates({ lat: fallbackLat, lng: fallbackLng });
      setGpsStatus('fallback');
    }
  }, [isOpen, ticket]);

  // Listener tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmitSos = async () => {
    if (!ticket) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const lat = coordinates?.lat || -7.7956;
      const lng = coordinates?.lng || 110.3695;

      await emergencyService.triggerSos({
        orderId: ticket.id,
        tripId: ticket.tripId || ticket.trip?.id,
        latitude: lat,
        longitude: lng,
        category: selectedCategory,
        notes: notes.trim() || undefined,
      });

      setCurrentStep(3); // Tampilan Berhasil
    } catch (err) {
      console.error('[SOS Trigger Error]', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Gagal mengirimkan sinyal SOS. Silakan coba lagi atau hubungi 112.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2SubmitClick = () => {
    if (isFinalConfirming) {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      setIsFinalConfirming(false);
      handleSubmitSos();
    } else {
      setIsFinalConfirming(true);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => {
        setIsFinalConfirming(false);
      }, 5000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
      ref={modalRef}
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border-2 border-rose-600 rounded-2xl shadow-2xl p-5 sm:p-6 text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Glow efek darurat */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/25 rounded-full blur-2xl pointer-events-none" />

        {/* Tombol Tutup */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Tutup jendela darurat"
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: PERINGATAN PERTAMA (1/2) - MENCEGAH TIDAK SENGAJA TERTEKAN */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                  Peringatan Darurat (Tahap 1 dari 2)
                </span>
                <h2 id="sos-modal-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Tombol SOS Darurat Tertekan
                </h2>
              </div>
            </div>

            {/* Banner Edukasi Pencegahan Tidak Sengaja Tertekan */}
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs sm:text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Info className="w-4 h-4 shrink-0" />
                <span>Apakah Anda benar-benar dalam keadaan darurat?</span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-xs">
                Peringatan ini sengaja dibuat untuk <strong>mencegah tombol SOS tertekan secara tidak sengaja</strong>.
                Fitur ini hanya digunakan saat terjadi bahaya mendesak seperti kejahatan, pelecehan, atau kecelakaan selama perjalanan di <strong className="text-white">Trip #{ticket?.tripId || ticket?.id}</strong>.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-700 text-xs text-neutral-300 space-y-1.5">
              <div className="font-semibold text-white">Apa yang terjadi jika Anda melanjutkan?</div>
              <p className="text-neutral-400 leading-normal">
                1. Anda akan masuk ke tahap konfirmasi akhir (Tahap 2/2).<br />
                2. Lokasi koordinat GPS Anda akan langsung dipersiapkan untuk disiarkan.<br />
                3. Jika bukan keadaan darurat, silakan tekan <strong>Batal / Salah Tekan</strong> di bawah.
              </p>
            </div>

            {/* Tombol Aksi Step 1 */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black rounded-xl transition min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                <span>Ya, Lanjut ke Peringatan Akhir (1/2)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer"
              >
                Batal / Salah Tekan
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PERINGATAN KEDUA / KONFIRMASI AKHIR (2/2) */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 block">
                  Konfirmasi Akhir (Tahap 2 dari 2)
                </span>
                <h2 id="sos-modal-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Kirim Peringatan SOS
                </h2>
              </div>
            </div>

            {/* Status Geolocation Live */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/80 border border-neutral-700 text-xs">
              <span className="flex items-center gap-2 text-neutral-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                {gpsStatus === 'detecting' && 'Mendeteksi koordinat GPS presisi...'}
                {gpsStatus === 'acquired' && 'Koordinat GPS akurat berhasil dideteksi'}
                {gpsStatus === 'fallback' && 'Menggunakan koordinat rute perjalanan'}
                {gpsStatus === 'error' && 'Koordinat tidak terdeteksi (rute cadangan)'}
              </span>
              {gpsStatus === 'detecting' ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              ) : (
                <span className="font-mono text-[11px] text-emerald-400 font-bold">
                  {coordinates ? `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : 'Siap'}
                </span>
              )}
            </div>

            {/* Pilihan Kategori Darurat */}
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Pilih Kategori Masalah:
              </legend>
              <div className="grid grid-cols-1 gap-2">
                {SOS_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                        isSelected
                          ? 'bg-rose-950/60 border-rose-500 text-white shadow-xs'
                          : 'bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-rose-500 bg-rose-500' : 'border-neutral-500'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Catatan Tambahan (Opsional) */}
            <div className="space-y-1">
              <label htmlFor="sos-notes" className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                Keterangan Singkat (Opsional):
              </label>
              <input
                id="sos-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pengemudi mencurigakan / Kecelakaan di KM 42"
                maxLength={180}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/50 min-h-[44px]"
              />
            </div>

            {/* Banner Peringatan Konfirmasi Akhir */}
            <div className="p-3.5 rounded-xl bg-rose-950/40 border-2 border-rose-500 text-rose-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-black text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>PERINGATAN KONFIRMASI AKHIR (2/2)</span>
              </div>
              <p className="leading-relaxed text-neutral-300">
                Sirene alarm darurat dan koordinat live Anda akan langsung disiarkan ke <strong className="text-white">Mitra Pos, Admin Wilayah, dan Super Admin</strong>.
                {isFinalConfirming ? (
                  <span className="block mt-1 text-amber-300 font-bold animate-pulse">
                    ⚠️ Tekan tombol merah sekali lagi untuk langsung mengirimkan sinyal!
                  </span>
                ) : (
                  <span className="block mt-1 text-neutral-400">
                    Klik tombol di bawah untuk mengonfirmasi pengiriman sinyal darurat.
                  </span>
                )}
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Tombol Aksi Step 2 */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={isSubmitting}
                className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition min-h-[48px] flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={handleStep2SubmitClick}
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-black rounded-xl transition min-h-[48px] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 cursor-pointer shadow-lg ${
                  isFinalConfirming
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-2 border-amber-300 shadow-rose-600/70 animate-pulse focus-visible:ring-amber-300'
                    : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-900/40 focus-visible:ring-rose-400'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Menyiarkan Sinyal Darurat...</span>
                  </>
                ) : isFinalConfirming ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-300 animate-bounce" />
                    <span>Yakin? Klik untuk Siarkan SOS Sekarang!</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5" />
                    <span>Siarkan Sinyal SOS (Tahap 2/2)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TAMPILAN BERHASIL DISIARKAN */}
        {currentStep === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 id="sos-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Sinyal SOS Berhasil Dikirim
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Peringatan darurat dan koordinat lokasi terkini Anda telah disiarkan langsung ke <span className="font-bold text-white">Mitra Pos, Admin Wilayah, dan Super Admin</span> Nebeng.
              </p>
            </div>

            <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-4 text-left text-xs text-neutral-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Koordinat: {coordinates?.lat?.toFixed(5)}, {coordinates?.lng?.toFixed(5)}</span>
              </div>
              <p>• Tetap tenang dan jangan tinggalkan tempat aman.</p>
              <p>• Tim Operasional (Mitra Pos, Admin Wilayah & Super Admin) sedang memantau dan dapat menghubungi Anda atau mitra pengemudi.</p>
              <p>• Jika Anda berada dalam bahaya jiwa mendesak, segera hubungi nomor darurat nasional (110 / 112).</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="tel:112"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Telepon Polisi / 112</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-xl transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
