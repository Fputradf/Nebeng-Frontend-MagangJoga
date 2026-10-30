import React, { useEffect, useState } from 'react';
import { bannerService } from '../../services/bannerService';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export const BannerSlider = ({ role }) => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await bannerService.getBanners(role);
        setBanners(data || []);
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

  if (loading || banners.length === 0) return null;

  return (
    <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 group bg-slate-900 shadow-card">
      {banners.map((banner, index) => {
        const isActive = index === currentIndex;
        return (
          <a
            key={banner.id}
            href={banner.linkUrl || '#'}
            target={banner.linkUrl ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
            onClick={(e) => !banner.linkUrl && e.preventDefault()}
            aria-label={banner.title || 'Banner promosi'}
          >
            <img
              src={banner.imageUrl}
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
