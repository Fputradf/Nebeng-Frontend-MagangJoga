import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Clock,
  Copy,
  Check,
  Download,
  Upload,
  Building2,
  QrCode,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Wallet,
  Info,
  RefreshCw,
} from 'lucide-react';
import paymentGatewayService from '../../../services/paymentGatewayService';
import { useToast } from '../../../context/ToastContext';
import { compressImageFile } from '../../../utils/imageUpload';

/* ========================================================================== */
/* BRAND LOGO SVGs (Fintech Indonesia Authentic Style)                         */
/* ========================================================================== */

const QrisBrandLogo = () => (
  <svg viewBox="0 0 110 38" className="h-7 w-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="22" height="22" rx="4" fill="#0F172A" />
    <rect x="6" y="6" width="14" height="14" rx="2" fill="white" />
    <rect x="9" y="9" width="8" height="8" rx="1" fill="#0F172A" />
    <path d="M2 30H10" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 6H34" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 20H34" stroke="#ED1C24" strokeWidth="2.5" strokeLinecap="round" />
    <text x="36" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="20" fill="#0F172A" letterSpacing="0.5">
      QRIS
    </text>
  </svg>
);

const GopayBrandLogo = () => (
  <div className="flex items-center gap-1.5">
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#00AED6" />
      <circle cx="12" cy="12" r="5" fill="white" />
      <circle cx="12" cy="12" r="2.5" fill="#00AED6" />
      <path d="M12 7V1" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span className="font-extrabold text-sm tracking-tight text-[#0F172A]">gopay</span>
  </div>
);

const DanaBrandLogo = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-5 h-5 rounded-md bg-[#118EEA] flex items-center justify-center text-white font-black text-[10px] shadow-xs">
      D
    </div>
    <span className="font-black text-sm tracking-tight text-[#118EEA]">DANA</span>
  </div>
);

const OvoBrandLogo = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-5 h-5 rounded-full border-[2.5px] border-[#4C3494] flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-[#4C3494]" />
    </div>
    <span className="font-extrabold text-sm tracking-tight text-[#4C3494]">ovo</span>
  </div>
);

const ShopeePayBrandLogo = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-5 h-5 rounded-md bg-[#EE4D2D] flex items-center justify-center text-white font-bold text-xs shadow-xs">
      S
    </div>
    <div className="flex items-baseline">
      <span className="text-[10px] font-bold text-[#EE4D2D]">Shopee</span>
      <span className="text-xs font-black text-[#EE4D2D]">Pay</span>
    </div>
  </div>
);

const BankLogoBadge = ({ bank }) => {
  switch (bank) {
    case 'BCA':
      return (
        <div className="w-16 h-7 rounded-md bg-[#00529C] flex items-center justify-center text-white font-black text-[11px] tracking-wider shadow-xs">
          BCA
        </div>
      );
    case 'MANDIRI':
      return (
        <div className="w-16 h-7 rounded-md bg-[#003366] flex items-center justify-center text-[#FFB700] font-black text-[10px] tracking-tight shadow-xs">
          mandırı
        </div>
      );
    case 'BRI':
      return (
        <div className="w-16 h-7 rounded-md bg-[#00529C] flex items-center justify-center text-white font-black text-[11px] tracking-wider shadow-xs">
          BRI
        </div>
      );
    case 'BNI':
      return (
        <div className="w-16 h-7 rounded-md bg-[#005E6A] flex items-center justify-center text-white font-black text-[11px] tracking-tight shadow-xs">
          BNI <span className="text-[#F15A24] text-[9px] ml-0.5 font-bold">46</span>
        </div>
      );
    case 'PERMATA':
      return (
        <div className="w-16 h-7 rounded-md bg-[#007038] flex items-center justify-center text-white font-black text-[10px] tracking-tight shadow-xs">
          Permata
        </div>
      );
    default:
      return (
        <div className="w-16 h-7 rounded-md bg-slate-700 flex items-center justify-center text-white font-black text-[10px] shadow-xs">
          {bank}
        </div>
      );
  }
};

/* ========================================================================== */
/* MAIN COMPONENT: InAppCheckoutModal                                         */
/* ========================================================================== */

export default function InAppCheckoutModal({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}) {
  const toast = useToast();

  const [paymentConfig, setPaymentConfig] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Active Mode: 'MANUAL' or 'GATEWAY'
  const activeMode = paymentConfig?.activeMode || 'MANUAL';

  // Gateway Tab: 'qris_ewallet' | 'va' (Mirrors user screenshot segmented tab)
  const [gatewayTab, setGatewayTab] = useState('qris_ewallet');

  // Selected Channel detail view ('qris' | 'gopay' | 'dana' | 'ovo' | 'shopeepay' | 'va_bca' | etc.)
  const [selectedChannel, setSelectedChannel] = useState(null);

  // Manual Tab: 'bank_transfer' | 'qris_static'
  const [manualTab, setManualTab] = useState('bank_transfer');

  // Countdown Timer: 15 menit (900 detik)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);
  const [isTimerExpired, setIsTimerExpired] = useState(false);

  // Copied State Helpers
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedOrderRef, setCopiedOrderRef] = useState(false);
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);
  const [copiedVaNumber, setCopiedVaNumber] = useState('');

  // SVG QRIS State (Pure local inline SVG generated via qrcode library)
  const [qrisSvgMarkup, setQrisSvgMarkup] = useState('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Manual Form Upload State
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('BCA');
  const [senderAccount, setSenderAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isProofSubmitted, setIsProofSubmitted] = useState(false);

  // Payment Status Polling State
  const [paymentStatus, setPaymentStatus] = useState('PENDING'); // 'PENDING' | 'PENDING_VERIFICATION' | 'PAID'
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);

  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // 1. Inisialisasi dan Muat Konfigurasi
  useEffect(() => {
    if (!isOpen || !order) return;

    // Reset countdown & form state
    setTimeLeftSeconds(15 * 60);
    setIsTimerExpired(false);
    setIsProofSubmitted(false);
    setPaymentStatus('PENDING');
    setIsSuccessRedirecting(false);
    setSelectedChannel(null);
    setGatewayTab('qris_ewallet');
    setProofFile(null);
    setProofImage((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setSenderName('');
    setSenderAccount('');
    setNotes('');

    loadConfig();

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [isOpen, order?.id]);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const config = await paymentGatewayService.getPaymentConfig();
      setPaymentConfig(config);
    } catch (err) {
      console.warn('Gagal memuat konfigurasi payment gateway, memakai fallback:', err);
      setPaymentConfig({
        activeMode: 'MANUAL',
        manual: {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '8830192837',
          accountHolder: 'PT SATURUTE INDONESIA DIGITAL',
          qrisPayload:
            '00020101021226680016ID.CO.NEBENG011893600999999999999902150000000000000000303UMI51440014ID.LINKAJA.WWW02150000000000000000303UMI5204549953033605802ID5919NEBENG OWNER STORE6007JAKARTA61051234062070703A016304E07B',
        },
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // 2. Generate Barcode QRIS murni format SVG inline lokal
  useEffect(() => {
    if (!order) return;
    const payload =
      paymentConfig?.manual?.qrisPayload ||
      `00020101021226680016ID.CO.NEBENG011893600999999999999902150000000000000000303UMI51440014ID.LINKAJA.WWW02150000000000000000303UMI5204549953033605802ID5919NEBENG ORDER-${order.id}6007JAKARTA61051234062070703A016304E07B`;

    setIsGeneratingQr(true);
    QRCode.toString(payload, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        setQrisSvgMarkup(svg);
      })
      .catch((err) => {
        console.error('Gagal generate QR SVG:', err);
      })
      .finally(() => {
        setIsGeneratingQr(false);
      });
  }, [order?.id, paymentConfig]);

  // 3. Countdown Timer 15 Menit
  useEffect(() => {
    if (!isOpen || isTimerExpired || paymentStatus === 'PAID') return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isTimerExpired, paymentStatus]);

  // Format Timer mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 4. Auto-Polling Realtime Setiap 5 Detik
  useEffect(() => {
    if (!isOpen || !order?.id || isTimerExpired || paymentStatus === 'PAID') return;

    const pollStatus = async () => {
      try {
        const res = await paymentGatewayService.checkPaymentStatus(order.id);
        if (res.status === 'PAID') {
          setPaymentStatus('PAID');
          setIsSuccessRedirecting(true);
          toast.success('Pembayaran terverifikasi lunas! Tiket Anda telah aktif.');
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

          setTimeout(() => {
            onPaymentSuccess && onPaymentSuccess(order);
            onClose();
          }, 2400);
        } else if (res.status === 'PENDING_VERIFICATION') {
          setPaymentStatus('PENDING_VERIFICATION');
        }
      } catch (err) {
        // Polling error silently in background
      }
    };

    const initialTimeout = setTimeout(pollStatus, 2000);
    pollingIntervalRef.current = setInterval(pollStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [isOpen, order?.id, isTimerExpired, paymentStatus, onPaymentSuccess, onClose]);

  // Copy Helpers
  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    if (type === 'nominal') {
      setCopiedNominal(true);
      setTimeout(() => setCopiedNominal(false), 2000);
      toast.info('Nominal disalin ke clipboard');
    } else if (type === 'ref') {
      setCopiedOrderRef(true);
      setTimeout(() => setCopiedOrderRef(false), 2000);
      toast.info('Nomor referensi disalin ke clipboard');
    } else if (type === 'bank') {
      setCopiedBankAcc(true);
      setTimeout(() => setCopiedBankAcc(false), 2000);
      toast.info('Nomor rekening disalin ke clipboard');
    } else if (type.startsWith('va-')) {
      setCopiedVaNumber(type);
      setTimeout(() => setCopiedVaNumber(''), 2000);
      toast.info('Nomor Virtual Account disalin ke clipboard');
    }
  };

  // Download QRIS SVG Standee
  const handleDownloadSvg = () => {
    if (!qrisSvgMarkup) return;
    const blob = new Blob([qrisSvgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QRIS-NEBENG-ORDER-${order?.id || 'BILL'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('File barcode QRIS (SVG) berhasil diunduh');
  };

  const fileToDataUrl = (fileObj) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.readAsDataURL(fileObj);
    });

  // Upload Struk File Handler
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isImageMime = typeof file.type === 'string' && file.type.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || '');
    if (!isImageMime && !isImageExt) {
      toast.error('Berkas bukti harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran berkas mentah maksimal 15MB.');
      return;
    }

    const compressed = await compressImageFile(file, { maxWidth: 1400, quality: 0.8 });
    if (compressed.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas struk setelah kompresi maksimal 5MB.');
      return;
    }

    setProofFile(compressed);
    setProofImage((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(compressed);
    });
    toast.info('Foto struk transfer dipilih.');
  };

  // Submit Manual Payment Proof
  const handleSubmitManualProof = async (e) => {
    e.preventDefault();
    if (!proofFile && !proofImage) {
      toast.error('Silakan pilih foto struk bukti transfer terlebih dahulu.');
      return;
    }
    if (!senderName.trim()) {
      toast.error('Masukkan nama pengirim rekening Anda.');
      return;
    }

    setIsSubmittingProof(true);
    try {
      let uploadedProofUrl = proofImage;
      if (proofFile) {
        try {
          uploadedProofUrl = await paymentGatewayService.uploadPaymentProof(proofFile);
        } catch (uploadErr) {
          console.warn('Upload multipart gagal, menggunakan fallback base64 terkompresi:', uploadErr);
          const smallProof = await compressImageFile(proofFile, { maxWidth: 900, quality: 0.72 });
          uploadedProofUrl = await fileToDataUrl(smallProof);
        }
        if (!uploadedProofUrl) {
          throw new Error('Gagal memproses file bukti pembayaran.');
        }
      } else if (uploadedProofUrl && uploadedProofUrl.startsWith('blob:')) {
        throw new Error('Silakan pilih ulang foto struk bukti transfer.');
      }

      const res = await paymentGatewayService.submitManualPayment({
        orderId: order.id,
        proofUrl: uploadedProofUrl,
        senderName: senderName.trim(),
        bankName: `${manualTab === 'qris_static' ? 'QRIS Statis' : senderBank}`,
        senderAccount: senderAccount.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsProofSubmitted(true);
      if (res.status === 'PAID') {
        setPaymentStatus('PAID');
        setIsSuccessRedirecting(true);
        toast.success('Bukti pembayaran terverifikasi otomatis! Tagihan lunas.');
        setTimeout(() => {
          onPaymentSuccess && onPaymentSuccess(order);
          onClose();
        }, 2200);
      } else {
        setPaymentStatus('PENDING_VERIFICATION');
        toast.success('Bukti transfer berhasil dikirim. Menunggu verifikasi admin.');
      }
    } catch (err) {
      console.error('Gagal mengirim bukti transfer:', err);
      const rawMsg = err.response?.data?.message || err.message || 'Gagal mengirim bukti pembayaran.';
      toast.error(Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  if (!isOpen || !order) return null;

  const totalAmount = Number(order.totalPrice || order.amount || 0);
  const formattedNominal = `Rp ${totalAmount.toLocaleString('id-ID')}`;
  const orderRefNumber = `ORD-${String(order.id).padStart(6, '0')}`;

  const manualConfig = paymentConfig?.manual || {
    bankName: 'Bank Central Asia (BCA)',
    accountNumber: '8830192837',
    accountHolder: 'PT SATURUTE INDONESIA DIGITAL',
  };

  // Virtual Account Channel List for Gateway Mode
  const vaAccounts = [
    { id: 'va_bca', bank: 'BCA Virtual Account', shortBank: 'BCA', code: '89108' + String(order.id).padStart(8, '0') },
    { id: 'va_mandiri', bank: 'Mandiri Virtual Account', shortBank: 'MANDIRI', code: '88701' + String(order.id).padStart(8, '0') },
    { id: 'va_bri', bank: 'BRI Virtual Account (BRIVA)', shortBank: 'BRI', code: '12890' + String(order.id).padStart(8, '0') },
    { id: 'va_bni', bank: 'BNI Virtual Account', shortBank: 'BNI', code: '98801' + String(order.id).padStart(8, '0') },
    { id: 'va_permata', bank: 'Permata Virtual Account', shortBank: 'PERMATA', code: '85201' + String(order.id).padStart(8, '0') },
  ];

  // E-Wallet Channel List
  const ewallets = [
    { id: 'gopay', name: 'GoPay', logo: <GopayBrandLogo /> },
    { id: 'dana', name: 'DANA', logo: <DanaBrandLogo /> },
    { id: 'ovo', name: 'OVO', logo: <OvoBrandLogo /> },
    { id: 'shopeepay', name: 'ShopeePay', logo: <ShopeePayBrandLogo /> },
  ];

  // Handle header back action
  const handleHeaderBack = () => {
    if (selectedChannel) {
      setSelectedChannel(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#F8FAFC] rounded-3xl shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden">
        {/* SUCCESS OVERLAY JIKA LUNAS */}
        {paymentStatus === 'PAID' && (
          <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-lg ring-8 ring-emerald-50">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Pembayaran Berhasil!</h3>
            <p className="text-sm font-semibold text-emerald-700 mt-1">Status: Lunas & Terverifikasi Escrow</p>
            <p className="text-xs text-slate-500 mt-2 max-w-xs">
              Tiket perjalanan Anda telah aktif. Mengalihkan Anda secara otomatis ke tiket perjalanan...
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Mengalihkan halaman...
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TOP BAR: < [Pilih Metode Pembayaran] + Subtle Timer                 */}
        {/* ================================================================== */}
        <div className="bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={handleHeaderBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-800 transition cursor-pointer -ml-1"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>

          <h2 className="text-base font-bold text-slate-900 text-center flex-1 tracking-tight">
            {selectedChannel ? 'Detail Pembayaran' : 'Pilih Metode Pembayaran'}
          </h2>

          <div
            className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
              timeLeftSeconds < 180 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}
            title="Sisa waktu pembayaran"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{isTimerExpired ? 'EXPIRED' : formatTime(timeLeftSeconds)}</span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* MAIN BODY                                                          */}
        {/* ================================================================== */}
        <div className="p-4 overflow-y-auto max-h-[75vh] space-y-4">
          {isLoadingConfig ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Memuat saluran pembayaran...</p>
            </div>
          ) : isProofSubmitted || paymentStatus === 'PENDING_VERIFICATION' ? (
            <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-xs text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto ring-8 ring-blue-50">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
                  Menunggu Verifikasi Admin
                </span>
                <h3 className="text-lg font-black text-slate-900 pt-1">
                  Bukti Pembayaran Sudah Dikirim
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Struk pembayaran Anda untuk pesanan <strong className="font-mono text-slate-700">{orderRefNumber}</strong> sebesar <strong className="text-slate-800">{formattedNominal}</strong> sedang ditinjau oleh admin.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-left text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Apa selanjutnya?</p>
                <p>Status pembayaran akan otomatis berubah menjadi lunas setelah admin memverifikasi bukti transfer Anda.</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition shadow-sm cursor-pointer"
              >
                Tutup &amp; Kembali
              </button>
            </div>
          ) : activeMode === 'GATEWAY' ? (
            /* ============================================================== */
            /* MODE A: AUTOMATIC PAYMENT GATEWAY (XENDIT / MIDTRANS)          */
            /* ============================================================== */
            selectedChannel ? (
              /* CHANNEL DETAIL VIEW (When user clicks on QRIS, GoPay, VA, etc.) */
              <div className="space-y-4">
                {/* Back to method button */}
                <button
                  onClick={() => setSelectedChannel(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Ganti Metode Pembayaran Lain
                </button>

                {/* 1. DETAIL VIEW: QRIS */}
                {selectedChannel === 'qris' && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-9 border border-slate-200 rounded-lg flex items-center justify-center bg-white p-1">
                        <QrisBrandLogo />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">QRIS Standar Nasional</span>
                    </div>

                    <div className="px-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Total:</span>
                      <span className="text-base font-black text-slate-900">{formattedNominal}</span>
                      <span className="text-xs text-slate-400 font-mono">({orderRefNumber})</span>
                    </div>

                    {/* Barcode Standee Pure Inline SVG */}
                    <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm inline-block">
                      {qrisSvgMarkup ? (
                        <div
                          className="w-56 h-56 flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: qrisSvgMarkup }}
                        />
                      ) : (
                        <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                          Membuat barcode QRIS...
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 w-full pt-1">
                      <button
                        onClick={() => handleCopy(totalAmount, 'nominal')}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedNominal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Salin Nominal
                      </button>
                      <button
                        onClick={handleDownloadSvg}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh SVG
                      </button>
                    </div>

                    {/* Panduan 4 Langkah Bayar QRIS */}
                    <div className="w-full text-left bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Panduan 4 Langkah Bayar QRIS:
                      </span>
                      <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                        <li>Buka aplikasi m-Banking atau e-wallet (BCA, Livin, GoPay, OVO, ShopeePay, DANA).</li>
                        <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
                        <li>Scan barcode QRIS di atas dan pastikan nominal tepat <strong>{formattedNominal}</strong>.</li>
                        <li>Konfirmasi pembayaran dengan PIN Anda. Halaman ini akan otomatis sukses dalam 5 detik.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* 2. DETAIL VIEW: E-WALLETS (GoPay, DANA, OVO, ShopeePay) */}
                {['gopay', 'dana', 'ovo', 'shopeepay'].includes(selectedChannel) && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-center">
                    <div className="flex justify-center">
                      <div className="px-4 py-2 border border-slate-200 rounded-xl bg-white shadow-xs">
                        {selectedChannel === 'gopay' && <GopayBrandLogo />}
                        {selectedChannel === 'dana' && <DanaBrandLogo />}
                        {selectedChannel === 'ovo' && <OvoBrandLogo />}
                        {selectedChannel === 'shopeepay' && <ShopeePayBrandLogo />}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 capitalize">Pembayaran via {selectedChannel}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Selesaikan transaksi Anda melalui aplikasi resmi {selectedChannel}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-left space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Total Pembayaran:</span>
                        <span className="font-black text-slate-900">{formattedNominal}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">No. Referensi:</span>
                        <span className="font-mono font-bold text-slate-800">{orderRefNumber}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200/70 rounded-xl text-left text-xs text-blue-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Permintaan pembayaran atau notifikasi push payment akan dikirim langsung ke aplikasi {selectedChannel} terdaftar Anda.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toast.info(`Membuka integrasi ${selectedChannel}... Menunggu konfirmasi pin.`)}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka Aplikasi {selectedChannel.toUpperCase()}
                    </button>
                  </div>
                )}

                {/* 3. DETAIL VIEW: VIRTUAL ACCOUNT */}
                {selectedChannel.startsWith('va_') && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                    {(() => {
                      const vaItem = vaAccounts.find((v) => v.id === selectedChannel) || vaAccounts[0];
                      return (
                        <>
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Tujuan</span>
                              <h4 className="font-black text-slate-900 text-sm">{vaItem.bank}</h4>
                            </div>
                            <BankLogoBadge bank={vaItem.shortBank} />
                          </div>

                          <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                                Nomor Virtual Account
                              </span>
                              <p className="text-lg font-black font-mono text-slate-900 tracking-wider mt-0.5">
                                {vaItem.code}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium">Verifikasi Otomatis Escrow</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(vaItem.code, `va-${vaItem.bank}`)}
                              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              {copiedVaNumber === `va-${vaItem.bank}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              Salin VA
                            </button>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <p className="font-bold text-slate-800">Petunjuk Pembayaran Virtual Account:</p>
                            <ol className="list-decimal list-inside space-y-1 text-[11px]">
                              <li>Buka aplikasi m-Banking atau ATM bank pilihan Anda.</li>
                              <li>Pilih menu <strong>Transfer → Virtual Account</strong>.</li>
                              <li>Masukkan nomor VA di atas: <strong>{vaItem.code}</strong>.</li>
                              <li>Pastikan nominal tagihan sesuai: <strong>{formattedNominal}</strong>.</li>
                              <li>Selesaikan transaksi. Halaman ini akan otomatis sukses dalam 5 detik.</li>
                            </ol>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================== */
              /* METHOD SELECTION SCREEN: EXACT REPLICA OF USER SCREENSHOT       */
              /* ============================================================== */
              <div className="space-y-4">
                {/* 1. SEGMENTED CONTROL / PILL TABS */}
                <div className="bg-[#E2E8F0]/70 p-1 rounded-2xl flex items-center">
                  <button
                    type="button"
                    onClick={() => setGatewayTab('qris_ewallet')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      gatewayTab === 'qris_ewallet'
                        ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>QRIS & E-Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGatewayTab('va')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      gatewayTab === 'va'
                        ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <span>Virtual Account</span>
                  </button>
                </div>

                {/* 2. TAB CONTENT: QRIS & E-WALLET */}
                {gatewayTab === 'qris_ewallet' && (
                  <div className="space-y-2.5">
                    {/* SECTION LABEL: SALURAN PEMBAYARAN INSTAN */}
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      SALURAN PEMBAYARAN INSTAN
                    </div>

                    {/* WHITE CARD CONTAINER WITH DIVIDERS */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
                      {/* ITEM 1: QRIS Standar Nasional */}
                      <button
                        type="button"
                        data-channel="qris"
                        onClick={() => setSelectedChannel('qris')}
                        className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-10 border border-slate-200/90 rounded-xl flex items-center justify-center bg-white p-1 shrink-0 group-hover:border-blue-300">
                            <QrisBrandLogo />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                              QRIS Standar Nasional
                            </span>
                            <span className="bg-[#E6F8F0] text-[#00A862] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#00A862]/30">
                              Populer
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </button>

                      {/* ITEM 2: GoPay */}
                      <button
                        type="button"
                        data-channel="gopay"
                        onClick={() => setSelectedChannel('gopay')}
                        className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-10 border border-slate-200/90 rounded-xl flex items-center justify-center bg-white p-1 shrink-0 group-hover:border-blue-300">
                            <GopayBrandLogo />
                          </div>
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                            GoPay
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </button>

                      {/* ITEM 3: DANA */}
                      <button
                        type="button"
                        data-channel="dana"
                        onClick={() => setSelectedChannel('dana')}
                        className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-10 border border-slate-200/90 rounded-xl flex items-center justify-center bg-white p-1 shrink-0 group-hover:border-blue-300">
                            <DanaBrandLogo />
                          </div>
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                            DANA
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </button>

                      {/* ITEM 4: OVO */}
                      <button
                        type="button"
                        data-channel="ovo"
                        onClick={() => setSelectedChannel('ovo')}
                        className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-10 border border-slate-200/90 rounded-xl flex items-center justify-center bg-white p-1 shrink-0 group-hover:border-blue-300">
                            <OvoBrandLogo />
                          </div>
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                            OVO
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </button>

                      {/* ITEM 5: ShopeePay */}
                      <button
                        type="button"
                        data-channel="shopeepay"
                        onClick={() => setSelectedChannel('shopeepay')}
                        className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-10 border border-slate-200/90 rounded-xl flex items-center justify-center bg-white p-1 shrink-0 group-hover:border-blue-300">
                            <ShopeePayBrandLogo />
                          </div>
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                            ShopeePay
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. TAB CONTENT: VIRTUAL ACCOUNT */}
                {gatewayTab === 'va' && (
                  <div className="space-y-2.5">
                    {/* SECTION LABEL: TRANSFER VIRTUAL ACCOUNT (VERIFIKASI OTOMATIS) */}
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      TRANSFER VIRTUAL ACCOUNT (VERIFIKASI OTOMATIS)
                    </div>

                    {/* WHITE CARD CONTAINER WITH DIVIDERS */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
                      {vaAccounts.map((va) => (
                        <button
                          key={va.id}
                          type="button"
                          data-channel={va.id}
                          onClick={() => setSelectedChannel(va.id)}
                          className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-10 border border-slate-200/90 rounded-xl flex items-center justify-center bg-white p-1 shrink-0 group-hover:border-blue-300">
                              <BankLogoBadge bank={va.shortBank} />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition block">
                                {va.bank}
                              </span>
                              <span className="text-[11px] text-slate-400">Verifikasi instan otomatis</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* ============================================================== */
            /* MODE B: TRANSFER MANUAL & QRIS STATIS PEMILIK (DEFAULT AKTIF)   */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Tab Pemilihan Manual: Rekening Bank vs QRIS Statis */}
              <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1.5 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setManualTab('bank_transfer')}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    manualTab === 'bank_transfer'
                      ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                      : 'text-slate-600'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Rekening Bank Resmi
                </button>
                <button
                  type="button"
                  onClick={() => setManualTab('qris_static')}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    manualTab === 'qris_static'
                      ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                      : 'text-slate-600'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  QRIS Statis Pemilik
                </button>
              </div>

              {manualTab === 'bank_transfer' ? (
                /* Card Info Rekening Bank Resmi */
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Bank Tujuan Resmi
                      </span>
                      <h4 className="font-black text-slate-900 text-base">{manualConfig.bankName}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      Bebas Biaya Admin
                    </span>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Nomor Rekening</span>
                      <p className="text-xl font-black font-mono text-slate-900 tracking-wider mt-0.5">
                        {manualConfig.accountNumber}
                      </p>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">a/n {manualConfig.accountHolder}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(manualConfig.accountNumber, 'bank')}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedBankAcc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Salin No. Rek
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-800">Petunjuk Transfer Bank Resmi:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      <li>Transfer tepat nominal <strong>{formattedNominal}</strong> ke nomor rekening di atas.</li>
                      <li>Simpan struk / bukti transfer (format JPG, PNG, atau WEBP).</li>
                      <li>Unggah bukti transfer pada formulir di bawah ini untuk konfirmasi pesanan.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Card Standee QRIS Statis Pemilik */
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-base">Standee QRIS Statis Pemilik</h4>
                    <p className="text-xs text-slate-500 font-medium">a/n {manualConfig.accountHolder}</p>
                  </div>

                  {/* QRIS SVG Standee */}
                  <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm inline-block">
                    {manualConfig.qrisImageUrl ? (
                      <img
                        src={manualConfig.qrisImageUrl}
                        alt="QRIS Statis"
                        className="w-52 h-52 object-contain rounded-lg"
                      />
                    ) : qrisSvgMarkup ? (
                      <div
                        className="w-52 h-52 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: qrisSvgMarkup }}
                      />
                    ) : (
                      <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                        Membuat barcode QRIS...
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Salin Nominal & Unduh SVG */}
                  <div className="flex items-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(totalAmount, 'nominal')}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedNominal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      Salin Nominal
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh SVG
                    </button>
                  </div>

                  <div className="w-full text-left bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold text-slate-800 block">Panduan 4 Langkah Pembayaran QRIS:</span>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Buka aplikasi m-Banking atau dompet digital (BCA, Mandiri, BRI, BNI, GoPay, DANA, OVO).</li>
                      <li>Pilih menu <strong>Scan QRIS</strong>.</li>
                      <li>Arahkan kamera ke barcode standee di atas dan masukkan nominal <strong>{formattedNominal}</strong>.</li>
                      <li>Selesaikan transaksi dan unggah struk bukti transfer di bawah ini.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Form Upload Bukti Transfer Struk */}
              <form onSubmit={handleSubmitManualProof} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Upload Struk Bukti Transfer</h4>
                  </div>
                  {isProofSubmitted && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                      Sedang Diverifikasi
                    </span>
                  )}
                </div>

                {/* Upload Image Box */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {proofImage ? (
                    <div className="relative p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={proofImage} alt="Struk Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">Struk Pembayaran Terpilih</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Siap dikirim untuk verifikasi</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer"
                    >
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">Pilih / Tarik Foto Struk Pembayaran</span>
                      <span className="text-[10px] text-slate-400">Mendukung format JPG, PNG, atau WEBP (Maks 5MB)</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nama Pengirim / Pemilik Rekening
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Bank / Saluran Pengirim
                    </label>
                    <select
                      value={senderBank}
                      onChange={(e) => setSenderBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                    >
                      <option value="BCA">BCA (Bank Central Asia)</option>
                      <option value="Mandiri">Bank Mandiri</option>
                      <option value="BRI">BRI</option>
                      <option value="BNI">BNI</option>
                      <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                      <option value="QRIS">QRIS (Gopay/OVO/Dana/ShopeePay)</option>
                      <option value="Lainnya">Bank Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Transfer via m-BCA jam 14:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingProof || isTimerExpired}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProof ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mengunggah Struk...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Konfirmasi Pembayaran
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Realtime Auto-Polling Status Bar */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Pemeriksaan otomatis status pembayaran setiap 5 detik</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">Realtime Polling Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}
