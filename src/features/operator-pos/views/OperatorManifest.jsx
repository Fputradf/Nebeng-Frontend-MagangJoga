import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  UserX,
  UserCheck,
  Car,
  MapPin,
  Building2,
  RefreshCw,
  Search,
  Users,
  AlertCircle,
  CalendarDays,
  CalendarClock,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import ReportModal from '../../../components/common/ReportModal';
import { evaluateOperatorReportEligibility } from '../../../utils/reportCheckpointValidation';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';

export default function OperatorManifest() {
  const toast = useToast();
  const confirm = useConfirm();

  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'custom'
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedPosId, setSelectedPosId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [posList, setPosList] = useState([]);

  // Report Modal State
  const [reportTargetUser, setReportTargetUser] = useState(null);
  const [reportContext, setReportContext] = useState({});
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleOpenReportDriver = (trip) => {
    // Validasi audit checkpoint: Driver harus sudah datang di pos
    const eligibility = evaluateOperatorReportEligibility({ targetType: 'driver', trip });
    if (!eligibility.canReport) {
      toast.warning(eligibility.reason, { title: 'Fitur Lapor Terkunci' });
      return;
    }

    setReportTargetUser({
      id: trip.mitraId,
      name: trip.mitraName || 'Mitra Supir',
      role: 'Mitra Driver',
    });
    setReportContext({
      tripId: trip.tripId,
      pickupPointId: selectedPosId || manifest?.currentPos?.id,
    });
    setIsReportModalOpen(true);
  };

  const handleOpenReportPassenger = (passenger, trip) => {
    // Validasi audit checkpoint: Penumpang harus sudah sampai / check-in di pos
    const eligibility = evaluateOperatorReportEligibility({ targetType: 'passenger', passenger });
    if (!eligibility.canReport) {
      toast.warning(eligibility.reason, { title: 'Fitur Lapor Terkunci' });
      return;
    }

    setReportTargetUser({
      id: passenger.customerId,
      name: passenger.customerName || 'Penumpang',
      role: 'Customer',
    });
    setReportContext({
      orderId: passenger.orderId,
      tripId: trip.tripId,
      pickupPointId: selectedPosId || manifest?.currentPos?.id,
    });
    setIsReportModalOpen(true);
  };

  useEffect(() => {
    loadManifest();
  }, [activeTab, selectedDate, selectedPosId]);

  const loadManifest = async () => {
    try {
      setIsLoading(true);
      const params = {};

      if (activeTab === 'today') {
        params.scope = 'today';
        params.date = getTodayStr();
      } else if (activeTab === 'upcoming') {
        params.scope = 'upcoming';
        params.date = getTodayStr();
      } else {
        params.scope = 'date';
        params.date = selectedDate;
      }

      if (selectedPosId) {
        params.posId = selectedPosId;
      }

      const response = await apiClient.get('/checkpoints/manifest', { params });
      setManifest(response.data);

      if (response.data?.availablePos && posList.length === 0) {
        setPosList(response.data.availablePos);
      }
    } catch (error) {
      console.error('Gagal memuat daftar kehadiran pos:', error);
      toast.error(error.response?.data?.message || 'Gagal memuat jadwal & kehadiran penumpang pos', {
        title: 'Gagal Memuat Data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassengerNoShow = async (orderId, tripId, passengerName) => {
    const isConfirmed = await confirm({
      title: 'Tandai Penumpang Tidak Hadir (No-Show)',
      message: `Apakah Anda yakin ingin menandai penumpang ${
        passengerName ? `"${passengerName}"` : 'ini'
      } tidak datang ke pos? Tiket akan dinyatakan hangus tanpa pengembalian dana (refund).`,
      confirmText: 'Ya, Tandai Tidak Hadir',
      cancelText: 'Batal',
      variant: 'warning',
    });
    if (!isConfirmed) return;

    try {
      await apiClient.post('/checkpoints/passenger-no-show-by-id', {
        orderId,
        posId: manifest?.posId || selectedPosId,
      });
      toast.success('Penumpang berhasil dicatat tidak hadir (no-show)', { title: 'Berhasil' });
      loadManifest();
    } catch (error) {
      console.error('Gagal menandai tidak hadir:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai penumpang tidak hadir', {
        title: 'Error',
      });
    }
  };

  const handleMitraNoShow = async (tripId, mitraName) => {
    const reason = prompt(
      `Masukkan alasan supir/mitra ${mitraName ? `"${mitraName}"` : ''} tidak hadir di pos asal:`
    );
    if (!reason || !reason.trim()) return;

    try {
      await apiClient.post('/checkpoints/mitra-no-show-by-id', {
        tripId,
        posId: manifest?.posId || selectedPosId,
        reason: reason.trim(),
      });
      toast.success('Supir/mitra berhasil dicatat tidak hadir (no-show)', { title: 'Berhasil' });
      loadManifest();
    } catch (error) {
      console.error('Gagal menandai supir tidak hadir:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai supir tidak hadir', {
        title: 'Error',
      });
    }
  };

  const formatTripDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const today = getTodayStr();
      const dToday = new Date(today + 'T00:00:00');
      const dTomorrow = new Date(dToday);
      dTomorrow.setDate(dTomorrow.getDate() + 1);

      const tomorrowStr = dTomorrow.toISOString().split('T')[0];

      if (dateStr === today) {
        return 'Hari Ini';
      }
      if (dateStr === tomorrowStr) {
        return 'Besok';
      }

      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDepartureTime = (timeStr) => {
    if (!timeStr) return '--:--';
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const parts = timeStr.split('T')[1].slice(0, 5);
      return `${parts} WIB`;
    }
    return timeStr;
  };

  const getTripBadgeVariant = (status) => {
    switch (status) {
      case 'in_origin_pos':
      case 'in_transit':
        return 'blue';
      case 'completed':
        return 'emerald';
      case 'mitra_no_show':
      case 'cancelled':
      case 'cancelled_by_mitra':
        return 'rose';
      default:
        return 'amber';
    }
  };

  const getTripStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Terjadwal';
      case 'in_origin_pos':
        return 'Di Pos Asal (Stand-by)';
      case 'in_transit':
        return 'Dalam Perjalanan';
      case 'completed':
        return 'Selesai';
      case 'mitra_no_show':
        return 'Supir Tidak Hadir';
      case 'cancelled':
      case 'cancelled_by_mitra':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const getPassengerBadgeVariant = (status) => {
    switch (status) {
      case 'in_transit':
      case 'checked_in_origin':
        return 'blue';
      case 'completed':
        return 'emerald';
      case 'paid':
        return 'amber';
      case 'no_show':
      case 'cancelled':
        return 'rose';
      default:
        return 'default';
    }
  };

  const getPassengerStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'Menunggu di Pos';
      case 'checked_in_origin':
        return 'Sudah Hadir / Masuk';
      case 'in_transit':
        return 'Dalam Perjalanan';
      case 'completed':
        return 'Tiba di Tujuan';
      case 'no_show':
        return 'Tidak Hadir (Hangus)';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  // Filtered trips by search query
  const filteredTrips = useMemo(() => {
    if (!manifest?.trips) return [];
    if (!searchQuery.trim()) return manifest.trips;

    const query = searchQuery.toLowerCase().trim();
    return manifest.trips.filter((trip) => {
      const tripIdMatch = String(trip.tripId).includes(query);
      const mitraMatch = trip.mitraName?.toLowerCase().includes(query);
      const vehicleMatch = trip.vehicle?.toLowerCase().includes(query);
      const originMatch = trip.originPoint?.toLowerCase().includes(query);
      const destMatch = trip.destinationPoint?.toLowerCase().includes(query);
      const passengerMatch = trip.passengers?.some(
        (p) =>
          p.customerName?.toLowerCase().includes(query) ||
          String(p.orderId).includes(query) ||
          p.passengers?.some((sub) => sub.name?.toLowerCase().includes(query))
      );

      return (
        tripIdMatch ||
        mitraMatch ||
        vehicleMatch ||
        originMatch ||
        destMatch ||
        passengerMatch
      );
    });
  }, [manifest?.trips, searchQuery]);

  // Statistik ringkas
  const stats = useMemo(() => {
    const trips = manifest?.trips || [];
    let totalPassengers = 0;
    let checkedInPassengers = 0;
    let noShowPassengers = 0;
    let waitingPassengers = 0;

    trips.forEach((t) => {
      (t.passengers || []).forEach((p) => {
        totalPassengers += 1;
        if (p.status === 'checked_in_origin' || p.status === 'in_transit' || p.status === 'completed') {
          checkedInPassengers += 1;
        } else if (p.status === 'no_show') {
          noShowPassengers += 1;
        } else if (p.status === 'paid') {
          waitingPassengers += 1;
        }
      });
    });

    return {
      totalTrips: trips.length,
      totalPassengers,
      checkedInPassengers,
      noShowPassengers,
      waitingPassengers,
    };
  }, [manifest?.trips]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── HEADER & KONTROL FILTER ── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: PRIMARY_COLOR }}
              />
              <span
                className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: PRIMARY_COLOR }}
              >
                <Users className="w-3.5 h-3.5" />
                Daftar Penumpang & Kehadiran Pos
              </span>
            </div>

            <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
              Cek Kehadiran Penumpang
            </h1>

            <p className="text-[13px] text-neutral-500 mt-0.5">
              Pantau jadwal keberangkatan, cek status kehadiran penumpang dan supir di pos, serta catat jika ada yang tidak hadir.
            </p>
          </div>

          {/* Filter Controls (Pos Dropdown & Refresh) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Dropdown Pos */}
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700">
              <Building2 className="w-4 h-4 text-neutral-400 shrink-0" />
              <select
                value={selectedPosId}
                onChange={(e) => setSelectedPosId(e.target.value)}
                className="bg-transparent border-none text-neutral-800 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="">Semua Pos Saya</option>
                {posList.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={loadManifest}
              disabled={isLoading}
              className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Muat Ulang Jadwal"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* ── TABS PERJALANAN (HARI INI / AKAN DATANG / PILIH TANGGAL) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Hari Ini</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Akan Datang</span>
              {activeTab === 'upcoming' && manifest?.trips?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                  {manifest.trips.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Pilih Tanggal</span>
            </button>
          </div>

          {/* Kolom Pencarian Cepat & Date Picker jika Custom */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'custom' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700">
                <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-neutral-800 text-xs font-bold focus:outline-none cursor-pointer"
                />
              </div>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari trip, supir, penumpang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── STATISTIK SINGKAT ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <span className="text-[11px] font-semibold text-neutral-400 block">Total Perjalanan</span>
            <span className="text-lg font-bold text-neutral-800">{stats.totalTrips} Trip</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-[11px] font-semibold text-blue-600 block">Total Penumpang</span>
            <span className="text-lg font-bold text-blue-900">{stats.totalPassengers} Orang</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-600 block">Sudah Hadir</span>
            <span className="text-lg font-bold text-emerald-900">{stats.checkedInPassengers} Orang</span>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-600 block">Tidak Hadir (No-Show)</span>
            <span className="text-lg font-bold text-rose-900">{stats.noShowPassengers} Orang</span>
          </div>
        </div>
      </div>

      {/* ── DAFTAR PERJALANAN ── */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-neutral-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-500">Memuat data jadwal dan kehadiran penumpang...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-neutral-200">
          <EmptyState
            icon={Car}
            title={
              activeTab === 'today'
                ? 'Tidak Ada Jadwal Hari Ini'
                : activeTab === 'upcoming'
                ? 'Tidak Ada Jadwal Mendatang'
                : 'Tidak Ada Trip Ditemukan'
            }
            description={
              searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}". Coba kata kunci lain.`
                : activeTab === 'today'
                ? 'Belum ada jadwal perjalanan untuk hari ini di pos terpilih. Anda dapat mengecek tab "Akan Datang" untuk melihat jadwal trip berikutnya.'
                : activeTab === 'upcoming'
                ? 'Belum ada perjalanan yang dijadwalkan di pos ini untuk waktu mendatang.'
                : `Tidak ada trip terjadwal untuk tanggal ${selectedDate}${
                    selectedPosId ? ' pada pos terpilih' : ''
                  }.`
            }
            action={
              activeTab === 'today' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  Lihat Jadwal Akan Datang
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <div
              key={trip.tripId}
              className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4 transition hover:border-blue-200"
            >
              {/* Trip Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                      #TRIP-{trip.tripId}
                    </span>

                    <h3 className="text-base font-bold text-neutral-800">
                      {trip.mitraName}
                    </h3>

                    <StatusBadge variant={getTripBadgeVariant(trip.status)}>
                      {getTripStatusLabel(trip.status)}
                    </StatusBadge>
                  </div>

                  <p className="text-xs text-neutral-500 font-medium">
                    {trip.vehicle} {trip.mitraPhone ? `• Telp: ${trip.mitraPhone}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  {/* Badge Tanggal & Jam Keberangkatan */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs font-bold text-blue-900">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {trip.departureDate ? formatTripDate(trip.departureDate) : 'Hari Ini'}
                    </span>
                    <span className="text-blue-300">•</span>
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatDepartureTime(trip.departureTime)}</span>
                  </div>

                  {trip.canMarkMitraNoShow && (
                    <button
                      type="button"
                      onClick={() => handleMitraNoShow(trip.tripId, trip.mitraName)}
                      className="min-h-[44px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Tandai jika supir tidak datang ke pos melewati batas waktu toleransi"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>Supir Tidak Hadir</span>
                    </button>
                  )}

                  {(() => {
                    const eligibility = evaluateOperatorReportEligibility({ targetType: 'driver', trip });
                    return eligibility.canReport ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReportDriver(trip)}
                        className="min-h-[44px] px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        title="Laporkan driver terkait pelanggaran operasional atau manifest pos"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Laporkan Driver</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(eligibility.reason, {
                            title: 'Fitur Lapor Driver Terkunci',
                          })
                        }
                        className="min-h-[44px] px-3 py-1.5 bg-neutral-100 text-neutral-400 border border-neutral-200 text-xs font-medium rounded-xl transition cursor-not-allowed flex items-center gap-1.5"
                        title={eligibility.reason}
                      >
                        <Lock className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Laporkan Driver (Terkunci)</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Rute Perjalanan */}
              <div className="bg-neutral-50/80 p-3 rounded-xl border border-neutral-100 flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-neutral-800">{trip.originPoint}</span>
                <span className="text-neutral-400 font-bold">➔</span>
                <span className="font-bold text-neutral-800">{trip.destinationPoint}</span>
              </div>

              {/* Daftar Penumpang */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Daftar Penumpang Terdaftar ({trip.passengers.length} Orang)
                  </h4>
                </div>

                {trip.passengers.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic py-1">
                    Belum ada tiket pemesanan pada jadwal perjalanan ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {trip.passengers.map((passenger) => (
                      <div
                        key={passenger.orderId}
                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white shadow-2xs text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-800">
                              {passenger.customerName}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              #{passenger.orderId}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {passenger.seatsBooked} Kursi{' '}
                            {Number(passenger.totalWeightKg) > 0 ? `• ${passenger.totalWeightKg} Kg Bagasi` : ''}
                            {passenger.customerPhone ? ` • ${passenger.customerPhone}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge variant={getPassengerBadgeVariant(passenger.status)}>
                            {getPassengerStatusLabel(passenger.status)}
                          </StatusBadge>

                          {(() => {
                            const eligibility = evaluateOperatorReportEligibility({ targetType: 'passenger', passenger });
                            return eligibility.canReport ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReportPassenger(passenger, trip)}
                                className="min-h-[44px] px-2.5 py-1 bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-700 border border-neutral-200 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                title="Laporkan penumpang jika melanggar tata tertib pos atau membawa kargo berbahaya"
                              >
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>Lapor</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  toast.info(eligibility.reason, {
                                    title: 'Fitur Lapor Penumpang Terkunci',
                                  })
                                }
                                className="min-h-[44px] px-2.5 py-1 bg-neutral-100 text-neutral-400 border border-neutral-200 text-[11px] font-medium rounded-lg transition cursor-not-allowed flex items-center gap-1"
                                title={eligibility.reason}
                              >
                                <Lock className="w-3 h-3 text-neutral-400" />
                                <span>Lapor</span>
                              </button>
                            );
                          })()}

                          {passenger.canMarkNoShow && (
                            <button
                              type="button"
                              onClick={() =>
                                handlePassengerNoShow(
                                  passenger.orderId,
                                  trip.tripId,
                                  passenger.customerName
                                )
                              }
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Tandai penumpang tidak datang setelah batas toleransi habis"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Tidak Hadir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Pusat Pelaporan Masalah & Pelanggaran */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetUser={reportTargetUser}
        context={reportContext}
        onSuccess={() => {
          toast.success('Laporan berhasil dikirim dan akan segera diproses oleh tim pengawas.', {
            title: 'Laporan Diterima',
          });
        }}
      />
    </div>
  );
}
