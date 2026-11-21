import { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Building2,
  QrCode,
  ShieldAlert,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  RotateCcw,
  Eye,
  Info,
  Clock,
  ExternalLink,
  HelpCircle,
  FileText,
  UserCheck,
  XCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import StatCard from '../../../components/ui/StatCard';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import paymentGatewayService from '../../../services/paymentGatewayService';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB

export default function PaymentGatewayManagement() {
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'verifications'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [activeMode, setActiveMode] = useState('MANUAL'); // 'MANUAL' (Opsi B) | 'GATEWAY' (Opsi A)

  // Gateway Settings
  const [gatewayProvider, setGatewayProvider] = useState('XENDIT');
  const [xenditSecretKey, setXenditSecretKey] = useState('');
  const [xenditCallbackToken, setXenditCallbackToken] = useState('');

  // Manual Transfer & QRIS Settings
  const [manualBankName, setManualBankName] = useState('Bank Central Asia (BCA)');
  const [manualAccountNumber, setManualAccountNumber] = useState('8830192837');
  const [manualAccountHolder, setManualAccountHolder] = useState('PT NEBENG INDONESIA DIGITAL');
  const [manualQrisImageUrl, setManualQrisImageUrl] = useState('');
  const [manualQrisPayload, setManualQrisPayload] = useState(
    '00020101021226680016ID.CO.NEBENG011893600999999999999902150000000000000000303UMI51440014ID.LINKAJA.WWW02150000000000000000303UMI5204549953033605802ID5919NEBENG OWNER STORE6007JAKARTA61051234062070703A016304E07B'
  );
  const [transferGuides, setTransferGuides] = useState([
    'Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau aplikasi e-wallet pilihan Anda.',
    'Pilih menu Transfer Rekening Bank Resmi atau Scan Barcode QRIS Statis Pemilik.',
    'Masukkan nominal tagihan tepat hingga digit terakhir sesuai ringkasan tagihan.',
    'Unggah foto struk/tangkapan layar bukti pembayaran pada form, lalu klik Konfirmasi Pembayaran.',
  ]);
  const [autoVerifyManual, setAutoVerifyManual] = useState(false);

  // Manual Payments for Verification
  const [manualPayments, setManualPayments] = useState([]);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [selectedProofModal, setSelectedProofModal] = useState(null);

  const fileInputRef = useRef(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await paymentGatewayService.getAdminPaymentConfig();
      if (data) {
        setActiveMode(data.activeMode || 'MANUAL');
        if (data.gateway) {
          setGatewayProvider(data.gateway.provider || 'XENDIT');
          setXenditSecretKey(data.gateway.xenditSecretKey || '');
          setXenditCallbackToken(data.gateway.xenditCallbackToken || '');
        }
        if (data.manual) {
          setManualBankName(data.manual.bankName || 'Bank Central Asia (BCA)');
          setManualAccountNumber(data.manual.accountNumber || '8830192837');
          setManualAccountHolder(data.manual.accountHolder || 'PT NEBENG INDONESIA DIGITAL');
          setManualQrisImageUrl(data.manual.qrisImageUrl || '');
          if (data.manual.qrisPayload) setManualQrisPayload(data.manual.qrisPayload);
          if (Array.isArray(data.manual.transferGuide) && data.manual.transferGuide.length > 0) {
            setTransferGuides(data.manual.transferGuide);
          }
          setAutoVerifyManual(Boolean(data.manual.autoVerifyManual));
        }
      }
    } catch (err) {
      console.error('Gagal memuat konfigurasi pembayaran:', err);
      toast.error('Gagal memuat konfigurasi pembayaran dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadManualPayments = async () => {
    setIsLoadingVerifications(true);
    try {
      const res = await paymentGatewayService.getManualPayments({ page: 1, limit: 50 });
      setManualPayments(res.data || []);
    } catch (err) {
      console.error('Gagal memuat verifikasi pembayaran manual:', err);
      toast.error('Gagal memuat daftar verifikasi manual.');
    } finally {
      setIsLoadingVerifications(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'verifications') {
      loadManualPayments();
    }
  }, [activeTab]);

  const handleQrisFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas harus berupa gambar (JPG, PNG, WEBP, SVG).');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Ukuran gambar QRIS maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setManualQrisImageUrl(event.target.result);
      toast.info('Gambar QRIS Statis Pemilik dipilih. Tekan Simpan untuk menerapkan.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        activeMode, // MUTUALLY EXCLUSIVE: SALAH SATU OPSI SAJA
        gatewayProvider,
        xenditSecretKey,
        xenditCallbackToken,
        manualBankName,
        manualAccountNumber,
        manualAccountHolder,
        manualQrisImageUrl,
        manualQrisPayload,
        transferGuide: transferGuides,
        autoVerifyManual,
      };

      await paymentGatewayService.updateAdminPaymentConfig(payload);
      toast.success(
        `Berhasil menyimpan! Mode aktif: ${
          activeMode === 'MANUAL'
            ? 'Opsi B (Transfer Manual & QRIS Statis Pemilik)'
            : 'Opsi A (Payment Gateway Otomatis)'
        }`
      );
    } catch (err) {
      console.error('Gagal menyimpan konfigurasi pembayaran:', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfigurasi pembayaran.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyPayment = async (paymentId, approved) => {
    const actionText = approved ? 'Terima & Lunas' : 'Tolak Bukti';
    const confirmed = await confirm({
      title: `${actionText} Pembayaran?`,
      message: approved
        ? 'Verifikasi pembayaran ini sebagai lunas? Sistem otomatis menahan dana ke Escrow Mitra dan mengaktifkan tiket perjalanan customer.'
        : 'Tolak bukti pembayaran ini? Customer perlu mengunggah ulang bukti transfer yang sah.',
      confirmText: approved ? 'Ya, Verifikasi Lunas' : 'Tolak Bukti',
      variant: approved ? 'primary' : 'danger',
    });

    if (!confirmed) return;

    try {
      await paymentGatewayService.verifyManualPayment(paymentId, {
        approved,
        reviewNotes: approved ? 'Diverifikasi oleh Superadmin' : 'Bukti transfer tidak valid atau belum masuk rekening',
      });
      toast.success(approved ? 'Pembayaran berhasil diverifikasi lunas!' : 'Pembayaran ditolak.');
      setSelectedProofModal(null);
      loadManualPayments();
    } catch (err) {
      console.error('Gagal verifikasi pembayaran:', err);
      toast.error(err.response?.data?.message || 'Gagal memproses verifikasi pembayaran.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Memuat konfigurasi payment gateway...</p>
        </div>
      </div>
    );
  }

  const pendingCount = manualPayments.filter((p) => p.status === 'pending').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Manajemen Saluran Pembayaran (Payment Gateway)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasi mode pembayaran tunggal (mutually exclusive) dan verifikasi bukti transfer manual pelanggan.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Pengaturan Mode
          </button>
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'verifications'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Verifikasi Struk Manual
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-black rounded-full bg-rose-500 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <span className="font-bold">Ketentuan Mode Tunggal (Mutually Exclusive):</span> Hanya{' '}
              <strong>SALAH SATU</strong> mode pembayaran yang boleh aktif dalam satu waktu. Karena akun gateway Xendit milik
              owner saat ini belum aktif / dalam verifikasi, sistem secara default mengunci saluran pada{' '}
              <strong>Opsi B (Transfer Manual & QRIS Statis Pemilik)</strong> agar sistem tidak memicu error API ke gateway.
            </div>
          </div>

          {/* Mutually Exclusive Card Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-800">
              Pilih Saluran Pembayaran Aktif Sistem (Wajib Mutually Exclusive)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opsi B: Transfer Manual & QRIS Statis (Default Rekomendasi) */}
              <div
                onClick={() => setActiveMode('MANUAL')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  activeMode === 'MANUAL'
                    ? 'border-blue-600 bg-blue-50/40 shadow-md ring-4 ring-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        activeMode === 'MANUAL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">Opsi B: Transfer Manual & QRIS Statis</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                          Default Aktif
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Rekening Bank Resmi & QRIS Statis Pemilik Tanpa Beban Gateway
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <input
                      type="radio"
                      name="payment_active_mode"
                      checked={activeMode === 'MANUAL'}
                      onChange={() => setActiveMode('MANUAL')}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    Sama sekali tidak memanggil API Xendit (100% aman dari error transaksi)
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-400" />
                    Customer mengunggah struk bukti pembayaran langsung pada checkout in-app
                  </p>
                </div>
              </div>

              {/* Opsi A: Payment Gateway Otomatis (Xendit/Midtrans) */}
              <div
                onClick={() => setActiveMode('GATEWAY')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  activeMode === 'GATEWAY'
                    ? 'border-blue-600 bg-blue-50/40 shadow-md ring-4 ring-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        activeMode === 'GATEWAY' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">Opsi A: Payment Gateway Otomatis</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Xendit / Midtrans
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        QRIS Dinamis, E-Wallet (GoPay/DANA/OVO), & Virtual Account
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <input
                      type="radio"
                      name="payment_active_mode"
                      checked={activeMode === 'GATEWAY'}
                      onChange={() => setActiveMode('GATEWAY')}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-slate-600">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-400" />
                    Verifikasi lunas otomatis via webhook dan callback server
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-amber-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    Membutuhkan API Secret Key Xendit yang berstatus Live/Sandbox aktif
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Bagian Opsi B: Transfer Manual & QRIS Statis Pemilik */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  B
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Konfigurasi Transfer Rekening & QRIS Statis Pemilik</h2>
                  <p className="text-xs text-slate-500">
                    Data rekening resmi dan kode barcode QRIS yang akan ditampilkan pada In-App Checkout pelanggan.
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  activeMode === 'MANUAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeMode === 'MANUAL' ? '● Saluran Ini Sedang Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Bank Resmi
                </label>
                <input
                  type="text"
                  value={manualBankName}
                  onChange={(e) => setManualBankName(e.target.value)}
                  placeholder="Contoh: Bank Central Asia (BCA)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor Rekening Bank
                </label>
                <input
                  type="text"
                  value={manualAccountNumber}
                  onChange={(e) => setManualAccountNumber(e.target.value)}
                  placeholder="Contoh: 8830192837"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Pemilik Rekening (a/n)
                </label>
                <input
                  type="text"
                  value={manualAccountHolder}
                  onChange={(e) => setManualAccountHolder(e.target.value)}
                  placeholder="Contoh: PT NEBENG INDONESIA DIGITAL"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium uppercase"
                />
              </div>
            </div>

            {/* QRIS Statis Section */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Unggah Gambar Standee QRIS Statis Pemilik
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Unggah gambar stiker QRIS resmi dari bank/merchant aggregator pemilik (Maksimal 3MB).
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleQrisFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-600" />
                      Pilih Berkas Gambar QRIS
                    </button>
                    {manualQrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => setManualQrisImageUrl('')}
                        className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold"
                      >
                        Hapus Gambar
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Raw QRIS Payload String (Untuk SVG Generator Standee Lokal)
                  </label>
                  <textarea
                    rows={3}
                    value={manualQrisPayload}
                    onChange={(e) => setManualQrisPayload(e.target.value)}
                    placeholder="00020101021226680016ID.CO.NEBENG..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[11px] text-slate-400">
                    Nilai ini akan diubah menjadi SVG barcode murni secara lokal tanpa dependensi API eksternal.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoVerifyManual}
                      onChange={(e) => setAutoVerifyManual(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Aktifkan Verifikasi Otomatis Instan (Mode Demo / Pengujian)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 ml-6">
                    Jika dicentang, order langsung otomatis lunas saat customer mengunggah struk bukti transfer tanpa menunggu review manual admin.
                  </p>
                </div>
              </div>

              {/* QRIS Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Preview QRIS Statis Pemilik
                </span>
                {manualQrisImageUrl ? (
                  <div className="relative group p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                    <img
                      src={manualQrisImageUrl}
                      alt="QRIS Statis Pemilik"
                      className="w-48 h-48 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-slate-400">
                    <QrCode className="w-12 h-12 mb-2 text-slate-300" />
                    <span className="text-xs text-center font-medium">
                      Belum ada gambar QRIS. Gunakan SVG Generator lokal bawaan.
                    </span>
                  </div>
                )}
                <span className="text-[11px] text-slate-500 mt-2 font-medium">
                  {manualAccountHolder || 'PT NEBENG INDONESIA DIGITAL'}
                </span>
              </div>
            </div>

            {/* Panduan Transfer Manual */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Panduan Langkah Pembayaran untuk Pelanggan (4 Langkah)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {transferGuides.map((guide, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={guide}
                      onChange={(e) => {
                        const next = [...transferGuides];
                        next[idx] = e.target.value;
                        setTransferGuides(next);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Bagian Opsi A: Konfigurasi Gateway Otomatis (Xendit/Midtrans) */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  A
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Konfigurasi Gateway Otomatis (Xendit / Midtrans)</h2>
                  <p className="text-xs text-slate-500">
                    Diaktifkan jika akun gateway pemilik sudah selesai diverifikasi dan siap memproses pembayaran live.
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  activeMode === 'GATEWAY' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeMode === 'GATEWAY' ? '● Saluran Ini Sedang Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Gateway Provider
                </label>
                <select
                  value={gatewayProvider}
                  onChange={(e) => setGatewayProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium bg-white"
                >
                  <option value="XENDIT">Xendit Indonesia (Invoices, QRIS, E-Wallet, VA)</option>
                  <option value="MIDTRANS">Midtrans Snap (Snap Popup & Core API)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Secret Key API
                </label>
                <input
                  type="password"
                  value={xenditSecretKey}
                  onChange={(e) => setXenditSecretKey(e.target.value)}
                  placeholder="xnd_development_... atau xnd_production_..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Webhook / Callback Token
                </label>
                <input
                  type="password"
                  value={xenditCallbackToken}
                  onChange={(e) => setXenditCallbackToken(e.target.value)}
                  placeholder="Token verifikasi x-callback-token"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={loadConfig}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Perubahan
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveConfig}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Mode Pembayaran
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Tab Verifikasi Struk Pembayaran Manual */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Verifikasi Bukti Transfer Manual Masuk</h2>
              <p className="text-xs text-slate-500">
                Tinjau bukti transfer yang diunggah pelanggan pada saluran Transfer Rekening & QRIS Statis Pemilik.
              </p>
            </div>
            <button
              onClick={loadManualPayments}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition self-start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Muat Ulang
            </button>
          </div>

          {isLoadingVerifications ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Memuat data pembayaran...</p>
            </div>
          ) : manualPayments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Belum ada struk transfer yang perlu diverifikasi</p>
              <p className="text-xs text-slate-400">Setiap ada bukti transfer manual yang diunggah customer akan muncul di sini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Order & ID</th>
                    <th className="pb-3 px-3">Pelanggan</th>
                    <th className="pb-3 px-3">Nominal</th>
                    <th className="pb-3 px-3">Pengirim & Bank</th>
                    <th className="pb-3 px-3">Bukti Struk</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manualPayments.map((p) => {
                    const isPending = p.status === 'pending';
                    const isSuccess = p.status === 'success';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 font-mono text-xs font-bold text-slate-900">
                          #{p.orderId}
                          <div className="text-[10px] text-slate-400 font-sans font-normal">{p.transactionId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 text-xs">{p.order?.customer?.name || 'Customer'}</p>
                          <p className="text-[11px] text-slate-400">{p.order?.customer?.phone || p.order?.customer?.email || '-'}</p>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-blue-700 text-sm">
                          Rp {Number(p.amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <p className="font-bold text-slate-800">{p.senderName || '-'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {p.bankName} {p.senderAccount ? `(${p.senderAccount})` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          {p.proofUrl ? (
                            <button
                              onClick={() => setSelectedProofModal(p)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat Struk
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Tanpa berkas</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold inline-block ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isSuccess ? 'Lunas Terverifikasi' : isPending ? 'Menunggu Verifikasi' : 'Ditolak'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleVerifyPayment(p.id, true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="Terima pembayaran & Lunas"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Terima
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(p.id, false)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                                title="Tolak bukti transfer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Preview Struk Bukti Transfer */}
      {selectedProofModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Struk Bukti Transfer Order #{selectedProofModal.orderId}</h3>
                <p className="text-xs text-slate-400">
                  Pengirim: {selectedProofModal.senderName} ({selectedProofModal.bankName})
                </p>
              </div>
              <button
                onClick={() => setSelectedProofModal(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col items-center gap-4 bg-slate-50">
              <div className="w-full text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tagihan</span>
                <p className="text-2xl font-black text-blue-700">
                  Rp {Number(selectedProofModal.amount || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="max-h-[380px] overflow-auto rounded-xl border border-slate-200 bg-white p-2 w-full flex items-center justify-center">
                <img
                  src={selectedProofModal.proofUrl}
                  alt="Bukti Transfer"
                  className="max-h-[360px] object-contain rounded-lg"
                />
              </div>

              {selectedProofModal.notes && (
                <div className="w-full p-3 rounded-xl bg-slate-100 text-xs text-slate-700">
                  <span className="font-bold block mb-0.5">Catatan Customer:</span>
                  {selectedProofModal.notes}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedProofModal(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
              >
                Tutup
              </button>
              {selectedProofModal.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleVerifyPayment(selectedProofModal.id, false)}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition"
                  >
                    Tolak Struk
                  </button>
                  <button
                    onClick={() => handleVerifyPayment(selectedProofModal.id, true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                  >
                    Verifikasi & Lunas
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
