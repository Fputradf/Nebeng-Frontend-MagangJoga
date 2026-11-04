import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Share2,
  ChevronUp,
  ChevronDown,
  Upload,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { socialLinkService } from '../../../services/socialLinkService';
import SocialIcon, { SOCIAL_PRESETS } from '../../../components/ui/SocialIcon';
import BaseModal from '../../../components/ui/BaseModal';
import EmptyState from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

export default function SocialLinksManagement() {
  const [socialLinks, setSocialLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  const toast = useToast();
  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    platform: 'Instagram',
    url: 'https://instagram.com/',
    iconType: 'preset',
    logoUrl: 'instagram',
    isActive: true,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await socialLinkService.getAllSocialLinks();
      setSocialLinks(data || []);
    } catch (error) {
      console.error('Error fetching social links:', error);
      toast.error('Gagal memuat daftar link sosial media');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCount = socialLinks.filter((item) => item.isActive).length;

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      platform: 'Instagram',
      url: 'https://instagram.com/',
      iconType: 'preset',
      logoUrl: 'instagram',
      isActive: activeCount < 5,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const isCustom =
      item.iconType === 'custom' ||
      (typeof item.logoUrl === 'string' &&
        (item.logoUrl.startsWith('/') ||
          item.logoUrl.startsWith('http://') ||
          item.logoUrl.startsWith('https://')));

    setFormData({
      platform: item.platform,
      url: item.url,
      iconType: isCustom ? 'custom' : 'preset',
      logoUrl: item.logoUrl || 'instagram',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    // Check size max 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file logo maksimal 2MB');
      return;
    }

    // Check mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau SVG');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const res = await socialLinkService.uploadSocialLogo(file);
      setFormData((prev) => ({
        ...prev,
        iconType: 'custom',
        logoUrl: res.filePath,
      }));
      toast.success('Logo berhasil diunggah');
    } catch (error) {
      console.error('Error uploading social logo:', error);
      toast.error(error.response?.data?.message || 'Gagal mengunggah file logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.platform.trim()) {
      toast.error('Nama platform sosial media wajib diisi');
      return;
    }

    if (!formData.url.trim()) {
      toast.error('Tautan (URL) wajib diisi');
      return;
    }

    if (formData.iconType === 'custom' && !formData.logoUrl?.trim()) {
      toast.error('Silakan upload file logo terlebih dahulu');
      return;
    }

    // Validasi batas maksimal 5 link aktif
    if (formData.isActive) {
      const isActivatingExisting = editingItem && !editingItem.isActive;
      const isCreatingActive = !editingItem;
      if ((isActivatingExisting || isCreatingActive) && activeCount >= 5) {
        toast.error('Maksimal 5 link sosial media aktif yang dapat ditampilkan di login');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        platform: formData.platform.trim(),
        url: formData.url.trim(),
        iconType: formData.iconType || 'preset',
        logoUrl:
          formData.logoUrl?.trim() ||
          (formData.iconType === 'preset' ? 'instagram' : ''),
        isActive: formData.isActive,
      };

      if (editingItem) {
        await socialLinkService.updateSocialLink(editingItem.id, payload);
        toast.success('Link sosial media berhasil diperbarui');
      } else {
        payload.orderIndex = socialLinks.length + 1;
        await socialLinkService.createSocialLink(payload);
        toast.success('Link sosial media berhasil ditambahkan');
      }

      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving social link:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan link sosial media');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveOrder = async (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= socialLinks.length) return;

    const reordered = [...socialLinks];
    const [movedItem] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Optimistic UI update
    setSocialLinks(reordered);

    try {
      await Promise.all(
        reordered.map((item, idx) =>
          socialLinkService.updateSocialLink(item.id, { orderIndex: idx + 1 })
        )
      );
    } catch (error) {
      console.error('Error reordering social links:', error);
      toast.error('Gagal memperbarui urutan');
      loadData();
    }
  };

  const handleToggleActive = async (item) => {
    const nextState = !item.isActive;
    if (nextState && activeCount >= 5) {
      toast.error('Maksimal 5 link sosial media aktif yang dapat ditampilkan di form login');
      return;
    }

    try {
      await socialLinkService.updateSocialLink(item.id, { isActive: nextState });
      toast.success(nextState ? 'Link diaktifkan di form login' : 'Link dinonaktifkan');
      setSocialLinks((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: nextState } : i))
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengubah status');
    }
  };

  const handleDelete = async (item) => {
    const isConfirmed = await confirm({
      title: 'Hapus Tautan Sosial',
      message: `Yakin ingin menghapus link ${item.platform}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await socialLinkService.deleteSocialLink(item.id);
      toast.success('Link sosial media berhasil dihapus');
      setSocialLinks((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error('Error deleting social link:', error);
      toast.error('Gagal menghapus link sosial media');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── HEADER BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#10367D] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20 pointer-events-none" />

        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Media & Saluran Resmi
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Manajemen Link Sosial Media
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola tautan sosial media resmi Nebeng yang ditampilkan pada form login.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Slot Info Badge */}
            <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-2 text-xs">
              <span className="text-blue-100 font-medium">Slot Login:</span>
              <span className="font-bold text-accent">{activeCount} / 5 Aktif</span>
            </div>

            {/* Tambah Button */}
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Link Sosmed</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── LIST / TABLE DATA ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : socialLinks.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="Belum ada link sosial media"
          description="Klik tombol 'Tambah Link Sosmed' untuk menambahkan link resmi akun sosial media Anda."
          actionText="Tambah Sekarang"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-28">Urutan</th>
                  <th className="px-6 py-4">Logo & Platform</th>
                  <th className="px-6 py-4">Tautan (URL)</th>
                  <th className="px-6 py-4 text-center">Status Tampil</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {socialLinks.map((item, index) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Urutan dengan Tombol Up / Down */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md min-w-[28px] text-center">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveOrder(index, -1)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                              title="Pindah ke atas"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === socialLinks.length - 1}
                              onClick={() => handleMoveOrder(index, 1)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                              title="Pindah ke bawah"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Logo & Platform */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2 text-slate-800 shrink-0">
                            <SocialIcon
                              platform={item.platform}
                              iconType={item.iconType || 'preset'}
                              logoUrl={item.logoUrl}
                              className="w-5 h-5"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{item.platform}</span>
                              {item.iconType === 'custom' ? (
                                <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                                  Logo Kustom
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60 px-1.5 py-0.5 rounded-md">
                                  Preset
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.iconType === 'custom'
                                ? 'Upload mandiri'
                                : `Preset ${item.logoUrl || item.platform}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* URL */}
                      <td className="px-6 py-4">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline max-w-xs truncate"
                        >
                          <span className="truncate">{item.url}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.isActive ? 'Aktif (Tampil)' : 'Non-aktif'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Link"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL TAMBAH / EDIT ── */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && !isUploadingLogo && setIsModalOpen(false)}
        title={editingItem ? 'Edit Link Sosial Media' : 'Tambah Link Sosial Media'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Pemilihan Logo / Icon */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Pilihan Icon / Logo <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    iconType: 'preset',
                    logoUrl:
                      prev.iconType === 'preset' && prev.logoUrl
                        ? prev.logoUrl
                        : 'instagram',
                  }))
                }
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  formData.iconType === 'preset'
                    ? 'bg-white text-[#10367D] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pilih Icon Preset</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    iconType: 'custom',
                    logoUrl: prev.iconType === 'custom' ? prev.logoUrl : '',
                  }))
                }
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  formData.iconType === 'custom'
                    ? 'bg-white text-[#10367D] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Logo File</span>
              </button>
            </div>

            {/* TAB 1: PRESET SELECTION */}
            {formData.iconType === 'preset' ? (
              <div className="grid grid-cols-4 gap-2">
                {SOCIAL_PRESETS.map((preset) => {
                  const isSelected = formData.logoUrl?.toLowerCase() === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          iconType: 'preset',
                          logoUrl: preset.key,
                          platform:
                            !prev.platform ||
                            SOCIAL_PRESETS.some((p) => p.label === prev.platform)
                              ? preset.label
                              : prev.platform,
                        }))
                      }
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-medium cursor-pointer ${
                        isSelected
                          ? 'border-[#10367D] bg-blue-50/50 text-[#10367D] shadow-xs ring-2 ring-[#10367D]/20 font-bold'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        {preset.svg}
                      </div>
                      <span className="text-[10px] truncate max-w-full">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* TAB 2: UPLOAD LOGO FILE */
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />

                {formData.logoUrl &&
                (formData.logoUrl.startsWith('/') ||
                  formData.logoUrl.startsWith('http') ||
                  formData.logoUrl.startsWith('blob:') ||
                  formData.logoUrl.startsWith('data:')) ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-xs">
                      <SocialIcon
                        platform={formData.platform}
                        iconType="custom"
                        logoUrl={formData.logoUrl}
                        className="w-8 h-8"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {formData.logoUrl.split('/').pop() || 'Logo kustom'}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> Logo berhasil diunggah
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isUploadingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition cursor-pointer shadow-xs"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingLogo}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            logoUrl: '',
                          }))
                        }
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Hapus logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                      isUploadingLogo
                        ? 'border-blue-300 bg-blue-50/50 cursor-wait'
                        : 'border-slate-300 hover:border-[#10367D] hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-[#10367D] flex items-center justify-center mb-2">
                      {isUploadingLogo ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {isUploadingLogo ? 'Mengunggah logo...' : 'Klik untuk memilih file logo'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Format: PNG, JPG, WEBP, atau SVG (Maks. 2MB). Disarankan rasio 1:1.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-xl border border-slate-200/90 flex items-center gap-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Preview Tombol Login:
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#10367D] text-white border border-white/20 flex items-center justify-center p-1.5 shadow-xs shrink-0">
              <SocialIcon
                platform={formData.platform}
                iconType={formData.iconType}
                logoUrl={formData.logoUrl}
                className="w-4 h-4"
              />
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-bold text-slate-800 truncate">
                {formData.platform || 'Nama Platform'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {formData.url || 'https://...'}
              </div>
            </div>
          </div>

          {/* Nama Platform */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Nama Platform <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all"
              placeholder="Contoh: Instagram, Threads, Discord, dll"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tautan / URL Tujuan <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 focus:bg-white transition-all"
              placeholder="https://instagram.com/nebeng.id"
            />
          </div>

          {/* Status Tampilan */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-medium text-slate-700">
                Tampilkan di Form Login
              </span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting || isUploadingLogo}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingLogo}
              className="px-4 py-2 rounded-lg bg-[#10367D] text-white text-xs font-bold hover:bg-[#0c2b64] active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : editingItem ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Link'
              )}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
