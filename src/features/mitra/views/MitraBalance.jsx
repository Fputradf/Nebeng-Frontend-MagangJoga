import { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  Lock,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  History,
  Eye,
  EyeOff,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import StatCard from '../../../components/ui/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

const STATUS_LABEL = {
  scheduled: 'Menunggu Keberangkatan',
  in_origin_pos: 'Di Pos Asal',
  in_transit: 'Dalam Perjalanan (Escrow Hold)',
  arrived_dest_pos: 'Tiba di Pos Tujuan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function MitraBalance() {
  const toast = useToast();

  const [availableBalance, setAvailableBalance] = useState(0);
  const [escrowHold, setEscrowHold] = useState(0);
  const [walletHistory, setWalletHistory] = useState([]);
  
  const [escrowTransactions, setEscrowTransactions] = useState([]);
  const [escrowPage, setEscrowPage] = useState(1);
  const [escrowLimit, setEscrowLimit] = useState(5);
  const [totalEscrowPages, setTotalEscrowPages] = useState(1);
  const [totalEscrowItems, setTotalEscrowItems] = useState(0);
  
  const [bankInfo, setBankInfo] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showAccountPii, setShowAccountPii] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankDraft, setBankDraft] = useState(bankInfo);
  const [isLoading, setIsLoading] = useState(true);

  const MIN_WITHDRAWAL = 50000;

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

  const fetchWalletData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const userRes = await apiClient.get('/auth/me');
      if (userRes.data) {
        const userData = userRes.data;
        const bankName = userData.bankName || userData.profile?.bankName || '';
        const accountNumber = userData.bankAccountNumber || userData.profile?.bankAccountNumber || '';
        const accountHolder = userData.bankAccountHolder || userData.profile?.bankAccountHolder || userData.name || '';

        const initialBank = { bankName, accountNumber, accountHolder };
        setBankInfo(initialBank);
        setBankDraft(initialBank);
      }

      const walletRes = await apiClient.get('/wallets/me');
      if (walletRes.data) {
        setAvailableBalance(Number(walletRes.data.balance || 0));
        setEscrowHold(Number(walletRes.data.heldEscrowBalance || 0));
        
        if (walletRes.data.transactions) {
          setWalletHistory(walletRes.data.transactions);
        }
      }

      const tripsRes = await apiClient.get('/trips/me', {
        params: {
          page: escrowPage,
          limit: escrowLimit,
          activeEscrow: 'true',
        },
      });

      if (tripsRes.data) {
        const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : tripsRes.data.data || [];
        
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
      console.error('Gagal memuat data keuangan:', error);
      toast.error('Gagal menyinkronkan data keuangan dari basis data.', { title: 'Kesalahan' });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escrowPage, escrowLimit]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const maskAccountNumber = (accNum) => {
    if (!accNum || accNum.length < 6) return accNum || '-';
    return `${accNum.slice(0, 3)}****${accNum.slice(-3)}`;
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

    try {
      await apiClient.post('/wallets/withdraw', { amount });
      setWithdrawAmount('');
      setIsSuccessModalOpen(true);
      fetchWalletData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Penarikan saldo gagal diproses.',
        { title: 'Gagal' }
      );
    }
  };

  const handleStartEditBank = () => {
    setBankDraft(bankInfo);
    setIsEditingBank(true);
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

    try {
      await apiClient.patch('/users/me/profile', {
        bankName: bankDraft.bankName,
        bankAccountNumber: bankDraft.accountNumber,
        bankAccountHolder: bankDraft.accountHolder,
      });

      setBankInfo(bankDraft);
      setIsEditingBank(false);
      toast.success('Informasi rekening bank berhasil diperbarui.', { title: 'Rekening Diperbarui' });
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Gagal memperbarui informasi rekening bank.',
        { title: 'Kesalahan' }
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />
            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: PRIMARY_COLOR }}
            >
              <Wallet className="w-3 h-3" />
              KEUANGAN & SISTEM ESCROW MITRA
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Dompet Mitra & Pendapatan Auto-Escrow
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Pantau saldo tertahan (escrow) secara otomatis dan lakukan penarikan
            pendapatan ke rekening bank yang terdaftar dengan aman.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard
          title="SALDO DAPAT DITARIK"
          value={`Rp ${availableBalance.toLocaleString('id-ID')}`}
          subtitle="Siap dicairkan ke rekening bank"
          icon={Wallet}
        />

        <StatCard
          title="SALDO TERTAHAN (ESCROW)"
          value={`Rp ${escrowHold.toLocaleString('id-ID')}`}
          subtitle="Tersimpan aman hingga verifikasi pos selesai"
          icon={Lock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 lg:col-span-1 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
            Penarikan Saldo
          </h3>

          {!isEditingBank ? (
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0"
                    style={{
                      backgroundColor: `${PRIMARY_ACCENT}25`,
                      color: PRIMARY_COLOR,
                    }}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>

                  <div>
                    <p className="text-[13px] font-bold text-neutral-800">
                      {bankInfo.bankName ? `${bankInfo.bankName} - ` : ''}
                      {showAccountPii
                        ? bankInfo.accountNumber || 'Belum diatur'
                        : maskAccountNumber(bankInfo.accountNumber || 'Belum diatur')}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-medium">
                      {bankInfo.accountHolder || 'Atas Nama Belum Diatur'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAccountPii(!showAccountPii)}
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
                    title={showAccountPii ? 'Sembunyikan Nomor Rekening' : 'Tampilkan Nomor Rekening'}
                  >
                    {showAccountPii ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleStartEditBank}
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
                    title="Ubah Rekening Bank"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSaveBank}
              className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2.5 text-[13px]"
            >
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Nama Bank
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA / Mandiri"
                  value={bankDraft.bankName}
                  onChange={(e) =>
                    setBankDraft((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg font-bold text-neutral-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234567890"
                  value={bankDraft.accountNumber}
                  onChange={(e) =>
                    setBankDraft((prev) => ({
                      ...prev,
                      accountNumber: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg font-bold text-neutral-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  placeholder="Sesuai buku tabungan"
                  value={bankDraft.accountHolder}
                  onChange={(e) =>
                    setBankDraft((prev) => ({ ...prev, accountHolder: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg font-bold text-neutral-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingBank(false)}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white rounded-lg font-bold transition cursor-pointer"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Simpan
                </button>
              </div>
            </form>
          )}

          <form onSubmit={handleWithdraw} className="space-y-3.5 text-[13px]">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Jumlah Penarikan (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 100000"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-bold text-neutral-800 focus:outline-none"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Minimal Rp 50.000 | Maksimal Rp {availableBalance.toLocaleString('id-ID')}
              </span>
            </div>

            <button
              type="submit"
              disabled={isEditingBank || availableBalance < MIN_WITHDRAWAL}
              className="w-full py-3 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-bold transition shadow-sm cursor-pointer"
              style={{ backgroundColor: isEditingBank ? undefined : PRIMARY_COLOR }}
            >
              Cairkan ke Rekening Bank
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Rincian Dana Escrow Aktif
              </h3>

              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-neutral-400">Tampilkan:</span>
                <select
                  value={escrowLimit}
                  onChange={(e) => {
                    setEscrowLimit(Number(e.target.value));
                    setEscrowPage(1);
                  }}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-semibold text-neutral-700 focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 text-[12px] text-neutral-400 uppercase font-bold">
                    <th className="py-3 px-3">ID Perjalanan</th>
                    <th className="py-3 px-3">Rute Perjalanan</th>
                    <th className="py-3 px-3">Tarif Trip</th>
                    <th className="py-3 px-3">Status Sistem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-[12px]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-400">
                        Memuat data...
                      </td>
                    </tr>
                  ) : escrowTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-400 font-medium">
                        Tidak ada dana escrow yang aktif saat ini.
                      </td>
                    </tr>
                  ) : (
                    escrowTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-neutral-50/60 transition">
                        <td className="py-3.5 px-3 font-bold text-neutral-800 font-mono">
                          #{tx.id}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-neutral-700">
                          {tx.originPoint?.name || '-'} → {tx.destinationPoint?.name || '-'}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-neutral-800">
                          Rp {calculateTripEscrowAmount(tx).toLocaleString('id-ID')}
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
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-[13px] text-neutral-500">
                <span>
                  Halaman {escrowPage} dari {totalEscrowPages} ({totalEscrowItems} data)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={escrowPage <= 1 || isLoading}
                    onClick={() => setEscrowPage((prev) => Math.max(prev - 1, 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={escrowPage >= totalEscrowPages || isLoading}
                    onClick={() => setEscrowPage((prev) => Math.min(prev + 1, totalEscrowPages))}
                    className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <h3 className="text-[17px] font-bold text-neutral-800 mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" style={{ color: PRIMARY_COLOR }} />
              Riwayat Mutasi Dompet Mitra
            </h3>

            <div className="space-y-2">
              {walletHistory.length === 0 ? (
                <p className="text-[13px] text-neutral-400 text-center py-4">
                  Belum terdapat riwayat mutasi transaksi.
                </p>
              ) : (
                walletHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-neutral-50/70 border border-neutral-100 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-neutral-800 flex items-center gap-1.5">
                        {item.description || item.type || 'Mutasi Dompet'}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        • ID: {item.id}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-[13px] font-bold ${
                          Number(item.amount) < 0 ? 'text-neutral-800' : 'text-emerald-600'
                        }`}
                      >
                        {Number(item.amount) < 0
                          ? `- Rp ${Math.abs(Number(item.amount)).toLocaleString('id-ID')}`
                          : `+ Rp ${Number(item.amount).toLocaleString('id-ID')}`}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-medium uppercase">
                        {item.type}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <BaseModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Penarikan Berhasil Diajukan"
        subtitle="Pencairan Komisi Mitra"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-3 text-[13px]">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <p className="text-neutral-500">
            Permintaan penarikan saldo Anda telah berhasil diajukan dan sedang diproses ke rekening bank terdaftar.
          </p>

          <button
            onClick={() => setIsSuccessModalOpen(false)}
            className="w-full py-2.5 text-white font-bold rounded-xl transition cursor-pointer"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            Tutup
          </button>
        </div>
      </BaseModal>
    </div>
  );
}