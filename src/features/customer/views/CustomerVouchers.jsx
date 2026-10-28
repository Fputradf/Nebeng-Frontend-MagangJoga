import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag,
  Copy,
  Check,
  Search,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  RotateCw,
  ShoppingBag,
  Car,
  Package,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import BaseModal from '../../../components/ui/BaseModal';
import { voucherService } from '../../../services/voucherService';

const formatRp = (value) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CustomerVouchers() {
  const navigate = useNavigate();
  const toast = useToast();

  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PASSENGER' | 'PARCEL'
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // Redeem Code State
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');

  // Load Vouchers
  useEffect(() => {
    let ignore = false;

    voucherService
      .getMyVouchers()
      .then((data) => {
        if (!ignore) {
          setVouchers(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Gagal memuat voucher customer:', err);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await voucherService.getMyVouchers();
      setVouchers(Array.isArray(data) ? data : []);
      toast.success('Daftar voucher berhasil diperbarui.');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal menyegarkan voucher.';
      toast.error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRedeemVoucher = async (e) => {
    e?.preventDefault();
    const code = redeemCode.trim().toUpperCase();
    if (!code) {
      setRedeemError('Silakan masukkan kode voucher terlebih dahulu.');
      return;
    }

    setIsRedeeming(true);
    setRedeemError('');
    try {
      const res = await voucherService.redeemVoucher(code);
      toast.success(res?.message || `Voucher ${code} berhasil diklaim!`);
      setRedeemCode('');
      // Refresh list to show newly claimed voucher
      const data = await voucherService.getMyVouchers();
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err) {
      const rawMsg = err.response?.data?.message || err.message || 'Gagal mengklaim voucher.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
      setRedeemError(msg);
      toast.error(msg);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopyCode = (code, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Kode voucher ${code} berhasil disalin!`);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2500);
  };

  const handleUseVoucher = (voucher, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(voucher.code);
    toast.success(`Kode ${voucher.code} disalin. Silakan tempelkan pada formulir pemesanan trip!`);
    navigate('/customer/booking');
  };

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (v.code && v.code.toLowerCase().includes(q)) ||
        (v.title && v.title.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q));

      const matchesTab =
        activeTab === 'ALL' ||
        (activeTab === 'PASSENGER' && (!v.appliesTo || v.appliesTo === 'passenger')) ||
        (activeTab === 'PARCEL' && (!v.appliesTo || v.appliesTo === 'parcel'));

      const matchesAvailability = !onlyAvailable || v.isAvailable;

      return matchesSearch && matchesTab && matchesAvailability;
    });
  }, [vouchers, searchQuery, activeTab, onlyAvailable]);

  const availableCount = useMemo(() => {
    return vouchers.filter((v) => v.isAvailable).length;
  }, [vouchers]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-sans">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> PROMO & DISKON PERJALANAN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Voucher Saya
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Gunakan voucher promosi resmi Nebeng untuk mendapatkan potongan tarif tiket perjalanan atau pengiriman paket.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Stat Pill: Siap Digunakan */}
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-accent text-brand-900 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 text-brand-900" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">
                  Siap Digunakan
                </div>
                <div className="text-lg font-black text-white">
                  {availableCount} Voucher
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="p-3 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl backdrop-blur text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              title="Segarkan daftar voucher"
            >
              <RotateCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── KLAIM KODE VOUCHER SECTION ── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-card border border-neutral-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-[#10367D] shrink-0 shadow-xs">
              <Gift className="w-6 h-6 text-[#10367D]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-800">
                Punya Kode Promo / Voucher Khusus?
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
                Klaim kode voucher unik promo untuk langsung ditambahkan ke koleksi voucher Anda. Voucher dengan kode redeem hanya dapat diklaim 1 kali per akun.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleRedeemVoucher}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto"
          >
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => {
                  setRedeemCode(e.target.value.toUpperCase());
                  if (redeemError) setRedeemError('');
                }}
                placeholder="Masukkan kode promo..."
                disabled={isRedeeming}
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-bold tracking-wider placeholder:font-sans placeholder:font-normal focus:outline-none focus:bg-white transition ${
                  redeemError
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-slate-300 focus:border-[#10367D]'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={isRedeeming || !redeemCode.trim()}
              className="px-5 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isRedeeming ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengklaim...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Klaim Voucher</span>
                </>
              )}
            </button>
          </form>
        </div>

        {redeemError && (
          <div className="mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-medium">{redeemError}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-neutral-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Tab Layanan */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white text-[#10367D] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Voucher
          </button>
          <button
            onClick={() => setActiveTab('PASSENGER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PASSENGER'
                ? 'bg-white text-[#10367D] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Penumpang</span>
          </button>
          <button
            onClick={() => setActiveTab('PARCEL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PARCEL'
                ? 'bg-white text-[#10367D] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Kirim Barang</span>
          </button>
        </div>

        {/* Search & Only Available Checkbox */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode atau judul voucher..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#10367D] focus:bg-white transition"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none px-1">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span>Hanya yang siap pakai</span>
          </label>
        </div>
      </div>

      {/* Grid Voucher Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card space-y-3">
              <Skeleton className="h-6 w-1/3 rounded-md" />
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <div className="pt-2 flex justify-between">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-card">
          <EmptyState
            icon={Tag}
            title={vouchers.length === 0 ? 'Belum Ada Voucher Tersedia' : 'Voucher Tidak Ditemukan'}
            description={
              vouchers.length === 0
                ? 'Nantikan berbagai program promosi dan voucher diskon menarik dari Nebeng segera.'
                : 'Coba ubah kata kunci pencarian Anda atau matikan filter.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVouchers.map((voucher) => {
            const isPercentage = voucher.discountType === 'percentage';
            const isUsable = voucher.isAvailable;

            return (
              <div
                key={voucher.id}
                onClick={() => setSelectedVoucher(voucher)}
                className={`relative bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-card-hover group ${
                  isUsable
                    ? 'border-neutral-200 hover:border-blue-300'
                    : 'border-neutral-200/80 opacity-75 bg-slate-50/50'
                }`}
              >
                {/* Header Card / Diskon Highlight */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-[#10367D] tracking-tight">
                        {isPercentage ? `${voucher.discountValue}% OFF` : formatRp(voucher.discountValue)}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        Min. Transaksi {formatRp(voucher.minOrderAmount)}
                      </div>
                    </div>

                    {/* Status & Acquisition Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {voucher.quotaExceeded ? (
                        <span className="text-[11px] font-bold text-rose-600">Kuota Habis</span>
                      ) : voucher.userLimitReached ? (
                        <span className="text-[11px] font-bold text-slate-400">Sudah Dipakai</span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600">Tersedia</span>
                      )}

                      {voucher.claimType === 'code_redemption' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                          <Gift className="w-3 h-3 text-blue-600" />
                          Hasil Klaim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Tag className="w-3 h-3 text-slate-400" />
                          Platform
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Judul & Deskripsi */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-[14px] leading-snug group-hover:text-[#10367D] transition-colors">
                      {voucher.title}
                    </h3>
                    {voucher.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {voucher.description}
                      </p>
                    )}
                  </div>

                  {/* Syarat Khusus Ringkas */}
                  <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5 text-xs text-slate-600">
                    {isPercentage && voucher.maxDiscountAmount && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Maks. potongan: <strong>{formatRp(voucher.maxDiscountAmount)}</strong></span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {voucher.appliesTo === 'passenger' ? (
                        <>
                          <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-blue-700">Khusus Penumpang</span>
                        </>
                      ) : voucher.appliesTo === 'parcel' ? (
                        <>
                          <Package className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span className="font-semibold text-slate-700">Khusus Kirim Barang</span>
                        </>
                      ) : (
                        <>
                          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Berlaku untuk semua layanan</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Berlaku s/d {formatDate(voucher.validUntil)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Kupon: Kode Voucher & Action Button */}
                <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs uppercase px-2.5 py-1 bg-white border border-slate-300 rounded-lg tracking-wider text-slate-800">
                      {voucher.code}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(voucher.code, e)}
                      title="Salin kode voucher"
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition cursor-pointer"
                    >
                      {copiedCode === voucher.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isUsable ? (
                    <button
                      type="button"
                      onClick={(e) => handleUseVoucher(voucher, e)}
                      className="px-3 py-1.5 bg-[#10367D] hover:bg-[#0C2C66] text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Pakai</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">Tidak tersedia</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail Voucher */}
      {selectedVoucher && (
        <BaseModal
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          title={selectedVoucher.title}
          subtitle={`Kode Voucher: ${selectedVoucher.code}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {/* Banner Nilai Diskon */}
            <div className="p-4 rounded-xl border border-slate-200 text-center space-y-1">
              <div className="text-2xl font-black text-[#10367D]">
                {selectedVoucher.discountType === 'percentage'
                  ? `Diskon ${selectedVoucher.discountValue}%`
                  : `Potongan ${formatRp(selectedVoucher.discountValue)}`}
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Minimal pesanan {formatRp(selectedVoucher.minOrderAmount)}
              </p>
            </div>

            {/* Kode Promo Box */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kode Promo</span>
                <span className="font-mono font-bold text-sm text-slate-800 tracking-wider">
                  {selectedVoucher.code}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleCopyCode(selectedVoucher.code, e)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedCode === selectedVoucher.code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
            </div>

            {/* Rincian Ketentuan */}
            <div className="space-y-2 pt-2 border-t border-slate-200 text-slate-700">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#10367D]" />
                <span>Syarat & Ketentuan Penggunaan</span>
              </h4>

              <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                {selectedVoucher.description && (
                  <li>{selectedVoucher.description}</li>
                )}
                <li>
                  Metode perolehan:{' '}
                  <strong>
                    {selectedVoucher.claimType === 'code_redemption'
                      ? 'Klaim Kode Promo (1x per pengguna)'
                      : 'Langsung dari Platform (Tanpa Klaim)'}
                  </strong>
                </li>
                <li>
                  Berlaku untuk:{' '}
                  <strong>
                    {!selectedVoucher.appliesTo
                      ? 'Semua Layanan (Penumpang & Kirim Barang)'
                      : selectedVoucher.appliesTo === 'passenger'
                      ? 'Layanan Perjalanan Penumpang Saja'
                      : 'Layanan Pengiriman Barang Saja'}
                  </strong>
                </li>
                {selectedVoucher.discountType === 'percentage' && selectedVoucher.maxDiscountAmount && (
                  <li>
                    Maksimal nilai potongan diskon sebesar{' '}
                    <strong>{formatRp(selectedVoucher.maxDiscountAmount)}</strong>.
                  </li>
                )}
                <li>
                  Minimal total pesanan (subtotal):{' '}
                  <strong>{formatRp(selectedVoucher.minOrderAmount)}</strong>.
                </li>
                <li>
                  Batas pemakaian:{' '}
                  <strong>Maksimal {selectedVoucher.usagePerUserLimit || 1} kali</strong> per akun pengguna.
                  {selectedVoucher.userUsageCount > 0 && (
                    <span className="text-blue-700 block text-[11px]">
                      (Anda telah memakai voucher ini sebanyak {selectedVoucher.userUsageCount} kali).
                    </span>
                  )}
                </li>
                <li>
                  Periode promo:{' '}
                  <strong>
                    {formatDate(selectedVoucher.validFrom)} s/d {formatDate(selectedVoucher.validUntil)}
                  </strong>.
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              {selectedVoucher.isAvailable && (
                <button
                  type="button"
                  onClick={(e) => handleUseVoucher(selectedVoucher, e)}
                  className="flex-1 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Gunakan Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
