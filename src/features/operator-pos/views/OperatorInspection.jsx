import { useState, useEffect, useRef } from 'react';
import { PackageCheck, Camera, QrCode, X as XIcon, ScanLine, CheckCircle, X } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import { operatorService } from '../../../services/operatorService';
import apiClient from '../../../services/apiClient';
import { Html5Qrcode } from 'html5-qrcode';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

export default function OperatorInspection() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    qrCodeTrip: '',
    qrCodeTicket: '',
    posId: '',
    securitySealQr: ''
  });

  const [itemPhoto, setItemPhoto] = useState(null);
  const [itemPhotoPreviewUrl, setItemPhotoPreviewUrl] = useState(null);
  const [latestScanResult, setLatestScanResult] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Camera QR Scanner State
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
          setFormData(prev => ({ ...prev, posId: String(resolvedPosId) }));
        }
      } catch (err) {
        console.error('Gagal memuat daftar pos:', err);
        setFormData(prev => ({ ...prev, posId: '1' }));
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
      html5QrCode.current = new Html5Qrcode('qr-reader-inspection');
      html5QrCode.current
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            const cleanText = decodedText.trim().toUpperCase();
            if (target === 'trip') {
              setFormData((prev) => ({ ...prev, qrCodeTrip: cleanText }));
            } else if (target === 'ticket') {
              setFormData((prev) => ({ ...prev, qrCodeTicket: cleanText }));
            } else if (target === 'seal') {
              setFormData((prev) => ({ ...prev, securitySealQr: cleanText }));
            }
            toast.success(`Berhasil memindai QR secara langsung!`, { title: 'Scan Sukses' });
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
    let sampleCode = '';
    if (activeTargetField === 'trip') {
      sampleCode = `TRIP-${Math.floor(100000 + Math.random() * 900000)}`;
      setFormData((prev) => ({ ...prev, qrCodeTrip: sampleCode }));
    } else if (activeTargetField === 'ticket') {
      sampleCode = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setFormData((prev) => ({ ...prev, qrCodeTicket: sampleCode }));
    } else {
      sampleCode = `SEAL-${Math.floor(100000 + Math.random() * 900000)}`;
      setFormData((prev) => ({ ...prev, securitySealQr: sampleCode }));
    }

    toast.success(`Berhasil memindai ${sampleCode} secara instan!`, { title: 'Scan Sukses' });
    stopCamera();
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
      };
    });
  };

  const handlePhotoFileChange = async (file) => {
    if (!file) {
      setItemPhoto(null);
      setItemPhotoPreviewUrl(null);
      return;
    }

    try {
      setIsCompressing(true);

      toast.info(
        'Mengompresi ukuran foto agar cepat terkirim...',
        { title: 'Optimalisasi' }
      );

      const optimizedFile = await compressImage(file);

      setItemPhoto(optimizedFile);

      setItemPhotoPreviewUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);

        return URL.createObjectURL(optimizedFile);
      });
    } catch {
      setItemPhoto(file);
      setItemPhotoPreviewUrl(URL.createObjectURL(file));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleScanAndSeal = async (e) => {
    e.preventDefault();

    if (!formData.qrCodeTicket.trim()) {
      toast.warning('Nomor QR Tiket / Resi Paket wajib diisi atau dipindai!', { title: 'Tiket Diperlukan' });
      return;
    }

    if (!itemPhoto) {
      toast.warning(
        'Wajib mengunggah foto fisik barang sebelum melakukan sealing & check-in!',
        { title: 'Foto Diperlukan' }
      );
      return;
    }

    if (!formData.posId) {
      toast.warning('ID Pos bertugas belum terdeteksi dari sistem.', { title: 'Pos Belum Dimuat' });
      return;
    }

    try {
      setIsLoading(true);

      let photoUrl = '';
      if (itemPhoto) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', itemPhoto);
        try {
          const uploadRes = await apiClient.post('/uploads/file', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          photoUrl = uploadRes.data.filePath;
        } catch (uploadError) {
          console.error('Gagal upload foto barang:', uploadError);
          toast.error('Gagal mengunggah foto barang. Silakan coba lagi.', { title: 'Upload Gagal' });
          setIsLoading(false);
          return;
        }
      }

      const cleanTrip = formData.qrCodeTrip.trim().toUpperCase();
      const cleanTicket = formData.qrCodeTicket.trim().toUpperCase();

      const payload = {
        ...(cleanTrip ? { qrCodeTrip: cleanTrip } : {}),
        qrCodeTicket: cleanTicket,
        posId: formData.posId.trim(),
        scanType: 'checkin_origin',
        securitySealQr:
          formData.securitySealQr.trim() ||
          `SEAL-${Math.floor(100000 + Math.random() * 900000)}`,
        ...(photoUrl && { photoUrl }),
      };

      const response = await operatorService.scanCheckpoint(payload);

      setLatestScanResult({
        id:
          response.checkpoint?.id ||
          'CHK-' + Date.now().toString().slice(-4),
        trip:
          response.checkpoint?.trip?.qrCodeTrip ||
          cleanTrip ||
          '(Otomatis dari Tiket)',
        order:
          response.checkpoint?.order?.qrCodeTiket ||
          cleanTicket,
        status: 'Check-in Asal & Segel Aktif',
        date: 'Baru saja'
      });

      setFormData((prev) => ({
        ...prev,
        qrCodeTrip: '',
        qrCodeTicket: '',
        securitySealQr: ''
      }));

      handlePhotoFileChange(null);

      toast.success(
        response.message ||
          'Check-in Pos Asal dan Segel QR berhasil dicatat ke database!',
        { title: 'Berhasil' }
      );
    } catch (error) {
      console.error('Gagal melakukan scan checkpoint:', error);

      toast.error(
        error.response?.data?.message ||
          'Gagal memproses ke server backend.',
        { title: 'Error Server' }
      );
    } finally {
      setIsLoading(false);
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
                <PackageCheck className="w-3.5 h-3.5" /> Inspeksi & Segel
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight break-words">
              Inspeksi & Sealing Checkpoint
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Validasi fisik paket pos asal, foto kondisi barang, dan sinkronkan segel QR langsung ke database.
            </p>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h2 className="text-[17px] font-bold text-neutral-800">
            Form Validasi Pos Asal
          </h2>

          <form
            onSubmit={handleScanAndSeal}
            className="space-y-3.5 text-[13px]"
          >
            <input type="hidden" value={formData.posId} />

            {/* QR TRIP MITRA (OPTIONAL) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  KODE QR TRIP MITRA (OPSIONAL)
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
                placeholder="cth: TRIP-A2D4CS13 (Opsional)"
                value={formData.qrCodeTrip}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qrCodeTrip: e.target.value
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-medium text-[13px] uppercase font-mono"
              />
            </div>

            {/* QR TIKET / PARCEL (REQUIRED) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  KODE QR TIKET / PARCEL *
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
                value={formData.qrCodeTicket}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qrCodeTicket: e.target.value
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-medium text-[13px] uppercase font-mono"
              />
            </div>

            {/* UPLOAD FOTO */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                UPLOAD FOTO KONDISI BARANG *
              </label>

              {itemPhotoPreviewUrl ? (
                <div className="flex items-center gap-2.5 p-2 rounded-xl border border-neutral-200 bg-neutral-50">
                  <img
                    src={itemPhotoPreviewUrl}
                    alt="Pratinjau Barang"
                    className="w-12 h-12 object-cover rounded-lg border border-neutral-200 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-emerald-600">
                      {isCompressing ? 'Mengompresi Foto...' : 'Foto Siap Dikirim'}
                    </p>

                    <p className="text-[11px] text-neutral-400 truncate">
                      {itemPhoto?.name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePhotoFileChange(null)}
                    className="w-6 h-6 rounded-full bg-neutral-800 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-neutral-200 rounded-xl p-3.5 text-center hover:bg-neutral-50 transition cursor-pointer flex flex-col items-center justify-center">
                  <Camera
                    className="w-5 h-5 mb-1"
                    style={{ color: PRIMARY_COLOR }}
                  />

                  <p className="font-bold text-neutral-700 text-[13px]">
                    Klik untuk Unggah Foto
                  </p>

                  <p className="text-[11px] text-neutral-400">
                    Otomatis terkompresi (Cepat & Ringan)
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handlePhotoFileChange(
                        e.target.files[0]
                      )
                    }
                  />
                </label>
              )}
            </div>

            {/* NOMOR SEGEL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  NOMOR SEGEL (SEAL QR)
                </label>

                <button
                  type="button"
                  onClick={() => startCamera('seal')}
                  className="flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
                  style={{ color: PRIMARY_COLOR }}
                >
                  <ScanLine className="w-3 h-3" />
                  Scan Segel
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Opsional / Auto"
                  value={formData.securitySealQr}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      securitySealQr: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none font-medium text-[13px] font-mono uppercase"
                />

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      securitySealQr: `SEAL-${Math.floor(
                        100000 + Math.random() * 900000
                      )}`
                    })
                  }
                  className="px-3 font-bold text-[12px] rounded-xl transition shrink-0 flex items-center gap-1 cursor-pointer"
                  style={{
                    backgroundColor: `${PRIMARY_ACCENT}22`,
                    color: PRIMARY_COLOR
                  }}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Auto
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isCompressing}
              className="w-full py-3 text-white text-[13px] font-bold rounded-xl transition shadow-sm cursor-pointer mt-1 disabled:opacity-50"
              style={{
                backgroundColor: PRIMARY_COLOR
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
              }}
            >
              {isLoading
                ? 'Memproses ke Server...'
                : 'Kunci & Check-in Asal'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h2 className="text-[17px] font-bold text-neutral-800">
            Status Hasil Scan Checkpoint Terakhir
          </h2>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">TRIP</th>
                  <th className="py-3 px-2">TIKET</th>
                  <th className="py-3 px-2">STATUS</th>
                  <th className="py-3 px-2">WAKTU</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 text-[12px]">
                {!latestScanResult ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="py-12">
                        <PackageCheck className="w-8 h-8 text-neutral-300 mx-auto mb-2" />

                        <p className="text-center text-neutral-400 text-[13px]">
                          Belum ada aktivitas scan pos yang
                          dikirim ke server pada sesi ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-neutral-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-neutral-800 font-mono text-[13px]">
                      {latestScanResult.id}
                    </td>

                    <td
                      className="py-3.5 px-4 font-mono font-bold"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      {latestScanResult.trip}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-neutral-700">
                      {latestScanResult.order}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge variant="blue">
                        {latestScanResult.status}
                      </StatusBadge>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-500 font-semibold">
                      {latestScanResult.date}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CAMERA SCANNER MODAL OVERLAY */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-neutral-800">
                Pindai{' '}
                {activeTargetField === 'trip'
                  ? 'QR Trip Mitra'
                  : activeTargetField === 'ticket'
                  ? 'QR Tiket / Resi'
                  : 'QR Segel Pengaman'}
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
                id="qr-reader-inspection"
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
