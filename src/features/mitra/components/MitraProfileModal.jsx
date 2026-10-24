import { BASE_URL } from '../../../config/env';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Phone, Car, ShieldCheck, Settings, X } from 'lucide-react';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';

const getFullFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseURL = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;

  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function MitraProfileModal({ isOpen, onClose, onSettingsClick }) {
  const [userData, setUserData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchDataFromDb = async () => {
      try {
        const [userRes, vehicleRes] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/vehicles/me'),
        ]);

        if (isMounted) {
          if (userRes.data) {
            setUserData(userRes.data);
          }
          const vehicles = Array.isArray(vehicleRes.data) ? vehicleRes.data : [];
          if (vehicles.length > 0) {
            setVehicleData(vehicles[0]);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil data profil mitra dari DB:', err);
      }
    };

    fetchDataFromDb();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = userData?.name || 'Mitra Nebeng';
  const photoUrl = getFullFileUrl(userData?.avatar);
  const initials = displayName.charAt(0).toUpperCase() || 'M';

  const kendaraanStr =
    [vehicleData?.type, vehicleData?.model, vehicleData?.plateNumber]
      .filter(Boolean)
      .join(' • ') || '-';

  const fields = [
    {
      icon: Mail,
      label: 'Email',
      value: userData?.email || '-',
    },
    {
      icon: Phone,
      label: 'No. Telepon',
      value: userData?.phone || '-',
    },
    {
      icon: Car,
      label: 'Kendaraan',
      value: kendaraanStr,
    }
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl text-gray-900 font-['Inter'] overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="p-6 text-white relative shrink-0"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_HOVER})`,
          }}
        >
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-[21px] shrink-0 overflow-hidden">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-[17px] font-bold truncate">
                {displayName}
              </h3>

              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck
                  className="w-3 h-3 shrink-0 text-[#74B4D9]"
                />
                <span
                  className="text-[12px] font-semibold uppercase tracking-wide truncate text-[#74B4D9]"
                >
                  Mitra Terverifikasi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-2.5 overflow-y-auto">
          {fields.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-3.5 py-2.5"
            >
              <Icon className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-[13px] font-semibold text-neutral-800 wrap-break-words">
                  {value}
                </p>
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-full cursor-pointer transition"
            >
              Tutup
            </button>

            {onSettingsClick && (
              <button
                onClick={() => {
                  onClose && onClose();
                  onSettingsClick();
                }}
                className="px-4 py-2 text-[13px] font-bold text-white rounded-full cursor-pointer shadow-sm transition flex items-center gap-1.5"
                style={{
                  backgroundColor: PRIMARY_COLOR,
                }}
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
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}