import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, ChevronDown, Check, Search, Loader2, Sparkles, Building2 } from 'lucide-react';
import BaseModal from './BaseModal';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function DashboardRegionSwitcher({
  variant = 'banner', // 'banner' (untuk banner gelap/biru) atau 'light' (untuk container putih)
  onRegionChanged,
  className = '',
}) {
  const { user, checkAuthStatus } = useAuth();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [regions, setRegions] = useState([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingRegionId, setSwitchingRegionId] = useState(null);

  // Fetch regions aktif dari server
  const fetchRegions = async () => {
    setIsLoadingRegions(true);
    try {
      const res = await apiClient.get('/regions?onlyActive=true&limit=100');
      const data = res.data?.data || res.data || [];
      setRegions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat daftar wilayah operasional:', err);
    } finally {
      setIsLoadingRegions(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  // Temukan objek wilayah saat ini
  const currentRegion = useMemo(() => {
    const userRegionIdStr = user?.regionId ? String(user.regionId) : null;
    if (userRegionIdStr && regions.length > 0) {
      const match = regions.find((r) => String(r.id) === userRegionIdStr);
      if (match) return match;
    }

    if (user?.region && typeof user.region === 'object') {
      return user.region;
    }

    if (user?.regionName) {
      return {
        id: user.regionId,
        name: user.regionName,
        code: user.regionCode || 'REG',
      };
    }

    return null;
  }, [user, regions]);

  // Filter wilayah berdasarkan pencarian
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regions;
    const q = searchQuery.toLowerCase().trim();
    return regions.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q) ||
        (Array.isArray(r.cities) &&
          r.cities.some((c) => c.name?.toLowerCase().includes(q)))
    );
  }, [regions, searchQuery]);

  const handleSelectRegion = async (selectedRegion) => {
    const isCurrent =
      currentRegion && String(currentRegion.id) === String(selectedRegion.id);
    if (isCurrent) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setSwitchingRegionId(selectedRegion.id);

    try {
      await apiClient.patch('/users/me', {
        regionId: String(selectedRegion.id),
      });

      if (checkAuthStatus) {
        await checkAuthStatus();
      }

      toast.success(
        `Wilayah operasional berhasil dialihkan ke ${selectedRegion.name} (${selectedRegion.code}).`,
        { title: 'Wilayah Diperbarui' }
      );

      setIsOpen(false);
      if (onRegionChanged) {
        onRegionChanged(selectedRegion);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Gagal mengganti wilayah operasional. Silakan coba beberapa saat lagi.';
      toast.error(msg, { title: 'Gagal Ganti Wilayah' });
    } finally {
      setIsSwitching(false);
      setSwitchingRegionId(null);
    }
  };

  const isBanner = variant === 'banner';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSearchQuery('');
          setIsOpen(true);
          if (regions.length === 0) fetchRegions();
        }}
        className={`group relative flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all cursor-pointer backdrop-blur shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          isBanner
            ? 'bg-white/15 hover:bg-white/25 text-white border border-white/25 hover:border-white/40'
            : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 hover:border-neutral-300'
        } ${className}`}
        aria-label="Ganti Wilayah Operasional"
      >
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
            isBanner
              ? 'bg-white/20 text-white'
              : 'bg-brand-50 text-brand-600'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
        </div>

        <div className="text-left min-w-0 pr-1">
          <p
            className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5 ${
              isBanner ? 'text-blue-100/80' : 'text-neutral-400'
            }`}
          >
            Wilayah Operasional
          </p>
          <p className="text-[13px] font-bold truncate flex items-center gap-1.5 leading-tight">
            <span>{currentRegion?.name || 'Pilih Wilayah'}</span>
            {currentRegion?.code && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isBanner
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {currentRegion.code}
              </span>
            )}
          </p>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-y-0.5 ${
            isBanner ? 'text-white/80' : 'text-neutral-400'
          }`}
        />
      </button>

      <BaseModal
        isOpen={isOpen}
        onClose={() => !isSwitching && setIsOpen(false)}
        title="Ganti Wilayah Operasional"
        subtitle="Pilih wilayah aktif untuk menyesuaikan rute, penjemputan pos, dan ketersediaan perjalanan."
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5 py-1 font-['Inter']">
          {/* Input Pencarian */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari wilayah atau kota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>

          {/* List Wilayah */}
          <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
            {isLoadingRegions ? (
              <div className="flex flex-col items-center justify-center py-8 text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                <span className="text-[12px]">Memuat daftar wilayah operasional...</span>
              </div>
            ) : filteredRegions.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-[13px]">
                Tidak ada wilayah yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredRegions.map((reg) => {
                const isSelected =
                  currentRegion && String(currentRegion.id) === String(reg.id);
                const isItemSwitching =
                  isSwitching && String(switchingRegionId) === String(reg.id);

                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => handleSelectRegion(reg)}
                    disabled={isSwitching}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/50 shadow-xs'
                        : 'border-neutral-200 hover:border-brand-300 hover:bg-neutral-50/80 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-neutral-100 text-neutral-600 group-hover:bg-brand-50 group-hover:text-brand-600'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[14px] text-neutral-800">
                            {reg.name}
                          </span>
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-200/80 text-neutral-700">
                            {reg.code}
                          </span>
                        </div>

                        {/* Nama kota jika ada */}
                        {Array.isArray(reg.cities) && reg.cities.length > 0 && (
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5 max-w-[260px]">
                            {reg.cities.map((c) => c.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isItemSwitching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                      ) : isSelected ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-brand-600 group-hover:underline">
                          Pilih
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Total {regions.length} wilayah operasional aktif</span>
            <span className="text-brand-600 font-medium">Bebas beralih kapan saja</span>
          </div>
        </div>
      </BaseModal>
    </>
  );
}

