import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, UserCheck, AlertTriangle, Unlock, ScanLine, CheckCircle, X } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';
import { Html5Qrcode } from 'html5-qrcode';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

export default function OperatorHandover() {
  const toast = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [ticketQr, setTicketQr] = useState('');
  const [posId, setPosId] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoverHistory, setHandoverHistory] = useState([]);

  // Camera QR Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTargetField, setActiveTargetField] = useState(null);
  const html5QrCode = useRef(null);

  // Manual Settlement / Bypass Modal
  const [showForceModal, setShowForceModal] = useState(false);
  const [forceTicket, setForceTicket] = useState('');
  const [forcePosId, setForcePosId] = useState('');
  const [forceOtp, setForceOtp] = useState('');
  const [forceReason, setForceReason] = useState('');
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

  const startCamera = async (target) => {
    setActiveTargetField(target);
    setIsCameraActive(true);

    setTimeout(() => {
      html5QrCode.current = new Html5Qrcode('qr-reader-handover');
      html5QrCode.current
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            const cleanText = decodedText.trim().toUpperCase();
            if (target === 'forceTicket') {
              setForceTicket(cleanText);
            } else {
              setTicketQr(cleanText);
            }
            toast.success('Berhasil memindai QR Tiket secara langsung!', { title: 'Scan Sukses' });
            stopCamera();
          },
          () => {}
        )
        .catch((err) => {
          console.warn('Gagal akses kamera langsung:', err);
          toast.info(
            'Kamera fisik tidak terdeteksi/izin diblokir. Gunakan tombol simulasi cepat di bawah.',
            { title: 'Mode Alternatif Aktif' }
          );
        });
    }, 100);
  };

  const stopCamera = () => {
    if (html5QrCode.current) {
      html5QrCode.current
        .stop()
        .then(() => {
          html5QrCode.current.clear();
          html5QrCode.current = null;
        })
        .catch((err) => console.error('Failed to stop camera', err));
    }
    setIsCameraActive(false);
    setActiveTargetField(null);
  };

  const handleCaptureMockQr = () => {
    const sampleCode = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    if (activeTargetField === 'forceTicket') {
      setForceTicket(sampleCode);
    } else {
      setTicketQr(sampleCode);
    }

    toast.success(`Berhasil memindai ${sampleCode} secara instan!`, { title: 'Scan Sukses' });
    stopCamera();
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    const cleanTicket = ticketQr.trim().toUpperCase();

    if (!recipientName.trim() || !cleanTicket || !cleanOtp) {
      toast.warning(
        'Mohon lengkapi Nama Penerima, QR Tiket/Resi Paket, dan Kode OTP!',
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
        qrCodeTicket: cleanTicket,
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
        ticket: cleanTicket,
        otp: cleanOtp,
        status: 'Escrow Released & Selesai',
        time: 'Baru saja',
      };

      setHandoverHistory([newLog, ...handoverHistory]);
      setRecipientName('');
      setTicketQr('');
      setOtpCode('');

      toast.success(
        res.data?.message ||
          'Verifikasi Handover sukses! Paket diserahkan dan dana escrow dicairkan ke Mitra.',
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
        'Nomor Tiket dan ID Pos wajib diisi untuk penyelesaian manual!',
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
        ...(forceReason ? { reason: forceReason.trim() } : {}),
      };

      const res = await apiClient.post(
        '/checkpoints/manual-force-release',
        payload
      );

      toast.success(
        res.data?.message ||
          'Penyelesaian tiket manual berhasil! Escrow dicairkan secara manual.',
        { title: 'Bypass Berhasil' }
      );

      setShowForceModal(false);
      setForceTicket('');
      setForceOtp('');
      setForceReason('');
    } catch (error) {
      console.error('Gagal bypass tiket manual:', error);

      toast.error(
        error.response?.data?.message ||
          'Gagal melakukan penyelesaian manual.',
        { title: 'Gagal' }
      );
    } finally {
      setIsForcing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter'] relative">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Validasi Handover
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight break-words">
              Handover & OTP Serah Paket
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Pindai tiket paket penerima dan masukkan 6-digit OTP klaim untuk serah terima & pelepasan escrow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForceModal(true)}
            className="px-4 py-2.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm backdrop-blur"
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Penyelesaian Manual (Bypass)</span>
          </button>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

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

            {/* NAMA PENERIMA */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                NAMA PENERIMA PAKET *
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

            {/* QR TIKET / RESI PAKET */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  QR TIKET / RESI PAKET *
                </label>

                <button
                  type="button"
                  onClick={() => startCamera('ticket')}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                  style={{ color: PRIMARY_COLOR }}
                >
                  <ScanLine className="w-3 h-3" />
                  Buka Kamera
                </button>
              </div>

              <input
                type="text"
                required
                placeholder="cth: TKT-SDJF12H"
                value={ticketQr}
                onChange={(e) => setTicketQr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-mono font-medium text-[13px] uppercase"
              />
            </div>

            {/* OTP CLAIM 6-DIGIT */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                KODE OTP 6-DIGIT PENERIMA *
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
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

      {/* MODAL PENYELESAIAN MANUAL (BYPASS FINANSIAL) */}
      <BaseModal
        isOpen={showForceModal}
        onClose={() => setShowForceModal(false)}
        title="Penyelesaian Tiket Manual (Bypass Finansial)"
        subtitle="Verifikasi identitas fisik KTP jika perangkat pengguna padam / tidak bisa menerima kode OTP."
        maxWidth="max-w-md"
      >
        <form
          onSubmit={handleForceReleaseSubmit}
          className="space-y-3 text-[13px]"
        >
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                NOMOR TIKET / RESI PAKET *
              </label>
              <button
                type="button"
                onClick={() => startCamera('forceTicket')}
                className="flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                style={{ color: PRIMARY_COLOR }}
              >
                <ScanLine className="w-3 h-3" />
                Scan Tiket
              </button>
            </div>

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
              KODE OTP (OPSIONAL JIKA VERIFIKASI KTP)
            </label>

            <input
              type="text"
              placeholder="Opsional jika verifikasi manual identitas KTP"
              value={forceOtp}
              onChange={(e) =>
                setForceOtp(e.target.value.replace(/\D/g, ''))
              }
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 font-mono text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              ALASAN / CATATAN AUDIT BYPASS
            </label>

            <input
              type="text"
              placeholder="cth: HP penerima mati/rusak, KTP cocok sesuai resi"
              value={forceReason}
              onChange={(e) => setForceReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-[13px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForceModal(false)}
              className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold cursor-pointer transition"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isForcing}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1 transition"
            >
              <Unlock className="w-3.5 h-3.5" />

              <span>
                {isForcing
                  ? 'Memproses...'
                  : 'Lepas Dana Escrow'}
              </span>
            </button>
          </div>
        </form>
      </BaseModal>

      {/* CAMERA SCANNER MODAL OVERLAY */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-neutral-800">
                Pindai QR Tiket / Resi Paket
              </h3>

              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </div>

            <div className="relative w-full h-56 bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center border border-neutral-200">
              <div
                id="qr-reader-handover"
                className="w-full h-full object-cover"
              ></div>

              <div
                className="absolute inset-0 border-2 border-dashed m-6 rounded-lg pointer-events-none flex items-center justify-center"
                style={{ borderColor: `${PRIMARY_COLOR}99` }}
              >
                <p className="text-[12px] text-white bg-black/60 px-2 py-1 rounded">
                  Arahkan QR ke Kotak Ini
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCaptureMockQr}
                className="w-full py-2.5 text-white text-[13px] font-bold rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5 transition"
                style={{ backgroundColor: PRIMARY_COLOR }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Simulasikan Tangkap QR (Cepat / Alternatif)</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[12px] font-bold rounded-xl transition cursor-pointer"
              >
                Tutup Kamera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
