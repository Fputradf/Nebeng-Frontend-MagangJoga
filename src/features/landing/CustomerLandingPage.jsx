import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  Users,
  Package,
  Car,
  Bike,
  Sparkles,
  LogIn,
  UserPlus,
  HelpCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { BannerSlider } from '../../components/ui/BannerSlider';
import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import logoAsset from '../../assets/LOGO.png';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export default function CustomerLandingPage() {
  const navigate = useNavigate();
  const { appName, appLogo } = useAppConfig();
  const { isAuthenticated, role } = useAuth();

  const roleHomeMap = {
    admin: '/admin/dashboard',
    regional: '/regional/dashboard',
    operator: '/operator-pos/dashboard',
    mitra: '/mitra/dashboard',
    customer: '/customer',
  };
  const dashboardPath = roleHomeMap[role] || '/customer';

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [activeService, setActiveService] = useState('motor');

  const [pickupPoints, setPickupPoints] = useState([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchPickupPoints = async () => {
      setIsLoadingPoints(true);
      try {
        const res = await apiClient.get('/pickup-points', { params: { onlyActive: true } });
        if (!ignore) {
          setPickupPoints(res.data || []);
        }
      } catch (err) {
        console.warn('Gagal memuat pos resmi:', err);
      } finally {
        if (!ignore) {
          setIsLoadingPoints(false);
        }
      }
    };

    fetchPickupPoints();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    if (date) params.set('date', date);
    if (activeService) params.set('service', activeService);

    const queryString = params.toString();
    const destinationPath = queryString ? `/customer/booking?${queryString}` : '/customer/booking';

    if (isAuthenticated) {
      navigate(destinationPath);
    } else {
      navigate('/login', {
        state: { from: destinationPath },
      });
    }
  };

  return (
    <div className="relative isolate min-h-screen bg-canvas font-sans text-slate-900 selection:bg-brand-500 selection:text-white flex flex-col">
      {/* Background glow ambiance */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(50rem 28rem at 85% -8%, rgba(116,180,217,0.30), transparent), radial-gradient(42rem 30rem at 5% 105%, rgba(16,54,125,0.12), transparent)',
        }}
      />

      {/* ── TOPBAR NAVIGATION ── */}
      <header className="sticky top-0 z-30 border-b border-brand-500/20 bg-white/85 backdrop-blur-md transition-all shadow-xs">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <img
              src={appLogo || logoAsset}
              alt={appName || 'SatuRute'}
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain drop-shadow-xs"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = logoAsset;
              }}
            />
            <div className="flex flex-col">
              <span className="font-display text-xl sm:text-2xl font-extrabold leading-none text-brand-700 tracking-tight">
                {appName || 'SatuRute'}
              </span>
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-500">
                Layanan Tumpangan & Logistik Antarkota
              </span>
            </div>
          </div>

          {/* Nav Actions - Button Sejajar Panjangnya */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate(dashboardPath)}
                className="w-28 sm:w-36 h-10 sm:h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-soft transition active:scale-95 cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-24 sm:w-28 h-10 sm:h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs sm:text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100/80 border border-brand-200 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-brand-600" />
                  <span>Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-24 sm:w-28 h-10 sm:h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-soft transition active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Daftar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (Mirrors Customer Dashboard) ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── HERO BANNER ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
          <div className="relative z-10 flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-sky-100 text-xs font-semibold backdrop-blur-xs mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Selamat Datang di Platform {appName || 'SatuRute'}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Cari & Booking Trip
              </h1>
              <p className="mt-1 text-sm text-blue-100 max-w-xl">
                Temukan perjalanan antar kota atau pengiriman barang dengan pembayaran aman terproteksi.
              </p>
            </div>
            <div className="shrink-0 flex items-center">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white font-medium backdrop-blur-xs">
                <MapPin className="w-4 h-4 text-sky-300" />
                <span>Pos Resmi Terintegrasi</span>
              </span>
            </div>
          </div>
          <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
          <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
        </section>

        {/* ── BANNER SLIDER PROMO ── */}
        <BannerSlider role="customer" />

        {/* ── LAYANAN KAMI (TABS) ── */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-card border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Layanan Kami
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Pilih moda transportasi atau kirim paket
            </span>
          </div>
          <div role="tablist" aria-label="Pilih Jenis Layanan" className="grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto">
            {/* SatuRute Motor */}
            <button
              type="button"
              role="tab"
              aria-selected={activeService === 'motor'}
              aria-label="Layanan SatuRute Motor"
              className="flex flex-col items-center gap-2.5 hover:opacity-90 transition cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-2xl p-2"
              onClick={() => setActiveService('motor')}
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-soft transition-all duration-200 ${
                  activeService === 'motor'
                    ? 'bg-[#262160] scale-105 ring-4 ring-[#262160]/20'
                    : 'bg-slate-200 group-hover:bg-slate-300 text-slate-600'
                }`}
              >
                <Bike className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold text-center ${
                  activeService === 'motor' ? 'text-[#262160]' : 'text-slate-600'
                }`}
              >
                SatuRute Motor
              </span>
            </button>

            {/* SatuRute Mobil */}
            <button
              type="button"
              role="tab"
              aria-selected={activeService === 'mobil'}
              aria-label="Layanan SatuRute Mobil"
              className="flex flex-col items-center gap-2.5 hover:opacity-90 transition cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-2xl p-2"
              onClick={() => setActiveService('mobil')}
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-soft transition-all duration-200 ${
                  activeService === 'mobil'
                    ? 'bg-[#262160] scale-105 ring-4 ring-[#262160]/20'
                    : 'bg-slate-200 group-hover:bg-slate-300 text-slate-600'
                }`}
              >
                <Car className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold text-center ${
                  activeService === 'mobil' ? 'text-[#262160]' : 'text-slate-600'
                }`}
              >
                SatuRute Mobil
              </span>
            </button>

            {/* SatuRute Barang */}
            <button
              type="button"
              role="tab"
              aria-selected={activeService === 'barang'}
              aria-label="Layanan SatuRute Barang"
              className="flex flex-col items-center gap-2.5 hover:opacity-90 transition cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-2xl p-2"
              onClick={() => setActiveService('barang')}
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-soft transition-all duration-200 ${
                  activeService === 'barang'
                    ? 'bg-[#262160] scale-105 ring-4 ring-[#262160]/20'
                    : 'bg-slate-200 group-hover:bg-slate-300 text-slate-600'
                }`}
              >
                <Package className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold text-center ${
                  activeService === 'barang' ? 'text-[#262160]' : 'text-slate-600'
                }`}
              >
                SatuRute Barang
              </span>
            </button>
          </div>
        </div>

        {/* ── FORM PENCARIAN RUTE PERJALANAN ── */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSearch} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Pos Asal */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>Pos Asal</span>
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 transition-all truncate"
                >
                  <option value="">Semua Pos Asal</option>
                  {pickupPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.cityName ? `(${p.cityName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pos Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pos Tujuan</span>
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 transition-all truncate"
                >
                  <option value="">Semua Pos Tujuan</option>
                  {pickupPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.cityName ? `(${p.cityName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  <span>Tanggal Keberangkatan</span>
                </label>
                <input
                  type="date"
                  min={TODAY_ISO}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            {/* Tombol Utama Cari - Full width sejajar dengan form card */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                className="w-full h-12 inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-soft transition-all active:scale-98 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Cari Jadwal Perjalanan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* ── PREVIEW SECTION (TIDAK MENAMPILKAN DATA JADWAL RUTE) ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center shadow-2xs border border-brand-100">
              <Search className="w-8 h-8" />
            </div>

            <div className="max-w-xl mx-auto space-y-1.5">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-900">
                Temukan Rute & Jadwal Tumpangan Anda
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tersedia berbagai pilihan rute keberangkatan antar pos setiap harinya. Silakan klik tombol{' '}
                <strong className="text-brand-700">Cari Jadwal Perjalanan</strong> di atas atau masuk ke akun Anda
                untuk melihat jadwal lengkap, ketersediaan kursi, dan memesan tiket langsung.
              </p>
            </div>

            {/* Tombol CTA Sejajar Panjangnya (Equal Width: w-full sm:w-64) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
              <button
                type="button"
                onClick={handleSearch}
                className="w-full sm:w-64 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-soft transition active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk untuk Lihat Jadwal</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full sm:w-64 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition active:scale-95 cursor-pointer border border-slate-200/70"
              >
                <UserPlus className="w-4 h-4 text-slate-600" />
                <span>Daftar Akun Baru</span>
              </button>
            </div>
          </div>

          {/* ── FITUR & KEUNGGULAN (TRUST BADGES) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-900">
                Driver & Pos Resmi Terverifikasi
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Semua mitra diverifikasi ketat melalui KTP, SIM, dan verifikasi biometrik di pos resmi.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-900">
                Sistem Escrow Terlindungi
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pembayaran Anda disimpan aman di sistem dan baru diteruskan setelah konfirmasi scan QR di pos tujuan.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-900">
                Tarif Pasti & Terjangkau
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Harga terstandarisasi antar pos tanpa lonjakan biaya tersembunyi selama perjalanan.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src={appLogo || logoAsset} alt="" className="h-5 w-5 object-contain" />
            <span className="font-bold text-slate-700">{appName || 'SatuRute'}</span>
            <span>&copy; {new Date().getFullYear()} Hak Cipta Dilindungi.</span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-brand-600 transition cursor-pointer"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="hover:text-brand-600 transition cursor-pointer"
            >
              Daftar
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-brand-600 transition cursor-pointer"
            >
              Pusat Bantuan
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
