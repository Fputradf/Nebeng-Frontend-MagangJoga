import { useState, useEffect } from 'react';
import { Calendar, Clock, UserX, Car, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';

export default function OperatorManifest() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadManifest();
  }, [selectedDate]);

  const loadManifest = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/checkpoints/manifest', {
        params: { date: selectedDate },
      });
      setManifest(response.data);
    } catch (error) {
      console.error('Gagal memuat manifest:', error);
      toast.error('Gagal memuat manifest pos', { title: 'Error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassengerNoShow = async (orderId, tripId) => {
    if (!confirm('Apakah Anda yakin ingin menandai penumpang ini tidak datang? Tiket akan hangus tanpa refund.')) {
      return;
    }

    try {
      await apiClient.post('/checkpoints/passenger-no-show-by-id', {
        orderId,
        posId: manifest?.posId,
      });
      toast.success('Penumpang no-show berhasil dicatat', { title: 'Berhasil' });
      loadManifest();
    } catch (error) {
      console.error('Gagal menandai no-show:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai no-show', { title: 'Error' });
    }
  };

  const handleMitraNoShow = async (tripId) => {
    const reason = prompt('Masukkan alasan mitra tidak datang:');
    if (!reason) return;

    try {
      await apiClient.post('/checkpoints/mitra-no-show-by-id', {
        tripId,
        posId: manifest?.posId,
        reason,
      });
      toast.success('Mitra no-show berhasil dicatat', { title: 'Berhasil' });
      loadManifest();
    } catch (error) {
      console.error('Gagal menandai mitra no-show:', error);
      toast.error(error.response?.data?.message || 'Gagal menandai mitra no-show', { title: 'Error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
              Manifest Pos
            </h1>
            <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
              Daftar trip dan penumpang yang melewati pos hari ini
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
          <p className="text-center text-neutral-400">Memuat manifest...</p>
        </div>
      ) : !manifest || manifest.trips.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
          <p className="text-center text-neutral-400">Tidak ada trip untuk tanggal ini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manifest.trips.map((trip) => (
            <div key={trip.tripId} className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[17px] font-bold text-neutral-800">
                      {trip.mitraName}
                    </h3>
                    <StatusBadge variant={trip.status === 'mitra_no_show' ? 'red' : 'blue'}>
                      {trip.status}
                    </StatusBadge>
                  </div>
                  <p className="text-[13px] text-neutral-600">{trip.vehicle}</p>
                  <p className="text-[12px] text-neutral-400 mt-1">
                    {trip.originPoint} ➔ {trip.destinationPoint}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-700">
                    {new Date(trip.departureTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {trip.canMarkMitraNoShow && (
                  <button
                    onClick={() => handleMitraNoShow(trip.tripId)}
                    className="px-3 py-2 bg-red-600 text-white text-[12px] font-bold rounded-lg hover:bg-red-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Mitra Tidak Datang</span>
                  </button>
                )}
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <h4 className="text-[13px] font-bold text-neutral-700 mb-3">Penumpang</h4>
                <div className="space-y-2">
                  {trip.passengers.map((passenger) => (
                    <div
                      key={passenger.orderId}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          {passenger.customerName}
                        </p>
                        <p className="text-[12px] text-neutral-500">
                          {passenger.seatsBooked} kursi • {passenger.totalWeightKg} kg
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge
                          variant={
                            passenger.status === 'no_show'
                              ? 'orange'
                              : passenger.status === 'paid'
                              ? 'emerald'
                              : 'gray'
                          }
                        >
                          {passenger.status}
                        </StatusBadge>

                        {passenger.canMarkNoShow && (
                          <button
                            onClick={() => handlePassengerNoShow(passenger.orderId, trip.tripId)}
                            className="px-2 py-1 bg-orange-500 text-white text-[11px] font-bold rounded hover:bg-orange-600 transition cursor-pointer flex items-center gap-1"
                          >
                            <UserX className="w-3 h-3" />
                            <span>No-Show</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
