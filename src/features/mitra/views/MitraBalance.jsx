import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Wallet,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  AlertCircle,
  History,
  Eye,
  EyeOff,
  Edit3,
  Save,
  PlusCircle,
  RefreshCw,
  Ticket,
  ShieldCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';
import { walletService } from '../../../services/walletService';

const PRIMARY_COLOR = '#10367D';
const MIN_WITHDRAWAL = 50000;

const SUPPORTED_BANKS = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)' },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)' },
  { code: 'MANDIRI', name: 'Bank Mandiri' },
  { code: 'PERMATA', name: 'Bank Permata' },
  { code: 'CIMB', name: 'CIMB Niaga' },
  { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)' },
  { code: 'DANAMON', name: 'Bank Danamon' },
  { code: 'BTPN', name: 'Bank BTPN / Jenius' },
];

const STATUS_LABEL = {
  scheduled: 'Menunggu Keberangkatan',
  in_origin_pos: 'Di Pos Asal',
  in_transit: 'Dalam Perjalanan (Escrow Hold)',
  arrived_dest_pos: 'Tiba di Pos Tujuan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const formatRupiah = (value) => `Rp ${Math.max(0, Math.round(value || 0)).toLocaleString('id-ID')}`;

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getMitraTransactionMeta = (row) => {
  const desc = (row.description || '').toLowerCase();
  const type = (row.type || '').toLowerCase();

  if (type === 'credit') {
    if (desc.includes('top up') || desc.includes('topup')) {
      return {
        label: 'Top Up Saldo',
        description: row.description || 'Top Up Saldo Dompet Mitra',
        isPositive: true,
        badgeVariant: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBg: 'bg-blue-100 text-blue-600',
        Icon: ArrowDownLeft,
        filterCategory: 'topup',
      };
    }

    if (desc.includes('refund') || desc.includes('pengembalian')) {
      return {
        label: 'Pengembalian Dana',
        description: row.description || 'Pengembalian Dana / Penyesuaian Saldo',
        isPositive: true,
        badgeVariant: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBg: 'bg-blue-100 text-blue-600',
        Icon: RotateCcw,
        filterCategory: 'other',
      };
    }

    return {
      label: 'Pendapatan Komisi',
      description: row.description || 'Pencairan Komisi Perjalanan',
      isPositive: true,
      badgeVariant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-600',
      Icon: TrendingUp,
      filterCategory: 'income',
    };
  }

  if (type === 'debit') {
    return {
      label: 'Penarikan Saldo',
      description: row.description || 'Pencairan ke Rekening Bank',
      isPositive: false,
      badgeVariant: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-100 text-blue-600',
      Icon: ArrowUpRight,
      filterCategory: 'withdraw',
    };
  }

  if (type === 'escrow_hold') {
    return {
      label: 'Dana Escrow Ditahan',
      description: row.description || 'Dana perjalanan ditahan sementara di sistem escrow',
      isPositive: false,
      badgeVariant: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-600',
      Icon: ShieldCheck,
      filterCategory: 'escrow',
    };
  }

  if (type === 'escrow_release') {
    return {
      label: 'Pencairan Auto-Escrow',
      description: row.description || 'Pencairan dana escrow perjalanan selesai ke saldo utama',
      isPositive: true,
      badgeVariant: 'bg-teal-50 text-teal-700 border-teal-200',
      iconBg: 'bg-teal-100 text-teal-600',
      Icon: TrendingUp,
      filterCategory: 'escrow',
    };
  }

  if (type === 'payment') {
    return {
      label: 'Pembayaran / Potongan',
      description: row.description || 'Pemotongan Biaya Operasional / Pembayaran',
      isPositive: false,
      badgeVariant: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-100 text-rose-600',
      Icon: Ticket,
      filterCategory: 'other',
    };
  }

  return {
    label: row.type || 'Mutasi Keuangan',
    description: row.description || '-',
    isPositive: Number(row.amount) > 0,
    badgeVariant: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    iconBg: 'bg-neutral-100 text-neutral-600',
    Icon: Receipt,
    filterCategory: 'other',
  };
};

export default function MitraBalance() {
  const toast = useToast();
  const location = useLocation();

  // Saldo & Dompet
  const [availableBalance, setAvailableBalance] = useState(0);
  const [escrowHold, setEscrowHold] = useState(0);
  const [walletHistory, setWalletHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter Mutasi Transaksi
  const [activeFilter, setActiveFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 5;

  // Escrow Trips Berjalan
  const [escrowTransactions, setEscrowTransactions] = useState([]);
  const [escrowPage, setEscrowPage] = useState(1);
  const [escrowLimit, setEscrowLimit] = useState(5);
  const [totalEscrowPages, setTotalEscrowPages] = useState(1);
  const [totalEscrowItems, setTotalEscrowItems] = useState(0);

  // Rekening Bank Mitra
  const [bankInfo, setBankInfo] = useState({
    bankName: 'BCA',
    accountNumber: '',
    accountHolder: '',
  });
  const [showAccountPii, setShowAccountPii] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankDraft, setBankDraft] = useState(bankInfo);
  const [isSavingBank, setIsSavingBank] = useState(false);

  // State Penarikan (Withdrawal)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // State Top Up Saldo
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  const calculateTripEscrowAmount = (trip) => {
    if (trip.totalEscrow !== undefined) return Number(trip.totalEscrow);
    if (trip.price !== undefined && !Array.isArray(trip.orders)) return Number(trip.price);

    if (Array.isArray(trip.orders) && trip.orders.length > 0) {
      return trip.orders.reduce((sum, order) => {
        if (order.status !== 'cancelled') {
          return sum + Number(order.totalPrice || order.price || 0);
        }
        return sum;
      }, 0);
    }

    return Number(trip.price || 0);
  };

  const fetchWalletData = useCallback(async (shouldSync = true) => {
    try {
      setIsLoading(true);

      if (shouldSync) {
        await walletService.syncTopUp().catch(() => null);
      }

      const [userRes, walletRes, tripsRes] = await Promise.all([
        apiClient.get('/auth/me').catch(() => ({ data: null })),
        apiClient.get('/wallets/me').catch(() => ({ data: null })),
        apiClient.get('/trips/me', {
          params: {
            page: escrowPage,
            limit: escrowLimit,
            activeEscrow: 'true',
          },
        }).catch(() => ({ data: null })),
      ]);

      if (userRes?.data) {
        const userData = userRes.data;
        const bName = userData.bankName || userData.profile?.bankName || 'BCA';
        const accNum = userData.bankAccountNumber || userData.profile?.bankAccountNumber || '';
        const accHold = userData.bankAccountHolder || userData.profile?.bankAccountHolder || userData.name || '';

        const initialBank = { bankName: bName, accountNumber: accNum, accountHolder: accHold };
        setBankInfo(initialBank);
        setBankDraft(initialBank);
      }

      if (walletRes?.data) {
        setAvailableBalance(Number(walletRes.data.balance || 0));
        setEscrowHold(Number(walletRes.data.heldEscrowBalance || 0));

        if (walletRes.data.transactions) {
          setWalletHistory(walletRes.data.transactions);
        }
      }

      if (tripsRes?.data) {
        const allTrips = Array.isArray(tripsRes.data)
          ? tripsRes.data
          : tripsRes.data.data || [];

        setEscrowTransactions(allTrips);

        if (tripsRes.data.meta) {
          setTotalEscrowPages(tripsRes.data.meta.totalPages || 1);
          setTotalEscrowItems(tripsRes.data.meta.total || 0);
        } else {
          setTotalEscrowPages(1);
          setTotalEscrowItems(allTrips.length);
        }
      }
    } catch (error) {
      console.error('Gagal memuat data keuangan mitra:', error);
      toast.error('Gagal menyinkronkan data keuangan dari server.', { title: 'Kesalahan' });
    } finally {
      setIsLoading(false);
    }
  }, [escrowPage, escrowLimit, toast]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await walletService.syncTopUp();
      if (res?.syncedCount > 0) {
        toast.success(res.message, { title: 'Sinkronisasi Berhasil' });
      } else {
        toast.info('Saldo Anda sudah tersinkronkan dengan status pembayaran dan escrow terbaru.', {
          title: 'Status Terkini',
        });
      }
      await fetchWalletData(false);
    } catch (err) {
      console.error('Gagal sinkronisasi dompet:', err);
      toast.error('Gagal menghubungkan ke gateway pembayaran.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchWalletData(true);

    const query = new URLSearchParams(location.search);
    if (query.get('topup') === 'success') {
      toast.success('Pembayaran Top Up Anda berhasil disinkronkan ke saldo dompet mitra!', {
        title: 'Top Up Berhasil',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search, fetchWalletData]);

  const maskAccountNumber = (accNum) => {
    if (!accNum || accNum.length < 6) return accNum || '-';
    return `${accNum.slice(0, 3)}****${accNum.slice(-3)}`;
  };

  const handleStartEditBank = () => {
    setBankDraft(bankInfo);
    setIsBankModalOpen(true);
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();

    if (
      !bankDraft.bankName.trim() ||
      !bankDraft.accountNumber.trim() ||
      !bankDraft.accountHolder.trim()
    ) {
      toast.warning('Semua kolom rekening bank wajib diisi.', { title: 'Data Tidak Lengkap' });
      return;
    }

    if (bankDraft.accountNumber.trim().length < 8) {
      toast.warning('Nomor rekening bank minimal 8 digit (maks. 18 digit).', { title: 'Rekening Tidak Valid' });
      return;
    }

    setIsSavingBank(true);
    try {
      await apiClient.patch('/users/me/profile', {
        bankName: bankDraft.bankName,
        bankAccountNumber: bankDraft.accountNumber,
        bankAccountHolder: bankDraft.accountHolder,
      });

      setBankInfo(bankDraft);
      setIsBankModalOpen(false);
      toast.success('Informasi rekening bank berhasil diperbarui.', { title: 'Rekening Diperbarui' });
    } catch (error) {
      console.error('Gagal memperbarui rekening bank:', error);
      toast.error(
        error.response?.data?.message || 'Gagal memperbarui informasi rekening bank.',
        { title: 'Kesalahan' }
      );
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleOpenWithdrawModal = () => {
    if (!bankInfo.bankName || !bankInfo.accountNumber) {
      toast.warning('Silakan atur rekening bank tujuan pencairan terlebih dahulu.', {
        title: 'Rekening Belum Diatur',
      });
      handleStartEditBank();
      return;
    }
    setWithdrawAmount('');
    setIsWithdrawModalOpen(true);
  };

  const handleSetQuickWithdraw = (type) => {
    if (type === 'max') {
      setWithdrawAmount(String(availableBalance));
    } else {
      setWithdrawAmount(String(type));
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (!amount || amount < MIN_WITHDRAWAL) {
      toast.warning(
        `Penarikan saldo minimal adalah Rp ${MIN_WITHDRAWAL.toLocaleString('id-ID')}.`,
        { title: 'Batas Penarikan Minimal' }
      );
      return;
    }

    if (amount > availableBalance) {
      toast.warning(
        'Jumlah penarikan melebihi Saldo Yang Dapat Ditarik.',
        { title: 'Saldo Tidak Mencukupi' }
      );
      return;
    }

    setIsWithdrawing(true);
    try {
      await walletService.withdrawWallet(amount);
      setWithdrawAmount('');
      setIsWithdrawModalOpen(false);
      setIsSuccessModalOpen(true);
      await fetchWalletData(false);
    } catch (error) {
      console.error('Gagal memproses penarikan:', error);
      if (error.response?.status === 503) {
        toast.warning(
          'Penarikan dana sementara dinonaktifkan. Silakan coba lagi nanti.',
          { title: 'Fitur Dinonaktifkan' }
        );
      } else {
        toast.error(
          error.response?.data?.message || 'Penarikan saldo gagal diproses.',
          { title: 'Gagal' }
        );
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(topUpAmount);

    if (!topUpAmount || isNaN(amount) || amount < 10000) {
      toast.warning('Minimal top up saldo adalah Rp 10.000.', {
        title: 'Nominal Kurang',
      });
      return;
    }

    setIsTopUpLoading(true);
    try {
      const response = await walletService.topUpWallet(amount);

      if (response && response.invoiceUrl) {
        toast.info('Mengarahkan ke halaman pembayaran resmi Xendit...', {
          title: 'Invoice Dibuat',
        });
        window.location.href = response.invoiceUrl;
      } else {
        toast.success(
          response.message || 'Permintaan top up berhasil dibuat.',
          { title: 'Berhasil' }
        );
        setIsTopUpModalOpen(false);
        setTopUpAmount('');
        await fetchWalletData(false);
      }
    } catch (err) {
      console.error('Gagal membuat invoice top up:', err);
      toast.error(
        err.response?.data?.message || 'Gagal membuat invoice top up.',
        { title: 'Top Up Gagal' }
      );
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const list = walletHistory || [];
    if (activeFilter === 'all') return list;

    return list.filter((row) => {
      const meta = getMitraTransactionMeta(row);
      return meta.filterCategory === activeFilter;
    });
  }, [walletHistory, activeFilter]);

  const totalTxPages = Math.ceil(filteredTransactions.length / TX_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * TX_PER_PAGE;
    return filteredTransactions.slice(start, start + TX_PER_PAGE);
  }, [filteredTransactions, txPage]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── KARTU SALDO DOMPET MITRA UTAMA ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2353] via-[#10367D] to-[#1c4e9e] p-6 sm:p-8 text-white shadow-xl border border-blue-400/20">
        {/* Dekorasi Aksen Lingkaran Glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-6 rounded bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 shadow-inner flex items-center justify-center">
                <div className="w-5 h-3 border border-amber-600/40 rounded-xs" />
              </div>
              <span className="text-xs font-mono tracking-widest text-blue-200 font-bold uppercase">
                DOMPET MITRA UTAMA
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Aktif & Terproteksi
              </span>
              <button
                onClick={handleManualSync}
                disabled={isSyncing || isLoading}
                title="Sinkronkan Saldo"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur text-blue-100 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ml-auto sm:ml-0"
              >
                <RefreshCw className={`w-3 h-3 text-accent ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                Total Saldo Dapat Ditarik
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1">
                {isLoading ? '...' : formatRupiah(availableBalance)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs text-blue-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Saldo Siap Dicairkan
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs text-blue-100">
                <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                Pencairan Otomatis via Auto-Escrow
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleOpenWithdrawModal}
              disabled={isLoading || availableBalance < MIN_WITHDRAWAL}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-950/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>Tarik Saldo</span>
            </button>

            <button
              onClick={() => {
                setTopUpAmount('');
                setIsTopUpModalOpen(true);
              }}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Top Up Saldo</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── KARTU ESCROW & REKENING PENCAIRAN ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Kartu Saldo Escrow */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Sistem Auto-Escrow
              </span>
              <h3 className="text-[16px] font-bold text-neutral-800">
                Saldo Tertahan (Escrow Hold)
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0 border border-amber-200/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
              {isLoading ? '...' : formatRupiah(escrowHold)}
            </div>
            <p className="text-[12px] text-neutral-500 mt-1">
              Pendapatan dari perjalanan dan titipan barang yang sedang aktif. Otomatis masuk ke saldo utama Anda begitu verifikasi pos tujuan selesai.
            </p>
          </div>
        </div>

        {/* Kartu Rekening Pencairan */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Rekening Penerima
                </span>
                {bankInfo.bankName && bankInfo.accountNumber ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Belum Diatur
                  </span>
                )}
              </div>
              <h3 className="text-[16px] font-bold text-neutral-800">
                Rekening Pencairan Bank Mitra
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0 border border-blue-200/60">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div>
            {bankInfo.bankName && bankInfo.accountNumber ? (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-neutral-900">
                      Bank {bankInfo.bankName} - {showAccountPii ? bankInfo.accountNumber : maskAccountNumber(bankInfo.accountNumber)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAccountPii(!showAccountPii)}
                      className="text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                      title={showAccountPii ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showAccountPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[12px] text-neutral-500">
                    a.n {bankInfo.accountHolder || 'Mitra'}
                  </p>
                </div>
                <button
                  onClick={handleStartEditBank}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3" /> Ubah
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-neutral-500">
                  Lengkapi rekening bank Anda agar dapat menarik pendapatan perjalanan kapan saja dengan aman.
                </p>
                <button
                  onClick={handleStartEditBank}
                  className="px-3.5 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[12px] font-bold rounded-xl transition cursor-pointer shrink-0 shadow-sm"
                >
                  Atur Rekening
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── RINCIAN DANA ESCROW AKTIF (PERJALANAN BERJALAN) ──────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-neutral-900">
                Perjalanan & Dana Escrow Aktif
              </h3>
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200">
                {totalEscrowItems} Trip Berjalan
              </span>
            </div>
            <p className="text-[12px] text-neutral-400 mt-0.5">
              Daftar trip yang sedang menahan dana escrow dan akan dicairkan saat verifikasi pos tujuan.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-neutral-400 font-medium">Tampilkan:</span>
            <select
              value={escrowLimit}
              onChange={(e) => {
                setEscrowLimit(Number(e.target.value));
                setEscrowPage(1);
              }}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 font-bold text-neutral-700 focus:outline-none"
            >
              <option value={5}>5 per halaman</option>
              <option value={10}>10 per halaman</option>
              <option value={20}>20 per halaman</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] text-neutral-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-3">ID Trip</th>
                <th className="py-3 px-3">Rute Perjalanan</th>
                <th className="py-3 px-3">Nilai Escrow</th>
                <th className="py-3 px-3">Status Sistem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-400">
                    <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    Memuat data escrow...
                  </td>
                </tr>
              ) : escrowTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-400 font-medium">
                    Tidak ada dana escrow perjalanan yang sedang tertahan saat ini.
                  </td>
                </tr>
              ) : (
                escrowTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3.5 px-3 font-bold text-neutral-900 font-mono">
                      #{tx.id}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-neutral-700">
                      {tx.originPoint?.name || '-'} → {tx.destinationPoint?.name || '-'}
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-neutral-900 font-mono">
                      {formatRupiah(calculateTripEscrowAmount(tx))}
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge variant="amber">
                        {STATUS_LABEL[tx.status] ?? tx.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalEscrowItems > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-[12px] text-neutral-500">
            <span>
              Halaman <strong>{escrowPage}</strong> dari <strong>{totalEscrowPages}</strong> ({totalEscrowItems} data)
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={escrowPage <= 1 || isLoading}
                onClick={() => setEscrowPage((prev) => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={escrowPage >= totalEscrowPages || isLoading}
                onClick={() => setEscrowPage((prev) => Math.min(prev + 1, totalEscrowPages))}
                className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── RIWAYAT MUTASI SALDO ──────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Riwayat Mutasi Saldo & Komisi
            </h3>
            <p className="text-[12px] text-neutral-400">
              Menampilkan seluruh riwayat pendapatan komisi, pencairan saldo, dan mutasi escrow akun Anda.
            </p>
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'income', label: 'Komisi / Pendapatan' },
              { id: 'withdraw', label: 'Penarikan' },
              { id: 'escrow', label: 'Escrow' },
              { id: 'topup', label: 'Top Up' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveFilter(tab.id); setTxPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Transaksi Modern */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <span className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-neutral-400 font-medium">Memuat riwayat mutasi keuangan...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <>
            <div className="divide-y divide-neutral-100">
            {paginatedTransactions.map((tx) => {
              const meta = getMitraTransactionMeta(tx);
              const Icon = meta.Icon;

              return (
                <div
                  key={tx.id}
                  className="py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/70 px-2 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-neutral-900 truncate">
                          {meta.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeVariant}`}>
                          {tx.type}
                        </span>
                      </div>
                      <p className="text-[12px] text-neutral-500 truncate mt-0.5">
                        {meta.description}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {formatDate(tx.createdAt)} • ID #{tx.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[15px] sm:text-[16px] font-extrabold font-mono ${
                        meta.isPositive ? 'text-emerald-600' : 'text-neutral-900'
                      }`}
                    >
                      {meta.isPositive ? '+' : '-'} {formatRupiah(Math.abs(Number(tx.amount)))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTransactions.length > TX_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 text-[12px] text-neutral-500">
              <span>
                Halaman <strong>{txPage}</strong> dari <strong>{totalTxPages}</strong> ({filteredTransactions.length} transaksi)
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={txPage <= 1}
                  onClick={() => setTxPage((prev) => Math.max(prev - 1, 1))}
                  className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  disabled={txPage >= totalTxPages}
                  onClick={() => setTxPage((prev) => Math.min(prev + 1, totalTxPages))}
                  className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="py-14 text-center space-y-2">
            <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto text-neutral-400">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-[14px] font-bold text-neutral-800">Tidak Ada Transaksi</h4>
            <p className="text-[12px] text-neutral-400 max-w-sm mx-auto">
              Belum ada riwayat mutasi pada kategori yang dipilih.
            </p>
          </div>
        )}
      </div>

      {/* ──────────────── MODAL TARIK SALDO ──────────────── */}
      <BaseModal
        isOpen={isWithdrawModalOpen}
        onClose={() => { if (!isWithdrawing) setIsWithdrawModalOpen(false); }}
        title="Tarik Saldo Komisi"
        subtitle="Cairkan saldo pendapatan perjalanan langsung ke rekening bank Anda"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
              Rekening Tujuan Pencairan
            </label>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-neutral-500" />
                <div>
                  <p className="text-[12px] font-bold text-neutral-800">
                    Bank {bankInfo.bankName} - {bankInfo.accountNumber}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    a.n {bankInfo.accountHolder || 'Mitra'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  handleStartEditBank();
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Ubah
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
              Saldo Siap Ditarik
            </label>
            <div className="text-[20px] font-bold text-neutral-800 font-mono">
              {formatRupiah(availableBalance)}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-neutral-400 uppercase">
                Jumlah Penarikan (Rp)
              </label>
              <div className="flex items-center gap-1">
                {[50000, 100000, 250000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => handleSetQuickWithdraw(nominal)}
                    className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-bold rounded cursor-pointer transition"
                  >
                    {nominal / 1000}rb
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSetQuickWithdraw('max')}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded cursor-pointer transition"
                >
                  Semua
                </button>
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ''))}
              placeholder={`Minimal Rp ${MIN_WITHDRAWAL.toLocaleString('id-ID')}`}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none focus:border-blue-500 shadow-sm font-mono"
              disabled={isWithdrawing}
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Minimal penarikan: Rp {MIN_WITHDRAWAL.toLocaleString('id-ID')}
            </p>
          </div>

          {withdrawAmount && Number(withdrawAmount) > availableBalance && (
            <div className="flex items-start gap-2 text-rose-600 text-[12px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Jumlah penarikan melebihi saldo tersedia.</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(false)}
              disabled={isWithdrawing}
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[13px] font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                isWithdrawing ||
                !withdrawAmount ||
                Number(withdrawAmount) < MIN_WITHDRAWAL ||
                Number(withdrawAmount) > availableBalance
              }
              className="flex-1 py-2.5 text-white text-[13px] font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isWithdrawing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  Cairkan Sekarang
                </>
              )}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* ──────────────── MODAL ATUR / EDIT REKENING BANK ──────────────── */}
      <BaseModal
        isOpen={isBankModalOpen}
        onClose={() => { if (!isSavingBank) setIsBankModalOpen(false); }}
        title="Atur Rekening Pencairan Bank"
        subtitle="Masukkan rincian rekening bank pribadi Anda untuk menerima pencairan komisi"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveBank} className="space-y-3.5 text-[13px]">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Pilih Bank <span className="text-rose-500">*</span>
            </label>
            <select
              value={bankDraft.bankName}
              onChange={(e) => setBankDraft((prev) => ({ ...prev, bankName: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-bold text-neutral-800 focus:outline-none focus:border-blue-500"
            >
              {SUPPORTED_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase">
                Nomor Rekening <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-neutral-400 font-medium">
                {bankDraft.accountNumber.length}/18
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={18}
              value={bankDraft.accountNumber}
              onChange={(e) =>
                setBankDraft((prev) => ({
                  ...prev,
                  accountNumber: e.target.value.replace(/\D/g, '').slice(0, 18),
                }))
              }
              placeholder="Contoh: 1234567890"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-mono font-bold text-neutral-800 focus:outline-none focus:border-blue-500"
            />
            {bankDraft.accountNumber && bankDraft.accountNumber.length < 8 ? (
              <p className="text-[11px] text-rose-500 mt-1">
                Nomor rekening minimal 8 digit (maks. 18 digit).
              </p>
            ) : (
              <p className="text-[11px] text-neutral-400 mt-1">
                Hanya angka, 8–18 digit
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Nama Pemilik Rekening <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={bankDraft.accountHolder}
              onChange={(e) =>
                setBankDraft((prev) => ({ ...prev, accountHolder: e.target.value }))
              }
              placeholder="Sesuai nama di buku tabungan / rekening"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-bold text-neutral-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={isSavingBank}
              onClick={() => setIsBankModalOpen(false)}
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[12px] font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingBank}
              className="flex-1 py-2.5 text-white text-[12px] font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSavingBank ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Simpan Rekening
            </button>
          </div>
        </form>
      </BaseModal>

      {/* ──────────────── MODAL TOP UP SALDO ──────────────── */}
      <BaseModal
        isOpen={isTopUpModalOpen}
        onClose={() => { if (!isTopUpLoading) setIsTopUpModalOpen(false); }}
        title="Top Up Saldo Dompet Mitra"
        subtitle="Tambah saldo dompet mitra Anda melalui Virtual Account Bank atau QRIS resmi Xendit"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTopUpSubmit} className="space-y-4">
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
            <span className="text-[12px] font-bold text-neutral-500">Saldo Saat Ini</span>
            <span className="text-[18px] font-bold text-neutral-900 font-mono">
              {formatRupiah(availableBalance)}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-2">
              Pilih Nominal Instan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[20000, 50000, 100000, 200000, 500000, 1000000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() => setTopUpAmount(String(nominal))}
                  className={`py-2.5 px-2 border rounded-xl text-[12px] font-bold transition text-center cursor-pointer ${
                    Number(topUpAmount) === nominal
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-2xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {formatRupiah(nominal)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
              Atau Masukkan Nominal Kustom
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-neutral-400 font-bold text-[13px]">
                Rp
              </span>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Minimal 10.000"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] font-bold text-neutral-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                disabled={isTopUpLoading}
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Minimal pengisian saldo adalah Rp 10.000.
            </p>
          </div>

          {topUpAmount && Number(topUpAmount) >= 10000 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-[12px]">
              <span className="text-emerald-800 font-medium">Estimasi Saldo Baru:</span>
              <span className="font-bold font-mono text-emerald-700">
                {formatRupiah(Number(availableBalance) + Number(topUpAmount))}
              </span>
            </div>
          )}

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 space-y-1.5">
            <p className="font-bold text-neutral-700">Metode Pembayaran Resmi Xendit:</p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-700">
                BCA VA
              </span>
              <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-700">
                BNI VA
              </span>
              <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-700">
                BRI VA
              </span>
              <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-semibold text-neutral-700">
                Mandiri VA
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-bold text-emerald-700">
                QRIS (GoPay, OVO, Dana, ShopeePay)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTopUpModalOpen(false)}
              disabled={isTopUpLoading}
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[13px] font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isTopUpLoading || !topUpAmount || Number(topUpAmount) < 10000}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isTopUpLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyiapkan Invoice...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Lanjut Bayar
                </>
              )}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* ──────────────── MODAL SUKSES PENARIKAN ──────────────── */}
      <BaseModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Penarikan Berhasil Diajukan"
        subtitle="Pencairan Pendapatan Komisi Mitra"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-3.5 text-[13px] py-1">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200/60">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 text-[15px]">Pengajuan Penarikan Diterima</h4>
            <p className="text-neutral-500 text-[12px] mt-1 leading-relaxed">
              Permintaan penarikan saldo Anda telah berhasil diajukan dan sedang diproses ke rekening bank terdaftar:
              <br />
              <strong className="text-neutral-800">Bank {bankInfo.bankName} - {bankInfo.accountNumber}</strong>
            </p>
          </div>

          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="w-full py-2.5 text-white font-bold rounded-xl transition cursor-pointer shadow-sm"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            Selesai
          </button>
        </div>
      </BaseModal>
    </div>
  );
}
