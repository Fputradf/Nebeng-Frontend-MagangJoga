import { BASE_URL } from '../../../config/env';
import { useState, useEffect } from 'react';
import { X, Phone, IdCard, ShieldCheck, Settings, CalendarCheck } from 'lucide-react';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';

const maskNik = (nik) => {
  if (!nik || nik === '-') return '-';
  if (nik.length <= 8) return 'x'.repeat(nik.length);
  return `${nik.slice(0, 4)}${'x'.repeat(nik.length - 8)}${nik.slice(-4)}`;
};

const getFullFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const baseURL = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;

  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function CustomerProfileModal({
  isOpen,
  onClose,
  profile,
  isVerified,
  onSettingsClick,
}) {
  const [userData, setUserData] = useState(profile || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchModalData = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get('/auth/me');
        if (isMounted && res.data) {
          setUserData(res.data);
        }
      } catch (err) {
        console.error('Gagal memuat profil modal:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchModalData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const displayName =
    userData?.name ||
    userData?.fullName ||
    profile?.name ||
    profile?.fullName ||
    'Pelanggan Nebeng';

  const initial = displayName.charAt(0).toUpperCase() || 'P';

  const rawPhoto =
    userData?.avatar ||
    userData?.photoDataUrl ||
    profile?.avatar ||
    profile?.photoDataUrl ||
    '';

  const photoUrl = getFullFileUrl(rawPhoto);

  const rawDate =
    userData?.createdAt ||
    userData?.verifiedAt ||
    profile?.createdAt ||
    profile?.verifiedAt;

  const memberSince = rawDate
    ? new Date(rawDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const displayPhone = userData?.phone || profile?.phone || '-';

  const displayNik =
    userData?.nik ||
    userData?.profile?.ktpNumber ||
    profile?.nik ||
    profile?.profile?.ktpNumber ||
    '-';

  const verifiedStatus =
    userData?.statusVerification === 'approved' || isVerified;

  const handleGoToSettings = () => {
    onClose?.();
    onSettingsClick?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 font-['Inter']"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative px-5 pt-5 pb-6 bg-linear-to-br"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_HOVER})`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div
            className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white text-[21px] font-extrabold mb-3 overflow-hidden shadow-sm"
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Foto Profil"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              initial
            )}
          </div>

          <p className="text-white font-bold text-[18px]">{displayName}</p>

          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide ${
              verifiedStatus
                ? 'bg-emerald-400/20 text-emerald-100'
                : 'bg-white/10 text-white/90'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-[#74B4D9]" />
            {verifiedStatus ? 'Terverifikasi' : 'Belum Terverifikasi'}
          </span>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-100 rounded-xl p-3">
            <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-wider">
                No. WhatsApp/HP
              </p>
              <p className="text-[13px] font-bold text-neutral-800 truncate">
                {isLoading ? 'Memuat...' : displayPhone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-100 rounded-xl p-3">
            <IdCard className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-wider">
                NIK
              </p>
              <p className="text-[13px] font-bold text-neutral-800 font-mono truncate">
                {isLoading ? 'Memuat...' : maskNik(displayNik)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-100 rounded-xl p-3">
            <CalendarCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-wider">
                Anggota Sejak
              </p>
              <p className="text-[13px] font-bold text-neutral-800 truncate">
                {isLoading ? 'Memuat...' : memberSince}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-bold text-neutral-500 hover:text-neutral-700 transition cursor-pointer px-2 py-2"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleGoToSettings}
            className="flex items-center gap-1.5 px-4 py-2 text-white rounded-full text-[13px] font-bold transition shadow-sm cursor-pointer"
            style={{ backgroundColor: PRIMARY_COLOR }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
            }}
          >
            <Settings className="w-3.5 h-3.5" />
            Pengaturan Akun
          </button>
        </div>
      </div>
    </div>
  );
}