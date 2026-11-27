import { useEffect, useState } from 'react';
import { bannerService } from '../../services/bannerService';
import apiClient from '../../services/apiClient';
import { BASE_URL } from '../../config/env';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';

function resolveBannerImageUrl(path) {
  if (!path) return '';
  if (/^(blob:|data:|https?:\/\/)/.test(path)) return path;
  const base = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const BannerSlider = ({
  role,
  containerClassName = 'h-44 mb-0',
  fallback = null,
}) => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await bannerService.getBanners(role);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setBanners(list);
      } catch (error) {
        console.error('Error fetching banners:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, [role]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  if (loading) {
    return (
      <div className={`w-full rounded-2xl bg-slate-100 animate-pulse ${containerClassName}`} />
    );
  }

  if (banners.length === 0) {
    if (fallback) return fallback;
    const isMitra = role === 'mitra';
    return (
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#0b3ba8] via-[#1356d6] to-[#2684ff] text-white shadow-card p-5 flex flex-col justify-between ${containerClassName}`}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#74B4D9]/20 blur-xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-10 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold uppercase tracking-wider text-[#74B4D9]">
            <Sparkles className="w-3 h-3" />
            {isMitra ? 'Info & Promo Mitra' : 'Promo SatuRute'}
          </span>
        </div>
        <div className="relative z-10 space-y-1">
          <h2 className="font-display text-base font-bold leading-snug text-white">
            {isMitra
              ? 'Raih Penghasilan Lebih dengan Trip Terjadwal'
              : 'Perjalanan Antarkota Aman, Nyaman & Hemat'}
          </h2>
          <p className="text-xs text-blue-100/90 line-clamp-2">
            {isMitra
              ? 'Pantau pesanan masuk, kelola kursi & bagasi, dan nikmati pencairan saldo cepat.'
              : 'Pesan kursi atau kirim paket langsung dari pos terdekat dengan tarif transparan.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden group bg-slate-900 shadow-card ${containerClassName}`}>
      {banners.map((banner, index) => {
        const isActive = index === currentIndex;
        return (
          <a
            key={banner.id}
            href={banner.linkUrl || '#'}
            target={banner.linkUrl?.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
            onClick={(e) => !banner.linkUrl && e.preventDefault()}
            aria-label={banner.title || 'Banner promosi'}
          >
            <img
              src={resolveBannerImageUrl(banner.imageUrl)}
              alt={banner.title || 'Banner promosi'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Overlay Gradient & Judul Banner */}
            {(banner.title || banner.linkUrl) && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent flex flex-col justify-end p-5 sm:p-7 pb-11 sm:pb-10">
                {banner.title && (
                  <h2 className="text-white text-base sm:text-xl md:text-2xl font-bold tracking-tight drop-shadow-md line-clamp-2 max-w-2xl">
                    {banner.title}
                  </h2>
                )}
                {banner.linkUrl && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-200 hover:text-white transition w-fit">
                    <span>Lihat Selengkapnya</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            )}
          </a>
        );
      })}

      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            type="button"
            aria-label="Banner sebelumnya"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-slate-900/60 hover:bg-slate-900/80 text-white p-2 md:p-2.5 rounded-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-soft backdrop-blur-sm cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNext}
            type="button"
            aria-label="Banner berikutnya"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-slate-900/60 hover:bg-slate-900/80 text-white p-2 md:p-2.5 rounded-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-soft backdrop-blur-sm cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Pindah ke banner ${idx + 1}`}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  idx === currentIndex
                    ? 'bg-white w-6 shadow-sm'
                    : 'bg-white/50 hover:bg-white/80 w-2'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
