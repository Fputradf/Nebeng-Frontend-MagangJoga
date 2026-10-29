import { useState, useEffect } from 'react';
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
  Link as LinkIcon
} from 'lucide-react';
import StatCard from '../../../components/ui/StatCard';
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

function formatTripSchedule(dateStr, timeStr) {
  if (!dateStr) return '-';

  const tripDate = new Date(`${dateStr.split('T')[0]}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((tripDate - today) / 86400000);
  let dayLabel;

  if (diffDays === 0) {
    dayLabel = 'Hari ini';
  } else if (diffDays === 1) {
    dayLabel = 'Besok';
  } else {
    dayLabel = tripDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  return `${dayLabel}, ${
    timeStr ? timeStr.split('T')[1]?.substring(0, 5) : '08:00'
  } WIB`;
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
          apiClient.get('/trips/me').catch(() => ({ data: [] })),
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

        const rawTrips = resMyTrips.data?.data || resMyTrips.data || [];
        const ratingData = resRating.data || { averageRating: 0, totalReviews: 0, reviews: [] };
        const reviewsList = ratingData.reviews || [];

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
       return Number(t.maxWeightCapacityKg) > 15 || rawType === 'barang';
    }
    if (activeService === 'motor') {
       return rawType === 'motor' || vehicleType === 'motor';
    }
    if (activeService === 'mobil') {
       return rawType === 'mobil' || vehicleType === 'mobil';
    }
    return true;
  });

  const upcomingTrips = filteredTrips
    .filter(
      (t) => t.status === 'scheduled' || t.status === 'in_transit' || t.status === 'in_origin_pos'
    )
    .slice(0, 2);

  const recentHistory = filteredTrips
    .filter((t) => t.status === 'completed')
    .sort((a, b) => Number(b.id) - Number(a.id))
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

      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200">
        <h2 className="text-[17px] font-extrabold text-neutral-800 mb-4 uppercase tracking-tight">Layanan Kami</h2>
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center gap-2 hover:opacity-80 transition cursor-pointer" onClick={() => setActiveService(activeService === 'motor' ? 'all' : 'motor')}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition ${activeService === 'motor' ? 'bg-[#262160]' : 'bg-neutral-300'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
            <span className={`text-[13px] font-bold ${activeService === 'motor' ? 'text-[#262160]' : 'text-neutral-500'}`}>Nebeng Motor</span>
          </button>
          <button className="flex flex-col items-center gap-2 hover:opacity-80 transition cursor-pointer" onClick={() => setActiveService(activeService === 'mobil' ? 'all' : 'mobil')}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition ${activeService === 'mobil' ? 'bg-[#262160]' : 'bg-neutral-300'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <span className={`text-[13px] font-bold ${activeService === 'mobil' ? 'text-[#262160]' : 'text-neutral-500'}`}>Nebeng Mobil</span>
          </button>
          <button className="flex flex-col items-center gap-2 hover:opacity-80 transition cursor-pointer" onClick={() => setActiveService(activeService === 'barang' ? 'all' : 'barang')}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition ${activeService === 'barang' ? 'bg-[#262160]' : 'bg-neutral-300'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <span className={`text-[13px] font-bold ${activeService === 'barang' ? 'text-[#262160]' : 'text-neutral-500'}`}>Nebeng Barang</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="TOTAL SALDO WALLET"
          value={formatRupiah(totalWallet)}
          subtitle={`${formatRupiah(availableBalance)} siap ditarik, ${formatRupiah(escrowHold)} tertahan (escrow)`}
          icon={Wallet}
        />
        <StatCard
          title="STATISTIK RATING MITRA"
          value={ratingDisplay}
          subtitle={ratingSubtitle}
          icon={Star}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowSanctionModal(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowSanctionModal(true); } }}
          className="cursor-pointer transition hover:opacity-95 text-left"
          title="Klik untuk melihat riwayat sanksi & skor integritas"
        >
          <StatCard
            title="REPUTASI & SANKSI POIN"
            value={`${sanctionData?.currentScore ?? 100} / ${sanctionData?.baseScore || 100}`}
            subtitle={
              sanctionData?.isSuspended
                ? 'Akun Sedang Tersuspensi'
                : (sanctionData?.currentScore ?? 100) >= 80
                ? 'Integritas Sangat Baik'
                : 'Peringatan Pemotongan Poin'
            }
            icon={ShieldAlert}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: `${PRIMARY_ACCENT}18`,
                  color: PRIMARY_COLOR
                }}
              >
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                Ringkasan Trip Mendatang
              </h2>
            </div>
            <Link
              to="/mitra/trip"
              className="text-[12px] font-bold hover:underline flex items-center gap-0.5"
              style={{ color: PRIMARY_COLOR }}
            >
              Lihat Semua
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-[13px] text-neutral-400 p-3">
                Memuat data trip...
              </div>
            ) : upcomingTrips.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Belum Ada Trip Mendatang"
                description="Jadwalkan trip baru lewat menu Kelola Trip & Jadwal."
              />
            ) : (
              upcomingTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/60 hover:bg-neutral-100/60 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-neutral-800 font-mono">
                      TRIP-{trip.id}
                    </span>

                    {trip.status === 'in_transit' ? (
                      <StatusBadge variant="amber">
                        Dalam Perjalanan
                      </StatusBadge>
                    ) : (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-[12px] font-bold"
                        style={{
                          color: PRIMARY_COLOR,
                          backgroundColor: `${PRIMARY_ACCENT}18`,
                          border: `1px solid ${PRIMARY_ACCENT}35`
                        }}
                      >
                        Dijadwalkan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-800">
                    <MapPin
                      className="w-3 h-3 shrink-0"
                      style={{ color: PRIMARY_COLOR }}
                    />
                    <span>
                      {trip.originPoint?.name || 'Asal'} &rarr;{' '}
                      {trip.destinationPoint?.name || 'Tujuan'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[12px] text-neutral-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTripSchedule(
                        trip.departureDate,
                        trip.departureTime
                      )}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-neutral-700">
                      <Package
                        className="w-2.5 h-2.5"
                        style={{ color: PRIMARY_COLOR }}
                      />
                      {trip.remainingWeightCapacityKg} Kg Sisa
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                Riwayat Perjalanan
              </h2>
            </div>
            <span className="text-[11px] font-bold text-neutral-400">
              Terakhir Selesai
            </span>
          </div>

          <div className="space-y-3">
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
                  className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/60 hover:bg-neutral-100/60 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-neutral-800 font-mono">
                      TRIP-{history.id}
                    </span>
                    <span className="text-[13px] font-bold text-emerald-600">
                      {formatRupiah(history.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-800">
                    <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span>
                      {history.originPoint?.name || 'Asal'} &rarr;{' '}
                      {history.destinationPoint?.name || 'Tujuan'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[12px] text-neutral-400 font-medium">
                    <span>
                      {history.departureDate?.split('T')[0]}
                    </span>
                    {history.rating ? (
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
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