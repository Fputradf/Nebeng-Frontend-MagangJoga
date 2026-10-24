import { useState, useEffect } from 'react';
import {
  Gift,
  Sparkles,
  Search,
  Package,
  Clock,
  Building2,
  Truck,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';
import merchandiseService from '../../../services/merchandiseService';

const PRIMARY_COLOR = '#10367D';

const STATUS_BADGE_VARIANT = {
  pending: 'warning',
  processing: 'purple',
  ready_at_pos: 'blue',
  completed: 'emerald',
  rejected: 'rose',
  cancelled: 'default',
};

const STATUS_LABEL = {
  pending: 'Menunggu Verifikasi',
  processing: 'Sedang Dikemas / Dikirim',
  ready_at_pos: 'Siap Diambil di Pos',
  completed: 'Selesai Diterima',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

export default function CustomerRewards() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('katalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [userPoints, setUserPoints] = useState(0);

  const [catalogItems, setCatalogItems] = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);

  // Inisialisasi awal loading agar tidak perlu panggil setState sinkron di useEffect
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);

  // State Modal Penukaran
  const [selectedItem, setSelectedItem] = useState(null);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isSubmittingRedeem, setIsSubmittingRedeem] = useState(false);

  // Form Tukar
  const [deliveryMethod, setDeliveryMethod] = useState('pos');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedPosId, setSelectedPosId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // 1. Memuat Profil Pengguna, Pos, dan Katalog Merchandise
  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiClient.get('/auth/me').catch(() => ({ data: null })),
      apiClient.get('/pickup-points').catch(() => ({ data: [] })),
      merchandiseService.getCatalog(false).catch(() => []),
    ])
      .then(([resMe, resPos, catalogData]) => {
        if (ignore) return;

        if (resMe?.data) {
          setUserPoints(resMe.data.rewardPoints ?? 0);
          setRecipientName(resMe.data.name || '');
          setRecipientPhone(resMe.data.phone || '');
        }

        const points = Array.isArray(resPos?.data)
          ? resPos.data
          : resPos?.data?.data || [];
        setPickupPoints(points);
        if (points.length > 0) {
          setSelectedPosId(String(points[0].id));
        }

        setCatalogItems(catalogData || []);
        setIsLoadingCatalog(false);
      })
      .catch((err) => {
        console.error('Gagal inisialisasi data:', err);
        if (!ignore) setIsLoadingCatalog(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. Memuat Riwayat Penukaran Saya saat tab riwayat dipilih
  useEffect(() => {
    if (activeTab !== 'riwayat') return;
    let ignore = false;

    merchandiseService
      .getMyRedemptions()
      .then((data) => {
        if (!ignore) {
          setMyRedemptions(data || []);
          setIsLoadingRedemptions(false);
        }
      })
      .catch((err) => {
        console.error('Gagal memuat riwayat:', err);
        if (!ignore) setIsLoadingRedemptions(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const handleOpenRedeemModal = (item) => {
    if (userPoints < item.pointsRequired) {
      toast.warning(
        `Poin Anda (${userPoints}) belum mencukupi untuk menukar ${item.name} (${item.pointsRequired} Poin).`,
        { title: 'Poin Tidak Cukup' }
      );
      return;
    }

    if (item.stock < 1) {
      toast.info('Mohon maaf, stok merchandise ini sedang habis.');
      return;
    }

    setSelectedItem(item);
    setIsRedeemModalOpen(true);
  };

  const handleSubmitRedeem = async (e) => {
    e.preventDefault();
    if (!selectedItem || isSubmittingRedeem) return;

    if (!recipientName.trim() || !recipientPhone.trim()) {
      toast.warning('Nama dan nomor telepon penerima wajib diisi.');
      return;
    }

    if (deliveryMethod === 'pos' && !selectedPosId) {
      toast.warning('Pilih Pos Checkpoint tempat pengambilan barang.');
      return;
    }

    if (deliveryMethod === 'alamat' && !shippingAddress.trim()) {
      toast.warning('Isi alamat pengiriman lengkap rumah Anda.');
      return;
    }

    setIsSubmittingRedeem(true);

    try {
      const payload = {
        merchandiseId: String(selectedItem.id),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        pickupPosId: deliveryMethod === 'pos' ? String(selectedPosId) : undefined,
        shippingAddress: deliveryMethod === 'alamat' ? shippingAddress.trim() : undefined,
      };

      const res = await merchandiseService.redeemMerchandise(payload);

      toast.success(res.message || 'Penukaran poin berhasil diproses!', {
        title: 'Berhasil Ditukar',
      });

      setIsRedeemModalOpen(false);
      setSelectedItem(null);

      // Refresh data poin & riwayat
      const [resMe, updatedCatalog, updatedRedemptions] = await Promise.all([
        apiClient.get('/auth/me'),
        merchandiseService.getCatalog(false),
        merchandiseService.getMyRedemptions(),
      ]);

      if (resMe?.data) {
        setUserPoints(resMe.data.rewardPoints ?? 0);
      }
      setCatalogItems(updatedCatalog || []);
      setMyRedemptions(updatedRedemptions || []);
    } catch (err) {
      console.error('Gagal menukarkan poin:', err);
      toast.error(
        err.response?.data?.message || 'Gagal menukarkan poin. Coba lagi nanti.',
        { title: 'Penukaran Gagal' }
      );
    } finally {
      setIsSubmittingRedeem(false);
    }
  };

  const filteredCatalog = catalogItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* Header Halaman */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-amber-500 animate-bounce" />
            <span className="text-[12px] font-bold uppercase tracking-widest text-amber-600">
              LOYALTY REWARDS & MERCHANDISE
            </span>
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Katalog Hadiah & Penukaran Poin
          </h1>
          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Tukarkan poin hasil perjalanan aman Anda dengan merchandise resmi Nebeng.
          </p>
        </div>

        {/* Card Saldo Poin Saya */}
        <div
          className="px-5 py-3 rounded-xl border flex items-center gap-3.5 shadow-sm"
          style={{
            backgroundColor: `${PRIMARY_COLOR}0A`,
            borderColor: `${PRIMARY_COLOR}25`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <span className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
              Poin Tersedia
            </span>
            <p
              className="text-[21px] font-extrabold tracking-tight"
              style={{ color: PRIMARY_COLOR }}
            >
              {userPoints.toLocaleString('id-ID')}{' '}
              <span className="text-[14px] font-normal text-neutral-500">Poin</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bar Pencarian & Tab Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('katalog')}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'katalog'
                ? 'text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
            style={activeTab === 'katalog' ? { backgroundColor: PRIMARY_COLOR } : undefined}
          >
            <Gift className="w-3.5 h-3.5" />
            Katalog Hadiah ({catalogItems.length})
          </button>

          <button
            onClick={() => {
              setIsLoadingRedemptions(true);
              setActiveTab('riwayat');
            }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'riwayat'
                ? 'text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
            style={activeTab === 'riwayat' ? { backgroundColor: PRIMARY_COLOR } : undefined}
          >
            <Clock className="w-3.5 h-3.5" />
            Riwayat Klaim Saya ({myRedemptions.length})
          </button>
        </div>

        {activeTab === 'katalog' && (
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari merchandise..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Konten Tab 1: Katalog Merchandise */}
      {activeTab === 'katalog' && (
        <div>
          {isLoadingCatalog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-neutral-200 space-y-3">
                  <Skeleton className="h-36 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredCatalog.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredCatalog.map((item) => {
                const canAfford = userPoints >= item.pointsRequired;
                const isOutOfStock = item.stock < 1;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Foto Merchandise */}
                      <div className="w-full h-40 bg-neutral-50 rounded-xl overflow-hidden flex items-center justify-center border border-neutral-100 relative">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-neutral-300" />
                        )}

                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOutOfStock ? 'Stok Habis' : `Stok: ${item.stock}`}
                          </span>
                        </div>
                      </div>

                      {/* Info Merchandise */}
                      <div>
                        <h3 className="text-[15px] font-bold text-neutral-800 line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-[12px] text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description || 'Merchandise resmi eksklusif Nebeng.'}
                        </p>
                      </div>
                    </div>

                    {/* Harga Poin & Tombol Tukar */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-neutral-400 uppercase font-bold block">
                          Dibutuhkan
                        </span>
                        <span
                          className="text-[16px] font-black font-mono"
                          style={{ color: PRIMARY_COLOR }}
                        >
                          {item.pointsRequired.toLocaleString('id-ID')}
                          <span className="text-[12px] font-normal text-neutral-500 ml-0.5">
                            Poin
                          </span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenRedeemModal(item)}
                        disabled={isOutOfStock}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          canAfford && !isOutOfStock
                            ? 'text-white'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                        }`}
                        style={canAfford && !isOutOfStock ? { backgroundColor: PRIMARY_COLOR } : undefined}
                      >
                        <Gift className="w-3 h-3" />
                        <span>{isOutOfStock ? 'Habis' : 'Tukar Poin'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <EmptyState
                icon={Package}
                title="Katalog Sedang Kosong"
                description="Belum ada merchandise yang tersedia untuk ditukarkan saat ini."
              />
            </div>
          )}
        </div>
      )}

      {/* Konten Tab 2: Riwayat Penukaran Saya */}
      {activeTab === 'riwayat' && (
        <div>
          {isLoadingRedemptions ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-neutral-200 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : myRedemptions.length > 0 ? (
            <div className="space-y-3">
              {myRedemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 bg-neutral-50 rounded-xl border border-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                      {redemption.merchandiseImage ? (
                        <img
                          src={redemption.merchandiseImage}
                          alt={redemption.merchandiseName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-neutral-300" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[15px] font-bold text-neutral-800">
                          {redemption.merchandiseName}
                        </h4>
                        <StatusBadge variant={STATUS_BADGE_VARIANT[redemption.status] || 'default'}>
                          {STATUS_LABEL[redemption.status] || redemption.status}
                        </StatusBadge>
                      </div>

                      <p className="text-[12px] text-neutral-500">
                        Penerima: <strong className="text-neutral-800">{redemption.recipientName}</strong> (
                        {redemption.recipientPhone})
                      </p>

                      <p className="text-[12px] text-neutral-500">
                        Metode:{' '}
                        {redemption.pickupPosName ? (
                          <span className="text-blue-600 font-medium">
                            Ambil di Pos {redemption.pickupPosName}
                          </span>
                        ) : (
                          <span className="text-neutral-700">
                            Kirim ke: {redemption.shippingAddress}
                          </span>
                        )}
                      </p>

                      {redemption.trackingNumber && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 rounded text-[11px] font-mono text-neutral-700 mt-1">
                          <Truck className="w-2.5 h-2.5" /> No. Resi: {redemption.trackingNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 shrink-0">
                    <span className="text-[12px] font-bold text-rose-600 font-mono block">
                      -{redemption.pointsSpent.toLocaleString('id-ID')} Poin
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      {new Date(redemption.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <EmptyState
                icon={Clock}
                title="Belum Ada Penukaran"
                description="Anda belum pernah menukarkan poin reward dengan merchandise apapun."
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Formulir Penukaran Merchandise */}
      <BaseModal
        isOpen={Boolean(isRedeemModalOpen && selectedItem)}
        onClose={() => {
          if (!isSubmittingRedeem) {
            setIsRedeemModalOpen(false);
            setSelectedItem(null);
          }
        }}
        title="Konfirmasi Penukaran Merchandise"
        subtitle={selectedItem?.name}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitRedeem} className="space-y-4 text-[13px]">
          {/* Ringkasan Poin */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 font-bold uppercase block">
                Total Poin Anda
              </span>
              <span className="font-bold text-neutral-700">{userPoints.toLocaleString('id-ID')} Poin</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-neutral-400 font-bold uppercase block">
                Poin Terpotong
              </span>
              <span className="font-bold text-rose-600 font-mono">
                -{selectedItem?.pointsRequired.toLocaleString('id-ID')} Poin
              </span>
            </div>
          </div>

          {/* Opsi Metode Penerimaan */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Metode Penerimaan Barang
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod('pos')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                  deliveryMethod === 'pos'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-[12px]">Ambil di Pos</p>
                  <p className="text-[13px] text-neutral-400">Gratis di Pos Resmi</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('alamat')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                  deliveryMethod === 'alamat'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-[12px]">Kirim ke Rumah</p>
                  <p className="text-[13px] text-neutral-400">Via Kurir Pengiriman</p>
                </div>
              </button>
            </div>
          </div>

          {/* Form Data Penerima */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Nama Penerima
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nama lengkap penerima..."
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none"
                required
              />
            </div>

            {deliveryMethod === 'pos' ? (
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                  Pilih Pos Pengambilan
                </label>
                <select
                  value={selectedPosId}
                  onChange={(e) => setSelectedPosId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none"
                >
                  {pickupPoints.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} ({pos.address})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                  Alamat Lengkap Pengiriman
                </label>
                <textarea
                  rows="2"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan, kota..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none resize-none"
                  required
                />
              </div>
            )}
          </div>

          {/* Tombol Aksi Modal */}
          <div className="flex gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              disabled={isSubmittingRedeem}
              onClick={() => setIsRedeemModalOpen(false)}
              className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-bold transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingRedeem}
              className="flex-1 py-2.5 text-white rounded-xl font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSubmittingRedeem ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Gift className="w-3.5 h-3.5" />
                  <span>Konfirmasi Tukar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}

