import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Power,
  Sparkles,
  CreditCard,
  Lock,
} from 'lucide-react';
import StatCard from '../../../components/ui/StatCard';
import BaseModal from '../../../components/ui/BaseModal';
import EmptyState from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { disbursementBankService } from '../../../services/disbursementBankService';

const PRESET_BANKS = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)', notes: 'Kliring instan 24 jam' },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)', notes: 'Kliring instan 24 jam' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)', notes: 'Kliring instan 24 jam' },
  { code: 'MANDIRI', name: 'Bank Mandiri', notes: 'Kliring instan 24 jam' },
  { code: 'PERMATA', name: 'Bank Permata', notes: 'Kliring instan 24 jam' },
  { code: 'CIMB', name: 'CIMB Niaga', notes: 'Kliring instan 24 jam' },
  { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)', notes: 'Kliring instan 24 jam' },
  { code: 'DANAMON', name: 'Bank Danamon', notes: 'Kliring instan 24 jam' },
  { code: 'BTPN', name: 'Bank BTPN / Jenius', notes: 'Kliring instan 24 jam' },
  { code: 'SEABANK', name: 'SeaBank Indonesia', notes: 'Transfer online instan' },
  { code: 'JAGO', name: 'Bank Jago', notes: 'Transfer online instan' },
  { code: 'BJB', name: 'Bank BJB', notes: 'Kliring lokal' },
  { code: 'JATIM', name: 'Bank Jatim', notes: 'Kliring lokal' },
  { code: 'JATENG', name: 'Bank Jateng', notes: 'Kliring lokal' },
];

export default function DisbursementBankManagement() {
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    bankCode: '',
    bankName: '',
    accountNumberSample: '',
    logoUrl: '',
    orderIndex: 0,
    isActive: true,
    notes: '',
  });

  const loadBanks = async () => {
    try {
      setIsLoading(true);
      const data = await disbursementBankService.getAllBanksAdmin();
      setBanks(data || []);
    } catch (err) {
      console.error('Gagal memuat konfigurasi bank:', err);
      toast.error('Gagal memuat daftar konfigurasi bank pencairan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
  }, []);

  const totalCount = banks.length;
  const activeCount = banks.filter((b) => b.isActive).length;
  const inactiveCount = totalCount - activeCount;

  const filteredBanks = useMemo(() => {
    return banks.filter((b) => {
      const matchSearch =
        b.bankCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterStatus === 'active') return b.isActive;
      if (filterStatus === 'inactive') return !b.isActive;
      return true;
    });
  }, [banks, searchQuery, filterStatus]);

  const handleOpenCreateModal = () => {
    setEditingBank(null);
    setFormData({
      bankCode: '',
      bankName: '',
      accountNumberSample: '',
      logoUrl: '',
      orderIndex: (banks.length + 1) * 1,
      isActive: true,
      notes: 'Kliring instan 24 jam',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bank) => {
    setEditingBank(bank);
    setFormData({
      bankCode: bank.bankCode || '',
      bankName: bank.bankName || '',
      accountNumberSample: bank.accountNumberSample || '',
      logoUrl: bank.logoUrl || '',
      orderIndex: bank.orderIndex ?? 0,
      isActive: Boolean(bank.isActive),
      notes: bank.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSelectPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      bankCode: preset.code,
      bankName: preset.name,
      notes: preset.notes,
    }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.bankCode.trim() || !formData.bankName.trim()) {
      toast.warning('Kode Bank dan Nama Bank wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        bankCode: formData.bankCode.trim().toUpperCase(),
        bankName: formData.bankName.trim(),
        accountNumberSample: formData.accountNumberSample.trim() || null,
        logoUrl: formData.logoUrl.trim() || null,
        orderIndex: Number(formData.orderIndex) || 0,
        isActive: formData.isActive,
        notes: formData.notes.trim() || null,
      };

      if (editingBank) {
        await disbursementBankService.updateBank(editingBank.id, payload);
        toast.success(`Konfigurasi bank ${payload.bankName} berhasil diperbarui!`);
      } else {
        await disbursementBankService.createBank(payload);
        toast.success(`Bank pencairan ${payload.bankName} berhasil ditambahkan!`);
      }

      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 4000);
      setIsModalOpen(false);
      loadBanks();
    } catch (err) {
      console.error('Gagal menyimpan bank:', err);
      const errMsg = err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi bank.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (bank) => {
    const actionText = bank.isActive ? 'menonaktifkan' : 'mengaktifkan';
    const isConfirmed = await confirm({
      title: `${bank.isActive ? 'Nonaktifkan' : 'Aktifkan'} Bank ${bank.bankCode}?`,
      message: bank.isActive
        ? `Customer dan Mitra tidak akan dapat memilih Bank ${bank.bankName} untuk pencairan saldo baru sampai diaktifkan kembali oleh Super Admin.`
        : `Bank ${bank.bankName} akan langsung tersedia dalam daftar pencairan saldo Customer dan Mitra.`,
      confirmText: `Ya, ${bank.isActive ? 'Nonaktifkan' : 'Aktifkan'}`,
      cancelText: 'Batal',
      variant: bank.isActive ? 'warning' : 'primary',
    });

    if (!isConfirmed) return;

    try {
      await disbursementBankService.toggleActive(bank.id);
      toast.success(
        `Bank ${bank.bankName} (${bank.bankCode}) berhasil di-${bank.isActive ? 'nonaktifkan' : 'aktifkan'}!`
      );
      setBanks((prev) =>
        prev.map((item) =>
          item.id === bank.id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } catch (err) {
      console.error('Gagal mengubah status bank:', err);
      toast.error('Gagal mengubah status aktif bank.');
    }
  };

  const handleDeleteBank = async (bank) => {
    const isConfirmed = await confirm({
      title: `Hapus Bank ${bank.bankName}?`,
      message: `Tindakan ini akan menghapus opsi bank ${bank.bankCode} dari sistem pencairan dana. Transaksi lampau tetap tercatat pada log audit.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await disbursementBankService.deleteBank(bank.id);
      toast.success(`Bank ${bank.bankName} berhasil dihapus.`);
      setBanks((prev) => prev.filter((item) => item.id !== bank.id));
    } catch (err) {
      console.error('Gagal menghapus bank:', err);
      toast.error(err.response?.data?.message || 'Gagal menghapus konfigurasi bank.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT HEADER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#1e58b8] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />

        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" /> SENTRALISASI KEBIJAKAN PENCAIRAN SALDO
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Konfigurasi Bank Pencairan
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Atur dan batasi rekening bank resmi yang diizinkan untuk penarikan saldo (disbursement) oleh Customer dan Mitra. Pengguna hanya dapat memilih bank yang berstatus aktif.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <button
              onClick={loadBanks}
              disabled={isLoading}
              className="p-2.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl backdrop-blur text-white transition cursor-pointer disabled:opacity-50 shadow-sm"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 text-amber-300 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Bank Baru</span>
            </button>
          </div>
        </div>

        {/* NOTIFIKASI SUKSES DISIMPAN */}
        {successNotice && (
          <div className="mt-2 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Perubahan konfigurasi bank pencairan telah berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
          </div>
        )}

        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 sm:right-8" />
      </section>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bank Terdaftar"
          value={isLoading ? '...' : totalCount}
          subtitle="Semua opsi kliring sistem"
          icon={Landmark}
          badgeText="Sistem"
          badgeVariant="blue"
        />
        <StatCard
          title="Bank Aktif"
          value={isLoading ? '...' : activeCount}
          subtitle="Tampil di Customer & Mitra"
          icon={CheckCircle2}
          badgeText="Bisa Dipilih"
          badgeVariant="emerald"
        />
        <StatCard
          title="Bank Dinonaktifkan"
          value={isLoading ? '...' : inactiveCount}
          subtitle="Ditutup sementara oleh Admin"
          icon={AlertTriangle}
          badgeText={inactiveCount > 0 ? 'Dibatasi' : 'Nihil'}
          badgeVariant={inactiveCount > 0 ? 'rose' : 'neutral'}
        />
        <StatCard
          title="Kecepatan Kliring"
          value="BI FAST / 24 Jam"
          subtitle="SLA otomatis Xendit Disbursement"
          icon={CreditCard}
          badgeText="Instan"
          badgeVariant="blue"
        />
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-800 focus:outline-none focus:border-[#10367D] focus:bg-white transition-all"
          />
        </div>

        {/* Tab Filter Status */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Aktif ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              filterStatus === 'inactive'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Nonaktif ({inactiveCount})
          </button>
        </div>
      </div>

      {/* ── DAFTAR BANK (GRID DENGAN CARD GRADIENT ACCENT) ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-sm">
              <Skeleton className="h-6 w-1/3 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 shadow-sm">
          <EmptyState
            icon={Building2}
            title={searchQuery ? 'Bank tidak ditemukan' : 'Belum ada konfigurasi bank'}
            description={
              searchQuery
                ? `Tidak ada konfigurasi bank yang sesuai dengan kueri "${searchQuery}".`
                : 'Mulai dengan menambahkan bank resmi pertama yang diizinkan untuk pencairan dana pengguna.'
            }
            actionText={!searchQuery ? 'Tambah Bank Baru' : undefined}
            onAction={!searchQuery ? handleOpenCreateModal : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanks.map((bank) => (
            <div
              key={bank.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md relative overflow-hidden ${
                bank.isActive
                  ? 'border-neutral-200/90 shadow-sm'
                  : 'border-neutral-200 bg-neutral-50/70 opacity-80'
              }`}
            >
              {/* Top Card Gradient Line */}
              <div
                className={`h-1.5 w-full ${
                  bank.isActive
                    ? 'bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#38bdf8]'
                    : 'bg-neutral-300'
                }`}
              />

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Header Card Bank */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      {/* Logo Icon with subtle gradient */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border ${
                          bank.isActive
                            ? 'bg-gradient-to-br from-[#0c2353] to-[#10367D] text-white border-blue-900/30'
                            : 'bg-neutral-200 text-neutral-500 border-neutral-300'
                        }`}
                      >
                        {bank.logoUrl ? (
                          <img
                            src={bank.logoUrl}
                            alt={bank.bankCode}
                            className="w-full h-full object-contain rounded-xl p-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          bank.bankCode.slice(0, 3)
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-neutral-900 tracking-tight text-base">
                            {bank.bankCode}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Urutan #{bank.orderIndex}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-600 line-clamp-1 mt-0.5">
                          {bank.bankName}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        bank.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          bank.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {bank.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {/* Info / Catatan Card */}
                  <div className="bg-neutral-50/90 rounded-xl p-3 text-xs text-neutral-600 space-y-1.5 border border-neutral-100 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-medium">SLA Kliring:</span>
                      <span className="font-semibold text-neutral-800">
                        {bank.notes || 'Kliring instan'}
                      </span>
                    </div>
                    {bank.accountNumberSample && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 font-medium">Contoh Format:</span>
                        <span className="font-mono text-neutral-800 font-semibold">
                          {bank.accountNumberSample}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50">
                      <span className="text-neutral-400 font-medium">Status Pilihan:</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          bank.isActive ? 'text-emerald-600' : 'text-neutral-400'
                        }`}
                      >
                        {bank.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tersedia di Customer & Mitra
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Diblokir / Tersembunyi
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(bank)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      bank.isActive
                        ? 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                    title={bank.isActive ? 'Nonaktifkan Bank' : 'Aktifkan Bank'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {bank.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(bank)}
                    className="p-2 border border-neutral-200 text-neutral-600 hover:text-[#10367D] hover:bg-neutral-50 rounded-xl transition-colors cursor-pointer"
                    title="Ubah Konfigurasi Bank"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBank(bank)}
                    className="p-2 border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Bank"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL TAMBAH / UBAH BANK ── */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBank ? 'Ubah Konfigurasi Bank' : 'Tambah Bank Pencairan Baru'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Quick Preset Selector (hanya jika mode tambah) */}
          {!editingBank && (
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Pilih Cepat Bank Populer di Indonesia:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-neutral-50 rounded-xl border border-neutral-200">
                {PRESET_BANKS.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      formData.bankCode === preset.code
                        ? 'bg-[#10367D] text-white border-[#10367D]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {preset.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Kode Bank */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Kode Bank (Gateway) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="cth: BCA, BNI, BRI, MANDIRI"
                value={formData.bankCode}
                onChange={(e) =>
                  setFormData({ ...formData, bankCode: e.target.value.toUpperCase() })
                }
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold uppercase text-neutral-900 focus:outline-none focus:border-[#10367D] focus:bg-white text-xs sm:text-sm"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Standar kode kliring Xendit / BI FAST
              </p>
            </div>

            {/* Urutan Tampilan */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Urutan Tampilan
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={formData.orderIndex}
                onChange={(e) =>
                  setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-900 focus:outline-none focus:border-[#10367D] focus:bg-white text-xs sm:text-sm"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Urutan terkecil muncul paling atas
              </p>
            </div>
          </div>

          {/* Nama Resmi Bank */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Nama Resmi Bank <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="cth: Bank Central Asia (BCA)"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-900 focus:outline-none focus:border-[#10367D] focus:bg-white text-xs sm:text-sm"
            />
          </div>

          {/* Catatan / SLA Kliring */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Catatan / SLA Kliring
            </label>
            <input
              type="text"
              placeholder="cth: Proses instan 24 jam / Jam kerja 08:00 - 17:00"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-900 focus:outline-none focus:border-[#10367D] focus:bg-white text-xs sm:text-sm"
            />
          </div>

          {/* Contoh Format No Rekening (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Contoh Format Nomor Rekening (Opsional)
            </label>
            <input
              type="text"
              placeholder="cth: 10 digit (1234567890)"
              value={formData.accountNumberSample}
              onChange={(e) =>
                setFormData({ ...formData, accountNumberSample: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-900 focus:outline-none focus:border-[#10367D] focus:bg-white text-xs sm:text-sm"
            />
          </div>

          {/* URL Logo Bank (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              URL Logo Bank (Opsional)
            </label>
            <input
              type="url"
              placeholder="https://domain.com/logo-bank.png"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-neutral-900 focus:outline-none focus:border-[#10367D] focus:bg-white text-xs sm:text-sm"
            />
          </div>

          {/* Toggle Aktif Langsung */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <div>
              <p className="text-xs font-bold text-neutral-800">
                Status Aktifkan Bank
              </p>
              <p className="text-[11px] text-neutral-500">
                Jika aktif, bank ini langsung tersedia untuk dipilih Customer & Mitra.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#10367D] hover:bg-[#0d2d69] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? 'Menyimpan...'
                : editingBank
                ? 'Simpan Perubahan'
                : 'Tambah Bank'}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
