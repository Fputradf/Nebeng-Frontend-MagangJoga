import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  UserX,
  FileText,
  Save,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronRight,
  Gavel,
  Sliders,
  Users
} from 'lucide-react';
import StatCard from '../../../components/ui/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { useToast } from '../../../context/ToastContext';
import {
  DEFAULT_SANCTION_SETTINGS,
  getSanctionSettings,
  updateSanctionSettings,
  getMitraSanctions,
  getSanctionAppeals,
  reviewMitraAppeal,
} from '../../../services/sanctionService';

export default function SanctionManagement() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('policy'); // 'policy' | 'appeals' | 'lookup'
  const [settings, setSettings] = useState(DEFAULT_SANCTION_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Appeals State
  const [appeals, setAppeals] = useState([]);
  const [isLoadingAppeals, setIsLoadingAppeals] = useState(false);
  const [appealFilter, setAppealFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Lookup State
  const [lookupMitraId, setLookupMitraId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Fetch Appeals
  const fetchAppeals = async () => {
    try {
      setIsLoadingAppeals(true);
      const data = await getSanctionAppeals();
      setAppeals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat permohonan banding mitra:', err);
      toast?.error?.('Gagal memuat data permohonan banding mitra');
    } finally {
      setIsLoadingAppeals(false);
    }
  };

  // Load Settings & Appeals on Mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoadingSettings(true);
        const data = await getSanctionSettings();
        setSettings(data || DEFAULT_SANCTION_SETTINGS);
      } catch (err) {
        console.error('Gagal memuat konfigurasi sanksi:', err);
      } finally {
        setIsLoadingSettings(false);
      }
      fetchAppeals();
    }
    loadInitialData();
  }, []);

  const handlePolicyChange = (policyKey, field, value) => {
    setSettings((prev) => ({
      ...prev,
      policies: {
        ...prev.policies,
        [policyKey]: {
          ...prev.policies[policyKey],
          [field]: value,
        },
      },
    }));
  };

  const handleGlobalSettingChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: Number(value) || 0,
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateSanctionSettings(settings);
      setSuccessNotice(true);
      toast?.success?.('Konfigurasi kebijakan sanksi berhasil disimpan!');
      setTimeout(() => setSuccessNotice(false), 4000);
    } catch (err) {
      console.error('Gagal menyimpan sanksi:', err);
      toast?.error?.('Gagal menyimpan konfigurasi sanksi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Kembalikan seluruh aturan sanksi ke konfigurasi standar sistem?')) {
      setSettings(DEFAULT_SANCTION_SETTINGS);
      toast?.info?.('Pengaturan dikembalikan ke standar bawaan');
    }
  };

  // Handle Review Appeal
  const handleReviewAppeal = async (approved) => {
    if (!selectedAppeal) return;
    try {
      setIsReviewing(true);
      await reviewMitraAppeal(selectedAppeal.id, {
        approved,
        reviewNotes: reviewNotes || (approved ? 'Banding disetujui oleh Super Admin' : 'Banding ditolak oleh Super Admin'),
      });

      toast?.success?.(
        approved
          ? 'Banding disetujui! Sanksi telah dicabut dan skor mitra dipulihkan.'
          : 'Banding ditolak. Sanksi tetap aktif.'
      );
      setSelectedAppeal(null);
      setReviewNotes('');
      await fetchAppeals();
    } catch (err) {
      console.error('Error saat meninjau banding:', err);
      toast?.error?.(err.response?.data?.message || 'Gagal memproses peninjauan banding.');
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle Lookup Mitra
  const handleSearchMitra = async (e) => {
    e?.preventDefault();
    if (!lookupMitraId.trim()) return;

    try {
      setIsSearchingLookup(true);
      setLookupError('');
      setLookupResult(null);

      const res = await getMitraSanctions(lookupMitraId.trim());
      setLookupResult(res?.data || res);
    } catch (err) {
      console.error('Error looking up mitra:', err);
      setLookupError(err.response?.data?.message || 'Data mitra tidak ditemukan atau ID tidak valid.');
    } finally {
      setIsSearchingLookup(false);
    }
  };

  const pendingAppealsCount = appeals.filter((a) => a.status === 'PENDING').length;

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
                SISTEM TATA KELOLA KEPATUHAN & SANKSI
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Konfigurasi Kebijakan Sanksi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Atur matriks penalti skor pelanggaran mitra, toleransi waktu pembatalan, suspensi otomatis berjenjang, dan evaluasi permohonan banding.
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
              {isSaving ? 'Menyimpan...' : 'Simpan Kebijakan'}
            </button>
          </div>
        </div>

        {/* NOTIFIKASI SUKSES */}
        {successNotice && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-100 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Perubahan parameter sanksi telah berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
          </div>
        )}
      </section>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Toleransi Telat"
          value={`${settings.lateToleranceMinutes || 15} Menit`}
          subtitle="Batas auto-cancel trip & tiket"
          badgeText="Otomatis"
          badgeVariant="indigo"
          icon={Clock}
          variant="light"
        />
        <StatCard
          title="Skor Awal Mitra"
          value={`${settings.baseScore || 100} Poin`}
          subtitle="Reputasi standar akun baru"
          badgeText="Standar"
          badgeVariant="emerald"
          icon={ShieldCheck}
          variant="light"
        />
        <StatCard
          title="Ambang Peringatan"
          value={`< ${settings.warningThreshold || 80} Poin`}
          subtitle="Notifikasi teguran otomatis"
          badgeText="Atensi"
          badgeVariant="amber"
          icon={AlertTriangle}
          variant="light"
        />
        <StatCard
          title="Ambang Suspensi"
          value={`< ${settings.suspensionThreshold || 50} Poin`}
          subtitle="Pembekuan akun otomatis"
          badgeText="Kritis"
          badgeVariant="rose"
          icon={UserX}
          variant="light"
        />
        <StatCard
          title="Banding Menunggu"
          value={`${pendingAppealsCount} Berkas`}
          subtitle="Perlu peninjauan Super Admin"
          badgeText={pendingAppealsCount > 0 ? 'Perlu Review' : 'Terkendali'}
          badgeVariant={pendingAppealsCount > 0 ? 'rose' : 'emerald'}
          icon={Gavel}
          variant="primary"
        />
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('policy')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'policy'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Konfigurasi & Matriks Aturan
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'appeals'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gavel className="w-4 h-4" />
          Tinjauan Banding Mitra
          {pendingAppealsCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-rose-500 text-white rounded-full font-bold">
              {pendingAppealsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('lookup')}
          className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'lookup'
              ? 'border-[#10367D] text-[#10367D]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          Periksa Rekam Sanksi Mitra
        </button>
      </div>

      {/* ── TAB 1: POLICY CONFIGURATION ── */}
      {activeTab === 'policy' && (
        <div className="space-y-6">
          {/* General Thresholds Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Clock className="w-5 h-5 text-[#10367D]" />
              <h2 className="text-base font-bold text-slate-900">
                Parameter Batas Waktu & Reputasi Global
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#10367D]" />
                  Batas Toleransi Telat (Menit)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.lateToleranceMinutes || 15}
                    onChange={(e) => handleGlobalSettingChange('lateToleranceMinutes', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D] font-bold text-slate-900"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    Menit
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Batas toleransi hadir di pos asal sebelum trip & tiket otomatis tercancel oleh sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Batas Waktu Pembatalan Dini (Jam)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={settings.earlyCancelHours || 4}
                    onChange={(e) => handleGlobalSettingChange('earlyCancelHours', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    Jam Sebelum Berangkat
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bila mitra membatalkan di atas jam ini dikategorikan pembatalan dini (sanksi ringan).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ambang Skor Peringatan
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={settings.warningThreshold || 80}
                    onChange={(e) => handleGlobalSettingChange('warningThreshold', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    Poin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pemberitahuan peringatan dikirim otomatis ke perangkat mitra.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ambang Skor Suspensi Otomatis
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={settings.suspensionThreshold || 50}
                    onChange={(e) => handleGlobalSettingChange('suspensionThreshold', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    Poin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akun dibekukan bila skor akumulasi sanksi aktif turun di bawah nilai ini.
                </p>
              </div>
            </div>
          </div>

          {/* Matrix Cards for Violations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {settings?.policies &&
              Object.entries(settings.policies).map(([key, policy]) => (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900">{policy.label}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {policy.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Tier 1 */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Tier 1 (Pelanggaran Awal)
                      </span>
                      <div>
                        <label className="block text-[11px] text-slate-600 font-medium mb-1">
                          Potongan Skor
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={policy.tier1ScoreDeduction}
                            onChange={(e) =>
                              handlePolicyChange(key, 'tier1ScoreDeduction', Number(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-[#10367D] focus:outline-hidden"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">
                            Poin
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 font-medium mb-1">
                          Suspensi Akun
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={policy.tier1SuspensionDays}
                            onChange={(e) =>
                              handlePolicyChange(key, 'tier1SuspensionDays', Number(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-[#10367D] focus:outline-hidden"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">
                            Hari
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                        Tier 2 (Pola Berulang-ulang)
                      </span>
                      <div>
                        <label className="block text-[11px] text-slate-600 font-medium mb-1">
                          Potongan Skor
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={policy.tier2ScoreDeduction}
                            onChange={(e) =>
                              handlePolicyChange(key, 'tier2ScoreDeduction', Number(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-[#10367D] focus:outline-hidden"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">
                            Poin
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 font-medium mb-1">
                          Suspensi Akun
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={policy.tier2SuspensionDays}
                            onChange={(e) =>
                              handlePolicyChange(key, 'tier2SuspensionDays', Number(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:border-[#10367D] focus:outline-hidden"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">
                            Hari
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policy.autoSuspendOnTier2}
                        onChange={(e) =>
                          handlePolicyChange(key, 'autoSuspendOnTier2', e.target.checked)
                        }
                        className="rounded-sm border-slate-300 text-[#10367D] focus:ring-[#10367D]"
                      />
                      <span className="font-medium text-slate-700">
                        Otomatis bekukan akun jika mencapai Tier 2
                      </span>
                    </label>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: APPEALS REVIEW ── */}
      {activeTab === 'appeals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Antrean Permohonan Banding Mitra
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mitra yang mengajukan pembatalan sanksi karena alasan mendesak atau kesalahan teknis.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAppealFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      appealFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Semua ({appeals.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      appealFilter === 'PENDING'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Menunggu ({appeals.filter((a) => a.status === 'PENDING').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealFilter('APPROVED')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      appealFilter === 'APPROVED'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Disetujui ({appeals.filter((a) => a.status === 'APPROVED').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealFilter('REJECTED')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      appealFilter === 'REJECTED'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Ditolak ({appeals.filter((a) => a.status === 'REJECTED').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchAppeals}
                  disabled={isLoadingAppeals}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                  title="Segarkan data banding"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAppeals ? 'animate-spin' : ''}`} />
                  Segarkan
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">ID & Mitra</th>
                    <th className="px-5 py-3.5">Jenis Sanksi</th>
                    <th className="px-5 py-3.5">Potongan Skor</th>
                    <th className="px-5 py-3.5">Alasan Pengajuan</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingAppeals ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#10367D]" />
                          <span>Memuat daftar permohonan banding mitra...</span>
                        </div>
                      </td>
                    </tr>
                  ) : appeals.filter((a) => appealFilter === 'ALL' || a.status === appealFilter).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-slate-400">
                        Tidak ada permohonan banding {appealFilter !== 'ALL' ? `dengan status ${appealFilter}` : ''} saat ini.
                      </td>
                    </tr>
                  ) : (
                    appeals
                      .filter((a) => appealFilter === 'ALL' || a.status === appealFilter)
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-4 font-medium text-slate-900">
                            <div>
                              <span className="font-bold">{item.mitraName || 'Mitra'}</span>
                              <span className="text-[11px] text-slate-400 block">
                                ID: #{item.mitraId} &bull; {item.mitraEmail || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
                              {item.violationType}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-rose-600">
                            -{item.scoreDeduction} Poin
                          </td>
                          <td className="px-5 py-4 text-slate-600 max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge
                              variant={
                                item.status === 'PENDING'
                                  ? 'amber'
                                  : item.status === 'APPROVED'
                                  ? 'emerald'
                                  : 'rose'
                              }
                            >
                              {item.status}
                            </StatusBadge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedAppeal(item);
                                setReviewNotes(item.reviewNotes || '');
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs ${
                                item.status === 'PENDING'
                                  ? 'bg-[#10367D] text-white hover:bg-[#0c2353]'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {item.status === 'PENDING' ? (
                                <>
                                  <Gavel className="w-3.5 h-3.5" />
                                  Tinjau
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5" />
                                  Detail
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LOOKUP MITRA SANCTION HISTORY ── */}
      {activeTab === 'lookup' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Pencarian Riwayat Sanksi Berdasarkan ID Mitra
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan ID numerik mitra untuk mengaudit akumulasi pengurangan skor, status suspensi, dan berkas sanksi aktif.
            </p>

            <form onSubmit={handleSearchMitra} className="flex gap-3 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan ID Mitra (Contoh: 1, 14, 25)..."
                  value={lookupMitraId}
                  onChange={(e) => setLookupMitraId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingLookup || !lookupMitraId.trim()}
                className="px-5 py-2.5 bg-[#10367D] hover:bg-[#0c2353] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSearchingLookup ? 'Mencari...' : 'Periksa'}
              </button>
            </form>

            {lookupError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          {lookupResult && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Hasil Rekam Kepatuhan Mitra #{lookupResult.mitraId}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Status Akun: <span className="font-semibold uppercase">{lookupResult.status || 'Active'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Skor Saat Ini</span>
                    <span
                      className={`text-xl font-bold ${
                        (lookupResult.currentScore ?? 100) >= 80
                          ? 'text-emerald-600'
                          : (lookupResult.currentScore ?? 100) >= 50
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {lookupResult.currentScore ?? 100} / {lookupResult.baseScore || 100}
                    </span>
                  </div>
                  {lookupResult.isSuspended && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
                      Tersuspensi
                    </span>
                  )}
                </div>
              </div>

              {/* Sanctions Table */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Daftar Sanksi Terdaftar ({lookupResult.sanctions?.length || 0})
                </h5>
                {(!lookupResult.sanctions || lookupResult.sanctions.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Mitra ini memiliki rekam jejak bersih dan tidak memiliki sanksi aktif.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {lookupResult.sanctions.map((s) => (
                      <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{s.violationType}</span>
                            <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-mono text-[10px]">
                              Tier {s.tier || 1}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Diberikan: {new Date(s.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-rose-600">
                            -{s.scoreDeduction} Poin
                          </span>
                          <StatusBadge variant={s.status === 'ACTIVE' ? 'rose' : 'emerald'}>
                            {s.status}
                          </StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL TINJAU BANDING ── */}
      {selectedAppeal && (
        <BaseModal
          isOpen={Boolean(selectedAppeal)}
          onClose={() => {
            if (!isReviewing) setSelectedAppeal(null);
          }}
          title={selectedAppeal.status === 'PENDING' ? 'Tinjau Permohonan Banding Sanksi' : 'Detail Permohonan Banding Sanksi'}
          subtitle={`Mitra: ${selectedAppeal.mitraName || 'Mitra'} (#${selectedAppeal.mitraId})`}
        >
          <div className="space-y-4 text-xs font-['Inter']">
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status Banding:</span>
                <StatusBadge
                  variant={
                    selectedAppeal.status === 'PENDING'
                      ? 'amber'
                      : selectedAppeal.status === 'APPROVED'
                      ? 'emerald'
                      : 'rose'
                  }
                >
                  {selectedAppeal.status}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipe Pelanggaran:</span>
                <span className="font-bold text-slate-800">{selectedAppeal.violationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Potongan Skor Terkena:</span>
                <span className="font-bold text-rose-600">-{selectedAppeal.scoreDeduction} Poin</span>
              </div>
              {selectedAppeal.tripDetails && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Perjalanan Terkait:</span>
                  <span className="font-medium text-slate-700">
                    {selectedAppeal.tripDetails.from || '-'} &rarr; {selectedAppeal.tripDetails.to || '-'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Pengajuan:</span>
                <span className="font-medium text-slate-700">
                  {new Date(selectedAppeal.createdAt).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Alasan & Argumen Banding Mitra:
              </label>
              <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-slate-800 leading-relaxed whitespace-pre-wrap">
                &ldquo;{selectedAppeal.reason}&rdquo;
              </div>
            </div>

            {selectedAppeal.evidenceUrl && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bukti Pendukung:
                </label>
                <a
                  href={selectedAppeal.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Lihat Berkas / Foto Bukti Mitra
                </a>
              </div>
            )}

            {selectedAppeal.status !== 'PENDING' ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="font-semibold text-slate-700 block mb-1">Catatan Evaluasi:</span>
                  <p className="text-slate-600 italic">
                    {selectedAppeal.reviewNotes ? `“${selectedAppeal.reviewNotes}”` : 'Tidak ada catatan tambahan.'}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAppeal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer text-xs transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catatan Evaluasi Super Admin:
                  </label>
                  <textarea
                    rows="3"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Tuliskan catatan pertimbangan (opsional untuk setuju, wajib bila menolak)..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D] text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isReviewing}
                    onClick={() => handleReviewAppeal(false)}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold cursor-pointer transition disabled:opacity-50"
                  >
                    {isReviewing ? 'Memproses...' : 'Tolak Banding'}
                  </button>
                  <button
                    type="button"
                    disabled={isReviewing}
                    onClick={() => handleReviewAppeal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
                  >
                    {isReviewing ? 'Memproses...' : 'Setujui & Pulihkan Skor'}
                  </button>
                </div>
              </>
            )}
          </div>
        </BaseModal>
      )}
    </div>
  );
}
