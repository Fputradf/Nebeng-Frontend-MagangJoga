import { useState, useRef, useEffect } from 'react';
import {
  User,
  FileText,
  Upload,
  Camera,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const SKCK_TYPES = [...IMAGE_TYPES, 'application/pdf'];
const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
const PLATE_REGEX = /^[A-Z]{1,2}\s?[0-9]{1,4}\s?[A-Z]{1,3}$/;

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

export default function MitraOnboarding() {
  const { user, checkAuthStatus } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: user?.name || user?.fullName || '',
    phone: user?.phone || '',
    nik: '',
    address: '',
    vehicleType: 'motor',
    vehicleModel: '',
    vehicleColor: 'Hitam',
    plateNumber: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: '',
  });

  const [rawFiles, setRawFiles] = useState({
    ktp: null,
    sim: null,
    skck: null,
    stnk: null,
    face: null
  });

  const [previews, setPreviews] = useState({
    ktp: null,
    sim: null,
    skck: null,
    stnk: null
  });

  const [fileErrors, setFileErrors] = useState({
    ktp: '',
    sim: '',
    skck: '',
    stnk: ''
  });

  const [rejectedDocTypes, setRejectedDocTypes] = useState([]);
  const [isResubmissionMode, setIsResubmissionMode] = useState(false);

  const [faceScanned, setFaceScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facePreviewUrl, setFacePreviewUrl] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationStatusDetail, setVerificationStatusDetail] = useState('pending');

  useEffect(() => {
    let isMounted = true;

    const checkLiveStatus = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        const userData = res.data?.data || res.data || {};
        const currentStatus = userData.statusVerification || userData.verificationStatus;

        if (isMounted && currentStatus === 'approved') {
          navigate('/mitra/dashboard', { replace: true });
          return;
        }

        const statusRes = await apiClient.get('/verifications/my-status');
        const verifications = statusRes.data?.data || statusRes.data || [];

        if (Array.isArray(verifications) && verifications.length > 0 && isMounted) {
          const latestTypeMap = new Map();
          verifications.forEach((v) => {
            if (!latestTypeMap.has(v.type)) {
              latestTypeMap.set(v.type, v);
            }
          });

          const latestVerifications = Array.from(latestTypeMap.values());
          const rejectedDocs = latestVerifications
            .filter((v) => v.status === 'rejected')
            .map((v) => v.type);

          setVerificationStatusDetail(currentStatus || 'pending');

          if (rejectedDocs.length > 0) {
            setRejectedDocTypes(rejectedDocs);
            setIsResubmissionMode(true);
            setSubmitted(false);
          } else if (currentStatus === 'pending') {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil status verifikasi mitra:', err);
      }
    };

    checkLiveStatus();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleManualCheckStatus = async () => {
    if (isCheckingStatus) return;

    setIsCheckingStatus(true);

    try {
      if (checkAuthStatus) {
        await checkAuthStatus();
      }

      const res = await apiClient.get('/auth/me');
      const userData = res.data?.data || res.data || {};
      const currentStatus = userData.statusVerification || userData.verificationStatus;

      if (currentStatus === 'approved') {
        toast.success('Verifikasi Anda telah disetujui!', { title: 'Sukses' });
        navigate('/mitra/dashboard', { replace: true });
        return;
      }

      const statusRes = await apiClient.get('/verifications/my-status');
      const verifications = statusRes.data?.data || statusRes.data || [];

      if (Array.isArray(verifications) && verifications.length > 0) {
        const latestTypeMap = new Map();
        verifications.forEach((v) => {
          if (!latestTypeMap.has(v.type)) {
            latestTypeMap.set(v.type, v);
          }
        });

        const rejectedDocs = Array.from(latestTypeMap.values())
          .filter((v) => v.status === 'rejected')
          .map((v) => v.type);

        setVerificationStatusDetail(currentStatus || 'pending');

        if (rejectedDocs.length > 0) {
          setRejectedDocTypes(rejectedDocs);
          setIsResubmissionMode(true);
          setSubmitted(false);

          toast.error(`Beberapa dokumen ditolak. Silakan perbaiki dokumen yang bersangkutan.`, {
            title: 'Perlu Perbaikan'
          });
        } else {
          toast.info('Status pengajuan Anda masih dalam peninjauan Admin.', { title: 'Menunggu' });
        }
      }
    } catch {
      toast.error('Gagal memperbarui status dari server.', { title: 'Error' });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === 'nik') {
      nextValue = value.replace(/\D/g, '').slice(0, 16);
    } else if (name === 'bankAccountNumber') {
      // Batasi hanya angka, maksimal 18 digit
      nextValue = value.replace(/\D/g, '').slice(0, 18);
    } else if (name === 'phone') {
      // Batasi hanya angka (dan tanda + jika di awal), maksimal 15 karakter
      const cleaned = value.startsWith('+')
        ? '+' + value.slice(1).replace(/\D/g, '')
        : value.replace(/\D/g, '');
      nextValue = cleaned.slice(0, 15);
    } else if (name === 'plateNumber') {
      // Batasi hanya huruf, angka, dan spasi, otomatis huruf kapital, maksimal 11 karakter
      nextValue = value.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase().slice(0, 11);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleFileChange = (e, field) => {
    const targetFile = e.target.files && e.target.files[0];
    if (!targetFile) return;

    const allowedTypes = field === 'skck' ? SKCK_TYPES : IMAGE_TYPES;

    if (!allowedTypes.includes(targetFile.type)) {
      setFileErrors((prev) => ({
        ...prev,
        [field]: 'Format file tidak didukung.'
      }));
      return;
    }

    if (targetFile.size > MAX_FILE_SIZE) {
      setFileErrors((prev) => ({
        ...prev,
        [field]: 'Ukuran file melebihi 5MB.'
      }));
      return;
    }

    setFileErrors((prev) => ({ ...prev, [field]: '' }));
    setRawFiles((prev) => ({ ...prev, [field]: targetFile }));

    if (targetFile.type.startsWith('image/')) {
      setPreviews((prev) => ({
        ...prev,
        [field]: URL.createObjectURL(targetFile)
      }));
    } else {
      setPreviews((prev) => ({
        ...prev,
        [field]: 'PDF Document'
      }));
    }
  };

  const startCamera = async () => {
    setErrorMessage('');
    setIsScanning(true);

    try {
      let stream;
      try {
        // Coba kamera depan (jika tersedia)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch {
        // Fallback ke kamera perangkat apapun (webcam laptop/PC/USB)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setIsScanning(false);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 150);
    } catch {
      setIsScanning(false);
      setCameraActive(false);
      setErrorMessage('Akses kamera ditolak atau perangkat kamera tidak ditemukan.');
    }
  };

  const captureFaceId = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const faceFile = new File([blob], `face-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });

          setRawFiles((prev) => ({ ...prev, face: faceFile }));
          setFacePreviewUrl(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      0.85
    );

    streamRef.current.getVideoTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setFaceScanned(true);
  };

  const resetFaceScan = () => {
    setFaceScanned(false);
    setFacePreviewUrl(null);
    setRawFiles((prev) => ({ ...prev, face: null }));
    startCamera();
  };

  const handleFaceFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Format foto wajah harus JPG, JPEG, atau PNG.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Ukuran foto wajah melebihi 5MB.');
      return;
    }

    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setRawFiles((prev) => ({ ...prev, face: file }));
    setFacePreviewUrl(URL.createObjectURL(file));
    setFaceScanned(true);
    setCameraActive(false);
    setErrorMessage('');
  };

  const uploadFileToServer = async (fileObj) => {
    if (!fileObj) return '';

    const formDataObj = new FormData();
    formDataObj.append('file', fileObj);
    formDataObj.append('destination', 'uploads/verifications');

    try {
      const response = await apiClient.post('/uploads/file', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data?.filePath || response.data?.url || response.data?.data?.filePath || '';
    } catch (err) {
      console.error('Gagal upload berkas fisik:', err);
      return '';
    }
  };

  const targetDocs = isResubmissionMode ? rejectedDocTypes : ['ktp', 'sim', 'skck', 'stnk'];
  const missingDocuments = targetDocs.filter((field) => !rawFiles[field]);
  const isNikValid = formData.nik.length === 16;
  const isPhoneValid = PHONE_REGEX.test(formData.phone.trim());
  const isPlateValid = !formData.plateNumber.trim() || PLATE_REGEX.test(formData.plateNumber.trim());
  const isBankAccountValid = formData.bankAccountNumber.trim().length >= 8 && formData.bankAccountNumber.trim().length <= 18;

  const isTextInputsValid =
    formData.fullName.trim() !== '' &&
    formData.phone.trim() !== '' &&
    isPhoneValid &&
    formData.address.trim() !== '' &&
    formData.plateNumber.trim() !== '' &&
    PLATE_REGEX.test(formData.plateNumber.trim()) &&
    formData.vehicleModel.trim() !== '' &&
    formData.bankName.trim() !== '' &&
    formData.bankAccountNumber.trim() !== '' &&
    isBankAccountValid &&
    formData.bankAccountHolder.trim() !== '';

  const isFormComplete = isResubmissionMode
    ? missingDocuments.length === 0
    : faceScanned && missingDocuments.length === 0 && isNikValid && isTextInputsValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormComplete) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!isResubmissionMode) {
        const facePath = rawFiles.face ? await uploadFileToServer(rawFiles.face) : '';

        await apiClient.patch('/users/me/profile', {
          ktpNumber: formData.nik,
          fullNameKtp: formData.fullName,
          addressKtp: formData.address,
          faceImageUrl: facePath || '/uploads/verifications/default-face.jpg',
          bankName: formData.bankName,
          bankAccountNumber: formData.bankAccountNumber,
          bankAccountHolder: formData.bankAccountHolder
        });

        await apiClient.post('/vehicles', {
          type: formData.vehicleType,
          model: formData.vehicleModel,
          plateNumber: formData.plateNumber.trim(),
          color: formData.vehicleColor,
          capacitySeats: formData.vehicleType === 'mobil' ? 4 : 1,
          maxWeightCapacityKg: formData.vehicleType === 'mobil' ? 100 : 15
        });

        const ktpPath = await uploadFileToServer(rawFiles.ktp);
        const simPath = await uploadFileToServer(rawFiles.sim);
        const skckPath = await uploadFileToServer(rawFiles.skck);
        const stnkPath = await uploadFileToServer(rawFiles.stnk);

        const basePayload = {
          ktpNumber: formData.nik,
          fullNameKtp: formData.fullName,
          addressKtp: formData.address,
          faceImageUrl: facePath || '/uploads/verifications/default-face.jpg'
        };

        if (ktpPath) {
          await apiClient.post('/verifications/submit', {
            ...basePayload,
            type: 'ktp',
            files: [{ filePath: ktpPath, fileType: rawFiles.ktp?.type || 'image/jpeg' }]
          });
        }

        if (simPath) {
          await apiClient.post('/verifications/submit', {
            ...basePayload,
            type: 'sim',
            files: [{ filePath: simPath, fileType: rawFiles.sim?.type || 'image/jpeg' }]
          });
        }

        if (skckPath) {
          await apiClient.post('/verifications/submit', {
            ...basePayload,
            type: 'skck',
            files: [{ filePath: skckPath, fileType: rawFiles.skck?.type || 'image/jpeg' }]
          });
        }

        if (stnkPath) {
          await apiClient.post('/verifications/submit', {
            ...basePayload,
            type: 'stnk',
            files: [{ filePath: stnkPath, fileType: rawFiles.stnk?.type || 'image/jpeg' }]
          });
        }
      } else {
        for (const docType of rejectedDocTypes) {
          if (rawFiles[docType]) {
            const uploadedPath = await uploadFileToServer(rawFiles[docType]);

            await apiClient.post('/verifications/submit', {
              type: docType,
              files: [
                {
                  filePath: uploadedPath,
                  fileType: rawFiles[docType]?.type || 'image/jpeg'
                }
              ]
            });
          }
        }
      }

      setSubmitted(true);
      setVerificationStatusDetail('pending');

      if (checkAuthStatus) {
        await checkAuthStatus();
      }

      toast.success('Dokumen verifikasi berhasil diperbarui & dikirim.', { title: 'Terkirim' });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || 'Terjadi kesalahan saat memproses data verifikasi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />
            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: PRIMARY_COLOR }}
            >
              <ShieldCheck className="w-3 h-3" />
              VERIFIKASI KEAMANAN MITRA
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            {isResubmissionMode
              ? 'Perbaikan Berkas Verifikasi Ditolak'
              : 'Mitra Onboarding & Verification'}
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            {isResubmissionMode
              ? 'Unggah kembali dokumen yang perlu diperbaiki sesuai catatan periksa admin.'
              : 'Lengkapi data diri, rekening bank, kendaraan, dan unggah berkas fisik.'}
          </p>
        </div>

        {submitted && (
          <StatusBadge variant={verificationStatusDetail === 'approved' ? 'emerald' : 'amber'}>
            {verificationStatusDetail === 'approved'
              ? 'Terverifikasi'
              : 'Menunggu Verifikasi Admin'}
          </StatusBadge>
        )}
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5 text-[13px]">
          {!isResubmissionMode && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
                <h2 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
                  <User className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                  1. Informasi Data Diri & Kendaraan
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Nama Lengkap (Sesuai KTP)
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      placeholder="Nama Lengkap"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        !formData.fullName.trim() ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Nomor NIK KTP (16 Digit)
                    </label>
                    <input
                      type="text"
                      name="nik"
                      required
                      inputMode="numeric"
                      maxLength={16}
                      placeholder="3372xxxxxxxxxxxx"
                      value={formData.nik}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        formData.nik.length !== 16 ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Nomor Telepon / WhatsApp
                      </label>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {formData.phone.length}/15
                      </span>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      required
                      maxLength={15}
                      placeholder="0812xxxxxxxx"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        formData.phone && !isPhoneValid ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                    {formData.phone && !isPhoneValid ? (
                      <p className="text-[11px] text-rose-500 mt-1">
                        Format nomor tidak valid (contoh: 08123456789, 10–15 digit).
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Maks. 15 digit (contoh: 081234567890)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Jenis Kendaraan
                    </label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                    >
                      <option value="motor">Sepeda Motor</option>
                      <option value="mobil">Mobil / Minibus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Model / Merk Kendaraan
                    </label>
                    <input
                      type="text"
                      name="vehicleModel"
                      required
                      placeholder="cth: Honda Beat / Avanza"
                      value={formData.vehicleModel}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        !formData.vehicleModel.trim() ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Nomor Plat Kendaraan
                      </label>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {formData.plateNumber.length}/11
                      </span>
                    </div>
                    <input
                      type="text"
                      name="plateNumber"
                      required
                      maxLength={11}
                      placeholder="cth: AD 1234 XX"
                      value={formData.plateNumber}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] uppercase font-mono ${
                        formData.plateNumber && !isPlateValid ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                    {formData.plateNumber && !isPlateValid ? (
                      <p className="text-[11px] text-rose-500 mt-1">
                        Format plat tidak valid (contoh: B 1234 ABC atau AD 1234 XX).
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Maks. 11 karakter (contoh: AD 1234 XX)
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Alamat Domisili
                    </label>
                    <textarea
                      name="address"
                      required
                      rows="2"
                      placeholder="Masukkan alamat lengkap domisili..."
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] resize-none ${
                        !formData.address.trim() ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
                <h2 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                  Informasi Rekening Bank (Pencairan)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      required
                      placeholder="cth: BCA / Mandiri"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        !formData.bankName.trim() ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Nomor Rekening
                      </label>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {formData.bankAccountNumber.length}/18
                      </span>
                    </div>
                    <input
                      type="text"
                      name="bankAccountNumber"
                      required
                      maxLength={18}
                      placeholder="cth: 1234567890"
                      inputMode="numeric"
                      value={formData.bankAccountNumber}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] font-mono ${
                        formData.bankAccountNumber && formData.bankAccountNumber.length < 8 ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                    {formData.bankAccountNumber && formData.bankAccountNumber.length < 8 ? (
                      <p className="text-[11px] text-rose-500 mt-1">
                        Nomor rekening minimal 8 digit (maks. 18 digit).
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Hanya angka, 8–18 digit
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Nama Pemilik Rekening
                    </label>
                    <input
                      type="text"
                      name="bankAccountHolder"
                      required
                      placeholder="Sesuai buku tabungan"
                      value={formData.bankAccountHolder}
                      onChange={handleInputChange}
                      className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        !formData.bankAccountHolder.trim() ? 'border-rose-300' : 'border-neutral-200'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              {isResubmissionMode
                ? 'Dokumen Yang Memerlukan Unggah Ulang'
                : 'Unggah Dokumen Legalitas (KTP, SIM, SKCK, STNK)'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {targetDocs.map((field) => (
                <div
                  key={field}
                  className={`p-4 rounded-xl border border-dashed bg-neutral-50/50 text-center flex flex-col items-center justify-center relative ${
                    !rawFiles[field] ? 'border-rose-300' : 'border-neutral-200'
                  }`}
                >
                  {previews[field] && previews[field] !== 'PDF Document' ? (
                    <div className="relative w-full h-24 mb-2 rounded-lg overflow-hidden border border-neutral-200 bg-black/5">
                      <img
                        src={previews[field]}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRawFiles((p) => ({ ...p, [field]: null }));
                          setPreviews((p) => ({ ...p, [field]: null }));
                        }}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Upload className="w-6 h-6 mb-1" style={{ color: PRIMARY_COLOR }} />
                  )}

                  <p className="text-[13px] font-bold text-neutral-800 mb-0.5 uppercase">
                    Foto {field}
                  </p>

                  <p className="text-[11px] text-neutral-400 mb-2 truncate max-w-45">
                    {rawFiles[field] ? rawFiles[field].name : 'Format JPG/PNG (Maks 5MB)'}
                  </p>

                  <label
                    className="px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition"
                    style={{
                      backgroundColor: `${PRIMARY_ACCENT}18`,
                      color: PRIMARY_COLOR
                    }}
                  >
                    {rawFiles[field] ? 'Ganti Berkas' : 'Pilih Berkas'}
                    <input
                      type="file"
                      accept={field === 'skck' ? 'image/*,application/pdf' : 'image/*'}
                      onChange={(e) => handleFileChange(e, field)}
                      className="hidden"
                    />
                  </label>

                  {fileErrors[field] ? (
                    <p className="text-[11px] text-rose-500 mt-1">{fileErrors[field]}</p>
                  ) : !rawFiles[field] ? (
                    <p className="text-[11px] text-rose-500 mt-1">
                      Berkas {field.toUpperCase()} wajib diperbaiki.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {!isResubmissionMode && (
            <div
              className={`bg-white rounded-2xl shadow-sm border p-5 sm:p-6 text-center space-y-3 ${
                !faceScanned ? 'border-rose-200' : 'border-neutral-200'
              }`}
            >
              <h2 className="text-[17px] font-bold text-neutral-800 flex items-center justify-center gap-1.5">
                <Camera className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                3. Pendaftaran Data Face ID Scan
              </h2>

              <div className="max-w-xs mx-auto p-3 bg-neutral-900 rounded-2xl text-white flex flex-col items-center justify-center relative shadow-inner min-h-45">
                <canvas ref={canvasRef} className="hidden" />

                <div
                  className={`relative w-full h-40 flex flex-col items-center justify-center ${
                    cameraActive ? 'flex' : 'hidden'
                  }`}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-32 object-cover rounded-xl border border-[#74B4D9]/50 bg-black"
                  />
                  <button
                    type="button"
                    onClick={captureFaceId}
                    className="mt-2 px-3 py-1 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[12px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Ambil / Konfirmasi Wajah
                  </button>
                </div>

                {faceScanned && facePreviewUrl && !cameraActive && (
                  <div className="flex flex-col items-center py-2 space-y-2">
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-[#74B4D9] shadow-md">
                      <img
                        src={facePreviewUrl}
                        alt="Face ID"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[12px] font-bold text-[#74B4D9]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Face ID Berhasil Direkam!
                    </div>
                    <button
                      type="button"
                      onClick={resetFaceScan}
                      className="text-[11px] underline hover:text-white cursor-pointer"
                      style={{ color: PRIMARY_ACCENT }}
                    >
                      Ulangi Foto Wajah
                    </button>
                  </div>
                )}

                {!cameraActive && !isScanning && !faceScanned && (
                  <div className="flex flex-col items-center py-5 space-y-2.5">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 text-white rounded-xl text-[12px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      <Camera className="w-4 h-4" />
                      Aktifkan Kamera Perangkat (Webcam)
                    </button>

                    <span className="text-[11px] text-neutral-400">atau</span>

                    <label className="text-[12px] font-bold text-[#74B4D9] hover:underline cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Pilih Foto Wajah dari File Perangkat
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleFaceFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {!faceScanned && (
                <p className="text-[11px] text-rose-500 mt-1">
                  Verifikasi Face ID scan wajah belum dilakukan.
                </p>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-[13px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col items-end gap-2 pt-1">
            <button
              type="submit"
              disabled={!isFormComplete || isLoading}
              className={`px-6 py-3 rounded-xl text-[13px] font-bold transition shadow-sm ${
                isFormComplete && !isLoading
                  ? 'text-white cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
              style={
                isFormComplete && !isLoading
                  ? { backgroundColor: PRIMARY_COLOR }
                  : undefined
              }
            >
              {isLoading
                ? 'Mengunggah Berkas ke Server...'
                : isResubmissionMode
                ? 'Kirim Ulang Berkas Ditolak'
                : 'Kirim Data Onboarding & Verifikasi'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h2 className="text-[19px] font-bold text-neutral-800">
            Verifikasi Mitra Sedang Ditinjau
          </h2>

          <p className="text-[14px] text-neutral-500">
            Dokumen Anda telah dikirim ke pusat verifikasi. Dashboard Mitra akan terbuka otomatis
            setelah Admin menyetujui pengajuan Anda.
          </p>

          <button
            onClick={handleManualCheckStatus}
            disabled={isCheckingStatus}
            className="py-2.5 px-5 text-white rounded-xl text-[13px] font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            <span>{isCheckingStatus ? 'Memeriksa...' : 'Cek Status Verifikasi'}</span>
          </button>
        </div>
      )}
    </div>
  );
}