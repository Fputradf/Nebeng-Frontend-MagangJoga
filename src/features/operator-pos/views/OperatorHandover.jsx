import { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, AlertTriangle, Unlock } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

export default function OperatorHandover() {
  const toast = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [tripQr, setTripQr] = useState('');
  const [ticketQr, setTicketQr] = useState('');
  const [posId, setPosId] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoverHistory, setHandoverHistory] = useState([]);

  const [showForceModal, setShowForceModal] = useState(false);
  const [forceTicket, setForceTicket] = useState('');
  const [forcePosId, setForcePosId] = useState('');
  const [forceOtp, setForceOtp] = useState('');
  const [isForcing, setIsForcing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchOperatorPos = async () => {
      try {
        const res = await apiClient.get('/pickup-points');
        if (isMounted && res.data) {
          const points = Array.isArray(res.data) ? res.data : res.data.data || [];

          const userRes = await apiClient.get('/auth/me');
          const currentUserId = userRes.data?.id;

          const assignedPoint = points.find(
            (p) => String(p.operatorId) === String(currentUserId)
          );

          const resolvedPosId = assignedPoint?.id || points[0]?.id || '1';
          setPosId(String(resolvedPosId));
          setForcePosId(String(resolvedPosId));
        }
      } catch (err) {
        console.error('Gagal memuat daftar pos:', err);
        setPosId('1');
        setForcePosId('1');
      }
    };

    fetchOperatorPos();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();

    if (
      !recipientName.trim() ||
      !tripQr.trim() ||
      !ticketQr.trim() ||
      !cleanOtp
    ) {
      toast.warning(
        'Mohon lengkapi Nama, QR Trip, QR Resi Paket, dan Kode OTP!',
        { title: 'Data Belum Lengkap' }
      );
      return;
    }

    if (!posId) {
      toast.warning('ID Pos bertugas belum terdeteksi dari sistem.', { title: 'Pos Belum Dimuat' });
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error(
        'Kode OTP wajib berupa 6 digit angka numerik!',
        { title: 'Format OTP Salah' }
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        qrCodeTrip: tripQr.trim().toUpperCase(),
        qrCodeTicket: ticketQr.trim().toUpperCase(),
        posId: String(posId),
        scanType: 'checkin_destination',
        otpClaim: cleanOtp,
        recipientName: recipientName.trim(),
      };

      const res = await apiClient.post('/checkpoints/scan', payload);

      const newLog = {
        id: String(
          res.data?.checkpoint?.id ||
            `HO-${Math.floor(900 + Math.random() * 90)}`
        ),
        recipient: recipientName.trim(),
        ticket: ticketQr.trim().toUpperCase(),
        otp: cleanOtp,
        status: 'Escrow Released & Selesai',
        time: 'Baru saja',
      };

      setHandoverHistory([newLog, ...handoverHistory]);
      setRecipientName('');
      setTripQr('');
      setTicketQr('');
      setOtpCode('');

      toast.success(
        res.data?.message ||
          'Verifikasi Handover sukses! Dana escrow dicairkan ke Mitra.',
        { title: 'Handover Selesai' }
      );
    } catch (error) {
      console.error('Gagal mengirim data handover:', error);

      toast.error(
        error.response?.data?.message ||
          'Gagal memproses verifikasi ke server.',
        { title: 'Error Server' }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceReleaseSubmit = async (e) => {
    e.preventDefault();

    if (!forceTicket.trim() || !forcePosId.trim()) {
      toast.warning(
        'Nomor Tiket dan ID Pos wajib diisi untuk force release!',
        { title: 'Data Kurang' }
      );
      return;
    }

    try {
      setIsForcing(true);

      const payload = {
        qrCodeTicket: forceTicket.trim().toUpperCase(),
        posId: String(forcePosId),
        ...(forceOtp ? { otpClaim: forceOtp.trim() } : {}),
      };

      const res = await apiClient.post(
        '/checkpoints/manual-force-release',
        payload
      );

      toast.success(
        res.data?.message ||
          'Intervensi darurat berhasil! Escrow dicairkan secara manual.',
        { title: 'Force Release Berhasil' }
      );

      setShowForceModal(false);
      setForceTicket('');
      setForceOtp('');
    } catch (error) {
      console.error('Gagal force release:', error);

      toast.error(
        error.response?.data?.message ||
          'Gagal melakukan intervensi darurat.',
        { title: 'Gagal' }
      );
    } finally {
      setIsForcing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_ACCENT }}
            />

            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1 flex-wrap min-w-0"
              style={{ color: PRIMARY_COLOR }}
            >
              <UserCheck className="w-3 h-3" />
              Validasi Handover
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800 break-words">
            Handover & OTP
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Validasi OTP untuk pencairan escrow paket.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForceModal(true)}
          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Bantuan Darurat (Force Release HP Rusak)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h2 className="text-[17px] font-bold text-neutral-800">
            Form Serah Terima Paket
          </h2>

          <form
            onSubmit={handleHandoverSubmit}
            className="space-y-3.5 text-[13px]"
          >
            <input type="hidden" value={posId} />

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                PENERIMA
              </label>

              <input
                type="text"
                required
                placeholder="cth: Siti Rahma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-medium text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                QR CODE TRIP MITRA
              </label>

              <input
                type="text"
                required
                placeholder="cth: TRIP-A2D4CS13"
                value={tripQr}
                onChange={(e) => setTripQr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-mono font-medium text-[13px] uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                QR TIKET / RESI PAKET
              </label>

              <input
                type="text"
                required
                placeholder="cth: TKT-SDJF12H"
                value={ticketQr}
                onChange={(e) => setTicketQr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-mono font-medium text-[13px] uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                KODE OTP 6-DIGIT PENERIMA
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="cth: 876543"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, ''))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-mono tracking-widest text-center text-[15px] font-extrabold"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 disabled:opacity-50 text-white text-[13px] font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 mt-1"
              style={{
                backgroundColor: PRIMARY_COLOR,
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />

              <span>
                {isSubmitting
                  ? 'Memproses...'
                  : 'Verifikasi & Serah Terima'}
              </span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h2 className="text-[17px] font-bold text-neutral-800">
            Riwayat Serah Terima Sesi Ini
          </h2>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">ID/WAKTU</th>
                  <th className="py-3 px-2">PENERIMA</th>
                  <th className="py-3 px-2">TIKET</th>
                  <th className="py-3 px-2">OTP</th>
                  <th className="py-3 px-2">STATUS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 text-[12px]">
                {handoverHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={ShieldCheck}
                        title="Belum Ada Serah Terima"
                        description="Belum ada riwayat serah terima paket yang diproses pada sesi ini."
                      />
                    </td>
                  </tr>
                ) : (
                  handoverHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-50/60 transition"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-neutral-800 font-mono text-[13px]">
                          {item.id}
                        </p>

                        <p className="text-[11px] text-neutral-400 font-semibold">
                          {item.time}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-neutral-800">
                        {item.recipient}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-800">
                        {item.ticket}
                      </td>

                      <td
                        className="py-3.5 px-4 font-mono font-bold tracking-wider"
                        style={{ color: PRIMARY_COLOR }}
                      >
                        {item.otp}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge variant="emerald">
                          {item.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <BaseModal
        isOpen={showForceModal}
        onClose={() => setShowForceModal(false)}
        title="Intervensi Darurat (Force Release)"
        subtitle="Gunakan fitur ini hanya jika perangkat penerima bermasalah (HP mati/rusak)."
        maxWidth="max-w-sm"
      >
        <form
          onSubmit={handleForceReleaseSubmit}
          className="space-y-3 text-[13px]"
        >
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-800 text-[12px]">
            <strong>Perhatian:</strong> Tindakan ini akan memaksa pencairan
            dana escrow dan menyelesaikan pesanan berdasarkan verifikasi manual
            KTP di pos.
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              ID POS BERTUGAS
            </label>

            <input
              type="text"
              required
              value={forcePosId}
              onChange={(e) => setForcePosId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 font-mono text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              NOMOR TIKET / RESI PAKET
            </label>

            <input
              type="text"
              required
              placeholder="cth: TKT-SDJF12H"
              value={forceTicket}
              onChange={(e) => setForceTicket(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 font-mono text-[13px] uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              KODE OTP MANUAL (JIKA ADA)
            </label>

            <input
              type="text"
              placeholder="Opsional jika verifikasi manual KTP"
              value={forceOtp}
              onChange={(e) =>
                setForceOtp(e.target.value.replace(/\D/g, ''))
              }
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 font-mono text-[13px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForceModal(false)}
              className="flex-1 py-2 bg-neutral-100 text-neutral-700 rounded-xl font-bold cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isForcing}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Unlock className="w-3.5 h-3.5" />

              <span>
                {isForcing
                  ? 'Memproses...'
                  : 'Eksekusi Force Release'}
              </span>
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}


