import { useState, useEffect } from 'react';
import { PackageCheck, Camera, QrCode, X as XIcon } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import { operatorService } from '../../../services/operatorService';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
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

      const payload = {
        qrCodeTrip: formData.qrCodeTrip.trim().toUpperCase(),
        qrCodeTicket: formData.qrCodeTicket.trim().toUpperCase(),
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
          formData.qrCodeTrip,
        order:
          response.checkpoint?.order?.qrCodeTiket ||
          formData.qrCodeTicket,
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
      console.error(
        'Gagal melakukan scan checkpoint:',
        error
      );

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
              <PackageCheck className="w-3 h-3" />
              Inspeksi & Segel
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800 break-words">
            Inspeksi & Sealing Checkpoint
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Validasi fisik paket pos asal, unggah foto kondisi, dan
            sinkronkan segel QR langsung ke database.
          </p>
        </div>
      </div>

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

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                KODE QR TRIP MITRA
              </label>

              <input
                type="text"
                required
                placeholder="cth: TRIP-A2D4CS13"
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

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                KODE QR TIKET / PARCEL
              </label>

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

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                UPLOAD FOTO KONDISI BARANG
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

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                NOMOR SEGEL
              </label>

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
                        100000 +
                          Math.random() * 900000
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
                      <StatusBadge variant="emerald">
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
    </div>
  );
}

