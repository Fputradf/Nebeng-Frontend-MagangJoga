import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Smartphone,
  RefreshCw,
  ShieldCheck,
  QrCode,
  AlertCircle,
  Ticket,
  Users,
  Package,
  Car,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import apiClient from '../../../services/apiClient';
import { useToast } from '../../../context/ToastContext';
import {
  formatTripSchedule,
  formatTripTime,
  formatDurationMinutes,
  getEstimatedArrivalTime,
  isTripPastTolerance,
} from '../../../utils/dateUtils';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

export default function CustomerQrDisplay() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [dynamicToken, setDynamicToken] = useState(() => `SEC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [countdown, setCountdown] = useState(60);
  const [qrError, setQrError] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCustomerTickets = async () => {
      setIsLoading(true);
      try {
        const resOrders = await apiClient.get('/orders/me').catch(() => ({ data: [] }));
        const ordersData = resOrders.data?.data || resOrders.data || [];

        // Filter tiket aktif: bukan completed, bukan cancelled/cancelled_by_mitra, bukan no_show, dan belum lewat toleransi jika masih scheduled
        const activeOrders = ordersData.filter((order) => {
          const st = order.status;
          if (st === 'completed' || st === 'cancelled' || st === 'cancelled_by_mitra' || st === 'no_show') {
            return false;
          }
          const trip = order.trip || {};
          // Jika trip masih scheduled dan customer belum check in di pos, cek apakah sudah lewat batas toleransi
          if (trip.status === 'scheduled' && st !== 'checked_in_origin' && st !== 'in_transit') {
            if (isTripPastTolerance(trip.departureDate, trip.departureTime)) {
              return false;
            }
          }
          return true;
        });

        const mapped = activeOrders.map((order) => {
          const isParcel = order.type === 'parcel' || order.type === 'barang';
          const trip = order.trip || {};

          let statusDisplay = 'Aktif';
          let statusVariant = 'emerald';
          if (order.status === 'pending_payment') {
            statusDisplay = 'Menunggu Pembayaran';
            statusVariant = 'amber';
          } else if (trip.status === 'in_transit' || order.status === 'in_transit') {
            statusDisplay = 'Dalam Perjalanan';
            statusVariant = 'blue';
          } else if (trip.status === 'in_origin_pos') {
            statusDisplay = 'Siap Boarding';
            statusVariant = 'purple';
          }

          return {
            id: order.id,
            rawId: order.id,
            tripId: trip.id,
            qrCodeTicket: order.qrCodeTicket || `TKT-${order.id}`,
            type: order.type,
            isParcel,
            title: isParcel
              ? `Nebeng Barang (${order.itemOrders?.[0]?.itemCategory || 'Paket'})`
              : 'Nebeng Penumpang',
            origin: trip.originPoint?.name || 'Pos Asal',
            destination: trip.destinationPoint?.name || 'Pos Tujuan',
            mitraName: trip.mitra?.name || 'Mitra Nebeng',
            mitraPhone: trip.mitra?.phone || null,
            vehicle: trip.vehicle
              ? `${trip.vehicle.model} (${trip.vehicle.plateNumber})`
              : 'Kendaraan Resmi',
            departureDate: trip.departureDate?.split('T')[0] || 'Hari Ini',
            departureTime: formatTripTime(trip.departureTime, trip.departureDate),
            schedule: formatTripSchedule(trip.departureDate, trip.departureTime),
            durationMinutes: trip.estimatedDurationMinutes ? Number(trip.estimatedDurationMinutes) : null,
            durationFormatted: formatDurationMinutes(trip.estimatedDurationMinutes),
            estimatedArrivalTime: getEstimatedArrivalTime(trip.departureDate, trip.departureTime, trip.estimatedDurationMinutes),
            distanceKm: trip.distanceKm ? Number(trip.distanceKm) : null,
            detail: isParcel
              ? `${order.totalItemsCount || 1} Item (${order.totalWeightKg || 1} Kg)`
              : `${order.seatsBooked || 1} Kursi Penumpang`,
            status: order.status,
            statusDisplay,
            statusVariant,
            otp: order.otpClaim || null,
          };
        });

        if (!isMounted) return;
        setTickets(mapped);

        // Pilih tiket dari navigation state jika ada, atau pilih tiket pertama
        const stateTicketId = location.state?.ticketId;
        if (stateTicketId && mapped.some((t) => String(t.id) === String(stateTicketId))) {
          setSelectedTicketId(stateTicketId);
        } else if (mapped.length > 0 && !selectedTicketId) {
          setSelectedTicketId(mapped[0].id);
        }
      } catch (err) {
        console.error('Gagal memuat tiket aktif untuk QR:', err);
        toast.error('Gagal menyambungkan data QR tiket ke server.', { title: 'Error' });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCustomerTickets();

    return () => {
      isMounted = false;
    };
  }, [location.state?.ticketId, toast, selectedTicketId]);

  const current = tickets.find((t) => String(t.id) === String(selectedTicketId));

  // Timer auto-refresh untuk Dynamic Token (60 detik)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setDynamicToken(`SEC-${Math.floor(1000 + Math.random() * 9000)}`);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedTicketId]);

  // Render QR Code ke Canvas
  useEffect(() => {
    if (!current || !canvasRef.current) return;

    const qrPayload = `NEBENG-${current.qrCodeTicket || current.id}-${dynamicToken}`;

    QRCode.toCanvas(
      canvasRef.current,
      qrPayload,
      {
        width: 170,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err) => {
        setQrError(Boolean(err));
      }
    );
  }, [current, dynamicToken]);

  const handleManualRefresh = () => {
    setDynamicToken(`SEC-${Math.floor(1000 + Math.random() * 9000)}`);
    setCountdown(60);
    toast.info('Token keamanan QR berhasil diperbarui.', { title: 'QR Diperbarui' });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-[calc(100vh-80px)] lg:min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> TAMPILAN LAYAR PERANGKAT CUSTOMER
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Digital Dynamic QR Tiket Perjalanan
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Tunjukkan QR Code dinamis ini kepada Operator Pos saat verifikasi keberangkatan (boarding) atau serah terima paket di pos mitra.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Status Live Token Pill */}
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-accent text-brand-900 flex items-center justify-center font-black shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-brand-900" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">
                  Status QR
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Dinamis ({countdown}s)
                </span>
              </div>
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              aria-label="Perbarui token QR sekarang"
              className="p-3 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl backdrop-blur text-white transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title="Perbarui token QR sekarang"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── KONTEN UTAMA ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/90 p-8 text-center text-[13px] text-neutral-500">
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className="font-medium">Memuat data Digital QR tiket aktif...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/90 p-8">
          <EmptyState
            icon={QrCode}
            title="Belum Ada Tiket / Trip Aktif"
            description="QR Code dinamis hanya tersedia untuk tiket perjalanan yang sedang aktif atau dijadwalkan berangkat. Silakan pesan perjalanan baru melalui menu Cari Trip."
          />
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/customer/booking')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-sm hover:opacity-95 transition cursor-pointer"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <span>Cari & Booking Trip Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── KOLOM KIRI: DAFTAR TIKET AKTIF ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/90 p-5 sm:p-6 lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h2 className="text-[16px] font-bold text-neutral-800 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-brand-600" />
                <span>Pilih Tiket Aktif</span>
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-brand-700 border border-blue-200/70">
                {tickets.length} Tiket
              </span>
            </div>

            <div className="space-y-2.5">
              {tickets.map((ticket) => {
                const isSelected = String(selectedTicketId) === String(ticket.id);

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      handleManualRefresh();
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 shadow-sm ring-1 ring-brand-500/30'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50/80 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-[13px] text-neutral-800">
                        {ticket.qrCodeTicket}
                      </span>
                      <StatusBadge variant={ticket.statusVariant}>
                        {ticket.statusDisplay}
                      </StatusBadge>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 mb-1">
                      {ticket.isParcel ? (
                        <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate">{ticket.title}</span>
                    </div>

                    <p className="text-[13px] font-bold text-neutral-800 flex items-center gap-1.5">
                      <span className="truncate">{ticket.origin}</span>
                      <span className="text-neutral-400 shrink-0">&rarr;</span>
                      <span className="truncate">{ticket.destination}</span>
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
                      <span className="truncate">{ticket.mitraName}</span>
                      <span className="shrink-0 font-medium">{ticket.departureDate}</span>
                    </div>

                    {isSelected && (
                      <div className="absolute right-2.5 bottom-2.5 text-brand-600">
                        <CheckCircle2 className="w-4 h-4 fill-brand-50" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => navigate('/customer/tickets')}
                className="w-full py-2.5 px-3 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-[12px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-neutral-500" />
                <span>Lihat Semua di Tiket Saya</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* ── KOLOM KANAN: DIGITAL QR DEVICE DISPLAY (MOCKUP PERANGKAT) ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/90 p-5 sm:p-6 lg:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="w-full max-w-sm bg-neutral-900 p-5 rounded-3xl text-white shadow-xl border-4 border-neutral-800 relative">
              {/* Header Mockup */}
              <div className="flex justify-between items-center text-[11px] text-neutral-400 mb-3 px-1">
                <span className="font-semibold tracking-wide">Nebeng Customer Pass</span>
                <span className="flex items-center gap-1 font-bold text-accent">
                  <ShieldCheck className="w-3 h-3 text-accent" />
                  Live Dynamic QR
                </span>
              </div>

              {/* Box QR Code Canvas */}
              <div className="bg-white p-4 rounded-2xl shadow-inner my-1 flex flex-col items-center">
                <div className="w-44 h-44 bg-white p-2 rounded-xl flex items-center justify-center relative shadow-xs border border-neutral-100">
                  {qrError ? (
                    <div className="flex flex-col items-center gap-1.5 text-rose-600 text-center px-2">
                      <AlertCircle className="w-6 h-6" />
                      <p className="text-[11px] font-bold">Gagal membuat QR. Tekan tombol perbarui.</p>
                    </div>
                  ) : (
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  )}
                </div>

                <p className="text-neutral-900 font-bold text-[15px] font-mono mt-2">
                  {current?.qrCodeTicket}
                </p>
                <p className="text-neutral-600 text-[12px] font-semibold mt-0.5">
                  {current?.origin} &rarr; {current?.destination}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400">
                  {current?.isParcel ? (
                    <Package className="w-3 h-3 text-neutral-500" />
                  ) : (
                    <Users className="w-3 h-3 text-neutral-500" />
                  )}
                  <span>{current?.detail}</span>
                </div>
              </div>

              {/* Panel Detail Keamanan & Jadwal */}
              <div className="mt-3 bg-white/10 p-3 rounded-xl border border-white/10 text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    Token Keamanan:
                  </span>
                  <span className="text-[12px] font-mono font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-md">
                    {dynamicToken}
                  </span>
                </div>



                <div className="pt-1 border-t border-white/10 text-[12px] text-neutral-200 space-y-0.5">
                  <p className="font-semibold text-white">
                    {current?.schedule || `${current?.departureDate || 'Hari Ini'} • Sesuai Jadwal`}
                  </p>
                  {current?.durationFormatted && (
                    <p className="text-[11px] text-blue-200 flex items-center gap-1 font-semibold">
                      <Smartphone className="w-3 h-3 text-blue-300" />
                      <span>
                        Estimasi Perjalanan: {current.durationFormatted}
                        {current.distanceKm ? ` (${current.distanceKm} km)` : ''}
                        {current.estimatedArrivalTime ? ` • Tiba ~${current.estimatedArrivalTime}` : ''}
                      </span>
                    </p>
                  )}
                  <p className="text-[11px] text-neutral-300 flex items-center gap-1">
                    <Car className="w-3 h-3 text-neutral-400" />
                    <span>{current?.mitraName} ({current?.vehicle})</span>
                  </p>
                </div>
              </div>

              {/* Bar Auto-refresh & Tombol Manual */}
              <div
                className="mt-3 flex items-center justify-between text-[11px] font-bold py-2 px-3 rounded-xl"
                style={{
                  color: PRIMARY_ACCENT,
                  backgroundColor: 'rgba(116, 180, 217, 0.12)',
                  border: '1px solid rgba(116, 180, 217, 0.25)',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Auto-refresh: {countdown}s
                </span>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="px-2.5 py-1 rounded-lg text-white font-bold transition cursor-pointer hover:opacity-95 shadow-xs"
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

