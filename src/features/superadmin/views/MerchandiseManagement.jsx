import { useState, useEffect, useRef } from 'react';
import {
  Gift,
  Plus,
  Package,
  Pencil,
  Trash2,
  Truck,
  Building2,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { BASE_URL } from '../../../config/env';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import merchandiseService from '../../../services/merchandiseService';

const PRIMARY_COLOR = '#10367D';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Menunggu Verifikasi' },
  { value: 'processing', label: 'Sedang Dikemas / Diproses' },
  { value: 'ready_at_pos', label: 'Siap di Pos Tujuan' },
  { value: 'completed', label: 'Selesai / Diterima' },
  { value: 'rejected', label: 'Ditolak' },
];

export default function MerchandiseManagement() {
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState('items');

  const [items, setItems] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Modal Tambah / Edit Produk
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [pointsRequired, setPointsRequired] = useState(100);
  const [itemStock, setItemStock] = useState(10);
  const [itemImageUrl, setItemImageUrl] = useState('');

  const fileInputRef = useRef(null);

  // State Modal Update Status Klaim
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [newStatus, setNewStatus] = useState('processing');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);


  // Memuat Data Asinkron tanpa memanggil setState sinkron di body effect
  useEffect(() => {
    let ignore = false;

    if (activeTab === 'items') {
      merchandiseService
        .getCatalog(false)
        .then((data) => {
          if (!ignore) {
            setItems(data || []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Gagal memuat produk merchandise:', err);
          if (!ignore) setIsLoading(false);
        });
    } else {
      merchandiseService
        .getAllRedemptions()
        .then((data) => {
          if (!ignore) {
            setRedemptions(data || []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Gagal memuat antrean penukaran:', err);
          if (!ignore) setIsLoading(false);
        });
    }

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemDesc('');
    setPointsRequired(100);
    setItemStock(10);
    setItemImageUrl('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description || '');
    setPointsRequired(item.pointsRequired);
    setItemStock(item.stock);
    setItemImageUrl(item.imageUrl || '');
    setIsItemModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await merchandiseService.uploadMerchandiseImage(file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : BASE_URL;
      setItemImageUrl(`${baseUrl}${result.filePath}`);
      toast.success('Gambar berhasil diunggah');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengunggah gambar');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    if (isSubmittingItem) return;

    if (!itemName.trim() || pointsRequired <= 0) {
      toast.warning('Nama dan poin yang dibutuhkan harus valid.');
      return;
    }

    setIsSubmittingItem(true);

    try {
      const payload = {
        name: itemName.trim(),
        description: itemDesc.trim() || null,
        pointsRequired: Number(pointsRequired),
        stock: Number(itemStock),
        imageUrl: itemImageUrl.trim() || null,
      };

      if (editingItem) {
        await merchandiseService.updateItem(editingItem.id, payload);
        toast.success('Merchandise berhasil diperbarui!', { title: 'Sukses' });
      } else {
        await merchandiseService.createItem(payload);
        toast.success('Merchandise baru berhasil ditambahkan!', { title: 'Sukses' });
      }

      setIsItemModalOpen(false);
      const updated = await merchandiseService.getCatalog(false);
      setItems(updated || []);
    } catch (err) {
      console.error('Gagal menyimpan merchandise:', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan data merchandise.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItem = async (item) => {
    const isConfirmed = await confirm({
      title: 'Hapus Merchandise',
      message: `Yakin ingin menghapus "${item.name}"? Tindakan ini akan menghapus merchandise secara permanen dan tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await merchandiseService.deleteItem(item.id);
      toast.success('Merchandise berhasil dihapus.');
      const updated = await merchandiseService.getCatalog(false);
      setItems(updated || []);
    } catch (err) {
      console.error('Gagal menghapus merchandise:', err);
      toast.error('Gagal menghapus merchandise.');
    }
  };

  const handleOpenStatusModal = (redemption) => {
    setSelectedRedemption(redemption);
    setNewStatus(redemption.status || 'processing');
    setTrackingNumber(redemption.trackingNumber || '');
    setIsStatusModalOpen(true);
  };

  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    if (!selectedRedemption || isSubmittingStatus) return;

    setIsSubmittingStatus(true);

    try {
      const payload = {
        status: newStatus,
        trackingNumber: trackingNumber.trim() || undefined,
      };

      await merchandiseService.updateRedemptionStatus(selectedRedemption.id, payload);
      toast.success('Status klaim dan resi berhasil diperbarui!', { title: 'Sukses' });

      setIsStatusModalOpen(false);
      const updated = await merchandiseService.getAllRedemptions();
      setRedemptions(updated || []);
    } catch (err) {
      console.error('Gagal memperbarui status:', err);
      toast.error('Gagal memperbarui status klaim merchandise.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> MODUL SUPERADMIN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manajemen Merchandise & Antrean Hadiah
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Atur stok produk reward loyalti dan proses pengiriman merchandise ke customer.
            </p>
          </div>

          {activeTab === 'items' && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Merchandise
            </button>
          )}
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* Tab Navigasi */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setIsLoading(true);
            setActiveTab('items');
          }}
          className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'items'
              ? 'text-white shadow-sm'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
          style={activeTab === 'items' ? { backgroundColor: PRIMARY_COLOR } : undefined}
        >
          <Package className="w-3.5 h-3.5" />
          Katalog Produk ({items.length})
        </button>

        <button
          onClick={() => {
            setIsLoading(true);
            setActiveTab('redemptions');
          }}
          className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'redemptions'
              ? 'text-white shadow-sm'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
          style={activeTab === 'redemptions' ? { backgroundColor: PRIMARY_COLOR } : undefined}
        >
          <Truck className="w-3.5 h-3.5" />
          Antrean Klaim Customer ({redemptions.length})
        </button>
      </div>

      {/* Konten Tab 1: Manajemen Produk */}
      {activeTab === 'items' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-3">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="w-full h-36 bg-neutral-50 rounded-xl overflow-hidden flex items-center justify-center border border-neutral-100 relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-neutral-300" />
                      )}
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {item.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-neutral-800 line-clamp-1">{item.name}</h3>
                      <p className="text-[12px] text-neutral-400 line-clamp-2 mt-0.5">
                        {item.description || 'Tidak ada deskripsi.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[13px] bg-neutral-50 p-2 rounded-lg">
                      <span className="text-neutral-500">
                        Harga: <strong className="text-blue-700 font-mono">{item.pointsRequired} Poin</strong>
                      </span>
                      <span className="text-neutral-500">
                        Stok: <strong className="text-neutral-800 font-mono">{item.stock}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="flex-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[12px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[12px] font-bold transition cursor-pointer border border-rose-200"
                      title="Hapus Merchandise"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <EmptyState
                icon={Package}
                title="Belum Ada Produk"
                description="Klik tombol '+ Tambah Merchandise' di atas untuk membuat barang baru."
              />
            </div>
          )}
        </div>
      )}

      {/* Konten Tab 2: Antrean Klaim Customer */}
      {activeTab === 'redemptions' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-[13px] text-neutral-400">Memuat antrean klaim...</div>
          ) : redemptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">ID & Waktu</th>
                    <th className="p-3.5">Merchandise</th>
                    <th className="p-3.5">Customer & Penerima</th>
                    <th className="p-3.5">Tujuan / Pos</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {redemptions.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-neutral-800">#{row.id}</span>
                        <span className="text-[11px] text-neutral-400 block">
                          {new Date(row.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-neutral-800 block">{row.merchandiseName}</span>
                        <span className="text-[11px] text-rose-600 font-mono">
                          -{row.pointsSpent} Poin
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-neutral-800 block">{row.recipientName}</span>
                        <span className="text-[11px] text-neutral-500 block">{row.recipientPhone}</span>
                        <span className="text-[13px] text-neutral-400 block">Akun: {row.userName}</span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        {row.pickupPosName ? (
                          <span className="text-blue-700 font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Ambil di Pos: {row.pickupPosName}
                          </span>
                        ) : (
                          <span className="text-neutral-600 line-clamp-2">{row.shippingAddress}</span>
                        )}
                        {row.trackingNumber && (
                          <span className="text-[11px] font-mono text-emerald-700 block mt-0.5">
                            Resi: {row.trackingNumber}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <StatusBadge
                          variant={
                            row.status === 'completed'
                              ? 'emerald'
                              : row.status === 'processing'
                              ? 'purple'
                              : row.status === 'ready_at_pos'
                              ? 'blue'
                              : 'warning'
                          }
                        >
                          {row.status}
                        </StatusBadge>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenStatusModal(row)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold transition cursor-pointer"
                        >
                          Update Resi / Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                icon={Truck}
                title="Antrean Klaim Kosong"
                description="Belum ada klaim penukaran merchandise dari pengguna."
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah / Edit Merchandise */}
      <BaseModal
        isOpen={isItemModalOpen}
        onClose={() => { if (!isSubmittingItem) setIsItemModalOpen(false); }}
        title={editingItem ? 'Edit Produk Merchandise' : 'Tambah Merchandise Baru'}
        subtitle="Loyalty Point Reward System"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitItem} className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Nama Merchandise
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: Kaos Nebeng Exclusive"
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              rows="2"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              placeholder="Bahan cotton combed 30s nyaman dipakai..."
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Harga Poin
              </label>
              <input
                type="number"
                min="1"
                value={pointsRequired}
                onChange={(e) => setPointsRequired(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Stok Barang
              </label>
              <input
                type="number"
                min="0"
                value={itemStock}
                onChange={(e) => setItemStock(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Foto Produk
            </label>
            <div className="space-y-2">
              {itemImageUrl && (
                <div className="relative w-full max-h-48 aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center group">
                  <img
                    src={itemImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setItemImageUrl('')}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-rose-700 transition"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                  placeholder="https://domain.com/merchandise.jpg atau upload..."
                  className="flex-1 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none font-mono text-xs"
                />

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="px-4 bg-[#10367D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#0C2C66] transition disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                >
                  {isUploadingImage ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                Format disarankan: 1:1 atau 4:3 (JPG, PNG, WEBP).
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              disabled={isSubmittingItem}
              onClick={() => setIsItemModalOpen(false)}
              className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingItem}
              className="flex-1 py-2.5 text-white rounded-xl font-bold shadow-sm"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSubmittingItem ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Modal Update Status Klaim & No Resi */}
      <BaseModal
        isOpen={Boolean(isStatusModalOpen && selectedRedemption)}
        onClose={() => { if (!isSubmittingStatus) setIsStatusModalOpen(false); }}
        title="Update Status Klaim & No. Resi"
        subtitle={`Klaim #${selectedRedemption?.id} • ${selectedRedemption?.merchandiseName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitStatus} className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Pilih Status Baru
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Nomor Resi / Ekspedisi (Opsional)
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Contoh: JNE-CGK-89028190"
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              disabled={isSubmittingStatus}
              onClick={() => setIsStatusModalOpen(false)}
              className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingStatus}
              className="flex-1 py-2.5 text-white rounded-xl font-bold shadow-sm"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSubmittingStatus ? 'Menyimpan...' : 'Perbarui Status'}
            </button>
          </div>
        </form>
      </BaseModal>


    </div>
  );
}