import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  Receipt,
  X,
  CreditCard,
  Building2,
} from 'lucide-react';
import paymentGatewayService from '../../../services/paymentGatewayService';
import InAppCheckoutModal from './InAppCheckoutModal';

export default function PendingBillsBanner({ onRefreshNeeded }) {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchPending = async () => {
    try {
      const orders = await paymentGatewayService.getMyOrders();
      if (Array.isArray(orders)) {
        const pending = orders.filter((o) => o.status === 'pending_payment');
        setPendingOrders(pending);
      }
    } catch {
      // ignore in background
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isDismissed || pendingOrders.length === 0) return null;

  const totalOutstanding = pendingOrders.reduce(
    (sum, o) => sum + Number(o.totalPrice || 0),
    0
  );
  const firstOrder = pendingOrders[0];

  const handlePayNow = () => {
    setSelectedOrder(firstOrder);
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="bg-white rounded-[14px] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base">
                  Perhatian: Ada {pendingOrders.length} Tagihan Menunggu Pembayaran
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 animate-pulse">
                  Segera Bayar
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Total belum diselesaikan: <strong className="text-rose-600 text-sm">Rp {totalOutstanding.toLocaleString('id-ID')}</strong>. Kursi/bagasi Anda akan dibatalkan jika melebihi batas waktu 15 menit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
            <button
              onClick={() => navigate('/customer/tagihan')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Lihat Tagihan ({pendingOrders.length})
            </button>
            <button
              onClick={handlePayNow}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              Bayar Sekarang
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <InAppCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setSelectedOrder(null);
            fetchPending();
            onRefreshNeeded && onRefreshNeeded();
          }}
          order={selectedOrder}
          onPaymentSuccess={() => {
            fetchPending();
            onRefreshNeeded && onRefreshNeeded();
          }}
        />
      )}
    </>
  );
}
