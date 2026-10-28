import { useState, useEffect } from 'react';
import {
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatCard from '../../../components/ui/StatCard';
import { BannerSlider } from '../../../components/ui/BannerSlider';
import { useAuth } from '../../../context/AuthContext';
import { operatorService } from '../../../services/operatorService';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

const DAYS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function OperatorDashboard() {
  const { session, adminProfile } = useAuth();

  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripsSchedule, setTripsSchedule] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const operatorProfile = adminProfile || session;
  const operatorPosId =
    operatorProfile?.assignedPickupPointId || operatorProfile?.posId || operatorProfile?.pickupPointId;

  useEffect(() => {
    let isMounted = true;

    const loadOperatorData = async () => {
      setIsLoadingTrips(true);
      try {
        const params = {
          page: currentPage,
          limit: limit,
          date: new Date().toISOString().split('T')[0],
        };
        
        if (operatorPosId) {
          if (directionFilter === 'masuk') {
            params.destinationPointId = operatorPosId;
          } else if (directionFilter === 'keluar') {
            params.originPointId = operatorPosId;
          } else {
            params.posId = operatorPosId;
          }
        }
        
        const result = await operatorService.getTrips(params);

        if (!isMounted) return;

        const formatted = (result.data || []).map((t) => {
          const timeSource = t.departureTime || t.departureDate || t.createdAt;
          let formattedTime = '-';

          if (timeSource) {
            const d = new Date(timeSource);
            if (!isNaN(d.getTime())) {
              formattedTime =
                d.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' WIB';
            }
          }

          const isIncoming =
            operatorPosId && t.destinationPointId
              ? String(t.destinationPointId) === String(operatorPosId)
              : false;

          return {
            id: String(t.id),
            type: isIncoming ? 'Masuk' : 'Keluar',
            partnerName:
              t.mitra?.name || t.driver?.name || t.mitraName || 'Mitra Pos',
            service: t.vehicleType === 'mobil' ? 'Mobil' : 'Motor',
            plateNumber: t.vehicle?.plateNumber || '-',
            time: formattedTime,
            status: t.status || 'scheduled',
            originName: t.originPoint?.name || 'Pos Asal',
            destName: t.destinationPoint?.name || 'Pos Tujuan',
          };
        });

        setTripsSchedule(formatted);
        if (result.meta) {
          setPaginationMeta(result.meta);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Gagal mengambil data operasional pos:', error);
          setTripsSchedule([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTrips(false);
        }
      }
    };

    loadOperatorData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, limit, operatorPosId, directionFilter]);

  const incomingCount = tripsSchedule.filter((t) => t.type === 'Masuk').length;
  const outgoingCount = tripsSchedule.filter((t) => t.type === 'Keluar').length;

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return {
          label: 'Selesai',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'in_transit':
      case 'ongoing':
        return {
          label: 'Berjalan',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-500 animate-pulse',
        };
      case 'scheduled':
        return {
          label: 'Dijadwalkan',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'cancelled':
      case 'canceled':
      case 'cancelled_by_mitra':
        return {
          label: 'Dibatalkan',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'no_show':
        return {
          label: 'Penumpang Tidak Datang',
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          dot: 'bg-orange-500',
        };
      case 'mitra_no_show':
        return {
          label: 'Mitra Tidak Datang',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500',
        };
      default:
        return {
          label: status || 'Pending',
          bg: 'bg-neutral-100',
          text: 'text-neutral-600',
          border: 'border-neutral-200',
          dot: 'bg-neutral-400',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                OPERASIONAL TERMINAL & POS
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Dashboard Operasional Pos</h1>
            <p className="mt-1 text-sm text-blue-100">Pantau jadwal trip mitra yang masuk dan keluar di pos Anda secara realtime dari server.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white/15 border border-white/25 rounded-full backdrop-blur">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">TANGGAL HARI INI</p>
                <p className="text-[13px] font-bold text-white">{todayLabel}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>
      <BannerSlider role="operator" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="TRIP MASUK (HALAMAN INI)"
          value={`${incomingCount} Trip`}
          subtitle={`Total Keseluruhan: ${paginationMeta.total}`}
          icon={ArrowDownLeft}
        />
        <StatCard
          title="TRIP KELUAR (HALAMAN INI)"
          value={`${outgoingCount} Trip`}
          subtitle={`Total Keseluruhan: ${paginationMeta.total}`}
          icon={ArrowUpRight}
        />
        <StatCard
          title="STATUS OPERASIONAL POS"
          value="Buka / Normal"
          subtitle="Terverifikasi Sistem"
          icon={CheckCircle2}
        />
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: `${PRIMARY_ACCENT}1A`,
                color: PRIMARY_COLOR,
              }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                Jadwal Trip Mitra Masuk & Keluar Pos
              </h2>
              <p className="text-[13px] text-neutral-400">
                Data terpaginasi langsung dari server backend (Total: {paginationMeta.total} trip)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[14px]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium hidden sm:inline">Arah Trip:</span>
              <select
                value={directionFilter}
                onChange={(e) => {
                  setDirectionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-neutral-200 rounded-lg px-2.5 py-1 bg-white text-neutral-700 font-semibold focus:outline-none focus:border-[#10367D]"
              >
                <option value="all">Semua Arah</option>
                <option value="masuk">Masuk Pos</option>
                <option value="keluar">Keluar Pos</option>
              </select>
            </div>
            
            <div className="w-px h-4 bg-neutral-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium hidden sm:inline">Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-neutral-200 rounded-lg px-2.5 py-1 bg-white text-neutral-700 font-semibold focus:outline-none focus:border-[#10367D]"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={20}>20 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-4">ID TRIP & WAKTU</th>
                <th className="py-3 px-4">TIPE ARAH</th>
                <th className="py-3 px-4">MITRA & KENDARAAN</th>
                <th className="py-3 px-4">LAYANAN</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">RUTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[13px]">
              {isLoadingTrips ? (
                <SkeletonTableRows rows={limit} columns={6} />
              ) : tripsSchedule.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Calendar}
                      title="Belum Ada Jadwal Trip"
                      description="Belum ada trip mitra di database yang dijadwalkan untuk pos ini."
                    />
                  </td>
                </tr>
              ) : (
                tripsSchedule.map((trip) => (
                  <tr key={trip.id} className="hover:bg-neutral-50/60 transition border-b border-neutral-100">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-neutral-800 font-mono text-[14px]">
                        #{trip.id}
                      </p>
                      <p className="text-[12px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#10367D]" />
                        {trip.time}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      {trip.type === 'Masuk' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-purple-600" />
                          Masuk Pos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80">
                          <ArrowUpRight className="w-3.5 h-3.5 text-teal-600" />
                          Keluar Pos
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-neutral-800">{trip.partnerName}</p>
                      <p className="text-[12px] text-neutral-400 font-mono">{trip.plateNumber}</p>
                    </td>
                    
                    <td className="py-3.5 px-4 font-semibold text-neutral-700">{trip.service}</td>

                    <td className="py-3.5 px-4">
                      {(() => {
                        const config = getStatusConfig(trip.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold border ${config.bg} ${config.text} ${config.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                            {config.label}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[13px] text-neutral-600 font-medium bg-neutral-100 px-2 py-1 rounded-md">
                        {trip.originName} ➔ {trip.destName}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 text-[14px] text-neutral-500">
          <div>
            Menampilkan data <span className="font-bold text-neutral-800">{tripsSchedule.length}</span> dari total{' '}
            <span className="font-bold text-neutral-800">{paginationMeta.total}</span> data
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1 || isLoadingTrips}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <span className="font-semibold text-neutral-700 px-2">
              {paginationMeta.page} / {paginationMeta.totalPages || 1}
            </span>
            <button
              disabled={currentPage >= paginationMeta.totalPages || isLoadingTrips}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}