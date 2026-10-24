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

const PRIMARY_COLOR = '#4FBF99';
const PRIMARY_ACCENT = '#66CDAA';

export default function MitraQrDisplay() {
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [dynamicToken, setDynamicToken] = useState('TOKEN-1234');
  const [countdown, setCountdown] = useState(30);
  const [qrError, setQrError] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchMitraTrips = async () => {
      setIsLoading(true);
      try {
        const resMyTrips = await apiClient.get('/trips/me').catch(() => ({ data: [] }));
        const allTrips = resMyTrips.data?.data || resMyTrips.data || [];

        const myActiveTrips = allTrips.filter((t) => 
          ['scheduled', 'in_origin_pos', 'in_transit'].includes(t.status)
        );

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
          return 30;
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
    setCountdown(30);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-[calc(100vh-80px)] lg:min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />
            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: PRIMARY_COLOR }}
            >
              <Smartphone className="w-3 h-3" />
              TAMPILAN LAYAR PERANGKAT MITRA
            </span>
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Digital Dynamic QR Trip Display
          </h1>
          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Tunjukkan QR Code dinamis ini kepada Operator Pos saat verifikasi keberangkatan atau kedatangan di pos mitra.
          </p>
        </div>
      </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 lg:col-span-1 space-y-3">
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

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 lg:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="w-full max-w-xs bg-neutral-900 p-5 rounded-2xl text-white shadow-lg border-4 border-neutral-800 relative">
              <div className="flex justify-between items-center text-[11px] text-neutral-500 mb-3 px-1">
                <span>Nebeng App Driver</span>
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
                  {current?.departureDate?.split('T')[0]} • Sesuai Jadwal
                </p>
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
