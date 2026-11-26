import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Calendar,
  MapPin,
  Car,
  Package,
  CreditCard,
  Building2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import paymentGatewayService from '../../../services/paymentGatewayService';
import InAppCheckoutModal from '../components/InAppCheckoutModal';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

export default function CustomerBills() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  // Tab State: 'pending' | 'paid' | 'cancelled'
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Order for In-App Checkout Modal
  const [selectedOrderForCheckout, setSelectedOrderForCheckout] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await paymentGatewayService.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat daftar tagihan:', err);
      toast.error('Gagal memuat data tagihan Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Orders Berdasarkan 3 Tab
  const pendingOrders = orders.filter((o) => o.status === 'pending_payment');
  const paidOrders = orders.filter(
    (o) =>
      o.status === 'paid' ||
      o.status === 'in_transit' ||
      o.status === 'arrived_pos' ||
      o.status === 'completed'
  );
  const cancelledOrders = orders.filter(
    (o) => o.status === 'cancelled' || o.status === 'cancelled_by_mitra'
  );

  const handleOpenCheckout = (order) => {
    setSelectedOrderForCheckout(order);
    setIsCheckoutOpen(true);
  };

  const handleCancelOrder = async (orderId) => {
    const confirmed = await confirm({
      title: 'Batalkan Tagihan Pesanan?',
      message: 'Apakah Anda yakin ingin membatalkan pesanan ini? Kuota kursi/bagasi pada trip akan dilepaskan kembali.',
      confirmText: 'Ya, Batalkan Pesanan',
      cancelText: 'Kembali',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await paymentGatewayService.cancelOrder(orderId);
      toast.success('Pesanan berhasil dibatalkan.');
      loadOrders();
    } catch (err) {
      console.error('Gagal membatalkan order:', err);
      toast.error(err.response?.data?.message || 'Gagal membatalkan pesanan.');
    }
  };

  const handlePaymentSuccess = () => {
    loadOrders();
    toast.success('Pembayaran tagihan Anda berhasil dikonfirmasi lunas!');
  };

  const currentList =
    activeTab === 'pending'
      ? pendingOrders
      : activeTab === 'paid'
      ? paidOrders
      : cancelledOrders;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-sans">
      {/* ── BANNER CARD GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-sky-300/20" />
        <div className="relative flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> TAGIHAN &amp; PEMBAYARAN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pusat Riwayat Tagihan &amp; Pembayaran
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola tagihan yang menunggu pembayaran, riwayat transaksi lunas, dan pesanan yang dibatalkan.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-4 py-2 rounded-2xl bg-white/15 border border-white/25 flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">
                  Menunggu Bayar
                </div>
                <div className="text-lg font-black text-white">
                  {pendingOrders.length} Tagihan
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={isLoading}
              className="p-3 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl text-white transition cursor-pointer shadow-xs disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title="Muat ulang daftar tagihan"
            >
              <RotateCcw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-300 sm:right-8" />
      </section>

      {/* 3 Tab Navigasi */}
      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Menunggu Bayar</span>
          {pendingOrders.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('paid')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'paid'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Riwayat Lunas</span>
          <span className="text-xs font-bold text-slate-400">({paidOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <XCircle className="w-4 h-4 text-slate-400" />
          <span>Dibatalkan</span>
          <span className="text-xs font-bold text-slate-400">({cancelledOrders.length})</span>
        </button>
      </div>

      {/* Konten Daftar Tagihan */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Memuat data tagihan...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-200/80 p-8 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {activeTab === 'pending'
              ? 'Tidak ada tagihan yang menunggu pembayaran'
              : activeTab === 'paid'
              ? 'Belum ada riwayat transaksi lunas'
              : 'Tidak ada tagihan yang dibatalkan'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {activeTab === 'pending'
              ? 'Semua tagihan Anda telah diselesaikan. Silakan pesan perjalanan baru kapan saja!'
              : 'Riwayat transaksi Anda akan tercatat rapi di sini setelah pemesanan dilakukan.'}
          </p>
          {activeTab === 'pending' && (
            <button
              onClick={() => navigate('/customer/booking')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
            >
              Cari & Pesan Trip Baru
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((order) => {
            const isPending = order.status === 'pending_payment';
            const isPaid =
              order.status === 'paid' ||
              order.status === 'in_transit' ||
              order.status === 'completed';
            const total = Number(order.totalPrice || 0);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border p-5 transition shadow-xs hover:shadow-md flex flex-col justify-between gap-4 ${
                  isPending
                    ? 'border-blue-200 ring-2 ring-blue-500/10'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        #{order.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold capitalize ${
                          isPending
                            ? 'bg-blue-100 text-blue-800'
                            : isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isPending
                          ? 'Menunggu Pembayaran'
                          : isPaid
                          ? 'Lunas'
                          : 'Dibatalkan'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        {order.trip?.originPoint?.name || order.trip?.origin || 'Kota Asal'}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span>
                        {order.trip?.destinationPoint?.name || order.trip?.destination || 'Kota Tujuan'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 capitalize font-medium">
                        {order.type === 'passenger' ? (
                          <>
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            {order.seatsBooked || 1} Kursi Penumpang
                          </>
                        ) : (
                          <>
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            {order.totalItemsCount || 1} Paket Barang
                          </>
                        )}
                      </span>
                      {order.trip?.departureTime && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Berangkat:{' '}
                          {new Date(order.trip.departureTime).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nominal Tagihan */}
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Nominal
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-blue-700 tracking-tight">
                      Rp {total.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Footer Card: Tombol Aksi */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {isPending ? (
                      <span className="flex items-center gap-1 text-blue-700 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        Harap selesaikan pembayaran sebelum batas waktu berakhir
                      </span>
                    ) : isPaid ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Dana ditahan aman oleh sistem Escrow
                      </span>
                    ) : (
                      <span>Pesanan telah dibatalkan</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Batalkan
                        </button>
                        <button
                          onClick={() => handleOpenCheckout(order)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                        >
                          Bayar Sekarang
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {isPaid && (
                      <button
                        onClick={() => navigate('/customer/tickets')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Buka Tiket Perjalanan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal In-App Checkout UI */}
      {selectedOrderForCheckout && (
        <InAppCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setSelectedOrderForCheckout(null);
          }}
          order={selectedOrderForCheckout}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
