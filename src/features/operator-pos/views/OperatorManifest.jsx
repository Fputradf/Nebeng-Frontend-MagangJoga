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
  Navigation,
} from 'lucide-react';
import ReportModal from '../../../components/common/ReportModal';
import { evaluateOperatorReportEligibility } from '../../../utils/reportCheckpointValidation';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import BaseModal from '../../../components/ui/BaseModal';
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

  // No-Show Modal State
  const [noShowModalConfig, setNoShowModalConfig] = useState(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [isSubmittingNoShow, setIsSubmittingNoShow] = useState(false);

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

  const handleOpenPassengerNoShow = (passenger, trip) => {
    setNoShowModalConfig({
      type: 'passenger',
      id: passenger.orderId,
      tripId: trip.tripId,
      name: passenger.customerName || `Penumpang #${passenger.orderId}`,
      seats: passenger.seatsBooked || 1,
      phone: passenger.customerPhone,
      defaultReason: 'Penumpang tidak hadir di pos asal sampai batas waktu toleransi habis.',
    });
    setNoShowReason('Penumpang tidak hadir di pos asal sampai batas waktu toleransi habis.');
  };

  const handleOpenMitraNoShow = (trip) => {
    setNoShowModalConfig({
      type: 'mitra',
      id: trip.tripId,
      name: trip.mitraName || `Supir #${trip.tripId}`,
      plate: trip.vehicle || '',
      defaultReason: 'Mitra supir tidak hadir ke pos asal melebihi batas waktu toleransi 15 menit.',
    });
    setNoShowReason('Mitra supir tidak hadir ke pos asal melebihi batas waktu toleransi 15 menit.');
  };

  const handleConfirmNoShow = async () => {
    if (!noShowModalConfig) return;
    if (!noShowReason.trim()) {
      toast.warning('Harap masukkan alasan ketidakhadiran', { title: 'Alasan Diperlukan' });
      return;
    }

    try {
      setIsSubmittingNoShow(true);
      if (noShowModalConfig.type === 'mitra') {
        await apiClient.post('/checkpoints/mitra-no-show-by-id', {
          tripId: noShowModalConfig.id,
          posId: manifest?.posId || selectedPosId,
          reason: noShowReason.trim(),
        });
        toast.success(
          'Mitra supir berhasil ditandai Tidak Hadir (No-Show). Trip dibatalkan dan seluruh penumpang di-refund.',
          { title: 'Supir No-Show Berhasil Diproses' }
        );
      } else {
        await apiClient.post('/checkpoints/passenger-no-show-by-id', {
          orderId: noShowModalConfig.id,
          posId: manifest?.posId || selectedPosId,
          reason: noShowReason.trim(),
        });
        toast.success(
          `Penumpang "${noShowModalConfig.name}" berhasil dicatat Tidak Hadir. Tiket hangus tanpa refund.`,
          { title: 'Penumpang No-Show Dicatat' }
        );
      }
      setNoShowModalConfig(null);
      loadManifest();
    } catch (error) {
      console.error('Gagal memproses status tidak hadir:', error);
      toast.error(error.response?.data?.message || 'Gagal memproses status Tidak Hadir', {
        title: 'Gagal Memproses',
      });
    } finally {
      setIsSubmittingNoShow(false);
    }
  };

  const handleDispatchTrip = async (tripId, vehicle) => {
    if (!window.confirm(`Konfirmasi keberangkatan armada ${vehicle ? `(${vehicle})` : ''} dari pos ini menuju pos tujuan?`)) {
      return;
    }
    try {
      const res = await apiClient.post('/checkpoints/scan', {
        qrCodeTrip: `TRIP-${tripId}`,
        posId: manifest?.posId || selectedPosId,
        scanType: 'checkin_origin',
      });
      toast.success(res.data?.message || 'Armada resmi diberangkatkan!', { title: 'Armada Berangkat' });
      loadManifest();
    } catch (error) {
      console.error('Gagal memberangkatkan armada:', error);
      toast.error(error.response?.data?.message || 'Gagal memberangkatkan armada.', { title: 'Error' });
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

        {/* ── INFO PANDUAN KEHADIRAN & NO-SHOW POS ── */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Panduan Status Kehadiran & Fitur No-Show:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-blue-800 text-[11px]">
              <li>
                <strong>Supir Tidak Hadir:</strong> Aktif jika supir belum check-in di pos hingga lewat batas toleransi 15 menit dari jam berangkat. Menandai supir no-show akan membatalkan trip, me-refund 100% dana penumpang, dan menjatuhkan sanksi pada supir.
              </li>
              <li>
                <strong>Penumpang Tidak Hadir:</strong> Aktif jika supir sudah tiba di pos atau toleransi keberangkatan telah habis namun penumpang belum datang. Tiket hangus tanpa refund dan kursi dikembalikan ke kuota trip.
              </li>
            </ul>
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

                  {trip.status === 'in_origin_pos' && (
                    <button
                      type="button"
                      onClick={() => handleDispatchTrip(trip.tripId, trip.vehicle)}
                      className="min-h-[44px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Berangkatkan armada dan penumpang menuju pos tujuan"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Berangkatkan Armada</span>
                    </button>
                  )}

                  {/* Status & Kontrol Kehadiran Supir */}
                  {(() => {
                    // 1. Supir sudah dinyatakan no-show
                    if (trip.status === 'mitra_no_show') {
                      return (
                        <span className="min-h-[44px] px-3 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                          <span>Supir No-Show</span>
                        </span>
                      );
                    }

                    // 2. Supir sudah hadir di pos asal / dalam perjalanan / selesai
                    if (
                      trip.isMitraCheckedIn ||
                      trip.status === 'in_origin_pos' ||
                      trip.status === 'in_transit' ||
                      trip.status === 'completed'
                    ) {
                      return (
                        <span className="min-h-[44px] px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Supir Sudah di Pos</span>
                        </span>
                      );
                    }

                    // 3. Supir belum hadir dan batas toleransi sudah lewat
                    if (trip.canMarkMitraNoShow || trip.isPastGracePeriod) {
                      return (
                        <button
                          type="button"
                          onClick={() => handleOpenMitraNoShow(trip)}
                          className="min-h-[44px] px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Tandai supir tidak hadir di pos asal setelah melewati batas toleransi"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Tandai Supir Tidak Hadir</span>
                        </button>
                      );
                    }

                    // 4. Supir belum hadir namun toleransi belum lewat
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(
                            `Supir "${trip.mitraName}" belum check-in di pos. Batas toleransi keberangkatan adalah s/d ${formatDepartureTime(
                              trip.gracePeriodEnd || trip.departureTime
                            )} (toleransi 15 menit). Tombol No-Show akan otomatis aktif jika supir belum tiba setelah waktu tersebut.`,
                            { title: 'Status Kehadiran Supir' }
                          )
                        }
                        className="min-h-[44px] px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        title="Klik untuk info batas toleransi kehadiran supir"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Supir Belum Tiba (Toleransi 15 Mnt)</span>
                      </button>
                    );
                  })()}

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

                          {/* Status & Kontrol Kehadiran Penumpang */}
                          {(() => {
                            if (passenger.status === 'no_show') {
                              return (
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                                  <UserX className="w-3 h-3 text-rose-500" />
                                  <span>No-Show (Hangus)</span>
                                </span>
                              );
                            }

                            if (passenger.status === 'checked_in_origin') {
                              return (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-lg flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Hadir di Pos</span>
                                </span>
                              );
                            }

                            if (passenger.status === 'in_transit' || passenger.status === 'completed') {
                              return null;
                            }

                            if (passenger.status === 'paid') {
                              if (passenger.canMarkNoShow) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPassengerNoShow(passenger, trip)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Tandai penumpang tidak datang di pos asal"
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>Tandai Tidak Hadir</span>
                                  </button>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toast.info(
                                      `Penumpang "${passenger.customerName}" belum check-in di pos. Fitur No-Show aktif jika supir sudah tiba di pos asal atau setelah batas toleransi keberangkatan (${formatDepartureTime(
                                        trip.departureTime
                                      )}) terlewati.`,
                                      { title: 'Status Kehadiran Penumpang' }
                                    )
                                  }
                                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 border border-neutral-200 text-[11px] font-medium rounded-lg transition cursor-pointer flex items-center gap-1"
                                  title="Klik untuk info status No-Show penumpang"
                                >
                                  <Lock className="w-3 h-3 text-neutral-400" />
                                  <span>Belum Hadir</span>
                                </button>
                              );
                            }

                            return null;
                          })()}
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

      {/* Modal Konfirmasi Tidak Hadir (No-Show) Mitra / Penumpang */}
      <BaseModal
        isOpen={Boolean(noShowModalConfig)}
        onClose={() => !isSubmittingNoShow && setNoShowModalConfig(null)}
        title={
          noShowModalConfig?.type === 'mitra'
            ? 'Konfirmasi Supir Tidak Hadir'
            : 'Konfirmasi Penumpang Tidak Hadir'
        }
        subtitle={
          noShowModalConfig?.type === 'mitra'
            ? `Tandai supir ${noShowModalConfig?.name} (${noShowModalConfig?.plate}) no-show di pos asal`
            : `Tandai penumpang ${noShowModalConfig?.name} (${noShowModalConfig?.seats} Kursi) no-show di pos asal`
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              noShowModalConfig?.type === 'mitra'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Dampak Konsekuensi Aksi Ini:</span>
            </div>
            {noShowModalConfig?.type === 'mitra' ? (
              <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Jadwal perjalanan ini akan <strong>langsung dibatalkan</strong> (status <code>mitra_no_show</code>).
                </li>
                <li>
                  Seluruh dana pesanan penumpang akan <strong>dikembalikan 100% (Full Refund)</strong> ke dompet customer.
                </li>
                <li>
                  Mitra supir otomatis dikenakan sanksi <strong>pengurangan skor -30 poin</strong> dan <strong>suspensi akun 1 hari</strong>.
                </li>
              </ul>
            ) : (
              <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Tiket pemesanan penumpang dinyatakan <strong>hangus tanpa pengembalian dana (tanpa refund)</strong>.
                </li>
                <li>
                  Kuota kursi penumpang yang dipesan akan <strong>dikembalikan</strong> ke kapasitas trip armada.
                </li>
                <li>Mitra supir tetap aman dan berhak atas pembayaran perjalanan.</li>
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Alasan Ketidakhadiran (No-Show):
            </label>
            <textarea
              rows={3}
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              placeholder="Masukkan catatan/alasan detail..."
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              disabled={isSubmittingNoShow}
              onClick={() => setNoShowModalConfig(null)}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmittingNoShow || !noShowReason.trim()}
              onClick={handleConfirmNoShow}
              className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                noShowModalConfig?.type === 'mitra'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmittingNoShow && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {noShowModalConfig?.type === 'mitra'
                  ? 'Tetapkan Supir Tidak Hadir'
                  : 'Tetapkan Penumpang Tidak Hadir'}
              </span>
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
