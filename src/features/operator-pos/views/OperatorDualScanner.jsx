import { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  ArrowRightLeft,
  ShieldCheck,
  ScanLine,
  X,
  Upload,
  Trash2,
  RefreshCw,
  Users,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import StatusBadge from '../../../components/ui/StatusBadge';
import apiClient from '../../../services/apiClient';
import { Html5Qrcode } from 'html5-qrcode';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const STORAGE_KEY = 'nebeng_operator_scan_history';

export default function OperatorDualScanner() {
  const toast = useToast();
  const [scanMode, setScanMode] = useState('origin');

  const [tripQr, setTripQr] = useState('');
  const [ticketQr, setTicketQr] = useState('');
  const [posId, setPosId] = useState('');

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [manifestTrips, setManifestTrips] = useState([]);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTargetField, setActiveTargetField] = useState(null);
  const html5QrCode = useRef(null);
  const fileInputRef = useRef(null);

  // Simpan riwayat ke localStorage setiap kali ada update
  const saveHistory = (newHistory) => {
    setScanHistory(newHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory.slice(0, 50)));
    } catch (e) {
      console.warn('Gagal menyimpan riwayat ke localStorage', e);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Bersihkan seluruh riwayat scan sesi ini?')) {
      saveHistory([]);
      toast.info('Riwayat log scan telah dibersihkan.', { title: 'Riwayat Bersih' });
    }
  };

  const fetchManifest = async (targetPosId) => {
    if (!targetPosId) return;
    try {
      setIsLoadingManifest(true);
      const res = await apiClient.get('/checkpoints/manifest', {
        params: { posId: String(targetPosId) }
      });
      if (res.data?.trips) {
        setManifestTrips(res.data.trips);
      }
    } catch (err) {
      console.warn('Gagal memuat manifest pos:', err);
    } finally {
      setIsLoadingManifest(false);
    }
  };

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
          fetchManifest(String(resolvedPosId));
        }
      } catch (err) {
        console.error('Gagal memuat daftar pos:', err);
        setPosId('1');
        fetchManifest('1');
      }
    };

    fetchOperatorPos();
    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const availableTrips = manifestTrips.map((t) => ({
    tripId: String(t.tripId),
    mitraName: t.mitraName || 'Mitra',
    vehicle: t.vehicle || '',
    status: t.status,
    qrCode: t.qrCodeTrip || `TRIP-${t.tripId}`,
  }));

  const availableTickets = manifestTrips.flatMap((t) =>
    (t.passengers || []).map((p) => ({
      orderId: String(p.orderId),
      customerName: p.customerName || 'Penumpang',
      status: p.status,
      tripId: String(t.tripId),
      qrCode: p.qrCodeTicket || `TKT-${p.orderId}`,
    }))
  );

  const startCamera = async (target) => {
    setActiveTargetField(target);
    setIsCameraActive(true);

    setTimeout(() => {
      try {
        html5QrCode.current = new Html5Qrcode('qr-reader');
        html5QrCode.current
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              const cleanText = (decodedText || '').trim();
              if (cleanText.toUpperCase().startsWith('TRIP-')) {
                setTripQr(cleanText);
                toast.success(`Berhasil memindai QR Trip Mitra: ${cleanText}`, { title: 'Scan Sukses' });
              } else if (
                cleanText.toUpperCase().startsWith('TKT-') ||
                cleanText.toUpperCase().startsWith('NEBENG-')
              ) {
                setTicketQr(cleanText);
                toast.success(`Berhasil memindai QR Tiket Penumpang: ${cleanText}`, { title: 'Scan Sukses' });
              } else if (target === 'trip') {
                setTripQr(cleanText);
                toast.success(`Berhasil memindai QR: ${cleanText}`, { title: 'Scan Sukses' });
              } else {
                setTicketQr(cleanText);
                toast.success(`Berhasil memindai QR: ${cleanText}`, { title: 'Scan Sukses' });
              }
              stopCamera();
            },
            () => {
              // Abaikan per-frame parse error saat scanning
            }
          )
          .catch((err) => {
            console.warn('Gagal akses kamera langsung:', err);
            toast.info(
              'Kamera tidak aktif atau izin diblokir. Anda bisa menggunakan unggah file gambar atau pilih dari manifest pos.',
              { title: 'Mode Alternatif Aktif' }
            );
          });
      } catch (e) {
        console.error('Gagal inisialisasi Html5Qrcode:', e);
      }
    }, 150);
  };

  const stopCamera = () => {
    if (html5QrCode.current) {
      const scanner = html5QrCode.current;
      html5QrCode.current = null;
      try {
        if (scanner.isScanning) {
          scanner
            .stop()
            .then(() => {
              try { scanner.clear(); } catch {}
            })
            .catch(() => {});
        } else {
          try { scanner.clear(); } catch {}
        }
      } catch (e) {
        console.warn('Error saat menutup scanner kamera:', e);
      }
    }
    setIsCameraActive(false);
    setActiveTargetField(null);
  };

  const handleScanFromImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Hentikan kamera aktif terlebih dahulu agar tidak bentrok 'Cannot start file scan - ongoing camera scan'
      if (html5QrCode.current) {
        try {
          if (html5QrCode.current.isScanning) {
            await html5QrCode.current.stop();
          }
          html5QrCode.current.clear();
        } catch (stopErr) {
          console.warn('Gagal menghentikan scanner kamera sebelum scan file:', stopErr);
        }
      }

      // 2. Buat instance baru untuk memproses gambar QR
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCode.current = scanner;

      const rawDecoded = await scanner.scanFile(file, false);
      const decodedText = (rawDecoded || '').trim();

      // 3. Deteksi otomatis format QR: Trip vs Tiket
      if (decodedText.toUpperCase().startsWith('TRIP-')) {
        setTripQr(decodedText);
        toast.success(`Berhasil membaca QR Trip Mitra: ${decodedText}`, { title: 'Scan Berhasil' });
      } else if (
        decodedText.toUpperCase().startsWith('TKT-') ||
        decodedText.toUpperCase().startsWith('NEBENG-')
      ) {
        setTicketQr(decodedText);
        toast.success(`Berhasil membaca QR Tiket Penumpang: ${decodedText}`, { title: 'Scan Berhasil' });
      } else if (activeTargetField === 'trip') {
        setTripQr(decodedText);
        toast.success(`Berhasil membaca QR: ${decodedText}`, { title: 'Scan Berhasil' });
      } else {
        setTicketQr(decodedText);
        toast.success(`Berhasil membaca QR: ${decodedText}`, { title: 'Scan Berhasil' });
      }

      stopCamera();
    } catch (err) {
      console.warn('Gagal membaca QR dari file:', err);
      toast.error('Tidak ditemukan kode QR yang terbaca pada gambar tersebut. Pastikan gambar jelas dan tidak terpotong.', {
        title: 'QR Tidak Terbaca'
      });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectFromManifest = (qrValue) => {
    if (!qrValue) return;
    if (activeTargetField === 'trip') {
      setTripQr(qrValue);
    } else {
      setTicketQr(qrValue);
    }
    toast.success(`Kode valid (${qrValue}) berhasil dipilih dari Manifest Pos!`, {
      title: 'Kode Terisi'
    });
    stopCamera();
  };

  const handleProcessScan = async (e) => {
    e.preventDefault();

    const cleanTrip = tripQr.trim().toUpperCase();
    const cleanTicket = ticketQr.trim().toUpperCase();

    if (!cleanTrip && !cleanTicket) {
      toast.warning(
        'Mohon masukkan atau scan salah satu: QR Trip Mitra atau QR Tiket Customer!',
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
        ...(cleanTrip ? { qrCodeTrip: cleanTrip } : {}),
        ...(cleanTicket ? { qrCodeTicket: cleanTicket } : {}),
        posId: String(posId),
        scanType: scanType,
      };

      const response = await apiClient.post('/checkpoints/scan', payload);

      const newLog = {
        id: response.data?.checkpoint?.id
          ? String(response.data.checkpoint.id)
          : `LOG-${Math.floor(100 + Math.random() * 900)}`,
        type: scanMode === 'origin' ? 'Scan 1 (Origin)' : 'Scan 2 (Destination / Selesai)',
        trip: cleanTrip || response.data?.checkpoint?.trip?.qrCodeTrip || response.data?.trip?.qrCodeTrip || '(Otomatis dari Tiket)',
        ticket: cleanTicket || response.data?.checkpoint?.order?.qrCodeTicket || '(Scan Trip Mitra)',
        status: scanMode === 'origin' ? 'IN_TRANSIT (Berangkat)' : 'SUCCESS (Trip Selesai & Escrow Released)',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      saveHistory([newLog, ...scanHistory]);

      toast.success(
        response.data?.message || (scanMode === 'origin' ? 'Check-in Pos Asal berhasil!' : 'Scan Tujuan Berhasil & Trip Diakhiri!'),
        { title: 'Scan Berhasil' }
      );

      setTripQr('');
      setTicketQr('');
      // Perbarui manifest pos secara realtime
      fetchManifest(posId);
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
      {/* Input File Tersembunyi untuk Scan Gambar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleScanFromImage}
        accept="image/*"
        className="hidden"
      />

      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> Sistem Keamanan Pos Checkpoint
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight break-words">
              Dual QR Scanner
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Validasi check-in keberangkatan pos asal & pelepasan dana escrow di pos tujuan secara instan.
            </p>
          </div>

          <div className="flex bg-black/20 p-1 rounded-2xl gap-1 shrink-0 backdrop-blur border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setScanMode('origin')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                scanMode === 'origin'
                  ? 'bg-accent text-slate-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Scan 1 Asal
            </button>

            <button
              type="button"
              onClick={() => setScanMode('destination')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                scanMode === 'destination'
                  ? 'bg-accent text-slate-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Scan 2 Tujuan
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* KOLOM KIRI: FORM SCANNER */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-neutral-800">
              {scanMode === 'origin'
                ? 'Check-in Pos Asal (Scan 1)'
                : 'Check-in Pos Tujuan (Scan 2)'}
            </h2>

            <StatusBadge
              variant={scanMode === 'origin' ? 'blue' : 'emerald'}
            >
              {scanMode === 'origin' ? 'IN_TRANSIT' : 'DESTINATION'}
            </StatusBadge>
          </div>

          <form
            onSubmit={handleProcessScan}
            className="space-y-4 text-[13px]"
          >
            {/* INPUT QR TRIP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  QR TRIP MITRA (OPSIONAL)
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera('trip')}
                    className="flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                    style={{ color: PRIMARY_COLOR }}
                  >
                    <ScanLine className="w-3 h-3" />
                    Kamera
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="cth: TRIP-1 atau format QR Mitra"
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

              {availableTrips.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-400 font-medium">Manifest:</span>
                  {availableTrips.slice(0, 2).map((t) => (
                    <button
                      key={t.tripId}
                      type="button"
                      onClick={() => setTripQr(t.qrCode)}
                      className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-mono font-bold transition"
                    >
                      Trip #{t.tripId}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* INPUT QR TIKET */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  QR TIKET/PAKET CUSTOMER
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera('ticket')}
                    className="flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                    style={{ color: PRIMARY_COLOR }}
                  >
                    <ScanLine className="w-3 h-3" />
                    Kamera
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="cth: NEBENG-TKT-... atau TKT-..."
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

              {availableTickets.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-400 font-medium">Manifest:</span>
                  {availableTickets.slice(0, 2).map((p) => (
                    <button
                      key={p.orderId}
                      type="button"
                      onClick={() => {
                        setTicketQr(p.qrCode);
                        const matchedTrip = availableTrips.find((t) => String(t.tripId) === String(p.tripId));
                        if (matchedTrip) {
                          setTripQr(matchedTrip.qrCode);
                        }
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-mono font-bold transition"
                    >
                      Tiket #{p.orderId} ({p.customerName})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoadingHistory}
              className="w-full py-3 text-white text-[13px] font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
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
                {isLoadingHistory
                  ? 'Sedang Memproses...'
                  : scanMode === 'origin'
                  ? 'Proses Scan Asal'
                  : 'Proses Scan Tujuan & Selesaikan Trip'}
              </span>
            </button>
          </form>

          {/* INFORMASI POS AKTIF */}
          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Pos Bertugas: <strong>Pos #{posId}</strong></span>
            <button
              type="button"
              onClick={() => fetchManifest(posId)}
              className="text-brand-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingManifest ? 'animate-spin' : ''}`} />
              Refresh Manifest
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: TABEL RIWAYAT LOG PERSISTEN */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                Riwayat Log Dual Scan Pos Sesi Ini
              </h2>
              <p className="text-[11px] text-neutral-400">
                Data log tersimpan otomatis di perangkat dan tidak akan hilang saat halaman disegarkan.
              </p>
            </div>

            {scanHistory.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-3">WAKTU / ID</th>
                  <th className="py-3 px-3">TIPE</th>
                  <th className="py-3 px-3">TRIP</th>
                  <th className="py-3 px-3">TIKET</th>
                  <th className="py-3 px-3">STATUS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 text-[12px]">
                {isLoadingHistory ? (
                  <SkeletonTableRows rows={3} columns={5} />
                ) : scanHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-neutral-400"
                    >
                      <QrCode className="w-8 h-8 mx-auto text-neutral-300 mb-2 opacity-50" />
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
                        <td className="py-3 px-3">
                          <div className="font-bold text-neutral-800 font-mono text-[12px]">
                            {log.id}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-medium">
                            {log.time || 'Baru saja'}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <StatusBadge
                            variant={isSuccess ? 'emerald' : 'blue'}
                          >
                            {log.type}
                          </StatusBadge>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-neutral-800 max-w-[140px] truncate" title={log.trip}>
                          {log.trip}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-neutral-800 max-w-[140px] truncate" title={log.ticket}>
                          {log.ticket}
                        </td>

                        <td className="py-3 px-3">
                          <StatusBadge
                            variant={log.status.includes('IN_TRANSIT') ? 'blue' : isSuccess ? 'emerald' : 'amber'}
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

      {/* MODAL SCANNER QR KAMERA */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-neutral-800">
                  Pindai {activeTargetField === 'trip' ? 'QR Trip Mitra' : 'QR Tiket Customer'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Arahkan kamera ke Kode QR fisik atau layar HP.
                </p>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </div>

            {/* Peringatan BUKAN MUKA/SWAFOTO */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Pindai hanya merespons <strong>gambar Kode QR</strong> (bukan wajah/swafoto). Jika Anda di laptop dengan webcam depan, arahkan QR HP ke arah kamera.
              </span>
            </div>

            {/* VIEWFINDER KAMERA */}
            <div className="relative w-full h-64 bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center border border-neutral-200">
              <div
                id="qr-reader"
                className="w-full h-full object-cover"
              ></div>

              <div
                className="absolute inset-0 border-2 border-dashed m-6 rounded-lg pointer-events-none flex items-center justify-center"
                style={{ borderColor: `${PRIMARY_COLOR}99` }}
              >
                <p className="text-[11px] text-white bg-black/60 px-2 py-1 rounded">
                  Posisikan QR di dalam kotak
                </p>
              </div>
            </div>

            {/* OPSI ALTERNATIF 1: UNGGAH GAMBAR DARI FILE */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[12px] font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition border border-neutral-300"
              >
                <Upload className="w-4 h-4 text-neutral-600" />
                <span>Unggah Gambar / Foto QR (Scan File Langsung)</span>
              </button>

              {/* OPSI ALTERNATIF 2: PILIH DARI MANIFEST AKTIF */}
              {activeTargetField === 'trip' && availableTrips.length > 0 && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Pilih Trip Aktif di Pos:
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {availableTrips.map((t) => (
                      <button
                        key={t.tripId}
                        type="button"
                        onClick={() => handleSelectFromManifest(t.qrCode)}
                        className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-neutral-200 rounded-lg text-[11px] flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-semibold text-neutral-800">Trip #{t.tripId} - {t.mitraName}</span>
                        <span className="font-mono text-brand-600 font-bold">{t.qrCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTargetField === 'ticket' && availableTickets.length > 0 && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Pilih Tiket Penumpang Aktif:
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {availableTickets.map((p) => (
                      <button
                        key={p.orderId}
                        type="button"
                        onClick={() => handleSelectFromManifest(p.qrCode)}
                        className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-neutral-200 rounded-lg text-[11px] flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-semibold text-neutral-800">Order #{p.orderId} - {p.customerName}</span>
                        <span className="font-mono text-emerald-700 font-bold">{p.qrCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
