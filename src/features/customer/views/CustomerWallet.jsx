import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpRight, 
  ArrowDownLeft,
  AlertCircle,
  Building2,
  CreditCard,
  CheckCircle2,
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
  RotateCcw
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';
import { walletService } from '../../../services/walletService';

const PRIMARY_COLOR = '#10367D';
const MIN_WITHDRAW_AMOUNT = 10000;

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

const getTransactionMeta = (row) => {
  if (row.type === 'payment') {
    return {
      label: 'Pembayaran Tiket',
      description: row.orderId ? `Tiket Perjalanan #${row.orderId}` : (row.description || 'Pembayaran Tiket'),
      isPositive: false,
      badgeVariant: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-100 text-rose-600',
      Icon: Ticket,
      filterCategory: 'payment',
    };
  }

  if (row.type === 'credit') {
    const isTopUp = row.description?.toLowerCase().includes('top up');
    const isRefund = row.orderId || row.description?.toLowerCase().includes('refund');

    if (isTopUp) {
      return {
        label: 'Top Up Saldo',
        description: row.description || 'Top Up Saldo Dompet',
        isPositive: true,
        badgeVariant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconBg: 'bg-emerald-100 text-emerald-600',
        Icon: ArrowDownLeft,
        filterCategory: 'topup',
      };
    }

    if (isRefund) {
      return {
        label: 'Pengembalian Dana',
        description: row.orderId ? `Refund Order #${row.orderId}` : (row.description || 'Pengembalian Dana'),
        isPositive: true,
        badgeVariant: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBg: 'bg-blue-100 text-blue-600',
        Icon: RotateCcw,
        filterCategory: 'refund',
      };
    }

    return {
      label: 'Pemasukan',
      description: row.description || 'Kredit Saldo',
      isPositive: true,
      badgeVariant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-600',
      Icon: ArrowDownLeft,
      filterCategory: 'other',
    };
  }

  if (row.type === 'debit') {
    return {
      label: 'Penarikan Saldo',
      description: row.description || 'Penarikan ke Rekening Bank',
      isPositive: false,
      badgeVariant: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-100 text-blue-600',
      Icon: ArrowUpRight,
      filterCategory: 'withdraw',
    };
  }

  if (row.type === 'escrow_hold') {
    return {
      label: 'Escrow Ditahan',
      description: row.description || 'Dana ditahan untuk pesanan aktif',
      isPositive: false,
      badgeVariant: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-600',
      Icon: ShieldCheck,
      filterCategory: 'escrow',
    };
  }

  if (row.type === 'escrow_release') {
    return {
      label: 'Pencairan Escrow',
      description: row.description || 'Dana pesanan dicairkan ke saldo',
      isPositive: true,
      badgeVariant: 'bg-teal-50 text-teal-700 border-teal-200',
      iconBg: 'bg-teal-100 text-teal-600',
      Icon: TrendingUp,
      filterCategory: 'escrow',
    };
  }

  return {
    label: row.type,
    description: row.description || '-',
    isPositive: false,
    badgeVariant: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    iconBg: 'bg-neutral-100 text-neutral-600',
    Icon: Receipt,
    filterCategory: 'other',
  };
};

export default function CustomerWallet() {
  const toast = useToast();
  const location = useLocation();

  const [wallet, setWallet] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter Transaksi
  const [activeFilter, setActiveFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 5;

  // State Top Up
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  // State Penarikan
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // State Rekening Bank
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  const loadData = async (shouldSync = true) => {
    setIsLoading(true);
    try {
      if (shouldSync) {
        // Otomatis sinkronkan invoice yang sudah dibayar di Xendit
        await walletService.syncTopUp().catch(() => null);
      }

      const [walletData, meRes] = await Promise.all([
        walletService.getMyWallet(),
        apiClient.get('/auth/me').catch(() => ({ data: null })),
      ]);

      setWallet(walletData);
      if (meRes?.data) {
        setUserProfile(meRes.data);
        setBankName(meRes.data.bankName || 'BCA');
        setBankAccountNumber(meRes.data.bankAccountNumber || '');
        setBankAccountHolder(meRes.data.bankAccountHolder || meRes.data.name || '');
      }
    } catch (err) {
      console.error('Gagal memuat data dompet:', err);
      toast.error('Gagal memuat data dompet. Silakan refresh halaman.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await walletService.syncTopUp();
      if (res?.syncedCount > 0) {
        toast.success(res.message, { title: 'Sinkronisasi Berhasil' });
      } else {
        toast.info('Saldo Anda sudah tersinkronkan dengan status pembayaran terbaru.', {
          title: 'Status Terkini',
        });
      }
      const updatedWallet = await walletService.getMyWallet();
      setWallet(updatedWallet);
    } catch (err) {
      console.error('Gagal sinkronisasi dompet:', err);
      toast.error('Gagal menghubungkan ke gateway pembayaran.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const query = new URLSearchParams(location.search);
    if (query.get('topup') === 'success') {
      toast.success('Pembayaran Top Up Anda berhasil disinkronkan ke saldo dompet!', {
        title: 'Top Up Berhasil',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search]);

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(topUpAmount);

    if (!topUpAmount || isNaN(amount) || amount < 10000) {
      toast.warning('Minimal top up saldo adalah Rp 10.000.', {
        title: 'Nominal Tidak Valid',
      });
      return;
    }

    setIsTopUpLoading(true);
    try {
      const res = await walletService.topUpWallet(amount);
      if (res.invoiceUrl) {
        toast.info('Mengarahkan ke gateway pembayaran aman Xendit...', {
          title: 'Invoice Dibuat',
        });
        setIsTopUpModalOpen(false);
        setTopUpAmount('');
        window.location.href = res.invoiceUrl;
      } else {
        toast.error('Gagal mendapatkan tautan pembayaran invoice.');
      }
    } catch (err) {
      console.error('Gagal membuat invoice top up:', err);
      const errMsg = err.response?.data?.message || err.message || 'Gagal memproses top up saldo.';
      toast.error(errMsg, { title: 'Top Up Gagal' });
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const handleOpenWithdrawModal = () => {
    if (!wallet || wallet.balance < MIN_WITHDRAW_AMOUNT) {
      toast.warning(
        `Saldo Anda kurang dari minimal penarikan Rp ${MIN_WITHDRAW_AMOUNT.toLocaleString('id-ID')}.`,
        { title: 'Saldo Tidak Cukup' }
      );
      return;
    }
    setWithdrawAmount('');
    setIsEditingBank(!userProfile?.bankName || !userProfile?.bankAccountNumber);
    setIsWithdrawModalOpen(true);
  };

  const handleSaveBankAccount = async (e) => {
    if (e) e.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      toast.warning('Silakan lengkapi semua kolom rekening bank.');
      return;
    }

    setIsSavingBank(true);
    try {
      await apiClient.put('/users/me/profile', {
        bankName: bankName.trim().toUpperCase(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      });

      setUserProfile((prev) => ({
        ...prev,
        bankName: bankName.trim().toUpperCase(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      }));

      setIsEditingBank(false);
      toast.success('Informasi rekening bank berhasil disimpan!', {
        title: 'Rekening Tersimpan',
      });
    } catch (err) {
      console.error('Gagal menyimpan rekening:', err);
      const errMsg = err.response?.data?.message || err.message || 'Gagal menyimpan rekening bank.';
      toast.error(errMsg, { title: 'Gagal' });
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSetQuickWithdraw = (nominal) => {
    if (nominal === 'max') {
      setWithdrawAmount(String(Math.floor(wallet?.balance || 0)));
    } else {
      setWithdrawAmount(String(nominal));
    }
  };

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    if (!wallet) return;

    if (!userProfile?.bankName || !userProfile?.bankAccountNumber) {
      toast.warning('Silakan lengkapi informasi rekening bank tujuan terlebih dahulu.', {
        title: 'Rekening Belum Diatur',
      });
      setIsEditingBank(true);
      return;
    }

    const amount = Number(withdrawAmount);

    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      toast.warning('Masukkan jumlah penarikan yang valid.');
      return;
    }

    if (amount < MIN_WITHDRAW_AMOUNT) {
      toast.warning(
        `Minimal penarikan adalah Rp ${MIN_WITHDRAW_AMOUNT.toLocaleString('id-ID')}.`
      );
      return;
    }

    if (amount > wallet.balance) {
      toast.warning('Saldo Anda tidak mencukupi untuk penarikan ini.');
      return;
    }

    setIsWithdrawing(true);

    try {
      const result = await walletService.withdrawWallet(amount);

      toast.success(result.message || 'Penarikan saldo berhasil diproses!', {
        title: 'Berhasil',
      });

      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');

      await loadData(false);
    } catch (err) {
      console.error('Gagal menarik saldo:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Gagal menarik saldo. Pastikan rekening bank Anda sudah terisi.';
      toast.error(errorMessage, { title: 'Penarikan Gagal' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const list = wallet?.transactions || [];
    if (activeFilter === 'all') return list;

    return list.filter((row) => {
      const meta = getTransactionMeta(row);
      return meta.filterCategory === activeFilter;
    });
  }, [wallet?.transactions, activeFilter]);

  const totalTxPages = Math.ceil(filteredTransactions.length / TX_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * TX_PER_PAGE;
    return filteredTransactions.slice(start, start + TX_PER_PAGE);
  }, [filteredTransactions, txPage]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ──────────────── HEADER ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-brand-700 border border-blue-200">
              <Wallet className="w-3 h-3 text-brand-600" />
              NEBENG PAY
            </span>
            <span className="text-[12px] text-neutral-600 font-medium">Dompet Digital Terintegrasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Dompet Saya
          </h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">
            Kelola saldo, lakukan top up instan, penarikan dana, dan pantau seluruh mutasi transaksi Anda.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing || isLoading}
          className="self-start sm:self-center px-3.5 py-2 rounded-xl text-[12px] font-bold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 shadow-sm flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Saldo'}</span>
        </button>
      </div>

      {/* ──────────────── HERO CARD SALDO UTAMA & ACTIONS ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2353] via-[#10367D] to-[#1c4e9e] p-6 sm:p-8 text-white shadow-xl border border-blue-400/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-blue-200">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[12px] tracking-wider text-blue-100 font-bold uppercase">
                DOMPET UTAMA
              </span>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-blue-200 uppercase tracking-wider">
                Total Saldo Tersedia
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5">
                {isLoading ? '...' : formatRupiah(wallet?.balance || 0)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[12px] text-blue-100/90 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Saldo Aktif & Dilindungi
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                Terhubung ke Gateway Xendit
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setTopUpAmount('');
                setIsTopUpModalOpen(true);
              }}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[13px] rounded-2xl shadow-lg shadow-emerald-950/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              Top Up Saldo
            </button>

            <button
              onClick={handleOpenWithdrawModal}
              disabled={isLoading || !wallet || wallet.balance < MIN_WITHDRAW_AMOUNT}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-[13px] rounded-2xl border border-white/20 shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              Tarik Saldo
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
                Sistem Penahanan
              </span>
              <h3 className="text-[16px] font-bold text-neutral-800">
                Saldo Escrow (Ditahan)
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0 border border-amber-200/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
              {isLoading ? '...' : formatRupiah(wallet?.heldEscrowBalance || 0)}
            </div>
            <p className="text-[12px] text-neutral-500 mt-1">
              Dana dalam proses order perjalanan atau titip barang yang sedang aktif. Dana ini otomatis dicairkan setelah trip diselesaikan.
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
                {userProfile?.bankName && userProfile?.bankAccountNumber ? (
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
                Pencairan Dana Rekening
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0 border border-blue-200/60">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div>
            {userProfile?.bankName && userProfile?.bankAccountNumber ? (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-neutral-900">
                    Bank {userProfile.bankName} - {userProfile.bankAccountNumber}
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    a.n {userProfile.bankAccountHolder || userProfile.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingBank(true);
                    setIsWithdrawModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3" /> Ubah
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-neutral-500">
                  Lengkapi rekening bank Anda agar dapat menarik saldo dompet langsung ke rekening pribadi kapan saja.
                </p>
                <button
                  onClick={() => {
                    setIsEditingBank(true);
                    setIsWithdrawModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-xl transition cursor-pointer shrink-0 shadow-sm"
                >
                  Atur Rekening
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── RIWAYAT MUTASI TRANSAKSI ──────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Riwayat Mutasi Saldo
            </h3>
            <p className="text-[12px] text-neutral-400">
              Menampilkan seluruh riwayat transaksi top up, pembayaran, dan pencairan saldo Anda.
            </p>
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'topup', label: 'Top Up' },
              { id: 'payment', label: 'Pembayaran' },
              { id: 'withdraw', label: 'Penarikan' },
              { id: 'refund', label: 'Refund' },
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
            <p className="text-[13px] text-neutral-400 font-medium">Memuat riwayat transaksi dompet...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <>
            <div className="divide-y divide-neutral-100">
            {paginatedTransactions.map((tx) => {
              const meta = getTransactionMeta(tx);
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
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[15px] sm:text-[16px] font-extrabold font-mono ${
                        meta.isPositive ? 'text-emerald-600' : 'text-neutral-900'
                      }`}
                    >
                      {meta.isPositive ? '+' : '-'} {formatRupiah(tx.amount)}
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
              Belum ada riwayat transaksi pada kategori yang dipilih.
            </p>
          </div>
        )}
      </div>

      {/* ──────────────── MODAL TOP UP SALDO ──────────────── */}
      <BaseModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        title="Top Up Saldo Dompet"
        subtitle="Tambah saldo dompet digital Anda melalui Virtual Account Bank atau QRIS resmi Xendit"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTopUpSubmit} className="space-y-4">
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
            <span className="text-[12px] font-bold text-neutral-500">Saldo Saat Ini</span>
            <span className="text-[18px] font-bold text-neutral-900 font-mono">
              {formatRupiah(wallet?.balance || 0)}
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
                {formatRupiah((Number(wallet?.balance) || 0) + Number(topUpAmount))}
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

      {/* ──────────────── MODAL TARIK SALDO & EDIT REKENING ──────────────── */}
      <BaseModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title={isEditingBank ? 'Atur Rekening Bank' : 'Tarik Saldo'}
        subtitle={
          isEditingBank
            ? 'Masukkan informasi rekening bank Anda untuk pencairan dana'
            : 'Masukkan jumlah saldo yang ingin ditarik ke rekening bank Anda'
        }
        maxWidth="max-w-md"
      >
        {isEditingBank ? (
          <form onSubmit={handleSaveBankAccount} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Pilih Bank
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none focus:border-blue-500"
              >
                {SUPPORTED_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Nomor Rekening
              </label>
              <input
                type="text"
                required
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 1234567890"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Nama Pemilik Rekening
              </label>
              <input
                type="text"
                required
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Sesuai nama di buku tabungan / rekening"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              {userProfile?.bankName && (
                <button
                  type="button"
                  onClick={() => setIsEditingBank(false)}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[12px] font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isSavingBank}
                className="flex-1 py-2 text-white text-[12px] font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        ) : (
          <form onSubmit={handleSubmitWithdraw} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                Rekening Tujuan
              </label>
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-[12px] font-bold text-neutral-800">
                      Bank {userProfile?.bankName} - {userProfile?.bankAccountNumber}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      a.n {userProfile?.bankAccountHolder || userProfile?.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingBank(true)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Ubah
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                Saldo Tersedia
              </label>
              <div className="text-[19px] font-bold text-neutral-800 font-mono">
                {formatRupiah(wallet?.balance || 0)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase">
                  Jumlah Penarikan
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[20000, 50000, 100000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => handleSetQuickWithdraw(nominal)}
                      className="min-h-[36px] px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {nominal / 1000}rb
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSetQuickWithdraw('max')}
                    className="min-h-[36px] px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-brand-700 text-xs font-bold rounded-lg cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    Semua
                  </button>
                </div>
              </div>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Minimal Rp ${MIN_WITHDRAW_AMOUNT.toLocaleString('id-ID')}`}
                className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none focus:border-blue-500 shadow-sm"
                disabled={isWithdrawing}
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Minimal penarikan: Rp {MIN_WITHDRAW_AMOUNT.toLocaleString('id-ID')}
              </p>
            </div>

            {withdrawAmount && Number(withdrawAmount) > wallet?.balance && (
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
                  Number(withdrawAmount) < MIN_WITHDRAW_AMOUNT ||
                  Number(withdrawAmount) > wallet?.balance
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
                    Tarik Sekarang
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BaseModal>
    </div>
  );
}
