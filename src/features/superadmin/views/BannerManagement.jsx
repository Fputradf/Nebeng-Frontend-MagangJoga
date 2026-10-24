import { BASE_URL } from '../../../config/env';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Megaphone,
  Users,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { bannerService } from '../../../services/bannerService';
import BaseModal from '../../../components/ui/BaseModal';
import EmptyState from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';

const PRIMARY_COLOR = '#10367D';

const ROLE_BADGES = {
  customer: {
    label: 'Customer',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  mitra: {
    label: 'Mitra',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  operator: {
    label: 'Operator',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  superadmin: {
    label: 'Superadmin',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  all: {
    label: 'Semua Audiens',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
};

export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fileInputRef = useRef(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    targetRole: '',
    isActive: true,
  });

  const loadBanners = async () => {
    setIsLoading(true);
    try {
      const data = await bannerService.getBanners();
      setBanners(data || []);
    } catch (error) {
      toast.error('Gagal memuat banner');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => b.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [banners]);

  const filteredBanners = useMemo(() => {
    return banners.filter((banner) => {
      const matchesSearch = banner.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const normalizedRole = (banner.targetRole || '').toLowerCase();
      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'PUBLIC' && !banner.targetRole) ||
        normalizedRole === roleFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && banner.isActive) ||
        (statusFilter === 'INACTIVE' && !banner.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [banners, searchQuery, roleFilter, statusFilter]);

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        imageUrl: banner.imageUrl || '',
        linkUrl: banner.linkUrl || '',
        targetRole: banner.targetRole || '',
        isActive: banner.isActive ?? true,
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        imageUrl: '',
        linkUrl: '',
        targetRole: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await bannerService.uploadBannerImage(file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : BASE_URL;
      setFormData((prev) => ({
        ...prev,
        imageUrl: `${baseUrl}${result.filePath}`,
      }));
      toast.success('Gambar berhasil diunggah');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      const updatedStatus = !banner.isActive;
      await bannerService.updateBanner(banner.id, { isActive: updatedStatus });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: updatedStatus } : b))
      );
      toast.success(`Banner berhasil ${updatedStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (error) {
      toast.error('Gagal mengubah status banner');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Judul banner wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        imageUrl: formData.imageUrl.trim() || null,
        linkUrl: formData.linkUrl.trim() || null,
        targetRole: formData.targetRole ? formData.targetRole.toUpperCase() : null,
        isActive: formData.isActive,
      };

      if (editingBanner) {
        await bannerService.updateBanner(editingBanner.id, payload);
        toast.success('Banner berhasil diperbarui');
      } else {
        await bannerService.createBanner(payload);
        toast.success('Banner berhasil dibuat');
      }
      setIsModalOpen(false);
      loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Yakin ingin menghapus banner "${banner.title}"?`)) return;
    try {
      await bannerService.deleteBanner(banner.id);
      toast.success('Banner berhasil dihapus');
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch (error) {
      toast.error('Gagal menghapus banner');
    }
  };

  const getRoleBadge = (role) => {
    if (!role) return ROLE_BADGES.all;
    const key = role.toLowerCase();
    return ROLE_BADGES[key] || {
      label: role,
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-lg shadow-card border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-slate-50 text-[#10367D]">
              <Megaphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#10367D]">
              Manajemen Konten & Iklan
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Manajemen Banner Promosi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola banner promosi dan pengumuman yang tayang di aplikasi pelanggan maupun mitra.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 text-white rounded-lg text-sm font-bold shadow-soft hover:shadow-soft-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto hover:brightness-110 active:scale-95"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Banner Baru</span>
        </button>
      </div>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-[#10367D] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Banner</div>
            <div className="text-lg font-bold text-slate-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banner Aktif</div>
            <div className="text-lg font-bold text-emerald-600">{stats.active}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-card border border-slate-200 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nonaktif</div>
            <div className="text-lg font-bold text-slate-700">{stats.inactive}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-card border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul banner..."
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-bold">Filter:</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 cursor-pointer transition-all"
          >
            <option value="ALL">Semua Audiens</option>
            <option value="PUBLIC">Publik / Semua</option>
            <option value="CUSTOMER">Customer</option>
            <option value="MITRA">Mitra</option>
            <option value="OPERATOR">Operator</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 cursor-pointer transition-all"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Hanya Aktif</option>
            <option value="INACTIVE">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Grid Banner Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 shadow-card space-y-3">
              <Skeleton className="h-44 w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-card">
          <EmptyState
            icon={Megaphone}
            title={banners.length === 0 ? 'Belum Ada Banner' : 'Banner Tidak Ditemukan'}
            description={
              banners.length === 0
                ? 'Mulai promosikan kampanye dan pengumuman dengan membuat banner baru.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan filter Anda.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanners.map((banner) => {
            const roleBadge = getRoleBadge(banner.targetRole);

            return (
              <div
                key={banner.id}
                className="group relative bg-white rounded-lg border border-slate-200 shadow-card hover:shadow-card-hover hover:border-slate-300 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Media Image Container */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />

                  {/* Fallback Error Placeholder */}
                  <div className="hidden absolute inset-0 bg-slate-100 flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                    <span className="text-xs">Gambar gagal dimuat</span>
                  </div>

                  {/* Top Floating Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-soft ${roleBadge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dot}`} />
                      {roleBadge.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(banner)}
                      title={`Klik untuk ${banner.isActive ? 'menonaktifkan' : 'mengaktifkan'}`}
                      className={`pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-soft transition hover:scale-105 cursor-pointer ${
                        banner.isActive
                          ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                          : 'bg-slate-800/80 text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          banner.isActive ? 'bg-white animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {banner.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  {/* Quick Action Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4 z-20">
                    <button
                      onClick={() => setPreviewModalUrl(banner.imageUrl)}
                      className="p-2.5 bg-white/95 hover:bg-white text-slate-800 rounded-lg shadow-soft-lg hover:scale-110 active:scale-95 transition cursor-pointer"
                      title="Perbesar Banner"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {banner.linkUrl && (
                      <a
                        href={banner.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-white/95 hover:bg-white text-blue-600 rounded-lg shadow-soft-lg hover:scale-110 active:scale-95 transition cursor-pointer"
                        title="Buka Link URL Tujuan"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Body with Elegant Clean Structure */}
                <div className="p-4 space-y-3 flex-1 flex flex-col bg-white">
                  <div>
                    <h3
                      className="font-bold text-[15px] text-slate-900 line-clamp-1 group-hover:text-[#10367D] transition-colors"
                      title={banner.title}
                    >
                      {banner.title}
                    </h3>

                    <div className="mt-1.5">
                      {banner.linkUrl ? (
                        <a
                          href={banner.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1.5 truncate max-w-full font-medium"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                          <span className="truncate">{banner.linkUrl}</span>
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada tautan keluar</p>
                      )}
                    </div>
                  </div>

                  {/* Micro Grid Meta Info */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/80 rounded-lg border border-neutral-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Target Audiens
                      </span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {banner.targetRole ? banner.targetRole : 'Semua Role'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Status Banner
                      </span>
                      <span
                        className={`font-semibold inline-flex items-center gap-1 ${
                          banner.isActive ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            banner.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {banner.isActive ? 'Tayang' : 'Draft/Arsip'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer with Grid Border */}
                <div className="px-4 py-2.5 bg-slate-50/50 flex items-center justify-between gap-2 border-t border-neutral-100">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: #{banner.id ? String(banner.id).slice(-4) : '---'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(banner)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#10367D] hover:bg-white border border-transparent hover:border-slate-200 transition shadow-none hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(banner)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
                      title="Hapus Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingBanner ? 'Edit Banner Promosi' : 'Tambah Banner Promosi Baru'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Judul Banner <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all"
              placeholder="Contoh: Promo Diskon Mudik 2026"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Gambar Banner <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {formData.imageUrl && (
                <div className="relative w-full max-h-48 aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center group">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-soft hover:bg-rose-700 transition"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all font-mono text-xs"
                  placeholder="https://domain.com/banner.jpg atau upload..."
                />

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 bg-[#10367D] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#0C2C66] transition disabled:opacity-50 cursor-pointer shadow-soft shrink-0"
                >
                  {isUploading ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Format disarankan: 16:9 atau resolusi 1200x675px (JPG, PNG, WEBP).
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Link URL Tujuan (Opsional)
            </label>
            <input
              type="text"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all font-mono text-xs"
              placeholder="https://nebeng.id/promo-lebaran"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Target Audiens
              </label>
              <select
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 cursor-pointer transition-all"
              >
                <option value="">Semua (Publik)</option>
                <option value="CUSTOMER">Customer (Penumpang)</option>
                <option value="MITRA">Mitra (Driver)</option>
                <option value="OPERATOR">Operator</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#10367D] rounded focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Publikasikan Langsung</span>
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white pt-4 pb-1 flex justify-end gap-2 border-t border-slate-100 mt-6">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploading || isSubmitting}
              className="px-5 py-2 bg-[#10367D] text-white rounded-lg text-xs font-bold hover:bg-[#0C2C66] transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-soft"
            >
              {isSubmitting && <span className="animate-spin">⏳</span>}
              <span>{editingBanner ? 'Simpan Perubahan' : 'Buat Banner'}</span>
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Modal Lightbox Preview Gambar */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-transparent overflow-hidden rounded-lg flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalUrl}
              alt="Banner Full Preview"
              className="max-h-[85vh] w-auto max-w-full rounded-lg shadow-modal object-contain border border-white/10"
            />
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="mt-4 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold backdrop-blur-md transition cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
