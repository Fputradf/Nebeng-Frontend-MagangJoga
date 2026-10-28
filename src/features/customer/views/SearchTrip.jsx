import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  ArrowRight,    
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Tag,
  Trash2,
  Calendar,
  Clock,
  Car,
  Bike,
  Package,
  Users,
  User,
  MapPin,
  Zap
} from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { BannerSlider } from '../../../components/ui/BannerSlider';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import { walletService } from '../../../services/walletService';
import { voucherService } from '../../../services/voucherService';

const PHONE_REGEX = /^(\+?62|0)?8[1-9][0-9]{7,11}$/;
const TODAY_ISO = new Date().toISOString().split('T')[0];
const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const formatRupiah = (value) => `Rp ${Math.max(0, Math.round(value || 0)).toLocaleString('id-ID')}`;

const DAYS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const inferServiceType = (trip) => {
  const rawType = (trip?.serviceType || '').toLowerCase();
  if (rawType === 'barang') return 'barang';
  if (rawType === 'mobil' || rawType === 'motor' || rawType === 'penumpang') return 'penumpang';
  return Number(trip?.maxWeightCapacityKg) > 15 ? 'barang' : 'penumpang';
};

const formatTripDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr.split('T')[0] || '-';
  }
};

const formatTripTime = (timeStr) => {
  if (!timeStr) return null;
  try {
    if (typeof timeStr === 'string') {
      if (timeStr.includes('T')) {
        const timePart = timeStr.split('T')[1];
        return timePart.substring(0, 5) + ' WIB';
      }
      if (timeStr.includes(':')) {
        return timeStr.substring(0, 5) + ' WIB';
      }
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
  } catch {
    // fallback
  }
  return null;
};

export default function SearchTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const queryParams = new URLSearchParams(location.search);
  const initialOrigin = location.state?.origin || queryParams.get('origin') || '';
  const initialDestination = location.state?.destination || queryParams.get('destination') || '';
  const initialDate = location.state?.date || queryParams.get('date') || '';

  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [date, setDate] = useState(initialDate);
  const [activeService, setActiveService] = useState('motor');

  const [pickupPoints, setPickupPoints] = useState([]);
  const [trips, setTrips] = useState([]);
  const [myBookedTripIds, setMyBookedTripIds] = useState(new Set());
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [customerWallet, setCustomerWallet] = useState(null);
  const customerName = userProfile?.name || userProfile?.fullName || 'Pelanggan';

  const [selectedTrip, setSelectedTrip] = useState(null);

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [seatCount, setSeatCount] = useState(1);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');

  const [itemCategory, setItemCategory] = useState('Elektronik');
  const [itemCount, setItemCount] = useState(1);
  const [itemWeight, setItemWeight] = useState(5);
  const [itemSize, setItemSize] = useState('M');

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('xendit');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [voucherNotice, setVoucherNotice] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const validatedParamsRef = useRef(null);

  const sizeOptions = [
    { code: 'XXS', label: 'XXS (< 1 kg)', weight: 1 },
    { code: 'XS', label: 'XS (1-2 kg)', weight: 2 },
    { code: 'S', label: 'S (2-5 kg)', weight: 4 },
    { code: 'M', label: 'M (5-10 kg)', weight: 7 },
    { code: 'L', label: 'L (10-20 kg)', weight: 15 },
    { code: 'XL', label: 'XL (> 20 kg)', weight: 25 },
  ];

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setIsLoadingTrips(true);
      try {
        const params = {};
        if (date) params.date = date;
        if (origin) params.originPointId = origin;
        if (destination) params.destinationPointId = destination;
        if (activeService === 'barang') params.serviceType = 'barang';
        if (activeService === 'motor') params.serviceType = 'motor';
        if (activeService === 'mobil') params.serviceType = 'mobil';

        const [resMe, resPoints, resMyOrders, resTrips, resWallet] = await Promise.all([
          apiClient.get('/auth/me').catch(() => ({ data: null })),
          apiClient.get('/pickup-points', { params: { onlyActive: true } }).catch(() => ({ data: [] })),
          apiClient.get('/orders/me').catch(() => ({ data: [] })),
          apiClient.get('/trips', { params }).catch(() => ({ data: { data: [] } })),
          walletService.getMyWallet().catch(() => null),
        ]);

        if (ignore) return;

        if (resMe.data) {
          setUserProfile(resMe.data);
        }

        if (resWallet) {
          setCustomerWallet(resWallet);
        }

        setPickupPoints(resPoints.data || []);

        const activeOrders = (resMyOrders.data || []).filter(o => o.status !== 'cancelled' && o.status !== 'cancelled_by_mitra');
        const bookedIds = new Set(activeOrders.map(o => String(o.tripId || o.trip?.id)));
        setMyBookedTripIds(bookedIds);

        const list = resTrips.data?.data || resTrips.data || [];

        const now = new Date();
        const TOLERANCE_MS = 15 * 60 * 1000;
        const activeList = list.filter((t) => {
          if (t.status === 'cancelled' || t.status === 'CANCELLED' || t.status === 'cancelled_by_mitra') {
            return false;
          }
          if (t.departureDate) {
            const dateStr = t.departureDate.split('T')[0];
            const timeStr = t.departureTime
              ? (t.departureTime.includes('T') ? t.departureTime.split('T')[1].substring(0, 8) : t.departureTime)
              : '23:59:59';
            const departureDateTime = new Date(`${dateStr}T${timeStr}`);
            if (!isNaN(departureDateTime.getTime()) && departureDateTime.getTime() + TOLERANCE_MS < now.getTime()) {
              return false;
            }
          }
          return true;
        });

        setTrips(activeList);
      } catch (err) {
        console.error('Gagal memuat trip:', err);
      } finally {
        if (!ignore) {
          setIsLoadingTrips(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [origin, destination, date, activeService]);

  const isPassengerService = activeService === 'motor' || activeService === 'mobil';

  const maxAllowedSeats = selectedTrip?.vehicle?.type === 'motor' 
    ? 1 
    : (selectedTrip?.seatAvailable ?? selectedTrip?.totalSeats ?? 1);

  const safeSeatCount = Math.min(Math.max(1, seatCount || 1), maxAllowedSeats);
  const safeItemCount = Math.max(1, itemCount || 1);
  const safeItemWeight = Math.max(1, itemWeight || 1);
  const totalAccumulatedWeight = safeItemCount * safeItemWeight;

  const isOverWeightCapacity =
    !isPassengerService &&
    totalAccumulatedWeight > (selectedTrip?.remainingWeightCapacityKg || selectedTrip?.maxWeightCapacityKg || 0);

  const isOverSeatCapacity =
    isPassengerService && (seatCount > maxAllowedSeats || seatCount < 1);

  const isOverCapacity = isOverWeightCapacity || isOverSeatCapacity;

  const quantity = !isPassengerService ? safeItemCount : safeSeatCount;
  const basePrice = selectedTrip?.price || 0;
  const subtotalPrice = basePrice * quantity;
  const effectiveTotalPrice = appliedVoucher ? appliedVoucher.totalPrice : subtotalPrice;

  const walletBalance = Number(customerWallet?.balance || 0);
  const isWalletBalanceSufficient = walletBalance >= effectiveTotalPrice;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Reset voucher jika parameter yang memengaruhi harga berubah
  useEffect(() => {
    if (appliedVoucher && validatedParamsRef.current) {
      const currentParams = `${selectedTrip?.id}_${safeSeatCount}_${safeItemCount}_${itemSize}_${itemWeight}_${activeService}`;
      if (currentParams !== validatedParamsRef.current) {
        setAppliedVoucher(null);
        setVoucherNotice('Rincian pesanan berubah. Silakan terapkan ulang voucher.');
      }
    }
  }, [safeSeatCount, safeItemCount, itemSize, itemWeight, selectedTrip?.id, activeService, appliedVoucher]);

  const isPassengerPhoneValid =
    isPassengerService ? PHONE_REGEX.test(passengerPhone.trim()) : true;

  const isReceiverPhoneValid =
    !isPassengerService ? PHONE_REGEX.test(receiverPhone.trim()) : true;

  const isPassengerValid =
    isPassengerService ? passengerName.trim() !== '' && isPassengerPhoneValid : true;

  const isBarangValid =
    !isPassengerService ? receiverName.trim() !== '' && isReceiverPhoneValid : true;

  const isPaymentValid =
    paymentMethod === 'xendit'
      ? true
      : isWalletBalanceSufficient && Boolean(userProfile?.hasPin) && pin.length === 6;

  const isFormValid = !isOverCapacity && isPassengerValid && isBarangValid && isPaymentValid;

  const getFormValidationMessage = () => {
    if (isOverCapacity) {
      return isPassengerService ? 'Jumlah kursi melebihi kuota tersedia.' : 'Berat barang melebihi kapasitas kuota.';
    }
    if (isPassengerService) {
      if (!passengerName.trim()) return 'Nama penumpang wajib diisi.';
      if (!passengerPhone.trim()) return 'Nomor WhatsApp penumpang wajib diisi.';
      if (!isPassengerPhoneValid) return 'Format nomor WhatsApp tidak valid (contoh: 08123456789).';
    } else {
      if (!receiverName.trim()) return 'Nama penerima barang wajib diisi.';
      if (!receiverPhone.trim()) return 'Nomor HP penerima barang wajib diisi.';
      if (!isReceiverPhoneValid) return 'Format nomor HP tidak valid (contoh: 08123456789).';
    }
    if (paymentMethod === 'wallet') {
      if (!isWalletBalanceSufficient) return 'Saldo dompet tidak mencukupi untuk total pesanan ini.';
      if (!userProfile?.hasPin) return 'Silakan buat PIN transaksi terlebih dahulu di bawah.';
      if (pin.length < 6) return 'Masukkan 6 digit PIN transaksi Anda.';
    }
    return null;
  };

  const handleSeatChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setSeatCount(1);
    } else if (val > maxAllowedSeats) {
      setSeatCount(maxAllowedSeats);
    } else {
      setSeatCount(val);
    }
  };

  const handlePhoneChange = (val, setter) => {
    const cleaned = val.replace(/[^0-9+]/g, '');
    if (cleaned.length <= 14) {
      setter(cleaned);
    }
  };

  const handleSizeChange = (sizeCode) => {
    setItemSize(sizeCode);
    const selectedOpt = sizeOptions.find((opt) => opt.code === sizeCode);
    if (selectedOpt) setItemWeight(selectedOpt.weight);
  };

  const handleCreatePin = async () => {
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.warning('PIN harus berupa 6 digit angka.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.warning('Konfirmasi PIN tidak cocok.');
      return;
    }

    setIsSavingPin(true);
    try {
      await apiClient.post('/users/me/pin', { pin: newPin });
      toast.success('PIN transaksi berhasil dibuat!', { title: 'PIN Aktif' });
      setUserProfile((prev) => ({ ...prev, hasPin: true }));
      setPin(newPin);
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal membuat PIN transaksi.';
      toast.error(errMsg, { title: 'Gagal Membuat PIN' });
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleApplyVoucher = async () => {
    const trimmedCode = (voucherInput || '').trim().toUpperCase();
    if (!trimmedCode || isValidatingVoucher || cooldownSeconds > 0) return;

    setVoucherError('');
    setVoucherNotice('');
    setIsValidatingVoucher(true);

    try {
      const orderType = isPassengerService ? 'passenger' : 'parcel';
      const res = await voucherService.validateVoucher({
        code: trimmedCode,
        orderType,
        subtotal: subtotalPrice,
      });

      validatedParamsRef.current = `${selectedTrip?.id}_${safeSeatCount}_${safeItemCount}_${itemSize}_${itemWeight}_${activeService}`;
      setAppliedVoucher({
        code: trimmedCode,
        discountAmount: Number(res.discountAmount || 0),
        totalPrice: Number(res.totalPrice || 0),
      });
      setVoucherInput('');
      toast.success(`Voucher ${trimmedCode} berhasil diterapkan!`);
    } catch (err) {
      if (err.response?.status === 429) {
        setVoucherError('Terlalu banyak percobaan, coba lagi sebentar');
        setCooldownSeconds(60);
      } else {
        const errorMsg =
          err.response?.data?.message || err.message || 'Voucher tidak valid.';
        const formattedMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
        setVoucherError(formattedMsg);
      }
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
    setVoucherNotice('');
    validatedParamsRef.current = null;
  };

  const handleOpenBooking = (trip) => {
    setSelectedTrip(trip);
    setIsCheckingOut(false);
    setPaymentMethod('xendit');
    setPin('');
    setNewPin('');
    setConfirmPin('');
    setSeatCount(1);
    setPassengerName(customerName || '');
    const cleanPhone = (userProfile?.phone || '').replace(/[^0-9+]/g, '');
    setPassengerPhone(cleanPhone);
    setItemCategory('Elektronik');
    setItemCount(1);
    setItemWeight(7);
    setItemSize('M');
    setReceiverName('');
    setReceiverPhone('');
    setVoucherInput('');
    setAppliedVoucher(null);
    setVoucherError('');
    setVoucherNotice('');
    validatedParamsRef.current = null;

    walletService.getMyWallet().then((w) => setCustomerWallet(w)).catch(() => {});
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!isFormValid || isCheckingOut || !selectedTrip) return;

    setIsCheckingOut(true);
    try {
      const orderPayload = {
        tripId: String(selectedTrip.id),
        type: isPassengerService ? 'passenger' : 'parcel',
        ...(appliedVoucher ? { voucherCode: appliedVoucher.code } : {}),
        ...(isPassengerService
          ? { seatsBooked: safeSeatCount }
          : {
              items: [
                {
                  itemName: itemCategory,
                  itemCategory: itemCategory,
                  quantity: safeItemCount,
                  weightPerItemKg: itemWeight,
                  sizeEnum: itemSize.toLowerCase(),
                  recipientName: receiverName,
                  recipientPhone: receiverPhone,
                },
              ],
            }),
      };

      // 1. Create Order
      const resOrder = await apiClient.post('/orders', orderPayload);
      const createdOrder = resOrder.data;
      const orderIdStr = String(createdOrder.id);

      if (paymentMethod === 'xendit') {
        // 2. Request Xendit Invoice URL
        const resPayment = await apiClient.post('/payments/xendit/create-invoice', {
          orderId: orderIdStr,
        });
        
        const invoiceUrl = resPayment.data?.invoiceUrl;
        if (!invoiceUrl || invoiceUrl === '/customer/tickets') {
          throw new Error('Gagal mendapatkan tautan pembayaran Xendit yang valid.');
        }
  
        // 3. Redirect ke Payment Gateway (Xendit)
        toast.success('Mengalihkan ke halaman pembayaran...', { title: 'Tunggu Sebentar' });
        window.location.href = invoiceUrl;
      } else if (paymentMethod === 'wallet') {
        // Pembayaran Saldo Dompet
        await walletService.payWithWallet(orderIdStr, pin);
        
        toast.success('Pembayaran dengan Saldo Dompet berhasil!', { title: 'Berhasil' });
        setSelectedTrip(null);
        navigate('/customer/tickets');
      }

    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Gagal memproses transaksi.';
      const formattedMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
      toast.error(formattedMsg, { title: 'Gagal' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-sans">
      {/* â”€â”€ BANNER â”€â”€ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Cari & Booking Trip</h1>
            <p className="mt-1 text-sm text-blue-100">Temukan perjalanan antar kota atau pengiriman barang dengan sistem Escrow terintegrasi.</p>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>
      <BannerSlider role="customer" />

      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-card border border-slate-200">
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Layanan Kami</h2>
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center gap-2.5 hover:opacity-90 transition cursor-pointer group" onClick={() => setActiveService('motor')}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft transition-all duration-200 ${activeService === 'motor' ? 'bg-[#262160] scale-105' : 'bg-slate-200 group-hover:bg-slate-300'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
            <span className={`text-sm font-bold ${activeService === 'motor' ? 'text-[#262160]' : 'text-slate-500'}`}>Nebeng Motor</span>
          </button>
          <button className="flex flex-col items-center gap-2.5 hover:opacity-90 transition cursor-pointer group" onClick={() => setActiveService('mobil')}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft transition-all duration-200 ${activeService === 'mobil' ? 'bg-[#262160] scale-105' : 'bg-slate-200 group-hover:bg-slate-300'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <span className={`text-sm font-bold ${activeService === 'mobil' ? 'text-[#262160]' : 'text-slate-500'}`}>Nebeng Mobil</span>
          </button>
          <button className="flex flex-col items-center gap-2.5 hover:opacity-90 transition cursor-pointer group" onClick={() => setActiveService('barang')}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft transition-all duration-200 ${activeService === 'barang' ? 'bg-[#262160] scale-105' : 'bg-slate-200 group-hover:bg-slate-300'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <span className={`text-sm font-bold ${activeService === 'barang' ? 'text-[#262160]' : 'text-slate-500'}`}>Nebeng Barang</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-slate-200 p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pos Asal</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 transition-all truncate">
              <option value="">Semua Pos Asal</option>
              {pickupPoints.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pos Tujuan</label>
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 transition-all truncate">
              <option value="">Semua Pos Tujuan</option>
              {pickupPoints.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tanggal</label>
            <input type="date" min={TODAY_ISO} value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:outline-none focus:border-[#10367D] focus:ring-2 focus:ring-[#10367D]/20 transition-all" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Hasil Trip Tersedia</span>
            <span className="px-2 py-0.5 text-xs font-extrabold bg-[#10367D]/10 text-[#10367D] rounded-full">
              {trips.length}
            </span>
          </h2>
        </div>

        {isLoadingTrips ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-28 bg-slate-200 rounded-full" />
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                </div>
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-slate-100 rounded-lg" />
                  <div className="h-12 bg-slate-100 rounded-lg" />
                </div>
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <div className="h-6 w-24 bg-slate-200 rounded-lg" />
                  <div className="h-9 w-28 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {trips.map((trip) => {
              const tripIdStr = String(trip.id);
              const isAlreadyBookedByMe = myBookedTripIds.has(tripIdStr);
              const tripService = inferServiceType(trip);
              const isBarang = tripService === 'barang';
              const isPassenger = !isBarang;
              const isFullyBooked = isPassenger
                ? Number(trip.seatAvailable) <= 0
                : Number(trip.remainingWeightCapacityKg) <= 0;

              const vehicleModel = trip.vehicle?.model || 'Kendaraan Mitra';
              const vehicleType = (trip.vehicle?.type || trip.vehicleType || '').toLowerCase();
              const isMotorVehicle = vehicleType.includes('motor') || vehicleModel.toLowerCase().includes('motor') || vehicleModel.toLowerCase().includes('beat') || vehicleModel.toLowerCase().includes('vario') || activeService === 'motor';

              const quotaRemaining = isBarang
                ? `${trip.remainingWeightCapacityKg ?? trip.maxWeightCapacityKg ?? 0} Kg`
                : `${trip.seatAvailable ?? trip.totalSeats ?? 0} Kursi`;

              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group hover:border-[#10367D]/40"
                >
                  <div>
                    {/* Header: Service Tag & Availability Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                          isPassenger
                            ? 'bg-blue-50 text-[#10367D] border-blue-200/70'
                            : 'bg-purple-50 text-[#4B2172] border-purple-200/70'
                        }`}
                      >
                        {isPassenger ? (
                          <Users className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Package className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isPassenger ? 'Nebeng Penumpang' : 'Nebeng Barang'}</span>
                      </span>

                      <div>
                        {isAlreadyBookedByMe ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Sudah Dipesan
                          </span>
                        ) : isFullyBooked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Kuota Penuh
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Tersedia
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visual Route Track */}
                    <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 mb-3 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                          <div className="w-0.5 h-7 bg-slate-200 my-1" />
                          <div className="w-2.5 h-2.5 rounded-full bg-[#10367D] ring-4 ring-blue-100" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pos Asal</span>
                            <span className="text-sm font-bold text-slate-900 truncate block">
                              {trip.originPoint?.name || 'Titik Asal'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pos Tujuan</span>
                            <span className="text-sm font-bold text-slate-900 truncate block">
                              {trip.destinationPoint?.name || 'Titik Tujuan'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Trip Meta Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Jadwal */}
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Jadwal</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {formatTripDate(trip.departureDate)}
                          </span>
                          {formatTripTime(trip.departureTime) && (
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                              {formatTripTime(trip.departureTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kendaraan & Mitra */}
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                        {isMotorVehicle ? (
                          <Bike className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        ) : (
                          <Car className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Kendaraan</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {vehicleModel}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium truncate block mt-0.5">
                            {trip.mitra?.name ? trip.mitra.name : trip.vehicle?.plateNumber || 'Mitra Nebeng'}
                          </span>
                        </div>
                      </div>

                      {/* Sisa Kuota Bar */}
                      <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-blue-50/40 border border-blue-100/70">
                        <div className="flex items-center gap-2">
                          {isBarang ? (
                            <Package className="w-4 h-4 text-[#10367D]" />
                          ) : (
                            <Users className="w-4 h-4 text-[#10367D]" />
                          )}
                          <span className="text-xs font-bold text-slate-700">Sisa Kuota:</span>
                        </div>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-white border border-blue-200 text-[#10367D] shadow-xs">
                          {quotaRemaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Price & CTA */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Tarif</span>
                      <span className="text-lg sm:text-xl font-extrabold text-emerald-600 tracking-tight block">
                        {formatRupiah(trip.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">
                        {isBarang ? 'per pengiriman' : 'per penumpang'}
                      </span>
                    </div>

                    <div>
                      {isAlreadyBookedByMe ? (
                        <button
                          onClick={() => navigate('/customer/tickets')}
                          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          Lihat Tiket
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : isFullyBooked ? (
                        <button
                          disabled
                          className="py-2.5 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs sm:text-sm font-bold cursor-not-allowed"
                        >
                          Kuota Penuh
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenBooking(trip)}
                          className="py-2.5 px-4 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
                          style={{ backgroundColor: PRIMARY_COLOR }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_HOVER)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_COLOR)}
                        >
                          <span>Pesan Sekarang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Search} title="Tidak Ada Trip" description="Tidak ada jadwal trip yang cocok." />
        )}
      </div>

      <BaseModal
        isOpen={Boolean(selectedTrip)}
        onClose={() => setSelectedTrip(null)}
        title="Formulir Pemesanan"
        subtitle="Booking Engine"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCheckout} className="space-y-3 text-[13px]">
          {isPassengerService ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Jumlah Kursi (Maks: {maxAllowedSeats})
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxAllowedSeats}
                  value={seatCount}
                  onChange={handleSeatChange}
                  className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none"
                />
                {seatCount > maxAllowedSeats && (
                  <p className="text-[12px] text-rose-500 mt-0.5">Jumlah kursi melebihi sisa kuota!</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Nama Penumpang</label>
                  <input
                    type="text"
                    required
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={passengerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, setPassengerPhone)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none"
                  />
                  {!isPassengerPhoneValid && passengerPhone.length > 0 && (
                    <p className="text-[12px] text-rose-500 mt-0.5">Format nomor tidak valid</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Kategori Barang</label>
                  <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none">
                    <option value="Elektronik">Elektronik</option>
                    <option value="Pakaian">Pakaian</option>
                    <option value="Dokumen">Dokumen</option>
                    <option value="Makanan">Makanan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Ukuran Paket</label>
                  <select value={itemSize} onChange={(e) => handleSizeChange(e.target.value)} className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none">
                    {sizeOptions.map((opt) => (
                      <option key={opt.code} value={opt.code}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Nama Penerima</label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">No. HP Penerima</label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={receiverPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, setReceiverPhone)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none"
                  />
                  {!isReceiverPhoneValid && receiverPhone.length > 0 && (
                    <p className="text-[12px] text-rose-500 mt-0.5">Format nomor tidak valid</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('xendit')}
                className={`py-2 px-3 border rounded-xl text-[13px] font-bold transition text-left cursor-pointer ${
                  paymentMethod === 'xendit'
                    ? 'border-[#10367D] bg-blue-50 text-[#10367D]'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                <div>Virtual Account / QRIS</div>
                <div className="text-[11px] font-normal text-neutral-400">Via Xendit Gateway</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isWalletBalanceSufficient) {
                    setPaymentMethod('wallet');
                  }
                }}
                disabled={!isWalletBalanceSufficient}
                className={`py-2 px-3 border rounded-xl text-[13px] font-bold transition text-left ${
                  !isWalletBalanceSufficient
                    ? 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-75'
                    : paymentMethod === 'wallet'
                    ? 'border-[#10367D] bg-blue-50 text-[#10367D] cursor-pointer'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 cursor-pointer'
                }`}
              >
                <div>Saldo Dompet</div>
                <div
                  className={`text-[11px] font-mono font-medium ${
                    isWalletBalanceSufficient ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  {formatRupiah(walletBalance)}
                </div>
              </button>
            </div>

            {!isWalletBalanceSufficient && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Saldo dompet tidak mencukupi (Tersedia: {formatRupiah(walletBalance)}, Total: {formatRupiah(effectiveTotalPrice)}).
              </p>
            )}
          </div>

          {paymentMethod === 'wallet' && (
            <div>
              {!userProfile?.hasPin ? (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-bold text-blue-900">Buat PIN Transaksi Terlebih Dahulu</p>
                      <p className="text-[11px] text-blue-700">
                        Akun Anda belum memiliki PIN transaksi untuk otorisasi pembayaran dompet.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        PIN Baru (6 Digit)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Contoh: 123456"
                        className="w-full p-2 bg-white border border-blue-200 rounded-lg font-bold text-center tracking-widest text-[12px] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        Konfirmasi PIN
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ulangi 6 digit"
                        className="w-full p-2 bg-white border border-blue-200 rounded-lg font-bold text-center tracking-widest text-[12px] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePin}
                    disabled={isSavingPin || newPin.length !== 6 || confirmPin.length !== 6}
                    className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[12px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSavingPin ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    Simpan & Gunakan PIN
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase">
                      PIN Transaksi (6 Digit)
                    </label>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> PIN Terverifikasi
                    </span>
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 6 digit PIN"
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none tracking-widest text-center"
                  />
                </div>
              )}
            </div>
          )}

          {/* Voucher Section */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase">
              Kode Voucher
            </label>
            {appliedVoucher ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[12px] font-bold text-emerald-800">
                    Voucher <span className="font-mono uppercase">{appliedVoucher.code}</span> diterapkan
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="p-1 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                  title="Hapus voucher"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setVoucherError('');
                    }}
                    placeholder="Masukkan kode voucher"
                    disabled={isValidatingVoucher || cooldownSeconds > 0}
                    className="flex-1 p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold uppercase text-[12px] focus:outline-none focus:border-blue-500 tracking-wider disabled:bg-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={!voucherInput.trim() || isValidatingVoucher || cooldownSeconds > 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-xl transition flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                  >
                    {isValidatingVoucher ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : cooldownSeconds > 0 ? (
                      `Tunggu (${cooldownSeconds}s)`
                    ) : (
                      'Terapkan'
                    )}
                  </button>
                </div>
                {voucherError && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{voucherError}</span>
                  </p>
                )}
                {voucherNotice && !voucherError && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{voucherNotice}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {appliedVoucher ? (
            <div className="p-3 bg-emerald-50 rounded-xl space-y-1.5 border border-emerald-100 text-[13px]">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-neutral-800">{formatRupiah(subtotalPrice)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Diskon ({appliedVoucher.code}):</span>
                <span>- {formatRupiah(appliedVoucher.discountAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-neutral-800 pt-1.5 border-t border-emerald-200/60">
                <span className="text-neutral-700">Total Bayar:</span>
                <span style={{ color: PRIMARY_COLOR }}>{formatRupiah(effectiveTotalPrice)}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-xl flex justify-between font-bold border border-emerald-100">
              <span className="text-neutral-700">Total Biaya:</span>
              <span style={{ color: PRIMARY_COLOR }}>{formatRupiah(subtotalPrice)}</span>
            </div>
          )}

          {getFormValidationMessage() && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{getFormValidationMessage()}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isCheckingOut}
            className={`w-full py-2.5 text-white rounded-xl font-bold shadow-sm transition cursor-pointer flex items-center justify-center ${
              isFormValid && !isCheckingOut ? '' : 'bg-neutral-300 cursor-not-allowed'
            }`}
            style={(isFormValid && !isCheckingOut) ? { backgroundColor: PRIMARY_COLOR } : undefined}
          >
            {isCheckingOut ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Lanjut Pembayaran'
            )}
          </button>
        </form>
      </BaseModal>
    </div>
  );
}






