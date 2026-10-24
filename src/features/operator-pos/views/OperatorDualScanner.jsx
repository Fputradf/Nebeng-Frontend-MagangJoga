import { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  ArrowRightLeft,
  ShieldCheck,
  ScanLine,
  X,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import StatusBadge from '../../../components/ui/StatusBadge';
import apiClient from '../../../services/apiClient';
import { Html5Qrcode } from 'html5-qrcode';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';

export default function OperatorDualScanner() {
  const toast = useToast();
  const [scanMode, setScanMode] = useState('origin');

  const [tripQr, setTripQr] = useState('');
  const [ticketQr, setTicketQr] = useState('');
  const [posId, setPosId] = useState('');

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTargetField, setActiveTargetField] = useState(null);
  const html5QrCode = useRef(null);

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
        }
      } catch (err) {
        console.error('Gagal memuat daftar pos:', err);
        setPosId('1');
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
      html5QrCode.current = new Html5Qrcode('qr-reader');
      html5QrCode.current
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (target === 'trip') {
              setTripQr(decodedText);
            } else {
              setTicketQr(decodedText);
            }
            toast.success(`Berhasil memindai QR secara langsung!`, { title: 'Scan Sukses' });
            stopCamera();
          },
          (errorMessage) => {
            // parse error, ignore
          }
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
    const sampleCode =
      activeTargetField === 'trip'
        ? `TRIP-${Math.floor(100000 + Math.random() * 900000)}`
        : `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    if (activeTargetField === 'trip') {
      setTripQr(sampleCode);
    } else {
      setTicketQr(sampleCode);
    }

    toast.success(
      `Berhasil memindai ${
        activeTargetField === 'trip' ? 'QR Trip' : 'QR Tiket'
      } secara instan!`,
      { title: 'Scan Sukses' }
    );

    stopCamera();
  };

  const handleProcessScan = async (e) => {
    e.preventDefault();

    const cleanTrip = tripQr.trim().toUpperCase();
    const cleanTicket = ticketQr.trim().toUpperCase();

    if (!cleanTrip || !cleanTicket) {
      toast.warning(
        'Mohon pastikan QR Trip Mitra dan QR Tiket/Paket Customer telah terisi!',
        { title: 'Data Belum Lengkap' }
      );
      return;
    }

    if (!posId) {
      toast.warning('ID Pos bertugas belum terdeteksi dari sistem. Pastikan akun operator terikat ke sebuah pos.', { title: 'Pos Belum Dimuat' });
      return;
    }

    try {
      setIsLoadingHistory(true);

      const scanType = scanMode === 'origin' ? 'checkin_origin' : 'checkin_destination';

      const payload = {
        qrCodeTrip: cleanTrip,
        qrCodeTicket: cleanTicket,
        posId: String(posId),
        scanType: scanType,
      };

      const response = await apiClient.post('/checkpoints/scan', payload);

      const newLog = {
        id: response.data?.checkpoint?.id
          ? String(response.data.checkpoint.id)
          : `LOG-${Math.floor(100 + Math.random() * 900)}`,
        type: scanMode === 'origin' ? 'Scan 1 (Origin)' : 'Scan 2 (Destination / Selesai)',
        trip: cleanTrip,
        ticket: cleanTicket,
        status: scanMode === 'origin' ? 'IN_TRANSIT (Berangkat)' : 'SUCCESS (Trip Selesai & Escrow Released)',
        time: 'Baru saja',
      };

      setScanHistory([newLog, ...scanHistory]);

      toast.success(
        response.data?.message || (scanMode === 'origin' ? 'Check-in Pos Asal berhasil!' : 'Scan Tujuan Berhasil & Trip Diakhiri!'),
        { title: 'Scan Berhasil' }
      );

      setTripQr('');
      setTicketQr('');
    } catch (error) {
      console.error('Gagal memproses scan:', error);
      const errorMsg = error.response?.data?.message || 'Gagal memverifikasi checkpoint.';
      toast.error(errorMsg, { title: 'Gagal Memproses Scan' });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter'] relative">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />

            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1 flex-wrap min-w-0"
              style={{ color: PRIMARY_COLOR }}
            >
              <QrCode className="w-3 h-3" />
              Sistem Keamanan Pos
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800 break-words">
            Dual QR Scanner
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Validasi check-in & pelepasan escrow.
          </p>
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setScanMode('origin')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition cursor-pointer ${
              scanMode === 'origin'
                ? 'text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
            style={
              scanMode === 'origin'
                ? { backgroundColor: PRIMARY_COLOR }
                : undefined
            }
          >
            Scan 1 Asal
          </button>

          <button
            type="button"
            onClick={() => setScanMode('destination')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition cursor-pointer ${
              scanMode === 'destination'
                ? 'text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
            style={
              scanMode === 'destination'
                ? { backgroundColor: PRIMARY_COLOR }
                : undefined
            }
          >
            Scan 2 Tujuan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-neutral-800">
              {scanMode === 'origin'
                ? 'Check-in Pos Asal (Scan 1)'
                : 'Check-in Pos Tujuan (Scan 2)'}
            </h2>

            <StatusBadge
              variant={scanMode === 'origin' ? 'purple' : 'blue'}
            >
              {scanMode === 'origin' ? 'IN_TRANSIT' : 'Destination'}
            </StatusBadge>
          </div>

          <form
            onSubmit={handleProcessScan}
            className="space-y-3 text-[13px]"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  QR TRIP MITRA
                </label>

                <button
                  type="button"
                  onClick={() => startCamera('trip')}
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
                placeholder="cth: TRIP-A2D4CS13"
                value={tripQr}
                onChange={(e) => setTripQr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-mono text-[13px] font-medium uppercase"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = PRIMARY_COLOR;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  QR TIKET/PAKET
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-mono text-[13px] font-medium uppercase"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = PRIMARY_COLOR;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-white text-[13px] font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 mt-1"
              style={{ backgroundColor: PRIMARY_COLOR }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
              }}
            >
              {scanMode === 'origin' ? (
                <ArrowRightLeft className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}

              <span>
                {scanMode === 'origin'
                  ? 'Proses Scan Asal'
                  : 'Proses Scan Tujuan & Selesaikan Trip'}
              </span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h2 className="text-[17px] font-bold text-neutral-800">
            Riwayat Log Dual Scan Pos Sesi Ini
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">TIPE</th>
                  <th className="py-3 px-2">TRIP</th>
                  <th className="py-3 px-2">TIKET</th>
                  <th className="py-3 px-2">STATUS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 text-[12px]">
                {isLoadingHistory ? (
                  <SkeletonTableRows rows={3} columns={5} />
                ) : scanHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-neutral-400"
                    >
                      Belum ada log scan checkpoint yang tercatat pada sesi ini.
                    </td>
                  </tr>
                ) : (
                  scanHistory.map((log) => {
                    const isSuccess =
                      log.status.includes('SUCCESS') ||
                      log.status.includes('Released');

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-neutral-50/60 transition"
                      >
                        <td className="py-3.5 px-4 font-bold text-neutral-800 font-mono text-[13px]">
                          {log.id}
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge
                            variant={isSuccess ? 'emerald' : 'purple'}
                          >
                            {log.type}
                          </StatusBadge>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-800">
                          {log.trip}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-800">
                          {log.ticket}
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge
                            variant={isSuccess ? 'emerald' : 'amber'}
                          >
                            {log.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-neutral-800">
                Pindai{' '}
                {activeTargetField === 'trip'
                  ? 'QR Trip Mitra'
                  : 'QR Tiket Customer'}
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
                id="qr-reader"
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

              <p className="text-[11px] text-neutral-400">
                Gunakan tombol di atas jika kamera perangkat tidak mendeteksi
                kode atau diblokir browser.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


