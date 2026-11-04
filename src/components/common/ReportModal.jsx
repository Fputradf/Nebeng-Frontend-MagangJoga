import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Upload,
  X,
  ShieldAlert,
  CheckCircle,
  FileText,
  Car,
  MapPin,
  Building2,
  User,
} from 'lucide-react';
import reportService from '../../services/reportService';

const DRIVER_CATEGORIES = [
  { value: 'SAFETY_AND_HARASSMENT', label: 'Pelecehan & Keselamatan Berkendara', desc: 'Ugal-ugalan, ancaman fisik/verbal, rute sesat' },
  { value: 'FRAUD_OR_EXTORTION', label: 'Pungli & Penipuan Tarif', desc: 'Minta ongkos tunai tambahan di luar aplikasi' },
  { value: 'VEHICLE_CONDITION', label: 'Kondisi Kendaraan', desc: 'Plat nomor berbeda, kotor, atau tidak layak jalan' },
  { value: 'DISPUTE_NO_SHOW', label: 'Driver Tidak Hadir (Mangkir)', desc: 'Driver tidak kunjung datang di titik penjemputan' },
  { value: 'OTHER', label: 'Lainnya', desc: 'Pelanggaran etika atau aturan operasional lainnya' },
];

const POS_CATEGORIES = [
  { value: 'FACILITY_AND_SERVICE', label: 'Fasilitas & Layanan Pos', desc: 'Petugas pos mangkir/tutup di jam kerja, tidak ramah' },
  { value: 'FRAUD_OR_EXTORTION', label: 'Pungli di Area Pos', desc: 'Dimintai uang parkir atau biaya titip siluman' },
  { value: 'CARGO_VIOLATION', label: 'Masalah Penitipan Barang / Kargo', desc: 'Barang titipan rusak, hilang, atau tertukar di pos' },
  { value: 'SAFETY_AND_HARASSMENT', label: 'Perilaku Petugas Pos', desc: 'Perlakuan diskriminatif, kasar, atau intimidasi' },
  { value: 'OTHER', label: 'Lainnya', desc: 'Kendala kebersihan atau fasilitas pos lainnya' },
];

const CUSTOMER_CATEGORIES = [
  { value: 'SAFETY_AND_HARASSMENT', label: 'Pelecehan & Keselamatan', desc: 'Perilaku kasar, ancaman verbal/fisik, mengganggu sopir berkendara' },
  { value: 'FRAUD_OR_EXTORTION', label: 'Kecurangan & Pelanggaran Tarif', desc: 'Menolak membayar tarif resmi, manipulasi transaksi' },
  { value: 'CARGO_VIOLATION', label: 'Pelanggaran Muatan / Barang', desc: 'Membawa barang berbahaya/terlarang atau merusak interior armada' },
  { value: 'DISPUTE_NO_SHOW', label: 'Penumpang Mangkir (No-Show)', desc: 'Penumpang tidak hadir di titik jemput hingga batas waktu berakhir' },
  { value: 'OTHER', label: 'Lainnya', desc: 'Pelanggaran etika, ketertiban umum, atau aturan operasional lainnya' },
];


export default function ReportModal({
  isOpen,
  onClose,
  targetUser,
  availableTargets = [],
  context = {},
  onSuccess,
}) {
  // Support either availableTargets array or a single targetUser
  const targets = availableTargets.length > 0
    ? availableTargets
    : targetUser
    ? [{ ...targetUser, key: 'single_target' }]
    : [];

  const [selectedTargetKey, setSelectedTargetKey] = useState(
    targets[0]?.key || 'default'
  );

  const currentTarget =
    targets.find((t) => t.key === selectedTargetKey) || targets[0] || targetUser;

  const isPosTarget =
    currentTarget?.role === 'Mitra Pos' || Boolean(currentTarget?.pickupPointId);

  const isCustomerTarget =
    currentTarget?.role === 'Customer' ||
    currentTarget?.role === 'Penumpang' ||
    currentTarget?.role === 'customer' ||
    Boolean(currentTarget?.customerId);

  const activeCategories = isPosTarget
    ? POS_CATEGORIES
    : isCustomerTarget
    ? CUSTOMER_CATEGORIES
    : DRIVER_CATEGORIES;

  const [category, setCategory] = useState(
    isPosTarget ? 'FACILITY_AND_SERVICE' : 'SAFETY_AND_HARASSMENT'
  );
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Switch category defaults when target changes, without overriding if already set appropriately
  useEffect(() => {
    if (isPosTarget) {
      setCategory((prev) =>
        POS_CATEGORIES.some((c) => c.value === prev) ? prev : 'FACILITY_AND_SERVICE'
      );
    } else if (isCustomerTarget) {
      setCategory((prev) =>
        CUSTOMER_CATEGORIES.some((c) => c.value === prev) ? prev : 'SAFETY_AND_HARASSMENT'
      );
    } else {
      setCategory((prev) =>
        DRIVER_CATEGORIES.some((c) => c.value === prev) ? prev : 'SAFETY_AND_HARASSMENT'
      );
    }
  }, [selectedTargetKey, isPosTarget, isCustomerTarget]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (targets[0]?.key) {
        setSelectedTargetKey(targets[0].key);
      }
      setCategory(
        context?.initialCategory ||
        (targets[0]?.role === 'Mitra Pos'
          ? 'FACILITY_AND_SERVICE'
          : 'SAFETY_AND_HARASSMENT')
      );
      setDescription(context?.initialDescription || '');
      setEvidenceFiles([]);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, context]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isUploading, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan sebagai bukti.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 2MB.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    try {
      const res = await reportService.uploadEvidence(file);
      const url = res.filePath || res.data?.filePath || res.url || res.data?.url;
      if (url) {
        setEvidenceFiles((prev) => [...prev, url]);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengunggah file bukti.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeEvidence = (index) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setErrorMsg('Harap isi kronologi atau rincian masalah yang Anda alami.');
      return;
    }

    if (trimmedDesc.length < 10) {
      setErrorMsg(
        `Deskripsi kronologi terlalu singkat (${trimmedDesc.length}/10 karakter). Mohon jelaskan sedikit lebih detail agar laporan dapat diinvestigasi.`
      );
      return;
    }

    const resolvedReportedUserId =
      currentTarget?.id ||
      currentTarget?.userId ||
      currentTarget?.mitraId ||
      currentTarget?.customerId ||
      currentTarget?.operatorId ||
      1;

    if (!resolvedReportedUserId && !currentTarget?.pickupPointId && !context?.pickupPointId) {
      setErrorMsg('Data pihak terlapor tidak valid atau belum dipilih.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        reportedUserId: resolvedReportedUserId,
        category,
        description: trimmedDesc,
        evidenceUrls: evidenceFiles,
        tripId: currentTarget?.tripId || context.tripId || undefined,
        orderId: currentTarget?.orderId || context.orderId || undefined,
        pickupPointId:
          currentTarget?.pickupPointId || context.pickupPointId || undefined,
      };

      const res = await reportService.createReport(payload);
      setSuccessMsg(
        'Laporan Anda berhasil dikirim dan masuk antrean investigasi resmi.'
      );
      if (onSuccess) {
        onSuccess(res.data);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          'Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={() => {
        if (!isSubmitting && !isUploading) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="report-modal-title"
                className="text-[16px] font-bold text-neutral-900"
              >
                Pusat Aduan & Laporan Pelanggaran
              </h3>
              <p className="text-[12px] text-neutral-600">
                Pilih pihak yang bermasalah dan laporkan secara objektif
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            aria-label="Tutup jendela pelaporan"
            className="w-11 h-11 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 text-neutral-800 text-[13px]">
          {/* Target Selector (Mitra Driver vs Mitra Pos Asal / Pos Tujuan) */}
          {targets.length > 1 && (
            <div>
              <span className="block text-[13px] font-semibold text-neutral-900 mb-1.5">
                Siapa yang Ingin Anda Laporkan? <span className="text-rose-600">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {targets.map((tgt) => {
                  const isSelected = selectedTargetKey === tgt.key;
                  const isPos = tgt.role === 'Mitra Pos' || Boolean(tgt.pickupPointId);
                  const isCust = tgt.role === 'Customer' || tgt.role === 'Penumpang' || tgt.role === 'customer' || Boolean(tgt.customerId);
                  return (
                    <button
                      type="button"
                      key={tgt.key}
                      onClick={() => setSelectedTargetKey(tgt.key)}
                      disabled={isSubmitting}
                      className={`min-h-[52px] p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-600 text-rose-950 font-bold shadow-xs'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-rose-600 text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {isPos ? (
                          <Building2 className="w-4 h-4" />
                        ) : isCust ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] truncate">{tgt.name}</div>
                        <div className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                          {tgt.subtitle || tgt.role}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning Banner: Anti-Defamation / Laporan Palsu */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-[12px] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Integritas Aduan:</strong> Laporan palsu atau fitnah tanpa bukti dapat mengakibatkan pengurangan poin reputasi atau penangguhan akun Anda.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[12px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[12px] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kategori Pelanggaran (Menyesuaikan Target) */}
            <div>
              <label
                htmlFor="report-category"
                className="block text-[13px] font-semibold text-neutral-900 mb-1"
              >
                Kategori Masalah ({isPosTarget ? 'Mitra Pos' : isCustomerTarget ? 'Customer / Penumpang' : 'Mitra Driver'}) <span className="text-rose-600">*</span>
              </label>
              <select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-900 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 focus-visible:outline-none text-[13px] transition"
              >
                {activeCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} ({c.desc})
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi Kronologi */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="report-description"
                  className="text-[13px] font-semibold text-neutral-900"
                >
                  Kronologi & Rincian Masalah <span className="text-rose-600">*</span>
                </label>
                <span
                  className={`text-[11px] font-medium transition ${
                    description.trim().length >= 10
                      ? 'text-emerald-600 font-semibold'
                      : description.trim().length > 0
                      ? 'text-amber-600'
                      : 'text-neutral-500'
                  }`}
                >
                  {description.trim().length >= 10
                    ? `${description.trim().length} karakter (Cukup)`
                    : description.trim().length > 0
                    ? `${description.trim().length}/10 karakter (kurang ${10 - description.trim().length} lagi)`
                    : 'Minimal 10 karakter'}
                </span>
              </div>
              <textarea
                id="report-description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                disabled={isSubmitting}
                placeholder={
                  isPosTarget
                    ? 'Jelaskan kendala pos: misalnya petugas tidak hadir di jam keberangkatan, dimintai parkir liar, atau fasilitas pos tidak aman...'
                    : isCustomerTarget
                    ? 'Jelaskan kendala customer: misalnya perilaku kasar, merusak armada, tidak membayar kekurangan ongkos, atau mengganggu keselamatan berkendara...'
                    : 'Jelaskan kendala driver: misalnya minta uang tunai tambahan, mengemudi membahayakan, atau menurunkan di luar pos tujuan...'
                }
                className="w-full p-3.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 focus-visible:outline-none text-[13px] transition leading-relaxed resize-none"
              />
            </div>

            {/* Lampiran Bukti (Upload) */}
            <div>
              <span className="block text-[13px] font-semibold text-neutral-900 mb-1.5">
                Bukti Pendukung (Foto / Screenshot)
              </span>
              <div className="space-y-2">
                {/* Preview Bukti */}
                {evidenceFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {evidenceFiles.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100"
                      >
                        <img
                          src={url.startsWith('http') ? url : `http://localhost:3000${url}`}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEvidence(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition cursor-pointer"
                          aria-label="Hapus foto bukti"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <label className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 border-2 border-dashed border-neutral-300 hover:border-emerald-500 rounded-xl text-neutral-700 text-[12px] font-medium cursor-pointer transition bg-neutral-50/50 hover:bg-emerald-50/30">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isUploading ? 'Sedang mengunggah...' : 'Pilih Foto Bukti'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading || isSubmitting}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-medium transition cursor-pointer focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 focus-visible:outline-none flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Kirim Laporan Resmi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
