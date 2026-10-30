import { useState, useEffect } from 'react';
import { Calendar, Clock, UserX, Car, AlertTriangle, MapPin, Building2, RefreshCw } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';

export default function OperatorManifest() {
  const toast = useToast();
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPosId, setSelectedPosId] = useState('');
  const [posList, setPosList] = useState([]);

  useEffect(() => {
    loadManifest();
  }, [selectedDate, selectedPosId]);

  const loadManifest = async () => {
    try {
      setIsLoading(true);
      const params = { date: selectedDate };
      if (selectedPosId) {
        params.posId = selectedPosId;
      }

      const response = await apiClient.get('/checkpoints/manifest', { params });
      setManifest(response.data);

      if (response.data?.availablePos && posList.length === 0) {
        setPosList(response.data.availablePos);
      }
    } catch (error) {
      console.error('Gagal memuat manifest:', error);
      toast.error(error.response?.data?.message || 'Gagal memuat manifest pos', { title: 'Error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassengerNoShow = async (orderId, tripId) => {
    const isConfirmed = await confirm({
      title: 'Tandai Penumpang No-Show',
      message: 'Apakah Anda yakin ingin menandai penumpang ini tidak datang? Tiket akan hangus tanpa refund.',
      confirmText: 'Ya, Tandai No-Show',
      cancelText: 'Batal',
      variant: 'warning',
    });
    if (!isConfirmed) return;

    try {
      await apiClient.post('/checkpoints/passenger-no-show-by-id', {
        orderId,
        posId: manifest?.posId || selectedPosId,
      });
      toast.success('Penumpang no-show berhasil dicatat', { title: 'Berhasil' });
      loadManifest();
    } catch (error) {
      console.error('Gagal menandai no-show:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai no-show', {
        title: 'Error',
      });
    }
  };

  const handleMitraNoShow = async (tripId) => {
    const reason = prompt('Masukkan alasan mitra tidak datang:');
    if (!reason) return;

    try {
      await apiClient.post('/checkpoints/mitra-no-show-by-id', {
        tripId,
        posId: manifest?.posId || selectedPosId,
        reason,
      });
      toast.success('Mitra no-show berhasil dicatat', { title: 'Berhasil' });
      loadManifest();
    } catch (error) {
      console.error('Gagal menandai mitra no-show:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai mitra no-show', {
        title: 'Error',
      });
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

  const getPassengerBadgeVariant = (status) => {
    switch (status) {
      case 'in_transit':
      case 'checked_in_origin':
        return 'blue';
      case 'completed':
      case 'paid':
        return 'emerald';
      case 'no_show':
      case 'cancelled':
        return 'rose';
      default:
        return 'default';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── HEADER & FILTER ── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />
            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: PRIMARY_COLOR }}
            >
              <Car className="w-3.5 h-3.5" />
              Manifes Pos & Kehadiran
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Manifes & No-Show
          </h1>

          <p className="text-[13px] text-neutral-400 mt-0.5">
            Daftar seluruh trip dan penumpang terjadwal beserta pemantauan status kehadiran pos.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Pos */}
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700">
            <Building2 className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedPosId}
              onChange={(e) => setSelectedPosId(e.target.value)}
              className="bg-transparent border-none text-neutral-800 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Semua Pos Ditugaskan</option>
              {posList.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700">
            <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-neutral-800 text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={loadManifest}
            className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-neutral-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-500">Memuat manifes pos...</p>
        </div>
      ) : !manifest || manifest.trips.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-neutral-200">
          <EmptyState
            icon={Car}
            title="Tidak Ada Trip Ditemukan"
            description={`Tidak ada trip terjadwal untuk tanggal ${selectedDate}${
              selectedPosId ? ' pada pos terpilih' : ''
            }. Coba pilih tanggal atau pos lain.`}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {manifest.trips.map((trip) => (
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
                      {trip.status === 'in_origin_pos'
                        ? 'Di Pos Asal (Stand-by)'
                        : trip.status === 'in_transit'
                        ? 'Dalam Perjalanan'
                        : trip.status === 'scheduled'
                        ? 'Dijadwalkan'
                        : trip.status}
                    </StatusBadge>
                  </div>

                  <p className="text-xs text-neutral-500 font-medium">
                    {trip.vehicle} {trip.mitraPhone ? `• ${trip.mitraPhone}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-700">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{formatDepartureTime(trip.departureTime)}</span>
                  </div>

                  {trip.canMarkMitraNoShow && (
                    <button
                      type="button"
                      onClick={() => handleMitraNoShow(trip.tripId)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>Mitra No-Show</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rute Info */}
              <div className="bg-neutral-50/80 p-3 rounded-xl border border-neutral-100 flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-neutral-800">{trip.originPoint}</span>
                <span className="text-neutral-400 font-bold">➔</span>
                <span className="font-bold text-neutral-800">{trip.destinationPoint}</span>
              </div>

              {/* Passengers List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Daftar Penumpang / Paket Terdaftar ({trip.passengers.length})
                </h4>

                {trip.passengers.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic py-1">
                    Belum ada tiket pemesanan pada trip ini.
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
                            {Number(passenger.totalWeightKg) > 0 ? `• ${passenger.totalWeightKg} Kg` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge variant={getPassengerBadgeVariant(passenger.status)}>
                            {passenger.status}
                          </StatusBadge>

                          {passenger.canMarkNoShow && (
                            <button
                              type="button"
                              onClick={() => handlePassengerNoShow(passenger.orderId, trip.tripId)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <UserX className="w-3 h-3" />
                              <span>No-Show</span>
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
    </div>
  );
}
