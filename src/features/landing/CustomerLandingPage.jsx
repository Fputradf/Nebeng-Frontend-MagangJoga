import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  Package,
  Car,
  Bike,
  Clock,
  CheckCircle2,
  Users,
  Sparkles,
  Mail,
  Phone,
} from 'lucide-react';
import { BannerSlider } from '../../components/ui/BannerSlider';
import SocialIcon from '../../components/ui/SocialIcon';
import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import { socialLinkService } from '../../services/socialLinkService';
import logoAsset from '../../assets/LOGO.png';
import heroBg from '../../assets/hero-transport.jpg';
import LandingNavbar from './components/LandingNavbar';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const DEFAULT_SOCIAL_LINKS = [
  { id: 'ig', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com' },
  { id: 'tt', platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com' },
  { id: 'fb', platform: 'facebook', label: 'Facebook', url: 'https://facebook.com' },
];

const SERVICES = [
  {
    id: 'motor',
    label: 'SatuRute Motor',
    desc: 'Perjalanan cepat & fleksibel untuk 1 penumpang',
    icon: Bike,
  },
  {
    id: 'mobil',
    label: 'SatuRute Mobil',
    desc: 'Perjalanan nyaman antar pos untuk hingga 4–6 penumpang',
    icon: Car,
  },
  {
    id: 'barang',
    label: 'SatuRute Barang',
    desc: 'Pengiriman paket kilat antar pos resmi terverifikasi',
    icon: Package,
  },
];

const FEATURES = [
  {
    id: 'verified',
    badge: '100% Resmi',
    icon: ShieldCheck,
    title: 'Driver & Pos Terverifikasi',
    desc: 'Semua mitra lolos verifikasi KTP, SIM, dan biometrik di pos resmi.',
  },
  {
    id: 'escrow',
    badge: 'Dana Terlindungi',
    icon: CheckCircle2,
    title: 'Pembayaran Escrow Aman',
    desc: 'Dana ditahan aman di sistem dan baru cair setelah scan QR di pos tujuan.',
  },
  {
    id: 'pricing',
    badge: 'Harga Jelas',
    icon: Clock,
    title: 'Tarif Pasti & Terjangkau',
    desc: 'Harga sudah pasti sejak awal tanpa biaya tambahan di perjalanan.',
  },
];

export default function CustomerLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, appLogo } = useAppConfig();
  const { isAuthenticated } = useAuth();

  const brandName = appName || 'SatuRute';

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [activeService, setActiveService] = useState('motor');

  const [pickupPoints, setPickupPoints] = useState([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isLightSection, setIsLightSection] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState(FEATURES[0].id);

  useEffect(() => {
    const targetSection = location.state?.scrollTo;
    if (targetSection) {
      const timer = setTimeout(() => {
        const el = document.getElementById(targetSection);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
      const layananEl = document.getElementById('layanan');
      if (layananEl) {
        setIsLightSection(layananEl.getBoundingClientRect().top <= 84);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

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
    socialLinkService
      .getPublicSocialLinks()
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setSocialLinks(data.slice(0, 5));
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat link sosial media:', err);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const defaultAdBanner = (
    <div className="relative w-full h-[140px] sm:h-[180px] md:h-[200px] lg:h-[220px] rounded-2xl overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white shadow-card flex items-center justify-between px-5 sm:px-10 lg:px-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-24 -bottom-20 h-56 w-56 rounded-full bg-accent/20 blur-2xl"
      />

      <div className="relative z-10 max-w-2xl space-y-1.5 sm:space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-0.5 text-[11px] font-bold text-sky-100">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Promo Spesial {brandName}</span>
        </span>
        <h3 className="font-display text-base sm:text-xl md:text-2xl font-extrabold tracking-tight leading-snug">
          Perjalanan Antarkota Lebih Hemat &amp; Terjadwal Setiap Hari
        </h3>
        <p className="hidden md:block text-xs sm:text-sm text-blue-100 max-w-xl">
          Tarif pasti antar pos resmi dengan mitra driver terverifikasi dan pembayaran escrow.
        </p>
      </div>

      <div className="relative z-10 shrink-0 hidden sm:flex items-center">
        <button
          type="button"
          onClick={() => (isAuthenticated ? navigate('/customer/booking') : navigate('/register'))}
          className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-brand-50 px-5 sm:px-6 py-3 text-xs sm:text-sm font-bold text-brand-700 shadow-lg transition active:scale-95 cursor-pointer"
        >
          <span>{isAuthenticated ? 'Booking Sekarang' : 'Daftar & Klaim Promo'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-brand-950 font-sans text-slate-900 selection:bg-brand-500 selection:text-white flex flex-col">
      <LandingNavbar
        isLight={isLightSection}
        isScrolled={isScrolled}
        fixed={true}
        onSectionClick={scrollToSection}
      />

      {/* ── FULL-BLEED DEEP NAVY HERO SECTION ── */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-16 bg-brand-950">
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-brand-950/25" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-brand-950/55 via-transparent to-brand-950"
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
            Layanan Transportasi
            <br />
            Nyaman ke Tujuan Anda
          </h1>

          <p className="text-base sm:text-lg text-blue-100/95 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow-xs">
            Pesan tumpangan motor, mobil, atau kirim barang bersama mitra driver terverifikasi
            dari pos resmi dengan praktis, aman, dan nyaman.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => scrollToSection('layanan')}
              className="w-full sm:w-auto min-w-[180px] px-7 py-3.5 rounded-lg bg-brand-500 hover:bg-brand-auth-bright text-white font-semibold text-sm sm:text-base shadow-lg shadow-brand-950/50 border border-white/15 transition active:scale-95 cursor-pointer"
            >
              Pesan Sekarang
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto min-w-[180px] px-7 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer"
            >
              Daftar Jadi Mitra
            </button>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1">
        {/* ── TENTANG & KEUNGGULAN (DARK NAVY + GLASSMORPHISM CARDS) ── */}
        <section id="tentang" className="scroll-mt-20 py-16 sm:py-20 bg-brand-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                Tentang {brandName}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Perjalanan Antarkota yang Lebih Aman &amp; Praktis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                const isActive = feat.id === activeFeatureId;
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => {
                      setActiveFeatureId(feat.id);
                      scrollToSection('layanan');
                    }}
                    className={`group relative overflow-hidden text-left rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md text-white border transition-all duration-300 cursor-pointer flex flex-col gap-4 hover:-translate-y-1 hover:from-white/[0.09] hover:to-white/[0.03] hover:border-white/25 ${
                      isActive ? 'border-brand-500/60 shadow-[0_8px_28px_rgba(16,54,125,0.25)]' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-brand-500/20 border border-brand-400/30 text-blue-200 transition-transform duration-300 group-hover:scale-105">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="rounded-full px-3 py-1 text-[11px] font-semibold bg-white/5 text-blue-200 border border-white/10">
                        {feat.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-display text-lg font-bold text-white">
                        {feat.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-300 font-normal">
                        {feat.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── BANNER IKLAN & LAYANAN (BG ABU-ABU) ── */}
        <section id="layanan" className="scroll-mt-20 pt-12 sm:pt-16 pb-6 sm:pb-8 bg-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Banner Iklan Memanjang Kiri-Kanan */}
            <BannerSlider
              role="customer"
              containerClassName="w-full h-[140px] sm:h-[180px] md:h-[200px] lg:h-[220px]"
              fallback={defaultAdBanner}
            />

            {/* Pencarian Rute & Layanan */}
            <div className="w-full">
              {/* Unified Service Tabs & Search Route Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-card space-y-6">
                <div className="text-center max-w-2xl mx-auto space-y-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600">
                    Layanan Kami
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Cari &amp; Booking Perjalanan Anda
                  </h2>
                </div>
                {/* Service Tabs */}
                <div
                  role="tablist"
                  aria-label="Pilih Jenis Layanan"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6 border-b border-slate-100"
                >
                  {SERVICES.map((svc) => {
                    const Icon = svc.icon;
                    const isSelected = activeService === svc.id;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setActiveService(svc.id)}
                        className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                            : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-brand-500/40 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-white/15 text-white'
                              : 'bg-brand-50 text-brand-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {svc.label}
                          </div>
                          <div className={`text-xs mt-0.5 leading-snug ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {svc.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Search Route Form */}
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Pos Asal */}
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-600" />
                        <span>Pos Asal</span>
                      </label>
                      <select
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        disabled={isLoadingPoints}
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
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span>Pos Tujuan</span>
                      </label>
                      <select
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        disabled={isLoadingPoints}
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
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      className="w-full h-12 inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base shadow-soft transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      <span>Cari Jadwal Perjalanan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ── MITRA DRIVER SECTION (RINGKAS & BG ABU-ABU) ── */}
        <section id="mitra" className="scroll-mt-20 pt-2 pb-12 sm:pt-4 sm:pb-16 bg-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-200">
                  <Users className="w-3.5 h-3.5" />
                  <span>Mitra Driver {brandName}</span>
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Bergabung Menjadi Mitra Pengemudi Resmi
                </h2>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Jadwal fleksibel, penumpang terverifikasi dari pos resmi, dan pencairan dana transparan.
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700 shadow-soft transition active:scale-95 cursor-pointer"
                >
                  <span>Daftar Jadi Mitra</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER (KONTAK & SOSIAL LINK) ── */}
      <footer className="border-t border-slate-200 bg-white pt-12 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-200/80">
            {/* Brand Info */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={appLogo || logoAsset}
                  alt={brandName}
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = logoAsset;
                  }}
                />
                <span className="font-display text-lg font-extrabold text-brand-700">
                  {brandName}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                Platform transportasi dan pengiriman barang antarkota berbasis pos resmi terverifikasi dengan perlindungan pembayaran escrow.
              </p>
            </div>

            {/* Kontak Kami */}
            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Kontak Kami
              </h3>
              <div className="space-y-2.5 text-sm text-slate-600">
                <a
                  href="mailto:cs@saturute.id"
                  className="flex items-center gap-2.5 hover:text-brand-600 transition w-fit"
                >
                  <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>cs@saturute.id</span>
                </a>
                <a
                  href="tel:+6281122334455"
                  className="flex items-center gap-2.5 hover:text-brand-600 transition w-fit"
                >
                  <Phone className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>0811-2233-4455</span>
                </a>
                <div className="flex items-center gap-2.5 text-slate-500">
                  <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>Senin – Minggu, 06.00 – 22.00 WIB</span>
                </div>
              </div>
            </div>

            {/* Sosial Media */}
            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Ikuti Kami
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dapatkan info promo dan rute terbaru melalui kanal resmi kami.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {(socialLinks.length > 0 ? socialLinks : DEFAULT_SOCIAL_LINKS).map((item) => (
                  <a
                    key={item.id || item.platform}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label || item.platform || 'Sosial Media'}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-600 hover:text-brand-600 flex items-center justify-center transition"
                  >
                    <SocialIcon
                      platform={item.platform}
                      logoUrl={item.logoUrl || item.platform}
                      iconType={item.iconType}
                      className="w-4 h-4"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              &copy; {new Date().getFullYear()} <strong className="font-bold text-slate-700">{brandName}</strong>. Hak Cipta Dilindungi.
            </span>
            <span>Layanan Tumpangan &amp; Logistik Antarkota Resmi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
