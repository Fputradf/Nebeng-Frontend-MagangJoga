import { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Building2,
  QrCode,
  ShieldCheck,
  Save,
  CheckCircle2,
  Upload,
  RotateCcw,
  Eye,
  FileText,
  Check,
  XCircle,
  Layers,
  Sliders,
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
  const [successNotice, setSuccessNotice] = useState(false);

  // Form State: MUTUALLY EXCLUSIVE ('MANUAL' vs 'GATEWAY')
  const [activeMode, setActiveMode] = useState('MANUAL');

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
    'Buka aplikasi m-Banking atau e-wallet pilihan Anda.',
    'Pilih menu Transfer Rekening Bank atau Scan QRIS.',
    'Masukkan nominal tagihan tepat sesuai ringkasan pesanan.',
    'Unggah foto struk transfer pada formulir checkout in-app.',
  ]);
  const [autoVerifyManual, setAutoVerifyManual] = useState(false);

  // Manual Payments for Verification
  const [manualPayments, setManualPayments] = useState([]);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [selectedProofModal, setSelectedProofModal] = useState(null);

  const fileInputRef = useRef(null);

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
      toast.error('Gagal memuat konfigurasi pembayaran.');
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
      toast.info('Gambar QRIS Statis Pemilik dipilih.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        activeMode,
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
      setSuccessNotice(true);
      toast.success(
        `Konfigurasi berhasil disimpan! Mode aktif: ${
          activeMode === 'MANUAL' ? 'Transfer Manual & QRIS Statis' : 'Payment Gateway Otomatis'
        }`
      );
      setTimeout(() => setSuccessNotice(false), 4000);
    } catch (err) {
      console.error('Gagal menyimpan konfigurasi pembayaran:', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfigurasi pembayaran.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setActiveMode('MANUAL');
    setGatewayProvider('XENDIT');
    setManualBankName('Bank Central Asia (BCA)');
    setManualAccountNumber('8830192837');
    setManualAccountHolder('PT NEBENG INDONESIA DIGITAL');
    setAutoVerifyManual(false);
    toast.info('Pengaturan dikembalikan ke standar bawaan.');
  };

  const handleVerifyPayment = async (paymentId, approved) => {
    const actionText = approved ? 'Terima & Lunas' : 'Tolak Bukti';
    const confirmed = await confirm({
      title: `${actionText} Pembayaran?`,
      message: approved
        ? 'Verifikasi pembayaran ini sebagai lunas? Sistem otomatis menahan dana ke Escrow Mitra dan mengaktifkan tiket perjalanan.'
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT IDENTIK DENGAN FORM LAIN ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                PAYMENT GATEWAY & ESCROW CONFIGURATION
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Konfigurasi Saluran Pembayaran
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Atur metode pembayaran tunggal (mutually exclusive) dan kelola verifikasi transfer manual pelanggan.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition cursor-pointer border border-white/15"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Bawaan
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-400/20 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* NOTIFIKASI SUKSES */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Konfigurasi metode pembayaran berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
        </div>
      )}

      {/* ── STATS CARDS IDENTIK DENGAN FORM LAIN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mode Pembayaran"
          value={activeMode === 'MANUAL' ? 'Transfer Manual' : 'Gateway Otomatis'}
          subtitle={activeMode === 'MANUAL' ? 'Tanpa beban gateway' : 'Xendit / Midtrans'}
          badgeText={activeMode === 'MANUAL' ? 'Default' : 'Live'}
          badgeVariant={activeMode === 'MANUAL' ? 'emerald' : 'blue'}
          icon={Layers}
          variant="light"
        />
        <StatCard
          title="Saluran Aktif"
          value={activeMode === 'MANUAL' ? 'Rekening & QRIS' : gatewayProvider}
          subtitle="Mode mutually exclusive"
          badgeText="Eksklusif"
          badgeVariant="blue"
          icon={CreditCard}
          variant="light"
        />
        <StatCard
          title="Rekening Tujuan"
          value={manualBankName.split('(')[0].trim() || 'BCA'}
          subtitle={manualAccountNumber}
          badgeText="Terverifikasi"
          badgeVariant="emerald"
          icon={Building2}
          variant="light"
        />
        <StatCard
          title="Struk Menunggu"
          value={`${pendingCount} Berkas`}
          subtitle="Perlu review admin"
          badgeText={pendingCount > 0 ? 'Perlu Review' : 'Terkendali'}
          badgeVariant={pendingCount > 0 ? 'rose' : 'emerald'}
          icon={FileText}
          variant="primary"
        />
      </div>

      {/* ── TABS NAVIGATION IDENTIK DENGAN FORM LAIN ── */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Pengaturan Saluran Pembayaran
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'verifications'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Verifikasi Struk Manual
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-rose-500 text-white rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: FORM PENGATURAN SALURAN ── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Card 1: Pilihan Saluran Mutually Exclusive */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <CreditCard className="w-5 h-5 text-[#10367D]" />
              <h2 className="text-base font-bold text-slate-900">
                Pilihan Saluran Pembayaran Aktif
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Opsi B: Transfer Manual & QRIS Statis */}
              <div
                onClick={() => setActiveMode('MANUAL')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                  activeMode === 'MANUAL'
                    ? 'border-[#10367D] bg-blue-50/40 shadow-xs ring-2 ring-[#10367D]/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      activeMode === 'MANUAL' ? 'bg-[#10367D] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Opsi B: Transfer Rekening & QRIS Statis</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Default
                      </span>
                    </div>
                  </div>
                </div>

                <input
                  type="radio"
                  name="payment_mode"
                  checked={activeMode === 'MANUAL'}
                  onChange={() => setActiveMode('MANUAL')}
                  className="w-4 h-4 text-[#10367D] focus:ring-[#10367D] cursor-pointer"
                />
              </div>

              {/* Opsi A: Payment Gateway Otomatis */}
              <div
                onClick={() => setActiveMode('GATEWAY')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                  activeMode === 'GATEWAY'
                    ? 'border-[#10367D] bg-blue-50/40 shadow-xs ring-2 ring-[#10367D]/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      activeMode === 'GATEWAY' ? 'bg-[#10367D] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm">Opsi A: Payment Gateway Otomatis</span>
                </div>

                <input
                  type="radio"
                  name="payment_mode"
                  checked={activeMode === 'GATEWAY'}
                  onChange={() => setActiveMode('GATEWAY')}
                  className="w-4 h-4 text-[#10367D] focus:ring-[#10367D] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Rekening Bank Resmi */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#10367D]" />
                <h2 className="text-base font-bold text-slate-900">
                  Rekening Bank Resmi
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  activeMode === 'MANUAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeMode === 'MANUAL' ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={manualBankName}
                  onChange={(e) => setManualBankName(e.target.value)}
                  placeholder="Contoh: Bank Central Asia (BCA)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  value={manualAccountNumber}
                  onChange={(e) => setManualAccountNumber(e.target.value)}
                  placeholder="Contoh: 8830192837"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Pemilik Rekening (a/n)
                </label>
                <input
                  type="text"
                  value={manualAccountHolder}
                  onChange={(e) => setManualAccountHolder(e.target.value)}
                  placeholder="Contoh: PT NEBENG INDONESIA DIGITAL"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm uppercase focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                />
              </div>
            </div>
          </div>

          {/* Card 3: QRIS Statis Pemilik */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <QrCode className="w-5 h-5 text-[#10367D]" />
              <h2 className="text-base font-bold text-slate-900">
                Standee QRIS Statis Pemilik
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1 items-start">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Unggah Gambar QRIS
                  </label>
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
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-600" />
                      Pilih Berkas QRIS
                    </button>
                    {manualQrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => setManualQrisImageUrl('')}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Raw QRIS Payload String
                  </label>
                  <textarea
                    rows={3}
                    value={manualQrisPayload}
                    onChange={(e) => setManualQrisPayload(e.target.value)}
                    placeholder="00020101021226680016ID.CO.NEBENG..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoVerifyManual}
                      onChange={(e) => setAutoVerifyManual(e.target.checked)}
                      className="w-4 h-4 rounded text-[#10367D] focus:ring-[#10367D]"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Verifikasi Otomatis Instan (Mode Demo)
                    </span>
                  </label>
                </div>
              </div>

              {/* QRIS Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
                {manualQrisImageUrl ? (
                  <img
                    src={manualQrisImageUrl}
                    alt="QRIS Statis"
                    className="w-40 h-40 object-contain rounded-lg bg-white p-1 border border-slate-200"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-2">
                    <QrCode className="w-10 h-10 mb-1 text-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-400">Barcode SVG Lokal</span>
                  </div>
                )}
                <span className="text-xs font-bold text-slate-700 mt-2">
                  {manualAccountHolder || 'PT NEBENG INDONESIA DIGITAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Panduan Langkah Transfer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-[#10367D]" />
              <h2 className="text-base font-bold text-slate-900">
                Panduan Langkah Pembayaran Pelanggan
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {transferGuides.map((guide, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#10367D]/10 text-[#10367D] font-bold text-xs flex items-center justify-center shrink-0">
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
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Kredensial Gateway Otomatis */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-[#10367D]" />
                <h2 className="text-base font-bold text-slate-900">
                  Kredensial Gateway Otomatis (Xendit / Midtrans)
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  activeMode === 'GATEWAY' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeMode === 'GATEWAY' ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Provider Gateway
                </label>
                <select
                  value={gatewayProvider}
                  onChange={(e) => setGatewayProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D] bg-white"
                >
                  <option value="XENDIT">Xendit Indonesia</option>
                  <option value="MIDTRANS">Midtrans Snap</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Secret Key API
                </label>
                <input
                  type="password"
                  value={xenditSecretKey}
                  onChange={(e) => setXenditSecretKey(e.target.value)}
                  placeholder="xnd_development_..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Webhook Callback Token
                </label>
                <input
                  type="password"
                  value={xenditCallbackToken}
                  onChange={(e) => setXenditCallbackToken(e.target.value)}
                  placeholder="x-callback-token"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: VERIFIKASI STRUK MANUAL ── */}
      {activeTab === 'verifications' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Verifikasi Bukti Transfer Masuk</h2>
            </div>
            <button
              onClick={loadManualPayments}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition self-start cursor-pointer"
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
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Order</th>
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
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 text-xs">{p.order?.customer?.name || 'Customer'}</p>
                          <p className="text-[11px] text-slate-400">{p.order?.customer?.phone || p.order?.customer?.email || '-'}</p>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[#10367D] text-sm">
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
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#10367D] hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
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
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isSuccess ? 'Lunas' : isPending ? 'Menunggu' : 'Ditolak'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleVerifyPayment(p.id, true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Terima
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(p.id, false)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
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
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tagihan</span>
                <p className="text-2xl font-black text-[#10367D]">
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
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
              {selectedProofModal.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleVerifyPayment(selectedProofModal.id, false)}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition cursor-pointer"
                  >
                    Tolak Struk
                  </button>
                  <button
                    onClick={() => handleVerifyPayment(selectedProofModal.id, true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
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
