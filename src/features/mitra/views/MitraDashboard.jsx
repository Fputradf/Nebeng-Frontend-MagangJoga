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
  AlertTriangle
} from 'lucide-react';
import StatCard from '../../../components/ui/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import { BannerSlider } from '../../../components/ui/BannerSlider';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';

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
          <Link
            to="/mitra/profile/pengaturan"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-xl shadow-sm transition shrink-0 text-center"
          >
            Lihat Sanksi & Banding
          </Link>
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
          <Link
            to="/mitra/profile/pengaturan"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-xl shadow-sm transition shrink-0 text-center"
          >
            Riwayat Sanksi
          </Link>
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
    </div>
  );
}