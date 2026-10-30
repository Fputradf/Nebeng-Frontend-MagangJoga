import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Star,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Send,
  Link as LinkIcon,
  Bike,
  Car,
  Layers,
  Plus,
  ChevronRight
} from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import BaseModal from '../../../components/ui/BaseModal';
import { BannerSlider } from '../../../components/ui/BannerSlider';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

const DAYS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatRupiah = (value) =>
  `Rp ${Math.max(0, Math.round(value || 0)).toLocaleString('id-ID')}`;

const formatIndoDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const rawDate = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : String(dateStr);
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${day} ${months[monthIdx] || parts[1]} ${year}`;
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
};

function formatTripSchedule(dateStr, timeStr) {
  if (!dateStr) return '-';
  try {
    const rawDate = typeof dateStr === 'string' && dateStr.includes('T') ? dateStr.split('T')[0] : String(dateStr);
    const parts = rawDate.split('-');
    let dayLabel = rawDate;

    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const tripDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.round((tripDate - today) / 86400000);
      if (diffDays === 0) {
        dayLabel = 'Hari ini';
      } else if (diffDays === 1) {
        dayLabel = 'Besok';
      } else if (diffDays === -1) {
        dayLabel = 'Kemarin';
      } else {
        dayLabel = !isNaN(tripDate.getTime())
          ? tripDate.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          : rawDate;
      }
    }

    let timeLabel = '08:00';
    if (timeStr) {
      if (typeof timeStr === 'string') {
        if (timeStr.includes('T')) {
          timeLabel = timeStr.split('T')[1].substring(0, 5);
        } else if (timeStr.includes(':')) {
          timeLabel = timeStr.substring(0, 5);
        }
      } else {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          timeLabel = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }
      }
    }

    return `${dayLabel}, ${timeLabel} WIB`;
  } catch {
    return String(dateStr);
  }
}

export default function MitraDashboard() {
  const { user, mitraProfile } = useAuth();
  const toast = useToast();
  const [trips, setTrips] = useState([]);
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [wallet, setWallet] = useState({
    balance: 0,
    heldEscrowBalance: 0
  });
  const [sanctionData, setSanctionData] = useState({
    currentScore: 100,
    baseScore: 100,
    isSuspended: false,
    suspendedUntil: null,
    sanctions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeService, setActiveService] = useState('all');
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [appealModalTarget, setAppealModalTarget] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidenceUrl, setAppealEvidenceUrl] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const handleOpenAppeal = (sanction) => {
    setAppealModalTarget(sanction);
    setAppealReason('');
    setAppealEvidenceUrl('');
  };

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealModalTarget || !appealReason.trim()) {
      toast.warning('Alasan banding wajib diisi.', { title: 'Peringatan' });
      return;
    }

    setIsSubmittingAppeal(true);
    try {
      const res = await apiClient.post(`/users/me/sanctions/${appealModalTarget.id}/appeal`, {
        reason: appealReason.trim(),
        ...(appealEvidenceUrl.trim() ? { evidenceUrl: appealEvidenceUrl.trim() } : {})
      });
      toast.success(res.data?.message || 'Banding berhasil diajukan.', { title: 'Sukses' });
      setAppealModalTarget(null);

      // Refresh sanctions
      const freshSanctions = await apiClient.get('/users/me/sanctions').catch(() => ({ data: null }));
      if (freshSanctions?.data) {
        setSanctionData(freshSanctions.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengajukan banding.', { title: 'Gagal' });
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const mitraName = mitraProfile?.name || user?.name || 'Mitra';

  useEffect(() => {
    let isMounted = true;

    const fetchMitraData = async () => {
      setIsLoading(true);
      try {
        const [resMyTrips, resWallet, resRating, resSanctions] = await Promise.all([
          apiClient.get('/trips/me', { params: { limit: 50 } }).catch(() => ({ data: [] })),
          apiClient.get('/wallets/me').catch(() => ({
            data: { balance: 0, heldEscrowBalance: 0 }
          })),
          apiClient.get('/reviews/me').catch(() => ({
            data: { averageRating: 0, totalReviews: 0, reviews: [] }
          })),
          apiClient.get('/users/me/sanctions').catch(() => ({
            data: { currentScore: 100, baseScore: 100, isSuspended: false, suspendedUntil: null, sanctions: [] }
          })),
        ]);

        const rawTrips = Array.isArray(resMyTrips.data?.data)
          ? resMyTrips.data.data
          : Array.isArray(resMyTrips.data)
          ? resMyTrips.data
          : [];
        const ratingData = resRating.data || { averageRating: 0, totalReviews: 0, reviews: [] };
        const reviewsList = Array.isArray(ratingData.reviews) ? ratingData.reviews : [];

        const mappedTrips = rawTrips.map((trip) => {
          const tripReview = reviewsList.find(
            (rev) => String(rev.tripId) === String(trip.id)
          );
          return {
            ...trip,
            rating: tripReview ? tripReview.rating : null
          };
        });

        if (isMounted) {
          setTrips(mappedTrips);
          setWallet(resWallet.data || { balance: 0, heldEscrowBalance: 0 });
          setRatingStats({
            averageRating: ratingData.averageRating || 0,
            totalReviews: ratingData.totalReviews ?? ratingData.totalReviewa ?? 0
          });
          if (resSanctions?.data) {
            setSanctionData(resSanctions.data);
          }
        }
      } catch (err) {
        console.error('Gagal memuat data dashboard mitra:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMitraData();

    const handleFocus = () => fetchMitraData();
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const filteredTrips = trips.filter(t => {
    if (activeService === 'all') return true;
    const rawType = (t.serviceType || '').toLowerCase();
    const vehicleType = (t.vehicleType || t.vehicle?.type || '').toLowerCase();
    
    if (activeService === 'barang') {
       return rawType === 'barang' || (!rawType && Number(t.maxWeightCapacityKg) > 15);
    }
    if (activeService === 'motor') {
       return rawType === 'motor' || (!rawType && vehicleType === 'motor');
    }
    if (activeService === 'mobil') {
       return rawType === 'mobil' || (!rawType && vehicleType === 'mobil');
    }
    return true;
  });

  const upcomingTrips = filteredTrips
    .filter(
      (t) =>
        t.status === 'scheduled' ||
        t.status === 'in_origin_pos' ||
        t.status === 'in_transit' ||
        t.status === 'arrived_dest_pos'
    )
    .sort((a, b) => {
      const activeWeight = {
        in_transit: 1,
        in_origin_pos: 2,
        arrived_dest_pos: 3,
        scheduled: 4,
      };
      const weightA = activeWeight[a.status] || 99;
      const weightB = activeWeight[b.status] || 99;
      if (weightA !== weightB) return weightA - weightB;
      return new Date(a.departureDate || 0) - new Date(b.departureDate || 0);
    })
    .slice(0, 3);

  const recentHistory = filteredTrips
    .filter((t) => t.status === 'completed')
    .sort((a, b) => {
      const dateA = new Date(a.departureDate || a.updatedAt || 0).getTime();
      const dateB = new Date(b.departureDate || b.updatedAt || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return Number(b.id) - Number(a.id);
    })
    .slice(0, 3);

  const availableBalance = Number(wallet.balance || 0);
  const escrowHold = Number(wallet.heldEscrowBalance || 0);
  const totalWallet = availableBalance + escrowHold;

  const ratingDisplay = ratingStats.totalReviews > 0 
    ? `${Number(ratingStats.averageRating).toFixed(1)} / 5.0` 
    : 'Belum ada rating';
  const ratingSubtitle = ratingStats.totalReviews > 0
    ? `Berdasarkan ${ratingStats.totalReviews} ulasan`
    : 'Belum ada ulasan perjalanan';

  const serviceCategories = [
    { id: 'all', label: 'Semua Layanan', icon: Layers, desc: 'Semua moda transportasi' },
    { id: 'motor', label: 'Nebeng Motor', icon: Bike, desc: 'Trip roda dua & penumpang' },
    { id: 'mobil', label: 'Nebeng Mobil', icon: Car, desc: 'Trip mobil berpenumpang' },
    { id: 'barang', label: 'Nebeng Barang', icon: Package, desc: 'Titip barang & ekspedisi' },
  ];

  const serviceCounts = useMemo(() => {
    return {
      all: trips.length,
      motor: trips.filter(t => {
        const rawType = (t.serviceType || '').toLowerCase();
        const vehicleType = (t.vehicleType || t.vehicle?.type || '').toLowerCase();
        return rawType === 'motor' || (!rawType && vehicleType === 'motor');
      }).length,
      mobil: trips.filter(t => {
        const rawType = (t.serviceType || '').toLowerCase();
        const vehicleType = (t.vehicleType || t.vehicle?.type || '').toLowerCase();
        return rawType === 'mobil' || (!rawType && vehicleType === 'mobil');
      }).length,
      barang: trips.filter(t => {
        const rawType = (t.serviceType || '').toLowerCase();
        return rawType === 'barang' || (!rawType && Number(t.maxWeightCapacityKg) > 15);
      }).length,
    };
  }, [trips]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Ringkasan Aktivitas Mitra</h1>
            <p className="mt-1 text-sm text-blue-100">Kelola trip mendatang, pantau riwayat perjalanan, statistik rating, dan total saldo dompet Anda.</p>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white/15 border border-white/25 rounded-full backdrop-blur shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">STATUS MITRA</p>
              <p className="text-[13px] font-bold text-white">Aktif & Terverifikasi</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>
      <BannerSlider role="mitra" />

      {/* ── BANNER PERINGATAN SANKSI JIKA AKTIF ── */}
      {sanctionData.isSuspended ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[14px] font-bold">Akun Anda Dalam Masa Penangguhan (Suspensi)</p>
              <p className="text-[12px] text-rose-600">
                Skor integritas Anda terpotong. Anda tidak dapat membuat jadwal trip baru
                {sanctionData.suspendedUntil && ` sampai ${new Date(sanctionData.suspendedUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSanctionModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-xl shadow-sm transition shrink-0 text-center cursor-pointer"
          >
            Lihat Sanksi & Banding
          </button>
        </div>
      ) : (sanctionData.currentScore < 100) ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[14px] font-bold">Perhatian: Terjadi Pemotongan Skor Integritas</p>
              <p className="text-[12px] text-amber-700">
                Skor reputasi Anda saat ini {sanctionData.currentScore} / {sanctionData.baseScore || 100}. Hindari pembatalan mendadak atau ajukan banding jika mengalami kendala darurat.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSanctionModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-xl shadow-sm transition shrink-0 text-center cursor-pointer"
          >
            Riwayat Sanksi
          </button>
        </div>
      ) : null}

      {/* ── KATEGORI & FILTER LAYANAN MITRA ── */}
      <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-bold text-neutral-800">Kategori Layanan Mitra</h2>
            <p className="text-[12px] text-neutral-500">Filter cepat ringkasan trip & riwayat berdasarkan moda transportasi</p>
          </div>
          {activeService !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveService('all')}
              className="text-[12px] font-bold text-brand-600 hover:text-brand-700 hover:underline self-start sm:self-auto cursor-pointer focus-visible:outline-none"
            >
              Tampilkan Semua ({serviceCounts.all})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="tablist" aria-label="Filter Layanan Mitra">
          {serviceCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeService === cat.id;
            const count = serviceCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveService(isSelected && cat.id !== 'all' ? 'all' : cat.id)}
                className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 min-h-[102px] ${
                  isSelected
                    ? 'bg-blue-50/70 border-2 border-brand-600 shadow-xs'
                    : 'bg-white hover:bg-neutral-50/90 border border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 group-hover:bg-brand-50 group-hover:text-brand-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200'
                    }`}
                  >
                    {count} Trip
                  </span>
                </div>
                <div>
                  <h3
                    className={`text-[14px] font-bold ${
                      isSelected ? 'text-brand-900' : 'text-neutral-800'
                    }`}
                  >
                    {cat.label}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {cat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── METRIK RINGKASAN MITRA ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* TOTAL SALDO WALLET */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-brand-600">
              <Wallet className="w-5 h-5" />
            </div>
            <Link
              to="/mitra/balance"
              className="text-[12px] font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-0.5"
            >
              Kelola Saldo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Saldo Wallet</p>
            <p className="text-[26px] font-bold text-neutral-800 leading-tight mt-0.5">
              {formatRupiah(totalWallet)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Siap ditarik: <strong className="text-emerald-600 font-semibold">{formatRupiah(availableBalance)}</strong></span>
            <span className="text-neutral-300">·</span>
            <span>Tertahan: <strong className="text-amber-600 font-semibold">{formatRupiah(escrowHold)}</strong></span>
          </div>
        </div>

        {/* STATISTIK RATING MITRA */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            {ratingStats.totalReviews > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                {ratingStats.totalReviews} Ulasan
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Statistik Rating Mitra</p>
            <p className="text-[26px] font-bold text-neutral-800 leading-tight mt-0.5">
              {ratingDisplay}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{ratingSubtitle}</span>
          </div>
        </div>

        {/* REPUTASI & SANKSI POIN */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowSanctionModal(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowSanctionModal(true); } }}
          className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-left"
          title="Klik untuk melihat riwayat sanksi & skor integritas"
        >
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-xl ${
              sanctionData?.isSuspended ? 'bg-rose-50 text-rose-600' :
              (sanctionData?.currentScore ?? 100) >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              sanctionData?.isSuspended ? 'bg-rose-100 text-rose-700' :
              (sanctionData?.currentScore ?? 100) >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {sanctionData?.isSuspended ? 'Suspensi' : 'Status Prima'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Reputasi & Sanksi Poin</p>
            <p className="text-[26px] font-bold text-neutral-800 leading-tight mt-0.5">
              {sanctionData?.currentScore ?? 100}
              <span className="text-[14px] font-medium text-neutral-400 ml-1.5">/ {sanctionData?.baseScore || 100}</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
            <span className={
              sanctionData?.isSuspended ? 'text-rose-600 font-semibold' :
              (sanctionData?.currentScore ?? 100) >= 80 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'
            }>
              {sanctionData?.isSuspended
                ? 'Akun Sedang Tersuspensi'
                : (sanctionData?.currentScore ?? 100) >= 80
                ? 'Integritas Sangat Baik'
                : 'Peringatan Pemotongan Poin'}
            </span>
            <span className="text-brand-600 font-semibold group-hover:underline flex items-center">
              Detail <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* ── AKTIVITAS TRIP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ringkasan Trip Mendatang */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-brand-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="text-[17px] font-bold text-neutral-800">
                  Ringkasan Trip Mendatang
                </h2>
              </div>
              <Link
                to="/mitra/trip"
                className="text-[12px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
              >
                Lihat Semua
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {isLoading ? (
                <div className="text-[13px] text-neutral-400 p-3">
                  Memuat data trip...
                </div>
              ) : upcomingTrips.length === 0 ? (
                <div className="text-center py-6 px-4 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-brand-600 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-800">Belum Ada Trip Mendatang</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                      Jadwalkan trip baru untuk mulai menerima penumpang atau titipan barang.
                    </p>
                  </div>
                  <Link
                    to="/mitra/trip"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Buat Jadwal Trip Baru
                  </Link>
                </div>
              ) : (
                upcomingTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 hover:bg-neutral-100/60 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-neutral-800 font-mono">
                        TRIP-{trip.id}
                      </span>

                      {trip.status === 'in_transit' ? (
                        <StatusBadge variant="amber">
                          Dalam Perjalanan
                        </StatusBadge>
                      ) : trip.status === 'in_origin_pos' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Stand-by di Pos
                        </span>
                      ) : trip.status === 'arrived_dest_pos' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tiba di Tujuan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-brand-700 border border-brand-200">
                          Dijadwalkan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-800">
                      <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span>
                        {trip.originPoint?.name || 'Asal'} &rarr;{' '}
                        {trip.destinationPoint?.name || 'Tujuan'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[12px] text-neutral-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {formatTripSchedule(
                          trip.departureDate,
                          trip.departureTime
                        )}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-neutral-700">
                        {trip.serviceType === 'barang' ? (
                          <>
                            <Package className="w-3 h-3 text-brand-600" />
                            {trip.remainingWeightCapacityKg ?? trip.maxWeightCapacityKg ?? 0} Kg Sisa
                          </>
                        ) : (
                          <>
                            <span className="text-brand-600 font-bold text-[12px]">Kursi:</span>
                            {trip.seatAvailable ?? 0} Sisa
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Riwayat Perjalanan */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h2 className="text-[17px] font-bold text-neutral-800">
                  Ringkasan Trip Selesai
                </h2>
              </div>
              <Link
                to="/mitra/trip"
                className="text-[12px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
              >
                Lihat Semua
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {isLoading ? (
                <div className="text-[13px] text-neutral-400 p-3">
                  Memuat riwayat...
                </div>
              ) : recentHistory.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Belum Ada Trip Selesai"
                  description="Riwayat akan muncul di sini setelah trip pertama Anda selesai."
                />
              ) : (
                recentHistory.map((history) => (
                  <div
                    key={history.id}
                    className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 hover:bg-neutral-100/60 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-neutral-800 font-mono">
                        TRIP-{history.id}
                      </span>
                      <span className="text-[13px] font-bold text-emerald-600 font-mono">
                        {formatRupiah(history.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-800">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>
                        {history.originPoint?.name || 'Asal'} &rarr;{' '}
                        {history.destinationPoint?.name || 'Tujuan'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[12px] text-neutral-500 font-medium">
                      <span>
                        {formatIndoDate(history.departureDate)}
                      </span>
                      {history.rating ? (
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{Number(history.rating).toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-400 italic">
                          Belum ada ulasan
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL RIWAYAT SANKSI & SKOR INTEGRITAS MITRA ── */}
      <BaseModal
        isOpen={showSanctionModal}
        onClose={() => setShowSanctionModal(false)}
        title="Riwayat Sanksi & Skor Integritas"
        subtitle="Informasi status reputasi, daftar pelanggaran, dan pengajuan banding"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-[13px] pt-1">
          {/* Ringkasan Skor & Status */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Status Akun</p>
              <p className="text-[14px] font-bold text-neutral-800">
                {sanctionData.isSuspended ? (
                  <span className="text-rose-600 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Akun Dalam Masa Suspensi
                  </span>
                ) : sanctionData.currentScore < 100 ? (
                  <span className="text-amber-600 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> Peringatan Pemotongan Skor
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Aktif & Bereputasi Baik
                  </span>
                )}
              </p>
              {sanctionData.suspendedUntil && (
                <p className="text-[11px] text-rose-500 mt-0.5">
                  Suspensi sampai: {new Date(sanctionData.suspendedUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Skor Integritas</p>
              <p className={`text-[22px] font-extrabold ${
                sanctionData.currentScore >= 80 ? 'text-emerald-600' :
                sanctionData.currentScore >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {sanctionData.currentScore} <span className="text-[13px] text-neutral-400 font-normal">/ {sanctionData.baseScore || 100}</span>
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-neutral-600 text-[12px] leading-relaxed">
            Skor integritas awal setiap mitra adalah 100 poin. Pemotongan skor terjadi otomatis saat terjadi pembatalan trip atau ketidakhadiran (no-show). Jika pembatalan terjadi karena kendala darurat (force majeure) yang disertai bukti sah, Anda dapat mengajukan banding agar sanksi ditinjau ulang oleh Admin.
          </div>

          {/* Daftar Sanksi */}
          <div className="space-y-3">
            <h4 className="text-[14px] font-bold text-neutral-800">Daftar Sanksi Pelanggaran</h4>
            {(!sanctionData.sanctions || sanctionData.sanctions.length === 0) ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Rekam jejak bersih. Anda belum pernah menerima sanksi atau pemotongan skor reputasi.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {sanctionData.sanctions.map((s) => {
                  const latestAppeal = s.appeals?.[0];
                  const isWaived = s.status === 'WAIVED';

                  return (
                    <div key={s.id} className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                            isWaived ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.violationType === 'MITRA_CANCEL_EARLY' ? 'Batal Awal' :
                             s.violationType === 'MITRA_CANCEL_LATE' ? 'Batal Mendadak' :
                             s.violationType === 'MITRA_NO_SHOW' ? 'Tidak Hadir (No-Show)' : s.violationType}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isWaived ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isWaived ? 'Sanksi Dicabut' : `-${s.scoreDeduction} Poin`}
                          </span>
                          {s.isSuspended && !isWaived && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                              Suspensi
                            </span>
                          )}
                        </div>
                      </div>

                      {s.tripDetails && (
                        <div className="text-[12px] text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 flex items-center justify-between flex-wrap gap-2">
                          <span>Trip #{s.tripDetails.id}: <strong>{s.tripDetails.from} &rarr; {s.tripDetails.to}</strong></span>
                          <span className="text-[11px] text-neutral-400">{s.tripDetails.date ? s.tripDetails.date.split('T')[0] : ''}</span>
                        </div>
                      )}

                      {/* Status Banding */}
                      {isWaived ? (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-[12px] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Sanksi ini telah dicabut oleh Admin Regional dan skor integritas telah dikembalikan.</span>
                        </div>
                      ) : latestAppeal ? (
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-[12px]">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-neutral-800">Status Banding Anda:</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              latestAppeal.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              latestAppeal.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {latestAppeal.status === 'APPROVED' ? 'Disetujui' :
                               latestAppeal.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Review Admin'}
                            </span>
                          </div>

                          <p className="text-neutral-600">
                            <strong>Alasan:</strong> &ldquo;{latestAppeal.reason}&rdquo;
                          </p>

                          {latestAppeal.evidenceUrl && (
                            <div>
                              <a
                                href={latestAppeal.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline text-[11px] inline-flex items-center gap-1 font-bold"
                              >
                                Lihat Bukti Lampiran &rarr;
                              </a>
                            </div>
                          )}

                          {latestAppeal.adminNote && (
                            <div className="p-2 bg-white rounded border border-neutral-200 text-neutral-700 text-[11px]">
                              <strong>Catatan Admin:</strong> {latestAppeal.adminNote}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                          <p className="text-[11px] text-neutral-400 italic">
                            Belum ada pengajuan banding untuk sanksi ini.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenAppeal(s)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold transition cursor-pointer shadow-xs"
                          >
                            Ajukan Banding
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </BaseModal>

      {/* ── MODAL AJUKAN BANDING SANKSI MITRA ── */}
      <BaseModal
        isOpen={Boolean(appealModalTarget)}
        onClose={() => { if (!isSubmittingAppeal) setAppealModalTarget(null); }}
        title="Ajukan Banding Sanksi"
        subtitle={'Sanksi #' + (appealModalTarget ? appealModalTarget.id : '')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitAppeal} className="space-y-4 pt-1">
          {/* Header Card Bergaya Sidebar Biru */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] p-4 text-white shadow-md">
            <div className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute bottom-0 right-16 h-16 w-16 rounded-full bg-cyan-400/20 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  TATA KELOLA INTEGRITAS & BANDING
                </span>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] font-mono font-bold text-white border border-white/25">
                  ID: #{appealModalTarget?.id}
                </span>
              </div>
              <h4 className="text-[16px] font-bold text-white">
                Permohonan Banding Sanksi
              </h4>
              <p className="text-[11px] text-blue-100/90 mt-0.5 leading-relaxed">
                Jelaskan kendala darurat yang dialami dan lampirkan bukti pendukung untuk ditinjau oleh Admin Wilayah.
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-[12px] flex items-start gap-2.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#10367D] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Jika pembatalan trip terjadi karena <strong>force majeure / kendala darurat</strong> dengan bukti sah, Admin Wilayah dapat menyetujui banding untuk mencabut sanksi dan memulihkan skor reputasi Anda.
            </p>
          </div>

          {/* Field: Alasan & Kronologi */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[12px] font-bold text-neutral-700">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#10367D]" />
                Alasan & Kronologi Banding
              </span>
              <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide">Wajib Diisi</span>
            </label>
            <textarea
              required
              rows={3}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Tuliskan secara lengkap kronologi kendala darurat, alasan pembatalan, atau kendala kendaraan Anda..."
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-[13px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D] focus:border-[#10367D] bg-white transition shadow-2xs"
            />
          </div>

          {/* Field: Bukti Foto / Dokumen */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[12px] font-bold text-neutral-700">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#10367D]" />
                Tautan Bukti Dokumen / Foto
              </span>
              <span className="text-[10px] font-semibold text-neutral-400">Opsional</span>
            </label>
            <input
              type="url"
              value={appealEvidenceUrl}
              onChange={(e) => setAppealEvidenceUrl(e.target.value)}
              placeholder="https://contoh.com/foto-bukti-bengkel.jpg"
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-[13px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D] focus:border-[#10367D] bg-white transition shadow-2xs"
            />
            <p className="text-[11px] text-neutral-400">
              Masukkan tautan Google Drive publik, link gambar kuitansi bengkel, atau surat dokter.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmittingAppeal}
              onClick={() => setAppealModalTarget(null)}
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-[13px] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingAppeal}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] hover:brightness-110 text-white rounded-xl font-bold text-[13px] transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {isSubmittingAppeal ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Banding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}