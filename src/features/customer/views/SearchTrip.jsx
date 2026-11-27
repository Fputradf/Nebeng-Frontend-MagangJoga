import { useState, useEffect, useRef, useMemo } from 'react';
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
  Star,
  ChevronRight,
  QrCode,
  Ticket,
  Receipt,
  Wallet,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import BaseModal from '../../../components/ui/BaseModal';
import { BannerSlider } from '../../../components/ui/BannerSlider';
import DashboardRegionSwitcher from '../../../components/ui/DashboardRegionSwitcher';
import NotificationBell from '../../../components/ui/NotificationBell';
import { useAuth } from '../../../context/AuthContext';
import { useAppConfig } from '../../../context/AppConfigContext';
import logoAsset from '../../../assets/LOGO-dark.png';
import heroCarWave from '../../../assets/hero-car-wave.jpg';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import { walletService } from '../../../services/walletService';
import { voucherService } from '../../../services/voucherService';
import { formatDurationMinutes, getEstimatedArrivalTime } from '../../../utils/dateUtils';
import PendingBillsBanner from '../components/PendingBillsBanner';
import InAppCheckoutModal from '../components/InAppCheckoutModal';

const PHONE_REGEX = /^(\+?62|0)?8[1-9][0-9]{7,11}$/;
const TODAY_ISO = new Date().toISOString().split('T')[0];
const PRIMARY_COLOR = '#1356d6';
const PRIMARY_HOVER = '#0e44ba';
const formatRupiah = (value) => `Rp ${Math.max(0, Math.round(value || 0)).toLocaleString('id-ID')}`;

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
  const { customerProfile } = useAuth();
  const { appName, appLogoDark } = useAppConfig();
  const searchSectionRef = useRef(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const initialOrigin = location.state?.origin || queryParams.get('origin') || '';
  const initialDestination = location.state?.destination || queryParams.get('destination') || '';
  const initialDate = location.state?.date || queryParams.get('date') || '';
  const initialService = location.state?.service || queryParams.get('service') || 'motor';

  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [date, setDate] = useState(initialDate);
  const [activeService, setActiveService] = useState(
    ['motor', 'mobil', 'barang'].includes(initialService) ? initialService : 'motor'
  );

  const [pickupPoints, setPickupPoints] = useState([]);
  const [trips, setTrips] = useState([]);
  const [myBookedTripIds, setMyBookedTripIds] = useState(new Set());
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [customerWallet, setCustomerWallet] = useState(null);
  const [customerFees, setCustomerFees] = useState({ motor: 0, mobil: 0, barang: 0 });
  const customerName = userProfile?.name || userProfile?.fullName || 'Pelanggan';

  const [selectedTrip, setSelectedTrip] = useState(null);

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [seatCount, setSeatCount] = useState(1);
  const [bookingForOthers, setBookingForOthers] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [passengersList, setPassengersList] = useState([
    { name: '', phone: '', isContact: true },
  ]);

  const [itemCategory, setItemCategory] = useState('Elektronik');
  const [itemCount, setItemCount] = useState(1);
  const [itemWeight, setItemWeight] = useState(5);
  const [itemSize, setItemSize] = useState('M');

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('xendit');
  const [selectedOrderForCheckout, setSelectedOrderForCheckout] = useState(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
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
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
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

        const [resMe, resPoints, resMyOrders, resTrips, resWallet, resCustomerFees] = await Promise.all([
          apiClient.get('/auth/me').catch(() => ({ data: null })),
          apiClient.get('/pickup-points', { params: { onlyActive: true } }).catch(() => ({ data: [] })),
          apiClient.get('/orders/me').catch(() => ({ data: [] })),
          apiClient.get('/trips', { params }).catch(() => ({ data: { data: [] } })),
          walletService.getMyWallet().catch(() => null),
          apiClient.get('/orders/customer-fee').catch(() => ({ data: { motor: 0, mobil: 0, barang: 0 } })),
        ]);

        if (ignore) return;

        if (resMe.data) {
          setUserProfile(resMe.data);
        }

        if (resWallet) {
          setCustomerWallet(resWallet);
        }

        if (resCustomerFees?.data) {
          setCustomerFees({
            motor: Number(resCustomerFees.data.motor || 0),
            mobil: Number(resCustomerFees.data.mobil || 0),
            barang: Number(resCustomerFees.data.barang || 0),
          });
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

        voucherService
          .getMyVouchers()
          .then((v) => {
            if (!ignore) setAvailableVouchers(Array.isArray(v) ? v : []);
          })
          .catch(() => {});
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
  }, [origin, destination, date, activeService, refreshKey]);

  const isPassengerService = activeService === 'motor' || activeService === 'mobil';

  const applicableVouchers = useMemo(() => {
    const currentOrderType = isPassengerService ? 'passenger' : 'parcel';
    return availableVouchers.filter((v) => {
      if (!v.isAvailable) return false;
      if (v.appliesTo && v.appliesTo !== currentOrderType) return false;
      return true;
    });
  }, [availableVouchers, isPassengerService]);

  const maxAllowedSeats = selectedTrip?.vehicle?.type === 'motor' 
    ? 1 
    : (selectedTrip?.seatAvailable ?? selectedTrip?.totalSeats ?? 1);

  const safeSeatCount = Math.min(Math.max(1, seatCount || 1), maxAllowedSeats);
  const safeItemCount = Math.max(1, itemCount || 1);
  const parsedItemWeight = parseFloat(itemWeight);
  const safeItemWeight = !isNaN(parsedItemWeight) && parsedItemWeight > 0 ? parsedItemWeight : 0;
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
  const currentCustomerFee = !isPassengerService
    ? Number(customerFees.barang || 0)
    : selectedTrip?.vehicle?.type === 'motor'
      ? Number(customerFees.motor || 0)
      : Number(customerFees.mobil || 0);
  const effectiveTotalPrice = (appliedVoucher ? appliedVoucher.totalPrice : subtotalPrice) + currentCustomerFee;

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

  const areAllPassengersValid = useMemo(() => {
    if (!isPassengerService) return true;
    if (!passengersList || passengersList.length !== safeSeatCount) return false;
    return passengersList.every(
      (p) => Boolean(p.name && p.name.trim() !== '') && PHONE_REGEX.test(p.phone?.trim() || '')
    );
  }, [isPassengerService, passengersList, safeSeatCount]);

  const isReceiverPhoneValid =
    !isPassengerService ? PHONE_REGEX.test(receiverPhone.trim()) : true;

  const isWeightValid =
    !isPassengerService ? (!isNaN(parsedItemWeight) && parsedItemWeight > 0) : true;

  const isPassengerValid = isPassengerService ? areAllPassengersValid : true;

  const isBarangValid =
    !isPassengerService ? receiverName.trim() !== '' && isReceiverPhoneValid && isWeightValid : true;

  const isPaymentValid =
    paymentMethod === 'xendit'
      ? true
      : isWalletBalanceSufficient && Boolean(userProfile?.hasPin) && pin.length === 6;

  const isFormValid = !isOverCapacity && isPassengerValid && isBarangValid && isPaymentValid;

  const getFormValidationMessage = () => {
    if (isOverCapacity) {
      return isPassengerService ? 'Jumlah kursi melebihi kuota tersedia.' : 'Berat barang melebihi kapasitas kuota bagasi.';
    }
    if (isPassengerService) {
      if (!areAllPassengersValid) {
        for (let i = 0; i < passengersList.length; i++) {
          const p = passengersList[i];
          if (!p.name?.trim()) return `Nama penumpang kursi ke-${i + 1} wajib diisi.`;
          if (!p.phone?.trim()) return `Nomor WhatsApp penumpang kursi ke-${i + 1} wajib diisi.`;
          if (!PHONE_REGEX.test(p.phone.trim())) {
            return `Format nomor WhatsApp penumpang kursi ke-${i + 1} tidak valid (contoh: 08123456789).`;
          }
        }
      }
    } else {
      if (!isWeightValid) return 'Berat paket wajib diisi dengan benar (minimal 0.1 Kg).';
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
    const newSeats = isNaN(val) || val < 1 ? 1 : Math.min(val, maxAllowedSeats);
    setSeatCount(newSeats);
    setPassengersList((prev) => {
      const updated = [...prev];
      if (newSeats > updated.length) {
        for (let i = updated.length; i < newSeats; i++) {
          updated.push({ name: '', phone: '', isContact: false });
        }
      } else {
        return updated.slice(0, newSeats);
      }
      return updated;
    });
  };

  const handlePassengerChange = (index, field, value) => {
    setPassengersList((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      if (field === 'phone') {
        const cleaned = value.replace(/[^0-9+]/g, '');
        if (cleaned.length <= 14) {
          updated[index] = { ...updated[index], [field]: cleaned };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleToggleBookingForOthers = (checked) => {
    setBookingForOthers(checked);
    setPassengersList((prev) => {
      const updated = [...prev];
      if (checked) {
        if (updated[0]) {
          updated[0] = { ...updated[0], name: '', phone: '', isContact: true };
        }
      } else {
        const cleanPhone = (userProfile?.phone || '').replace(/[^0-9+]/g, '');
        if (updated[0]) {
          updated[0] = {
            ...updated[0],
            name: customerName || '',
            phone: cleanPhone || '',
            isContact: true,
          };
        }
      }
      return updated;
    });
  };

  const handlePhoneChange = (val, setter) => {
    const cleaned = val.replace(/[^0-9+]/g, '');
    if (cleaned.length <= 14) {
      setter(cleaned);
    }
  };

  const handleWeightChange = (e) => {
    const val = e.target.value;
    setItemWeight(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (num <= 1) setItemSize('XXS');
      else if (num <= 3) setItemSize('XS');
      else if (num <= 5) setItemSize('S');
      else if (num <= 10) setItemSize('M');
      else if (num <= 20) setItemSize('L');
      else setItemSize('XL');
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

  const handleApplyVoucher = async (codeOverride) => {
    const rawCode = typeof codeOverride === 'string' ? codeOverride : voucherInput;
    const trimmedCode = (rawCode || '').trim().toUpperCase();
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
      setShowManualInput(false);
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
    setBookingForOthers(false);
    const cleanPhone = (userProfile?.phone || '').replace(/[^0-9+]/g, '');
    setPassengersList([
      { name: customerName || '', phone: cleanPhone, isContact: true },
    ]);
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
    setShowManualInput(false);
    validatedParamsRef.current = null;

    walletService.getMyWallet().then((w) => setCustomerWallet(w)).catch(() => {});

    setIsLoadingVouchers(true);
    voucherService
      .getMyVouchers()
      .then((v) => setAvailableVouchers(Array.isArray(v) ? v : []))
      .catch(() => {})
      .finally(() => setIsLoadingVouchers(false));
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!isFormValid || isCheckingOut || !selectedTrip) return;

    setIsCheckingOut(true);
    let createdOrderId = null;
    try {
      const orderPayload = {
        tripId: String(selectedTrip.id),
        type: isPassengerService ? 'passenger' : 'parcel',
        ...(appliedVoucher ? { voucherCode: appliedVoucher.code } : {}),
        ...(isPassengerService
          ? {
              seatsBooked: safeSeatCount,
              passengers: passengersList.map((p, idx) => ({
                name: p.name.trim(),
                phone: p.phone.trim(),
                seatNumber: idx + 1,
                isContact: idx === 0,
              })),
            }
          : {
              items: [
                {
                  itemName: itemCategory,
                  itemCategory: itemCategory,
                  quantity: safeItemCount,
                  weightPerItemKg: safeItemWeight > 0 ? safeItemWeight : (parseFloat(itemWeight) || 1),
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
      createdOrderId = orderIdStr;

      if (paymentMethod === 'xendit') {
        // Tampilkan Custom In-App Checkout UI langsung tanpa redirect luar
        setSelectedOrderForCheckout(createdOrder);
        setIsCheckoutModalOpen(true);
        setSelectedTrip(null);
        toast.info('Silakan selesaikan pembayaran tiket Anda.', {
          title: 'Selesaikan Tagihan',
        });
      } else if (paymentMethod === 'wallet') {
        // Pembayaran Saldo Dompet
        await walletService.payWithWallet(orderIdStr, pin);
        
        toast.success('Pembayaran dengan Saldo Dompet berhasil!', { title: 'Berhasil' });
        setSelectedTrip(null);
        navigate('/customer/tickets');
      }

    } catch (error) {
      if (createdOrderId) {
        toast.warning(
          'Pesanan telah dibuat. Silakan klik Bayar Sekarang di halaman Tiket Saya untuk menyelesaikan transaksi.',
          { title: 'Menunggu Pembayaran' }
        );
        setSelectedTrip(null);
        navigate('/customer/tickets');
      } else {
        const errorMsg =
          error.response?.data?.message || error.message || 'Gagal memproses transaksi.';
        const formattedMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
        toast.error(formattedMsg, { title: 'Gagal' });
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const firstName = (customerProfile?.fullName || customerProfile?.name || 'Pelanggan').split(' ')[0];

  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    const q = quickSearchQuery.trim().toLowerCase();
    if (q) {
      if (q.includes('motor')) setActiveService('motor');
      else if (q.includes('mobil')) setActiveService('mobil');
      else if (q.includes('barang') || q.includes('paket')) setActiveService('barang');
      else {
        const matchedPoint = pickupPoints.find((p) => (p.name || '').toLowerCase().includes(q));
        if (matchedPoint) setDestination(String(matchedPoint.id));
      }
    }
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full mx-auto min-h-screen bg-white font-sans pb-6">
      {/* ── HERO HEADER BIRU DENGAN WAVE ── */}
      <section className="relative bg-gradient-to-br from-[#0b3ba8] via-[#1356d6] to-[#2684ff] px-4 pt-4 pb-14 text-white">
        {/* Background & Wave di dalam wrapper overflow-hidden agar dropdown notifikasi tidak terpotong */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={heroCarWave}
            alt=""
            className="absolute bottom-2 -right-4 h-[88%] w-[68%] object-cover object-[52%_72%] opacity-95"
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse 85% 90% at 72% 72%, rgba(0,0,0,1) 42%, rgba(0,0,0,0) 82%)',
              maskImage: 'radial-gradient(ellipse 85% 90% at 72% 72%, rgba(0,0,0,1) 42%, rgba(0,0,0,0) 82%)',
            }}
          />
          <svg
            viewBox="0 0 430 36"
            fill="none"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 right-0 h-7 w-full"
          >
            <path
              d="M0 16C85 34 175 0 275 18C345 30 395 14 430 6V36H0V16Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Top Bar: Logo + Nama Aplikasi & Notifikasi (z-30 agar di atas pill lokasi & search bar) */}
        <div className="relative z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={appLogoDark || logoAsset}
              alt={appName || 'SatuRute'}
              className="h-8 w-8 rounded-xl bg-white/15 p-1 object-contain shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = logoAsset;
              }}
            />
            <span className="font-display text-lg font-extrabold tracking-tight text-white truncate">
              {appName || 'SatuRute'}
            </span>
          </div>

          <NotificationBell basePath="/customer" compact />
        </div>

        {/* Pill Lokasi (Langsung dari DashboardRegionSwitcher tanpa wrapper ganda) */}
        <div className="relative z-10 mt-3.5">
          <DashboardRegionSwitcher
            variant="banner"
            onRegionChanged={() => setRefreshKey((k) => k + 1)}
          />
        </div>

        {/* Sapaan */}
        <div className="relative z-10 mt-3.5 space-y-0.5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
            Halo, {firstName}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-xs font-medium text-blue-100">
            Mau ke mana hari ini?
          </p>
        </div>
      </section>

      {/* ── FLOATING SEARCH BAR ── */}
      <form
        onSubmit={handleQuickSearchSubmit}
        className="relative z-20 -mt-6 mx-4 flex items-center gap-2 rounded-full border border-slate-100 bg-white p-1.5 pl-4 shadow-[0_8px_24px_rgba(16,54,125,0.12)]"
      >
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={quickSearchQuery}
          onChange={(e) => setQuickSearchQuery(e.target.value)}
          placeholder="Cari tujuan, lokasi, atau layanan..."
          className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Cari trip"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1356d6] text-white shadow-sm transition hover:bg-[#0b3ba8] active:scale-95 cursor-pointer"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="px-4 pt-4 space-y-5">
        <PendingBillsBanner />

        {/* ── KARTU LAYANAN UTAMA (4 KOLOM) ── */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_16px_rgba(16,54,125,0.06)]">
          <div role="tablist" aria-label="Pilih Jenis Layanan" className="grid grid-cols-4 gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeService === 'motor'}
              onClick={() => {
                setActiveService('motor');
                searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition cursor-pointer ${
                activeService === 'motor' ? 'bg-blue-50/90 ring-2 ring-[#1356d6]/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_6px_14px_rgba(37,99,235,0.28)] ring-1 ring-inset ring-white/25">
                <Bike className="h-7 w-7 stroke-[2.2]" />
              </div>
              <span className={`text-[11px] font-bold ${activeService === 'motor' ? 'text-[#1356d6]' : 'text-slate-700'}`}>
                Motor
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeService === 'mobil'}
              onClick={() => {
                setActiveService('mobil');
                searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition cursor-pointer ${
                activeService === 'mobil' ? 'bg-sky-50/90 ring-2 ring-[#0284c7]/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white shadow-[0_6px_14px_rgba(14,165,233,0.28)] ring-1 ring-inset ring-white/25">
                <Car className="h-7 w-7 stroke-[2.2]" />
              </div>
              <span className={`text-[11px] font-bold ${activeService === 'mobil' ? 'text-[#0284c7]' : 'text-slate-700'}`}>
                Mobil
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeService === 'barang'}
              onClick={() => {
                setActiveService('barang');
                searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition cursor-pointer ${
                activeService === 'barang' ? 'bg-amber-50/90 ring-2 ring-amber-400/60' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white shadow-[0_6px_14px_rgba(245,158,11,0.28)] ring-1 ring-inset ring-white/25">
                <Package className="h-7 w-7 stroke-[2.2]" />
              </div>
              <span className={`text-[11px] font-bold ${activeService === 'barang' ? 'text-amber-700' : 'text-slate-700'}`}>
                Barang
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/customer/qr')}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white shadow-[0_6px_14px_rgba(99,102,241,0.28)] ring-1 ring-inset ring-white/25">
                <QrCode className="h-7 w-7 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                Digital QR
              </span>
            </button>
          </div>
        </div>

        {/* ── BANNER IKLAN / PROMO ── */}
        <BannerSlider role="customer" containerClassName="h-44 mb-2" />

        {/* ── LAYANAN LAINNYA ── */}
        <div className="pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold text-slate-900">
              Layanan Lainnya
            </h2>
            <button
              type="button"
              onClick={() => navigate('/customer/tickets')}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-[#1356d6] hover:underline cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/customer/tickets')}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_2px_10px_rgba(16,54,125,0.05)] transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white shadow-sm ring-1 ring-inset ring-white/25">
                <Ticket className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Tiket</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/customer/vouchers')}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_2px_10px_rgba(16,54,125,0.05)] transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#ea580c] text-white shadow-sm ring-1 ring-inset ring-white/25">
                <Tag className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Voucher</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/customer/tagihan')}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_2px_10px_rgba(16,54,125,0.05)] transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] text-white shadow-sm ring-1 ring-inset ring-white/25">
                <Receipt className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Tagihan</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/customer/wallet')}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_2px_10px_rgba(16,54,125,0.05)] transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] text-white shadow-sm ring-1 ring-inset ring-white/25">
                <Wallet className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Dompet Saya</span>
            </button>
          </div>
        </div>

        {/* ── KARTU AMAN & NYAMAN ── */}
        <button
          type="button"
          onClick={() => navigate('/customer/bantuan')}
          className="w-full flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-3 text-left transition hover:bg-slate-100/80 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1356d6] text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">Aman &amp; Nyaman</p>
              <p className="text-[11px] text-slate-500">Perjalanan Anda selalu terlindungi</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </button>

        {/* ── FORM FILTER & HASIL TRIP ── */}
        <div
          ref={searchSectionRef}
          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(16,54,125,0.07)] space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-extrabold text-slate-900">
                Cari Jadwal Perjalanan
              </h2>
              <p className="text-[11px] text-slate-400">
                Pilih rute pos asal, tujuan, dan tanggal keberangkatan
              </p>
            </div>
            {(origin || destination || date) && (
              <button
                type="button"
                onClick={() => {
                  setOrigin('');
                  setDestination('');
                  setDate('');
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="relative space-y-2.5">
              {/* Pos Asal */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 focus-within:border-[#1356d6] focus-within:bg-white transition">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pos Asal
                    </label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none truncate cursor-pointer pr-6"
                    >
                      <option value="">Semua Pos Asal</option>
                      {pickupPoints.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tombol Tukar Rute (di tengah antara Asal & Tujuan, tidak menimpa panah select) */}
              <button
                type="button"
                onClick={() => {
                  setOrigin(destination);
                  setDestination(origin);
                }}
                aria-label="Tukar pos asal dan tujuan"
                className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1356d6] shadow-sm transition hover:bg-blue-50 active:scale-95 cursor-pointer"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>

              {/* Pos Tujuan */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 focus-within:border-[#1356d6] focus-within:bg-white transition">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1356d6] ring-4 ring-blue-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pos Tujuan
                    </label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none truncate cursor-pointer pr-6"
                    >
                      <option value="">Semua Pos Tujuan</option>
                      {pickupPoints.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tanggal */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 focus-within:border-[#1356d6] focus-within:bg-white transition">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-sky-100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tanggal Berangkat
                  </label>
                  <input
                    type="date"
                    min={TODAY_ISO}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Hasil Trip Tersedia</span>
            <span className="px-2 py-0.5 text-xs font-extrabold bg-[#1356d6]/10 text-[#1356d6] rounded-full">
              {trips.length}
            </span>
          </h2>
        </div>

        {isLoadingTrips ? (
          <div className="grid grid-cols-1 gap-4">
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
          <div className="grid grid-cols-1 gap-4">
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
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group hover:border-[#1356d6]/40"
                >
                  <div>
                    {/* Header: Service Tag & Availability Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                          isPassenger
                            ? 'bg-blue-50 text-[#1356d6] border-blue-200/70'
                            : 'bg-sky-50 text-sky-700 border-sky-200/70'
                        }`}
                      >
                        {isPassenger ? (
                          <Users className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Package className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isPassenger ? 'SatuRute Penumpang' : 'SatuRute Barang'}</span>
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
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1356d6] ring-4 ring-blue-100" />
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

                    {/* Estimasi Waktu & Jarak Perjalanan */}
                    {(trip.estimatedDurationMinutes || trip.distanceKm) && (
                      <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 mb-3 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>
                            Estimasi: <strong>{formatDurationMinutes(trip.estimatedDurationMinutes) || `${trip.estimatedDurationMinutes} mnt`}</strong>
                            {trip.distanceKm ? ` (${Number(trip.distanceKm)} km)` : ''}
                          </span>
                        </div>
                        {getEstimatedArrivalTime(trip.departureDate, trip.departureTime, trip.estimatedDurationMinutes) && (
                          <span className="text-[11px] text-blue-700/80 font-normal">
                            Tiba ~{getEstimatedArrivalTime(trip.departureDate, trip.departureTime, trip.estimatedDurationMinutes)}
                          </span>
                        )}
                      </div>
                    )}

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
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Kendaraan & Mitra</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {vehicleModel}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-600 font-medium truncate max-w-[120px]">
                              {trip.mitra?.name ? trip.mitra.name : trip.vehicle?.plateNumber || 'Mitra SatuRute'}
                            </span>
                            {trip.mitra?.rating ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200/80">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 shrink-0" />
                                <span>{trip.mitra.rating}</span>
                                {trip.mitra.totalReviews > 0 && (
                                  <span className="text-amber-600/70 font-normal">({trip.mitra.totalReviews})</span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">
                                <Star className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>Baru</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sisa Kuota Bar */}
                      <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-blue-50/40 border border-blue-100/70">
                        <div className="flex items-center gap-2">
                          {isBarang ? (
                            <Package className="w-4 h-4 text-[#1356d6]" />
                          ) : (
                            <Users className="w-4 h-4 text-[#1356d6]" />
                          )}
                          <span className="text-xs font-bold text-slate-700">Sisa Kuota:</span>
                        </div>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-white border border-blue-200 text-[#1356d6] shadow-xs">
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
                          type="button"
                          onClick={() => handleOpenBooking(trip)}
                          className="min-h-[44px] py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center shadow-sm hover:shadow active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                        >
                          <span>Pesan Sekarang</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-blue-200/80 bg-gradient-to-b from-blue-50/50 to-white p-5">
            <EmptyState
              icon={Search}
              title="Belum Ada Jadwal Trip"
              description={
                origin || destination || date
                  ? 'Tidak ada jadwal yang cocok dengan filter Anda. Coba reset filter atau pilih layanan lain.'
                  : 'Belum ada trip tersedia untuk layanan ini di wilayah yang dipilih.'
              }
            />
            {(origin || destination || date) && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setOrigin('');
                    setDestination('');
                    setDate('');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1356d6] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0b3ba8] transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filter Pencarian
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <BaseModal
        isOpen={Boolean(selectedTrip)}
        onClose={() => setSelectedTrip(null)}
        title="Formulir Pemesanan"
        subtitle="Booking Engine"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCheckout} className="space-y-3.5 text-[13px]">
          {/* Ringkasan Mitra & Armada */}
          {selectedTrip && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Mitra Driver</span>
                <p className="font-bold text-slate-800 text-[13px] truncate">
                  {selectedTrip.mitra?.name || 'Mitra SatuRute'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {selectedTrip.vehicle?.model || 'Kendaraan Resmi'} {selectedTrip.vehicle?.plateNumber ? `(${selectedTrip.vehicle.plateNumber})` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {selectedTrip.mitra?.rating ? (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{selectedTrip.mitra.rating}</span>
                    {selectedTrip.mitra.totalReviews > 0 && (
                      <span className="text-[10px] text-amber-600 font-normal">({selectedTrip.mitra.totalReviews} ulasan)</span>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg">
                    <Star className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mitra Baru</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isPassengerService ? (
            <div className="space-y-3">
              {/* Kuota Kursi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                    Jumlah Kursi (Maks: {maxAllowedSeats})
                  </label>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Sisa Kuota: {maxAllowedSeats} Kursi
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxAllowedSeats}
                  value={seatCount}
                  onChange={handleSeatChange}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none focus:border-brand-500"
                />
                {seatCount > maxAllowedSeats && (
                  <p className="text-[12px] text-rose-500 mt-1 font-semibold">Jumlah kursi melebihi sisa kuota!</p>
                )}
              </div>

              {/* Toggle Opsi Pemesanan (Pesan untuk Orang Lain) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="toggleBookingForOthers"
                  checked={bookingForOthers}
                  onChange={(e) => handleToggleBookingForOthers(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-brand-600 rounded cursor-pointer accent-brand-600"
                />
                <label htmlFor="toggleBookingForOthers" className="text-xs text-neutral-700 cursor-pointer select-none">
                  <span className="font-bold text-neutral-900 block">
                    {seatCount === 1 ? 'Saya memesankan untuk orang lain (Teman / Keluarga)' : 'Pesan rombongan untuk keluarga / teman'}
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    {seatCount === 1
                      ? 'Centang jika penumpang yang berangkat bukan pemilik akun. Mitra/Driver akan menghubungi nomor kontak di bawah saat penjemputan.'
                      : 'Data di bawah akan digunakan untuk manifest perjalanan resmi dan koordinasi penjemputan.'}
                  </span>
                </label>
              </div>

              {/* Daftar Penumpang Sesuai Jumlah Kursi */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {passengersList.map((passenger, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50/80 border border-neutral-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1356d6] flex items-center justify-center text-[11px] font-extrabold">
                          {idx + 1}
                        </span>
                        Kursi {idx + 1}: {idx === 0 && !bookingForOthers ? 'Data Penumpang (Saya)' : `Penumpang ${idx + 1}`}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Kontak Utama (PIC)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-0.5">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Penumpang"
                          value={passenger.name}
                          onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-0.5">
                          No. WhatsApp
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="08123456789"
                          value={passenger.phone}
                          onChange={(e) => handlePassengerChange(idx, 'phone', e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                        {passenger.phone.length > 0 && !PHONE_REGEX.test(passenger.phone.trim()) && (
                          <p className="text-[10px] text-rose-500 mt-0.5">Format nomor tidak valid</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Kategori Barang</label>
                  <select 
                    value={itemCategory} 
                    onChange={(e) => setItemCategory(e.target.value)} 
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none text-[13px]"
                  >
                    <option value="Elektronik">Elektronik</option>
                    <option value="Pakaian">Pakaian</option>
                    <option value="Dokumen">Dokumen</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase">
                      Berat Paket (Kg)
                    </label>
                    <span className="text-[10px] text-neutral-400 font-semibold">
                      Sisa: {selectedTrip?.remainingWeightCapacityKg ?? selectedTrip?.maxWeightCapacityKg ?? 30} Kg
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={selectedTrip?.remainingWeightCapacityKg ?? selectedTrip?.maxWeightCapacityKg ?? 30}
                      value={itemWeight}
                      onChange={handleWeightChange}
                      placeholder="Contoh: 5"
                      required
                      className={`w-full p-2 pr-9 bg-neutral-50 border rounded-xl font-bold focus:outline-none text-[13px] ${
                        isOverWeightCapacity ? 'border-rose-400 bg-rose-50/50' : 'border-neutral-200'
                      }`}
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-bold text-neutral-400 pointer-events-none">
                      Kg
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase">
                    Ukuran Paket (Kategori Tarif)
                  </label>
                  <span className="text-[10px] text-[#1356d6] font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    Otomatis Sesuai Berat
                  </span>
                </div>
                <select 
                  value={itemSize} 
                  onChange={(e) => handleSizeChange(e.target.value)} 
                  className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold focus:outline-none text-[13px]"
                >
                  {sizeOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                  ))}
                </select>
                {isOverWeightCapacity && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">
                    Berat paket ({totalAccumulatedWeight} Kg) melebihi sisa kapasitas bagasi ({selectedTrip?.remainingWeightCapacityKg || selectedTrip?.maxWeightCapacityKg || 0} Kg).
                  </p>
                )}
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
                    ? 'border-[#1356d6] bg-blue-50 text-[#1356d6]'
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
                    ? 'border-[#1356d6] bg-blue-50 text-[#1356d6] cursor-pointer'
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
                    className="w-full min-h-[44px] py-2.5 px-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Voucher Promo
              </label>
              {!appliedVoucher && (
                <button
                  type="button"
                  onClick={() => {
                    setShowManualInput(!showManualInput);
                    setVoucherError('');
                  }}
                  className="text-[11px] font-semibold text-[#1356d6] hover:underline cursor-pointer"
                >
                  {showManualInput ? 'Pilih dari daftar voucher' : 'Punya kode lain?'}
                </button>
              )}
            </div>

            {appliedVoucher ? (
              <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="w-4 h-4 text-[#1356d6] shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-mono font-bold text-[#1356d6] mr-1.5">
                      {appliedVoucher.code}
                    </span>
                    <span className="text-emerald-600 font-bold">
                      (-{formatRupiah(appliedVoucher.discountAmount)})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Hapus voucher"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : showManualInput ? (
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
                    className="flex-1 p-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold uppercase text-[12px] focus:outline-none focus:border-[#1356d6] tracking-wider disabled:bg-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyVoucher()}
                    disabled={!voucherInput.trim() || isValidatingVoucher || cooldownSeconds > 0}
                    className="px-4 py-2 bg-[#1356d6] hover:bg-[#0e44ba] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-xl transition flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
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
              </div>
            ) : isLoadingVouchers ? (
              <div className="p-3 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Memuat daftar voucher...
              </div>
            ) : applicableVouchers.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {applicableVouchers.map((v) => {
                  const isEligible = subtotalPrice >= (v.minOrderAmount || 0);

                  return (
                    <div
                      key={v.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 bg-white ${
                        isEligible
                          ? 'border-slate-200 hover:border-blue-400'
                          : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-[#1356d6]">
                            {v.code}
                          </span>
                          <span className="text-xs font-bold text-emerald-600">
                            {v.discountType === 'percentage'
                              ? `${v.discountValue}% OFF`
                              : `Potongan ${formatRupiah(v.discountValue)}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={v.title}>
                          {v.title}
                        </div>
                        {Number(v.minOrderAmount) > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Min. transaksi {formatRupiah(v.minOrderAmount)}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isEligible ? (
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(v.code)}
                            disabled={isValidatingVoucher || cooldownSeconds > 0}
                            className="min-h-[40px] px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            {isValidatingVoucher ? '...' : 'Gunakan'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Belum capai min.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Belum ada voucher yang tersedia untuk perjalanan ini.
              </div>
            )}

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

          {(appliedVoucher || currentCustomerFee > 0) ? (
            <div className="p-3 bg-white rounded-xl space-y-1.5 border border-slate-200 text-[13px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatRupiah(subtotalPrice)}</span>
              </div>
              {currentCustomerFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Aplikasi:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(currentCustomerFee)}</span>
                </div>
              )}
              {appliedVoucher && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Diskon ({appliedVoucher.code}):</span>
                  <span>- {formatRupiah(appliedVoucher.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 pt-1.5 border-t border-slate-200">
                <span className="text-slate-700">Total Bayar:</span>
                <span style={{ color: PRIMARY_COLOR }}>{formatRupiah(effectiveTotalPrice)}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white rounded-xl flex justify-between font-bold border border-slate-200">
              <span className="text-slate-700">Total Biaya:</span>
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

      {/* In-App Checkout UI Modal */}
      {selectedOrderForCheckout && (
        <InAppCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => {
            setIsCheckoutModalOpen(false);
            setSelectedOrderForCheckout(null);
          }}
          order={selectedOrderForCheckout}
          onPaymentSuccess={() => {
            navigate('/customer/tickets');
          }}
        />
      )}
      </div>
    </div>
  );
}






