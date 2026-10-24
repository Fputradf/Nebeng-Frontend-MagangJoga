import { X, CheckCircle2, Clock, MapPin, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import BaseModal from '../../../components/ui/BaseModal';

// const PRIMARY_COLOR = '#10367D';

export default function TicketTimelineModal({ isOpen, onClose, ticket }) {
  if (!isOpen || !ticket) return null;

  const logs = ticket.checkpointsLogs || [];
  const status = ticket.currentStatusText || ticket.status;

  // Cek pencapaian tahapan perjalanan
  const isPaid = ['paid', 'checked_in_origin', 'in_transit', 'arrived_destination', 'completed'].includes(status);
  const isCheckedInOrigin = ['checked_in_origin', 'in_transit', 'arrived_destination', 'completed'].includes(status);
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isNoShow = status === 'no_show';

  // Temukan detail log spesifik jika ada
  const originLog = logs.find((l) => l.scanType === 'checkin_origin');
  const destLog = logs.find((l) => l.scanType === 'checkin_destination');

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const steps = [
    {
      id: 'created',
      title: 'Tiket Dipesan',
      subtitle: `No. Tiket: ${ticket.qrCodeTicket || ticket.id}`,
      time: formatTime(ticket.createdAt),
      isDone: true,
      isActive: status === 'pending_payment',
      icon: Clock,
      color: 'bg-blue-600',
    },
    {
      id: 'paid',
      title: 'Pembayaran Dikonfirmasi & Dana Ditahan di Escrow',
      subtitle: isNoShow ? 'Tiket hangus (penumpang tidak datang)' : 'Pembayaran aman tersimpan di sistem rekening bersama',
      time: isPaid ? (isNoShow ? 'No-Show (Hangus)' : 'Pembayaran Sukses') : 'Menunggu Pembayaran',
      isDone: isPaid,
      isActive: status === 'paid',
      icon: ShieldCheck,
      color: isNoShow ? 'bg-orange-600' : 'bg-emerald-600',
    },
    {
      id: 'origin_scan',
      title: `Check-in Pos Asal (${ticket.from || 'Pos Asal'})`,
      subtitle: originLog
        ? `Diperiksa & Disegel oleh ${originLog.operatorName} di ${originLog.posName}`
        : 'Menunggu pemeriksaan fisik & scan oleh Operator Pos Asal',
      time: originLog ? formatTime(originLog.createdAt) : '--:--',
      isDone: isCheckedInOrigin,
      isActive: status === 'checked_in_origin',
      icon: UserCheck,
      color: 'bg-indigo-600',
    },
    {
      id: 'in_transit',
      title: 'Dalam Perjalanan Menuju Pos Tujuan',
      subtitle: `Armada: ${ticket.vehicle || 'Mitra'} • Sopir: ${ticket.mitra || 'Mitra'}`,
      time: isCheckedInOrigin && !isCompleted ? 'Sedang Bergerak' : isCompleted ? 'Selesai' : '--:--',
      isDone: isCheckedInOrigin,
      isActive: status === 'in_transit',
      icon: MapPin,
      color: 'bg-amber-600',
    },
    {
      id: 'dest_scan',
      title: `Tiba & Serah Terima di ${ticket.to || 'Pos Tujuan'}`,
      subtitle: destLog
        ? `Diverifikasi dengan OTP oleh ${destLog.operatorName}. Dana Escrow berhasil dicairkan ke Mitra.`
        : ticket.otp
        ? `Tunjukkan Kode OTP: [ ${ticket.otp} ] kepada Operator Pos Tujuan saat pengambilan`
        : 'Menunggu kedatangan di Pos Tujuan',
      time: destLog ? formatTime(destLog.createdAt) : '--:--',
      isDone: isCompleted,
      isActive: status === 'arrived_destination',
      icon: CheckCircle2,
      color: 'bg-emerald-600',
    },
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Riwayat & Audit Checkpoint Tiket
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              ID Pesanan: #{ticket.id} • {ticket.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kondisi Batal */}
        {isCancelled && (
          <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Pesanan Telah Dibatalkan.</span>
              <p className="mt-0.5">Seluruh proses perjalanan dihentikan.</p>
            </div>
          </div>
        )}

        {/* Kondisi No-Show Penumpang */}
        {isNoShow && (
          <div className="my-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-orange-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Penumpang Tidak Datang (No-Show).</span>
              <p className="mt-0.5">Tiket dianggap hangus tanpa refund. Kuota kursi telah dikembalikan ke trip.</p>
              {ticket.disputeDeadline && !ticket.isDisputed && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-orange-600">
                    Jendela keberatan: {new Date(ticket.disputeDeadline).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stepper Timeline List */}
        <div className="py-6 space-y-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Garis Vertikal Antar Step */}
                {!isLast && (
                  <div
                    className={`absolute left-4.25 top-9 bottom-6 w-0.5 transition-colors ${
                      step.isDone ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                )}

                {/* Lingkaran Icon */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    step.isDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : step.isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md animate-pulse'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Konten Step */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-semibold ${
                        step.isDone || step.isActive
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <span className="text-[14px] font-medium text-gray-500 ml-2 shrink-0">
                      {step.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {step.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="border-t pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </BaseModal>
  );
}