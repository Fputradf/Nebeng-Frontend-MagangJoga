import { useState, useRef, useEffect } from 'react';
import { IMAGE_PRESETS, resizeImageToDataUrl } from '../../../utils/imageUpload';
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
    appLogoDark,
    appFavicon,
    appTagline,
    isCustom,
    defaultLogo,
    defaultLogoDark,
    defaultFavicon,
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
  const [logoDarkPreview, setLogoDarkPreview] = useState(appLogoDark || defaultLogoDark);
  const [faviconPreview, setFaviconPreview] = useState(appFavicon || defaultFavicon);
  const [logoInputType, setLogoInputType] = useState('upload'); // 'upload' | 'url'
  const [urlInputs, setUrlInputs] = useState({ light: '', dark: '', favicon: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [draggingTarget, setDraggingTarget] = useState(null);
  const [successNotice, setSuccessNotice] = useState(false);
  const [applyGlobally, setApplyGlobally] = useState(true);

  const lightInputRef = useRef(null);
  const darkInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  // Sinkronisasi form saat context berubah
  useEffect(() => {
    setNameInput(appName || defaultName);
    setTaglineInput(appTagline || defaultTagline);
    setLogoPreview(appLogo || defaultLogo);
    setLogoDarkPreview(appLogoDark || defaultLogoDark);
    setFaviconPreview(appFavicon || defaultFavicon);
  }, [appName, appTagline, appLogo, appLogoDark, appFavicon, defaultName, defaultTagline, defaultLogo, defaultLogoDark, defaultFavicon]);

  const setSlotPreview = (slot, value) => {
    if (slot === 'light') setLogoPreview(value);
    else if (slot === 'dark') setLogoDarkPreview(value);
    else if (slot === 'favicon') setFaviconPreview(value);
  };

  // Handle pemrosesan berkas logo / favicon
  const handleFileProcess = async (file, slot = 'light') => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas tidak valid. Harap pilih gambar (PNG, SVG, JPG, WEBP, ICO).');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Ukuran berkas melebihi batas maksimal 2MB.');
      return;
    }

    try {
      const resizedDataUrl = await resizeImageToDataUrl(file, IMAGE_PRESETS.logo);
      setSlotPreview(slot, resizedDataUrl);
      toast.info('Aset berhasil dipilih & dioptimalkan. Tekan "Simpan Identitas" untuk menerapkan.');
    } catch {
      toast.error('Gagal memproses berkas gambar.');
    }
  };

  const handleApplySlotUrl = (slot) => {
    const raw = (urlInputs[slot] || '').trim();
    if (!raw) {
      toast.error('Masukkan tautan URL gambar yang valid');
      return;
    }
    setSlotPreview(slot, raw);
    toast.info('Pratinjau URL diperbarui. Tekan "Simpan Identitas" untuk menerapkan.');
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
        appLogoDark: logoDarkPreview,
        appFavicon: faviconPreview,
        appTagline: taglineInput.trim() || defaultTagline,
      });
      setSuccessNotice(true);
      toast.success('Konfigurasi logo, favicon, dan nama aplikasi berhasil disimpan!');
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
      message: 'Apakah Anda yakin ingin mengembalikan seluruh logo, favicon, dan nama aplikasi ke konfigurasi bawaan (default)?',
      confirmText: 'Ya, Reset',
      cancelText: 'Batal',
      variant: 'warning',
    });

    if (ok) {
      resetConfig();
      setNameInput(defaultName);
      setTaglineInput(defaultTagline);
      setLogoPreview(defaultLogo);
      setLogoDarkPreview(defaultLogoDark);
      setFaviconPreview(defaultFavicon);
      setUrlInputs({ light: '', dark: '', favicon: '' });
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2684ff] px-6 py-5 sm:py-0 sm:h-[104px] flex items-center text-white shadow-card">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent truncate">
                SISTEM TATA KELOLA IDENTITAS & BRANDING
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              Konfigurasi Logo & Nama Aplikasi
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition cursor-pointer border border-white/15 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Bawaan
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-[#1356d6] text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Identitas'}
            </button>
          </div>
        </div>
      </section>

      {/* NOTIFIKASI SUKSES */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Perubahan logo dan nama aplikasi telah berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
        </div>
      )}

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Status Identitas"
          value={isCustom ? 'Kustom' : 'Standar'}
          subtitle={isCustom ? 'Branding mandiri aktif' : 'Konfigurasi bawaan sistem'}
          badgeText={isCustom ? 'Kustomisasi' : 'Default'}
          badgeVariant="blue"
          icon={Sparkles}
          iconVariant="blue"
          variant="light"
        />
        <StatCard
          title="Nama Aplikasi"
          value={nameInput.trim() || 'SatuRute'}
          subtitle="Tampil di sidebar & tab"
          badgeText="Resmi"
          badgeVariant="blue"
          icon={Globe}
          iconVariant="blue"
          variant="light"
        />
        <StatCard
          title="Sumber Logo"
          value={logoSourceLabel}
          subtitle="Resolusi rasio 1:1 transparan"
          badgeText="Aktif"
          badgeVariant="blue"
          icon={ImageIcon}
          iconVariant="blue"
          variant="light"
        />
        <StatCard
          title="Slogan Platform"
          value={taglineInput ? `${taglineInput.slice(0, 15)}...` : 'Ekosistem'}
          subtitle="Slogan resmi platform"
          badgeText="Aktif"
          badgeVariant="blue"
          icon={Sliders}
          iconVariant="blue"
          variant="light"
        />
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'config'
              ? 'border-[#1356d6] text-[#1356d6]'
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
              ? 'border-[#1356d6] text-[#1356d6]'
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
              ? 'border-[#1356d6] text-[#1356d6]'
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
              <Sliders className="w-5 h-5 text-[#1356d6]" />
              <h2 className="text-base font-bold text-slate-900">
                Parameter Nama & Slogan Platform Global
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 min-h-[24px] flex items-end">
                  Nama Aplikasi Utama
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#1356d6]/20 focus-within:border-[#1356d6]">
                  <input
                    type="text"
                    maxLength={35}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Contoh: SatuRute"
                    className="w-full min-w-0 px-3.5 py-2.5 text-sm focus:outline-none"
                  />
                  <span className="px-3 py-2.5 bg-slate-50 border-l border-slate-200 text-xs text-slate-400 font-medium shrink-0">
                    {nameInput.length}/35
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Nama utama yang ditampilkan pada seluruh sidebar, topbar, dan judul tab peramban.
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 min-h-[24px] flex items-end">
                  Slogan / Tagline Platform
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#1356d6]/20 focus-within:border-[#1356d6]">
                  <input
                    type="text"
                    maxLength={80}
                    value={taglineInput}
                    onChange={(e) => setTaglineInput(e.target.value)}
                    placeholder="Contoh: Platform Ekosistem Transportasi Antarkota"
                    className="w-full min-w-0 px-3.5 py-2.5 text-sm focus:outline-none"
                  />
                  <span className="px-3 py-2.5 bg-slate-50 border-l border-slate-200 text-xs text-slate-400 font-medium shrink-0">
                    {taglineInput.length}/80
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Deskripsi singkat platform yang digunakan pada topbar dan informasi sistem.
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 min-h-[24px] flex items-end">
                  Metode Pemilihan Logo
                </label>
                <select
                  value={logoInputType}
                  onChange={(e) => setLogoInputType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1356d6]/20 focus:border-[#1356d6] bg-white cursor-pointer"
                >
                  <option value="upload">Unggah Berkas Gambar (Upload File)</option>
                  <option value="url">Tautan Gambar Daring (External URL)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Pilih metode pemasangan logo aplikasi baik berkas lokal maupun URL CDN eksternal.
                </p>
              </div>
            </div>
          </div>

          {/* Matrix Cards for Logo Management & Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: Logo & Favicon Asset Management (3 slots) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#1356d6] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Manajemen Berkas Logo &amp; Favicon
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Atur aset logo terpisah untuk halaman terang (White Page), halaman gelap (Black Page), dan ikon tab peramban (Favicon).
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: 'light',
                    title: '1. Logo Halaman Terang (White Page)',
                    desc: 'Digunakan pada Topbar, Landing Page, Cetak PDF, dan form latar putih.',
                    preview: logoPreview,
                    fallback: defaultLogo,
                    inputRef: lightInputRef,
                    previewBg: 'bg-white border-slate-200',
                    resetLabel: 'Reset Logo Terang',
                  },
                  {
                    key: 'dark',
                    title: '2. Logo Halaman Gelap (Black Page)',
                    desc: 'Digunakan pada Sidebar navigasi dan panel berlatar gelap/biru tua.',
                    preview: logoDarkPreview,
                    fallback: defaultLogoDark,
                    inputRef: darkInputRef,
                    previewBg: 'bg-[#0b3ba8] border-blue-400/30',
                    resetLabel: 'Reset Logo Gelap',
                  },
                  {
                    key: 'favicon',
                    title: '3. Favicon Tab Browser',
                    desc: 'Ikon kecil pada tab peramban, bookmark, dan shortcut layar utama.',
                    preview: faviconPreview,
                    fallback: defaultFavicon,
                    inputRef: faviconInputRef,
                    previewBg: 'bg-slate-100 border-slate-200',
                    resetLabel: 'Reset Favicon',
                  },
                ].map((slot) => (
                  <div key={slot.key} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center p-1.5 shrink-0 ${slot.previewBg}`}>
                          <img
                            src={slot.preview}
                            alt={slot.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = slot.fallback;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {slot.title}
                          </span>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {slot.desc}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSlotPreview(slot.key, slot.fallback);
                          toast.info(`${slot.resetLabel} dikembalikan ke bawaan.`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-700 transition cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        Default
                      </button>
                    </div>

                    {logoInputType === 'upload' ? (
                      <div
                        onDrop={(e) => {
                          e.preventDefault();
                          setDraggingTarget(null);
                          handleFileProcess(e.dataTransfer.files?.[0], slot.key);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDraggingTarget(slot.key);
                        }}
                        onDragLeave={() => setDraggingTarget(null)}
                        onClick={() => slot.inputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl px-4 py-3 text-center cursor-pointer transition flex items-center justify-center gap-3 ${
                          draggingTarget === slot.key
                            ? 'border-[#1356d6] bg-blue-50/60'
                            : 'border-slate-300 bg-white hover:bg-slate-50/80 hover:border-slate-400'
                        }`}
                      >
                        <input
                          ref={slot.inputRef}
                          type="file"
                          accept="image/png, image/svg+xml, image/jpeg, image/webp, image/x-icon"
                          className="hidden"
                          onChange={(e) => handleFileProcess(e.target.files?.[0], slot.key)}
                        />
                        <Upload className="w-4 h-4 text-[#1356d6] shrink-0" />
                        <span className="text-xs font-semibold text-slate-700">
                          Tarik berkas ke sini atau <span className="text-[#1356d6] underline">pilih gambar</span> (PNG/SVG, maks 2MB)
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={urlInputs[slot.key]}
                          onChange={(e) => setUrlInputs((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                          placeholder="https://cdn.example.com/logo.png"
                          className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-[#1356d6] focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplySlotUrl(slot.key)}
                          className="px-3 py-2 bg-[#1356d6] hover:bg-[#0b3ba8] text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyGlobally}
                    onChange={(e) => setApplyGlobally(e.target.checked)}
                    className="rounded-sm border-slate-300 text-[#1356d6] focus:ring-[#1356d6]"
                  />
                  <span className="font-medium text-slate-700">
                    Otomatis sinkronkan identitas ke semua role pengguna (Regional, Mitra, Pos, Customer)
                  </span>
                </label>
              </div>
            </div>

            {/* Card 2: Transparency & Contrast Testing */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#1356d6] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Uji Transparansi &amp; Kontras Latar
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Pastikan masing-masing logo terlihat tajam pada tema gelap, terang, dan tab browser.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Latar Gelap (Black Page / Sidebar Theme) */}
                <div className="bg-gradient-to-b from-[#0b3ba8] via-[#1356d6] to-[#2684ff] p-4 rounded-xl border border-blue-400/20 text-white flex flex-col items-center justify-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80 block text-center">
                    Black Page (Sidebar)
                  </span>
                  <div className="w-14 h-14 rounded-xl bg-white/10 p-2 flex items-center justify-center border border-white/15">
                    <img
                      src={logoDarkPreview}
                      alt="Logo Black Page"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoDark;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-white/90 truncate max-w-[120px]">
                    {nameInput.trim() || defaultName}
                  </span>
                </div>

                {/* Latar Terang (White Page / Topbar Theme) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
                    White Page (Topbar)
                  </span>
                  <div className="w-14 h-14 rounded-xl bg-white p-2 shadow-2xs border border-slate-200 flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo White Page"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultLogo;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#1356d6] truncate max-w-[120px]">
                    {nameInput.trim() || defaultName}
                  </span>
                </div>
              </div>

              {/* Favicon Preview Box */}
              <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                    <img
                      src={faviconPreview}
                      alt="Favicon"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultFavicon;
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {nameInput.trim() || defaultName} — Tab Peramban
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                  Favicon
                </span>
              </div>

              <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Setiap tema menggunakan aset logo khususnya secara otomatis.</span>
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
                  <Layout className="w-5 h-5 text-[#1356d6]" />
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
                <div className="max-w-md bg-gradient-to-r from-[#0b3ba8] via-[#1356d6] to-[#2684ff] rounded-2xl p-4 text-white shadow-md border border-blue-400/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5 shrink-0 border border-white/15">
                        <img
                          src={logoDarkPreview}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = defaultLogoDark;
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
                      <p className="font-extrabold text-[#1356d6] text-base leading-none truncate">
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
                      src={faviconPreview}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultFavicon;
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
              <BookOpen className="w-5 h-5 text-[#1356d6]" />
              <h2 className="text-base font-bold text-slate-900">
                Spesifikasi & Pedoman Desain Visual Brand
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-[#1356d6] uppercase tracking-wider block">
                  1. Rasio & Dimensi
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gunakan rasio <strong>1:1 (persegi)</strong> dengan dimensi minimal <strong>256 x 256 piksel</strong> atau ideal <strong>512 x 512 piksel</strong> agar tampilan tetap tajam pada layar Retina / High-DPI.
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-[#1356d6] uppercase tracking-wider block">
                  2. Format Berkas
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Format berkas yang direkomendasikan adalah <strong>PNG transparan</strong> atau <strong>SVG</strong>. Hindari latar belakang putih solid agar logo menyatu alami dengan gradien biru sidebar.
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-xs font-bold text-[#1356d6] uppercase tracking-wider block">
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
