import { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  Globe,
  Upload,
  Eye,
  BookOpen,
  Info,
  Check,
  ShieldCheck,
  Layout,
  ExternalLink,
  Layers,
  MonitorSmartphone,
  SlidersHorizontal,
} from 'lucide-react';
import StatCard from '../../../components/ui/StatCard';
import { useAppConfig } from '../../../context/AppConfigContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

export default function AppConfigManagement() {
  const {
    appName,
    appLogo,
    appTagline,
    isCustom,
    defaultLogo,
    defaultName,
    defaultTagline,
    updateConfig,
    resetConfig,
  } = useAppConfig();

  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'preview' | 'guidelines'
  const [nameInput, setNameInput] = useState(appName || defaultName);
  const [taglineInput, setTaglineInput] = useState(appTagline || defaultTagline);
  const [logoPreview, setLogoPreview] = useState(appLogo || defaultLogo);
  const [logoInputType, setLogoInputType] = useState('upload'); // 'upload' | 'url'
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [applyGlobally, setApplyGlobally] = useState(true);

  const fileInputRef = useRef(null);

  // Sinkronisasi form saat context berubah
  useEffect(() => {
    setNameInput(appName || defaultName);
    setTaglineInput(appTagline || defaultTagline);
    setLogoPreview(appLogo || defaultLogo);
  }, [appName, appTagline, appLogo, defaultName, defaultTagline, defaultLogo]);

  // Handle pemrosesan berkas logo
  const handleFileProcess = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas tidak valid. Harap pilih gambar (PNG, SVG, JPG, WEBP).');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Ukuran berkas logo melebihi batas maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
      toast.info('Logo berhasil dipilih. Tekan "Simpan Kebijakan Identitas" untuk menerapkan.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileProcess(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFileProcess(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleApplyLogoUrl = () => {
    if (!logoUrlInput.trim()) {
      toast.error('Masukkan tautan URL logo yang valid');
      return;
    }
    setLogoPreview(logoUrlInput.trim());
    toast.info('Pratinjau logo URL diperbarui. Tekan "Simpan Kebijakan Identitas" untuk menerapkan.');
  };

  const handleSaveSettings = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      toast.error('Nama aplikasi tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      updateConfig({
        appName: trimmedName,
        appLogo: logoPreview,
        appTagline: taglineInput.trim() || defaultTagline,
      });
      setSuccessNotice(true);
      toast.success('Konfigurasi logo dan nama aplikasi berhasil disimpan!');
      setTimeout(() => setSuccessNotice(false), 5000);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan konfigurasi aplikasi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: 'Reset Identitas Aplikasi',
      message: 'Apakah Anda yakin ingin mengembalikan logo dan nama aplikasi ke konfigurasi bawaan (default)?',
      confirmText: 'Ya, Reset',
      cancelText: 'Batal',
      variant: 'warning',
    });

    if (ok) {
      resetConfig();
      setNameInput(defaultName);
      setTaglineInput(defaultTagline);
      setLogoPreview(defaultLogo);
      setLogoUrlInput('');
      toast.success('Identitas aplikasi berhasil dikembalikan ke standar bawaan.');
    }
  };

  const logoSourceLabel = logoPreview.startsWith('data:')
    ? 'Unggahan'
    : logoPreview.startsWith('http')
    ? 'URL Luar'
    : 'Bawaan';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#1e58b8] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />

        <div className="relative flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                SISTEM TATA KELOLA IDENTITAS & BRANDING
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Konfigurasi Logo & Nama Aplikasi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Atur matriks identitas visual sistem, nama platform antarmuka, aset logo resmi, dan pratinjau langsung pada seluruh panel ekosistem.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition cursor-pointer border border-white/15"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Bawaan
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-400/20 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Identitas'}
            </button>
          </div>
        </div>

        {/* NOTIFIKASI SUKSES */}
        {successNotice && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-100 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Perubahan logo dan nama aplikasi telah berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
          </div>
        )}
      </section>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Status Identitas"
          value={isCustom ? 'Kustom' : 'Standar'}
          subtitle={isCustom ? 'Branding mandiri aktif' : 'Konfigurasi bawaan sistem'}
          badgeText={isCustom ? 'Kustomisasi' : 'Default'}
          badgeVariant={isCustom ? 'blue' : 'emerald'}
          icon={Sparkles}
          variant="light"
        />
        <StatCard
          title="Nama Aplikasi"
          value={nameInput.trim() || 'Nebeng'}
          subtitle="Tampil di sidebar & tab"
          badgeText="Resmi"
          badgeVariant="emerald"
          icon={Globe}
          variant="light"
        />
        <StatCard
          title="Sumber Logo"
          value={logoSourceLabel}
          subtitle="Resolusi rasio 1:1 transparan"
          badgeText="Aktif"
          badgeVariant="amber"
          icon={ImageIcon}
          variant="light"
        />
        <StatCard
          title="Slogan Platform"
          value={taglineInput ? `${taglineInput.slice(0, 15)}...` : 'Ekosistem'}
          subtitle="Slogan resmi platform"
          badgeText="Aktif"
          badgeVariant="blue"
          icon={Sliders}
          variant="primary"
        />
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'config'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Konfigurasi Identitas & Logo
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'preview'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          Pratinjau Antarmuka & Layar
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'guidelines'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Standar Aset Visual & Tipografi
        </button>
      </div>

      {/* ── TAB 1: KONFIGURASI IDENTITAS & LOGO ── */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* General Parameters Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-[#10367D]" />
              <h2 className="text-base font-bold text-slate-900">
                Parameter Nama & Slogan Platform Global
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Aplikasi Utama
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={35}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Contoh: Nebeng"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    {nameInput.length}/35
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nama utama yang ditampilkan pada seluruh sidebar, topbar, dan judul tab peramban.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Slogan / Tagline Platform
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={80}
                    value={taglineInput}
                    onChange={(e) => setTaglineInput(e.target.value)}
                    placeholder="Contoh: Platform Ekosistem Transportasi Antarkota"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    {taglineInput.length}/80
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Deskripsi singkat platform yang digunakan pada topbar dan informasi sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Metode Pemilihan Logo
                </label>
                <div className="relative">
                  <select
                    value={logoInputType}
                    onChange={(e) => setLogoInputType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D] bg-white cursor-pointer"
                  >
                    <option value="upload">Unggah Berkas Gambar (Upload File)</option>
                    <option value="url">Tautan Gambar Daring (External URL)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih metode pemasangan logo aplikasi baik berkas lokal maupun URL CDN eksternal.
                </p>
              </div>
            </div>
          </div>

          {/* Matrix Cards for Logo Management & Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Logo Asset Management */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#10367D] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Manajemen Berkas Logo Utama
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Unggah aset logo resmi beresolusi tinggi dengan latar belakang transparan.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Tier 1 / Upload Box */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    {logoInputType === 'upload' ? 'Area Unggah Berkas' : 'Alamat URL Logo'}
                  </span>

                  {logoInputType === 'upload' ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                        isDragging
                          ? 'border-[#10367D] bg-blue-50/60'
                          : 'border-slate-300 bg-white hover:bg-slate-50/80 hover:border-slate-400'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/svg+xml, image/jpeg, image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#10367D]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Tarik berkas ke sini atau <span className="text-[#10367D] underline">pilih dari perangkat</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          PNG transparan atau SVG disarankan (Maksimal 2MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="https://cdn.example.com/logo.png"
                        className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-[#10367D] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleApplyLogoUrl}
                        className="px-3 py-2 bg-[#10367D] hover:bg-[#0c2353] text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>

                {/* Tier 2 / Actions Box */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Aksi Reset & Normalisasi
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(defaultLogo);
                        toast.info('Logo dikembalikan ke pratinjau standar bawaan.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      Gunakan Logo Bawaan Sistem
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyGlobally}
                    onChange={(e) => setApplyGlobally(e.target.checked)}
                    className="rounded-sm border-slate-300 text-[#10367D] focus:ring-[#10367D]"
                  />
                  <span className="font-medium text-slate-700">
                    Otomatis sinkronkan identitas ke semua role pengguna (Regional, Mitra, Pos, Customer)
                  </span>
                </label>
              </div>
            </div>

            {/* Card 2: Transparency & Contrast Testing */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#10367D] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Uji Transparansi & Kontras Latar
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Pastikan logo terlihat tajam dan terbaca jelas pada tema gelap dan terang.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Latar Gelap (Sidebar Theme) */}
                <div className="bg-gradient-to-b from-[#0c2353] via-[#10367D] to-[#18458f] p-4 rounded-xl border border-blue-400/20 text-white flex flex-col items-center justify-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80 block">
                    Latar Gelap (Sidebar)
                  </span>
                  <div className="w-14 h-14 rounded-xl bg-white/10 p-2 flex items-center justify-center border border-white/15">
                    <img
                      src={logoPreview}
                      alt="Logo Gelap"
                      className="w-full h-full object-contain filter brightness-0 invert"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultLogo;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-white/90 truncate max-w-[120px]">
                    {nameInput.trim() || defaultName}
                  </span>
                </div>

                {/* Latar Terang (Topbar Theme) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Latar Terang (Topbar)
                  </span>
                  <div className="w-14 h-14 rounded-xl bg-white p-2 shadow-2xs border border-slate-200 flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo Terang"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultLogo;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#10367D] truncate max-w-[120px]">
                    {nameInput.trim() || defaultName}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Format PNG transparan otomatis beradaptasi dengan warna latar navigasi.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PRATINJAU ANTARMUKA & LAYAR ── */}
      {activeTab === 'preview' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-[#10367D]" />
                  Simulasi Tampilan di Seluruh Antarmuka Sistem
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifikasi bagaimana identitas baru muncul di komponen navigasi, topbar, dan peramban.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Preview 1: Header Sidebar Gelap */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Header Sidebar Panel Navigasi (Super Admin & Regional)
                </span>
                <div className="max-w-md bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] rounded-2xl p-4 text-white shadow-md border border-blue-400/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5 shrink-0 border border-white/15">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-full h-full object-contain filter brightness-0 invert"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = defaultLogo;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-base tracking-tight leading-none truncate">
                          {nameInput.trim() || defaultName}
                        </p>
                        <span className="text-[10px] text-blue-200/80 uppercase tracking-widest font-semibold mt-1 block">
                          Superadmin Panel
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-blue-200 font-bold border border-white/10">
                      Live
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview 2: Topbar Header Terang */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Header Topbar Utama (Seluruh Halaman Dashboard)
                </span>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-soft">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultLogo;
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-[#10367D] text-base leading-none truncate">
                        {nameInput.trim() || defaultName}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">
                        {taglineInput.trim() || defaultTagline}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 3: Judul Tab Peramban */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Tab Peramban (Browser Title)
                </span>
                <div className="max-w-md bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded bg-white flex items-center justify-center p-0.5 shrink-0 border border-slate-300">
                    <img
                      src={logoPreview}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultLogo;
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {nameInput.trim() || defaultName} - Panel Superadmin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: STANDAR ASET VISUAL ── */}
      {activeTab === 'guidelines' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <BookOpen className="w-5 h-5 text-[#10367D]" />
              <h2 className="text-base font-bold text-slate-900">
                Spesifikasi & Pedoman Desain Visual Brand
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-[#10367D] uppercase tracking-wider block">
                  1. Rasio & Dimensi
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gunakan rasio <strong>1:1 (persegi)</strong> dengan dimensi minimal <strong>256 x 256 piksel</strong> atau ideal <strong>512 x 512 piksel</strong> agar tampilan tetap tajam pada layar Retina / High-DPI.
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-[#10367D] uppercase tracking-wider block">
                  2. Format Berkas
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Format berkas yang direkomendasikan adalah <strong>PNG transparan</strong> atau <strong>SVG</strong>. Hindari latar belakang putih solid agar logo menyatu alami dengan gradien biru sidebar.
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-[#10367D] uppercase tracking-wider block">
                  3. Tata Nama & Tipografi
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nama aplikasi direkomendasikan terdiri dari 1 hingga 2 kata ringkas (maksimal 35 karakter) untuk mempertahankan keterbacaan pada mode tampilan mobile.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
