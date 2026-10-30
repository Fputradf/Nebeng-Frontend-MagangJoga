import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ticket,
  Plus,
  Edit3,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Clock,
  RotateCw,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import BaseModal from '../../../components/ui/BaseModal';
import EmptyState from '../../../components/ui/EmptyState';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { voucherService } from '../../../services/voucherService';

const formatRp = (value) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const toInputDateTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();

  // Form State
  const initialFormState = {
    code: '',
    title: '',
    description: '',
    claimType: 'direct_platform', // 'direct_platform' | 'code_redemption'
    appliesTo: '', // '' = semua, 'passenger', 'parcel'
    discountType: 'percentage', // 'percentage' | 'fixed_amount'
    discountValue: '',
    maxDiscountAmount: '',
    minOrderAmount: '0',
    usageLimit: '',
    usagePerUserLimit: '1',
    validFrom: '',
    validUntil: '',
    isActive: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  const refreshVouchers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await voucherService.getAllAdminVouchers();
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Gagal memuat daftar voucher.';
      toast.error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    let ignore = false;
    voucherService
      .getAllAdminVouchers()
      .then((data) => {
        if (!ignore) {
          setVouchers(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          const errorMsg = err.response?.data?.message || err.message || 'Gagal memuat daftar voucher.';
          toast.error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [toast]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const total = vouchers.length;
    const active = vouchers.filter((v) => v.isActive).length;
    const totalUsed = vouchers.reduce((acc, v) => acc + (Number(v.usedCount) || 0), 0);
    const totalReserved = vouchers.reduce((acc, v) => acc + (Number(v.reservedCount) || 0), 0);
    return { total, active, totalUsed, totalReserved };
  }, [vouchers]);

  // Filter Data
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (v.code && v.code.toLowerCase().includes(q)) ||
        (v.title && v.title.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && v.isActive) ||
        (statusFilter === 'INACTIVE' && !v.isActive);

      const matchesService =
        serviceFilter === 'ALL' ||
        (serviceFilter === 'ALL_SERVICES' && !v.appliesTo) ||
        (serviceFilter === 'PASSENGER' && v.appliesTo === 'passenger') ||
        (serviceFilter === 'PARCEL' && v.appliesTo === 'parcel');

      const matchesType =
        typeFilter === 'ALL' ||
        v.discountType === typeFilter;

      return matchesSearch && matchesStatus && matchesService && matchesType;
    });
  }, [vouchers, searchQuery, statusFilter, serviceFilter, typeFilter]);

  // Buka Modal Tambah
  const handleOpenCreateModal = () => {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setDate(oneMonthLater.getDate() + 30);

    setFormData({
      ...initialFormState,
      validFrom: toInputDateTime(now.toISOString()),
      validUntil: toInputDateTime(oneMonthLater.toISOString()),
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Buka Modal Edit
  const handleOpenEditModal = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code || '',
      title: voucher.title || '',
      description: voucher.description || '',
      claimType: voucher.claimType || 'direct_platform',
      appliesTo: voucher.appliesTo || '',
      discountType: voucher.discountType || 'percentage',
      discountValue: String(voucher.discountValue ?? ''),
      maxDiscountAmount: voucher.maxDiscountAmount != null ? String(voucher.maxDiscountAmount) : '',
      minOrderAmount: String(voucher.minOrderAmount ?? 0),
      usageLimit: voucher.usageLimit != null ? String(voucher.usageLimit) : '',
      usagePerUserLimit: String(voucher.usagePerUserLimit ?? 1),
      validFrom: toInputDateTime(voucher.validFrom),
      validUntil: toInputDateTime(voucher.validUntil),
      isActive: Boolean(voucher.isActive),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Validasi Form
  const validateForm = () => {
    const code = formData.code.trim();
    if (!code) return 'Kode voucher wajib diisi.';
    if (!formData.title.trim()) return 'Judul voucher wajib diisi.';

    const discountVal = Number(formData.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      return 'Nilai diskon harus lebih besar dari 0.';
    }

    if (formData.discountType === 'percentage' && (discountVal < 1 || discountVal > 100)) {
      return 'Nilai persentase diskon harus di antara 1 dan 100.';
    }

    if (!formData.validFrom) return 'Waktu mulai berlaku wajib diisi.';
    if (!formData.validUntil) return 'Waktu berakhir berlaku wajib diisi.';

    const fromDate = new Date(formData.validFrom);
    const untilDate = new Date(formData.validUntil);

    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return 'Format tanggal/waktu tidak valid.';
    }

    if (fromDate >= untilDate) {
      return 'Waktu selesai berlaku harus lebih lambat dari waktu mulai berlaku.';
    }

    return null;
  };

  // Submit Buat Voucher
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        claimType: formData.claimType || 'direct_platform',
        appliesTo: formData.appliesTo || undefined,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount:
          formData.discountType === 'percentage' && formData.maxDiscountAmount !== ''
            ? Number(formData.maxDiscountAmount)
            : undefined,
        minOrderAmount: formData.minOrderAmount !== '' ? Number(formData.minOrderAmount) : 0,
        usageLimit: formData.usageLimit !== '' ? Number(formData.usageLimit) : undefined,
        usagePerUserLimit: formData.usagePerUserLimit !== '' ? Number(formData.usagePerUserLimit) : 1,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        isActive: formData.isActive,
      };

      await voucherService.createVoucher(payload);
      toast.success(`Voucher ${payload.code} berhasil dibuat!`, { title: 'Berhasil' });
      setIsCreateModalOpen(false);
      refreshVouchers();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal membuat voucher.';
      const formatted = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg;
      setFormError(formatted);
      toast.error(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Voucher
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingVoucher) return;

    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const hasRedemptions =
        (Number(editingVoucher.reservedCount) || 0) + (Number(editingVoucher.usedCount) || 0) > 0;

      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        claimType: formData.claimType || 'direct_platform',
        minOrderAmount: formData.minOrderAmount !== '' ? Number(formData.minOrderAmount) : 0,
        usageLimit: formData.usageLimit !== '' ? Number(formData.usageLimit) : null,
        usagePerUserLimit: formData.usagePerUserLimit !== '' ? Number(formData.usagePerUserLimit) : 1,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        isActive: formData.isActive,
      };

      // Hanya kirim field sensitif jika belum ada redemption
      if (!hasRedemptions) {
        payload.appliesTo = formData.appliesTo || null;
        payload.discountType = formData.discountType;
        payload.discountValue = Number(formData.discountValue);
        payload.maxDiscountAmount =
          formData.discountType === 'percentage' && formData.maxDiscountAmount !== ''
            ? Number(formData.maxDiscountAmount)
            : null;
      }

      await voucherService.updateVoucher(editingVoucher.id, payload);
      toast.success(`Voucher ${payload.code} berhasil diperbarui!`, { title: 'Berhasil' });
      setIsEditModalOpen(false);
      setEditingVoucher(null);
      refreshVouchers();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal memperbarui voucher.';
      const formatted = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg;
      setFormError(formatted);
      toast.error(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Konfirmasi Toggle Status
  const handleToggleVoucher = async (voucher) => {
    const isActivating = !voucher.isActive;
    const isConfirmed = await confirm({
      title: isActivating ? 'Aktifkan Voucher' : 'Nonaktifkan Voucher',
      message: `Apakah Anda yakin ingin ${isActivating ? 'mengaktifkan kembali' : 'menonaktifkan'} voucher "${voucher.code}"?`,
      confirmText: isActivating ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      variant: isActivating ? 'info' : 'warning',
    });
    if (!isConfirmed) return;

    try {
      await voucherService.updateVoucherStatus(voucher.id, isActivating);
      toast.success(
        `Voucher ${voucher.code} berhasil ${isActivating ? 'diaktifkan' : 'dinonaktifkan'}!`
      );
      refreshVouchers();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal mengubah status voucher.';
      toast.error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    }
  };

  // Konfirmasi Hapus Voucher
  const handleDeleteVoucher = async (voucher) => {
    const usageCount = (Number(voucher.reservedCount) || 0) + (Number(voucher.usedCount) || 0);
    if (usageCount > 0) {
      toast.warning(
        `Voucher ${voucher.code} sudah memiliki riwayat penggunaan (${usageCount} kali) dan tidak dapat dihapus demi audit transaksi. Silakan nonaktifkan voucher sebagai gantinya.`
      );
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Voucher',
      message: `Apakah Anda yakin ingin menghapus voucher "${voucher.code}" (${voucher.title})? Tindakan ini permanen dan data voucher akan dihapus dari sistem.`,
      confirmText: 'Ya, Hapus Voucher',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await voucherService.deleteVoucher(voucher.id);
      toast.success(`Voucher ${voucher.code} berhasil dihapus!`);
      refreshVouchers();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal menghapus voucher.';
      toast.error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    }
  };

  const editingHasRedemptions =
    editingVoucher &&
    (Number(editingVoucher.reservedCount) || 0) + (Number(editingVoucher.usedCount) || 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" /> Manajemen Promosi & Diskon
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manajemen Voucher
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola kode voucher diskon platform, alokasi kuota penggunaan, dan masa berlaku program promosi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              onClick={() => refreshVouchers()}
              disabled={isLoading || isRefreshing}
              className="p-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl backdrop-blur text-white transition cursor-pointer disabled:opacity-50 shadow-sm"
              title="Segarkan data"
            >
              <RotateCw className={`w-4 h-4 text-accent ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Voucher Baru</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl border border-slate-200 text-[#10367D] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Voucher</div>
            <div className="text-lg font-bold text-slate-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl border border-slate-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Voucher Aktif</div>
            <div className="text-lg font-bold text-emerald-600">{stats.active}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl border border-slate-200 text-blue-700 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Used (Terpakai)</div>
            <div className="text-lg font-bold text-blue-700">{stats.totalUsed}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl border border-slate-200 text-sky-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reserved (Menunggu)</div>
            <div className="text-lg font-bold text-sky-700">{stats.totalReserved}</div>
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian & Filter */}
      <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau judul voucher..."
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-bold">Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#10367D]"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Hanya Aktif</option>
            <option value="INACTIVE">Hanya Nonaktif</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#10367D]"
          >
            <option value="ALL">Semua Layanan</option>
            <option value="ALL_SERVICES">Semua (Universal)</option>
            <option value="PASSENGER">Penumpang Saja</option>
            <option value="PARCEL">Barang Saja</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#10367D]"
          >
            <option value="ALL">Semua Tipe Diskon</option>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed_amount">Nominal Tetap (Rp)</option>
          </select>
        </div>
      </div>

      {/* Tabel Voucher */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3.5 px-4">Kode & Judul</th>
                <th className="py-3.5 px-4">Diskon</th>
                <th className="py-3.5 px-4">Layanan</th>
                <th className="py-3.5 px-4">Berlaku Sampai</th>
                <th className="py-3.5 px-4">Kuota (Used)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {isLoading ? (
                <SkeletonTableRows rows={5} columns={7} />
              ) : filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => {
                  const used = Number(voucher.usedCount) || 0;
                  const reserved = Number(voucher.reservedCount) || 0;
                  const limit = voucher.usageLimit;
                  const isExpired = new Date() > new Date(voucher.validUntil);

                  return (
                    <tr key={voucher.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Kode & Judul */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-sm text-[#10367D]">
                          {voucher.code}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]" title={voucher.title}>
                          {voucher.title}
                        </div>
                      </td>

                      {/* Diskon */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sm text-emerald-600">
                          {voucher.discountType === 'percentage'
                            ? `${voucher.discountValue}%`
                            : formatRp(voucher.discountValue)}
                        </span>
                        {Number(voucher.minOrderAmount) > 0 && (
                          <div className="text-[11px] text-slate-400">
                            Min. {formatRp(voucher.minOrderAmount)}
                          </div>
                        )}
                      </td>

                      {/* Layanan */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {!voucher.appliesTo
                          ? 'Semua'
                          : voucher.appliesTo === 'passenger'
                          ? 'Penumpang'
                          : 'Kirim Barang'}
                      </td>

                      {/* Berlaku Sampai */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>{formatDate(voucher.validUntil)}</div>
                        {isExpired && (
                          <span className="text-[11px] font-semibold text-rose-600 block">
                            Kedaluwarsa
                          </span>
                        )}
                      </td>

                      {/* Kuota (Used) */}
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-800">
                          {used} / {limit != null ? limit : '∞'}
                        </span>
                        {reserved > 0 && (
                          <span className="text-[11px] text-sky-600 block">
                            +{reserved} reserved
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        <span className={voucher.isActive ? 'text-emerald-600' : 'text-slate-400'}>
                          {voucher.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(voucher)}
                            className="p-1.5 text-slate-400 hover:text-[#10367D] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Voucher"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleVoucher(voucher)}
                            className={`p-1.5 rounded-lg transition cursor-pointer hover:bg-slate-100 ${
                              voucher.isActive ? 'text-slate-400 hover:text-slate-700' : 'text-emerald-600'
                            }`}
                            title={voucher.isActive ? 'Nonaktifkan Voucher' : 'Aktifkan Voucher'}
                          >
                            {voucher.isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteVoucher(voucher)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Hapus Voucher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-8">
                    <EmptyState
                      icon={Ticket}
                      title={vouchers.length === 0 ? 'Belum Ada Voucher' : 'Voucher Tidak Ditemukan'}
                      description={
                        vouchers.length === 0
                          ? 'Mulai buat program promosi dengan menekan tombol Tambah Voucher Baru.'
                          : 'Coba ubah kata kunci pencarian atau sesuaikan filter Anda.'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Voucher */}
      <BaseModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsCreateModalOpen(false);
        }}
        title="Tambah Voucher Baru"
        subtitle="Buat kode promosi diskon platform baru"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-[13px]">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Kode Voucher <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Contoh: HEMAT50"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold uppercase text-sm focus:outline-none focus:border-[#10367D]"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Otomatis diubah ke huruf besar.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Judul Promosi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Diskon Mudik Akhir Pekan"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Deskripsi Voucher (Opsional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Keterangan syarat atau informasi kampanye..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Metode Perolehan Voucher <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  formData.claimType === 'direct_platform'
                    ? 'border-[#10367D] bg-blue-50/60 text-[#10367D]'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="claimTypeCreate"
                  value="direct_platform"
                  checked={formData.claimType === 'direct_platform'}
                  onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-bold text-xs">Langsung dari Platform</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  formData.claimType === 'code_redemption'
                    ? 'border-[#10367D] bg-blue-50/60 text-[#10367D]'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="claimTypeCreate"
                  value="code_redemption"
                  checked={formData.claimType === 'code_redemption'}
                  onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-bold text-xs">Klaim / Redeem Kode</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Berlaku Untuk Layanan
              </label>
              <select
                value={formData.appliesTo}
                onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D]"
              >
                <option value="">Semua Layanan</option>
                <option value="passenger">Penumpang Saja</option>
                <option value="parcel">Pengiriman Barang Saja</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Tipe Diskon <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D]"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed_amount">Potongan Tetap (Rp)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Nilai Diskon <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={formData.discountType === 'percentage' ? '1' : '100'}
                max={formData.discountType === 'percentage' ? '100' : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder={formData.discountType === 'percentage' ? 'Contoh: 25' : 'Contoh: 15000'}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.discountType === 'percentage' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Maksimal Potongan Diskon (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  placeholder="Opsional (kosongkan jika tanpa batas)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Minimal Nilai Order (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Batas Total Kuota Penggunaan
              </label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="Kosongkan jika tanpa batas kuota"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Batas Penggunaan per User
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.usagePerUserLimit}
                onChange={(e) => setFormData({ ...formData, usagePerUserLimit: e.target.value })}
                placeholder="1"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Waktu Mulai Berlaku <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Waktu Selesai Berlaku <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="createIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="createIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
              Aktifkan voucher langsung setelah dibuat
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Simpan Voucher'
              )}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Modal Edit Voucher */}
      <BaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsEditModalOpen(false);
        }}
        title={`Edit Voucher #${editingVoucher?.code || ''}`}
        subtitle="Perbarui data dan kuota voucher promosi"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-[13px]">
          {editingHasRedemptions && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-bold">Perhatian: </span>
                Tidak bisa mengubah jenis layanan (appliesTo), tipe diskon, dan nilai diskon karena voucher sudah memiliki riwayat pemakaian ({editingVoucher.usedCount} used, {editingVoucher.reservedCount} reserved).
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Kode Voucher <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold uppercase text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Judul Promosi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Deskripsi Voucher (Opsional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Metode Perolehan Voucher <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition ${
                  editingHasRedemptions ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                  formData.claimType === 'direct_platform'
                    ? 'border-[#10367D] bg-blue-50/60 text-[#10367D]'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="claimTypeEdit"
                  disabled={editingHasRedemptions}
                  value="direct_platform"
                  checked={formData.claimType === 'direct_platform'}
                  onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="font-bold text-xs">Langsung dari Platform</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition ${
                  editingHasRedemptions ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                  formData.claimType === 'code_redemption'
                    ? 'border-[#10367D] bg-blue-50/60 text-[#10367D]'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="claimTypeEdit"
                  disabled={editingHasRedemptions}
                  value="code_redemption"
                  checked={formData.claimType === 'code_redemption'}
                  onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="font-bold text-xs">Klaim / Redeem Kode</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Berlaku Untuk Layanan
              </label>
              <select
                disabled={editingHasRedemptions}
                value={formData.appliesTo}
                onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Semua Layanan</option>
                <option value="passenger">Penumpang Saja</option>
                <option value="parcel">Pengiriman Barang Saja</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Tipe Diskon
              </label>
              <select
                disabled={editingHasRedemptions}
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed_amount">Potongan Tetap (Rp)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Nilai Diskon
              </label>
              <input
                type="number"
                disabled={editingHasRedemptions}
                required
                min={formData.discountType === 'percentage' ? '1' : '100'}
                max={formData.discountType === 'percentage' ? '100' : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:border-[#10367D] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.discountType === 'percentage' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Maksimal Potongan Diskon (Rp)
                </label>
                <input
                  type="number"
                  disabled={editingHasRedemptions}
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  placeholder="Kosongkan jika tanpa batas"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Minimal Nilai Order (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Batas Total Kuota Penggunaan
              </label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="Kosongkan jika tanpa batas kuota"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Batas Penggunaan per User
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.usagePerUserLimit}
                onChange={(e) => setFormData({ ...formData, usagePerUserLimit: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Waktu Mulai Berlaku <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Waktu Selesai Berlaku <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#10367D]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
              Voucher Aktif
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </BaseModal>

      </div>
  );
}
