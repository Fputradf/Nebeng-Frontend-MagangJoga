import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  RefreshCw,
  ShieldCheck,
  QrCode,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import apiClient from '../../../services/apiClient';
import { useToast } from '../../../context/ToastContext';
import {
  formatTripSchedule,
  formatDurationMinutes,
  getEstimatedArrivalTime,
  isTripPastTolerance,
} from '../../../utils/dateUtils';

const PRIMARY_COLOR = '#4FBF99';
const PRIMARY_ACCENT = '#66CDAA';

export default function MitraQrDisplay() {
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [dynamicToken, setDynamicToken] = useState('TOKEN-1234');
  const [countdown, setCountdown] = useState(60);
  const [qrError, setQrError] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchMitraTrips = async () => {
      setIsLoading(true);
      try {
        const resMyTrips = await apiClient.get('/trips/me').catch(() => ({ data: [] }));
        const allTrips = resMyTrips.data?.data || resMyTrips.data || [];

        const myActiveTrips = allTrips.filter((t) => {
          if (!['scheduled', 'in_origin_pos', 'in_transit'].includes(t.status)) {
            return false;
          }
          if (t.status === 'scheduled' && isTripPastTolerance(t.departureDate, t.departureTime)) {
            return false;
          }
          return true;
        });

        setTrips(myActiveTrips);

        if (myActiveTrips.length > 0 && !selectedTripId) {
          setSelectedTripId(myActiveTrips[0].id);
        }
      } catch (err) {
        console.error('Gagal memuat trip aktif:', err);
        toast.error('Gagal menyambungkan data QR ke server.', { title: 'Error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMitraTrips();
  }, [toast, selectedTripId]);

  const current = trips.find((t) => String(t.id) === String(selectedTripId));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setDynamicToken(`TOKEN-${Math.floor(1000 + Math.random() * 9000)}`);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedTripId]);

  useEffect(() => {
    if (!current || !canvasRef.current) return;

    const qrPayload = `TRIP-${current.id}|Route:${current.originPoint?.name}->${current.destinationPoint?.name}|TS:${dynamicToken}`;

    QRCode.toCanvas(
      canvasRef.current,
      qrPayload,
      {
        width: 140,
        margin: 1
      },
      (err) => {
        setQrError(Boolean(err));
      }
    );
  }, [current, dynamicToken]);

  const handleManualRefresh = () => {
    setDynamicToken(`TOKEN-${Math.floor(1000 + Math.random() * 9000)}`);
    setCountdown(60);
  };

  return (
    <div className="mx-auto p-4 space-y-5 min-h-[calc(100vh-9.5rem)] font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2684ff] px-5 py-4 flex items-center text-white shadow-card">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative w-full flex flex-col gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5 truncate">
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">TAMPILAN LAYAR PERANGKAT MITRA</span>
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              Digital Dynamic QR Trip Display
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2.5 shadow-xs whitespace-nowrap">
              <div className="w-8 h-8 rounded-lg bg-accent text-brand-900 flex items-center justify-center font-black shrink-0">
                <ShieldCheck className="w-4 h-4 text-brand-900" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block leading-none">
                  Status QR
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Dinamis ({countdown}s)
                </span>
              </div>
            </div>

            <button
              onClick={handleManualRefresh}
              className="p-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl backdrop-blur text-white transition cursor-pointer shadow-xs"
              title="Perbarui token QR sekarang"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center text-[13px] text-neutral-400">
          Memuat data QR trip...
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <EmptyState
            icon={QrCode}
            title="Belum Ada Trip Aktif"
            description="QR Code hanya tersedia untuk trip berstatus Aktif atau In Transit. Buat trip baru lewat menu Kelola Trip & Jadwal."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 space-y-3">
            <h2 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5 mb-2">
              <QrCode className="w-3.5 h-3.5" style={{ color: PRIMARY_COLOR }} />
              Pilih Trip Aktif
            </h2>

            <div className="space-y-2">
              {trips.map((trip) => {
                const isSelected = String(selectedTripId) === String(trip.id);

                return (
                  <button
                    key={trip.id}
                    onClick={() => {
                      setSelectedTripId(trip.id);
                      handleManualRefresh();
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'shadow-sm'
                        : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: PRIMARY_COLOR,
                            backgroundColor: `${PRIMARY_ACCENT}12`
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[13px] text-neutral-800 font-mono">
                        {trip.qrCodeTrip}
                      </span>
                      {trip.status === 'in_transit' ? (
                        <StatusBadge variant="amber">{trip.status}</StatusBadge>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            backgroundColor: `${PRIMARY_ACCENT}20`,
                            color: PRIMARY_COLOR,
                            border: `1px solid ${PRIMARY_ACCENT}35`
                          }}
                        >
                          {trip.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-bold text-neutral-700">
                      {trip.originPoint?.name} &rarr; {trip.destinationPoint?.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {trip.vehicle?.model} • {trip.departureDate?.split('T')[0]} WIB
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 flex flex-col items-center justify-center text-center">
            <div className="w-full max-w-xs bg-neutral-900 p-5 rounded-2xl text-white shadow-lg border-4 border-neutral-800 relative">
              <div className="flex justify-between items-center text-[11px] text-neutral-500 mb-3 px-1">
                <span>SatuRute App Driver</span>
                <span className="flex items-center gap-1" style={{ color: PRIMARY_ACCENT }}>
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Secure Token
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-inner my-1 flex flex-col items-center">
                <div className="w-40 h-40 bg-white p-1 rounded-lg flex items-center justify-center relative shadow-sm border border-neutral-100">
                  {qrError ? (
                    <div className="flex flex-col items-center gap-1.5 text-rose-600 text-center px-2">
                      <AlertCircle className="w-6 h-6" />
                      <p className="text-[11px] font-bold">Gagal membuat QR. Coba tekan "Perbarui Sekarang".</p>
                    </div>
                  ) : (
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  )}
                </div>
                <p className="text-neutral-900 font-bold text-[15px] font-mono mt-2">
                  {current?.qrCodeTrip}
                </p>
                <p className="text-neutral-400 text-[12px] font-medium">
                  {current?.originPoint?.name} &rarr; {current?.destinationPoint?.name}
                </p>
              </div>

              <div className="mt-3 bg-white/10 p-2.5 rounded-lg border border-white/10 text-left space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-bold uppercase" style={{ color: `${PRIMARY_ACCENT}` }}>
                    Token Keamanan:
                  </p>
                  <span className="text-[11px] font-mono font-bold" style={{ color: PRIMARY_ACCENT }}>
                    {dynamicToken}
                  </span>
                </div>
                <p className="text-[13px] text-white font-semibold">
                  {formatTripSchedule(current?.departureDate, current?.departureTime)}
                </p>
                {(current?.estimatedDurationMinutes || current?.distanceKm) && (
                  <p className="text-[11px] text-emerald-200 font-semibold">
                    Estimasi: {formatDurationMinutes(current.estimatedDurationMinutes) || `${current.estimatedDurationMinutes} mnt`}
                    {current.distanceKm ? ` (${current.distanceKm} km)` : ''}
                    {getEstimatedArrivalTime(current.departureDate, current.departureTime, current.estimatedDurationMinutes) ? ` • Tiba ~${getEstimatedArrivalTime(current.departureDate, current.departureTime, current.estimatedDurationMinutes)}` : ''}
                  </p>
                )}
                <p className="text-[12px] text-neutral-300">
                  {current?.vehicle?.model} ({current?.vehicle?.plateNumber})
                </p>
              </div>

              <div
                className="mt-3 flex items-center justify-between text-[11px] font-bold py-1.5 px-3 rounded-lg"
                style={{
                  color: PRIMARY_ACCENT,
                  backgroundColor: `${PRIMARY_ACCENT}18`,
                  border: `1px solid ${PRIMARY_ACCENT}30`
                }}
              >
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Auto-refresh: {countdown}s
                </span>
                <button
                  onClick={handleManualRefresh}
                  className="text-white px-2 py-0.5 rounded transition cursor-pointer"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Perbarui Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
