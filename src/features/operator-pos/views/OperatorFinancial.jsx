import { useState, useEffect } from 'react';
import { FileText, DollarSign, Printer, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatCard from '../../../components/ui/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { operatorService } from '../../../services/operatorService';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

export default function OperatorFinancial() {
  const { user } = useAuth();
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [serverTotalRevenue, setServerTotalRevenue] = useState(0);
  const [posInfo, setPosInfo] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // State Pagination & Limit
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    totalData: 0,
    totalPages: 1,
    currentPage: 1,
  });

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setIsLoadingTransactions(true);
      try {
        const responseData = await operatorService.getPayments(currentPage, limit);

        if (ignore) return;

        const dataArray = Array.isArray(responseData)
          ? responseData
          : responseData?.data || [];

        if (responseData?.posSummary) {
          setPosInfo(responseData.posSummary);
          setServerTotalRevenue(responseData.posSummary.totalRevenue || 0);
        }

        const formatted = dataArray.map((trx, index) => {
          const gateway = trx.paymentGateway || 'MANUAL_SIMULATION';
          let readableMethod = 'Tunai / Manual';

          if (gateway === 'QRIS') {
            readableMethod = 'QRIS Instant';
          } else if (gateway === 'BANK_TRANSFER') {
            readableMethod = 'Virtual Account Bank';
          }

          return {
            id: String(trx.id || `TRX-${String((currentPage - 1) * limit + index + 1).padStart(3, '0')}`),
            amount: Number(trx.amount || 0),
            type: gateway,
            method: readableMethod,
            status: trx.status || 'success',
            time: trx.createdAt
              ? new Date(trx.createdAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' WIB'
              : 'Hari ini',
          };
        });

        setDailyTransactions(formatted);

        if (responseData?.meta) {
          setPaginationMeta({
            totalData: responseData.meta.totalData || responseData.meta.total || formatted.length,
            totalPages: responseData.meta.totalPages || Math.ceil((responseData.meta.totalData || formatted.length) / limit),
            currentPage: responseData.meta.currentPage || currentPage,
          });
        } else {
          const total = responseData?.total || formatted.length;
          setPaginationMeta({
            totalData: total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            currentPage: currentPage,
          });
        }

        if (!responseData?.posSummary) {
          const calculatedTotal = formatted.reduce((acc, curr) => acc + curr.amount, 0);
          setServerTotalRevenue(calculatedTotal);
        }
      } catch (error) {
        if (!ignore) {
          console.error('Gagal mengambil data keuangan dari database:', error);
          setDailyTransactions([]);
          setServerTotalRevenue(0);
          setPaginationMeta({ totalData: 0, totalPages: 1, currentPage: 1 });
        }
      } finally {
        if (!ignore) {
          setIsLoadingTransactions(false);
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [currentPage, limit]);

  // Handler ubah limit data per halaman
  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setCurrentPage(1); // Reset ke halaman pertama saat limit diubah
  };

  const totalRevenue = serverTotalRevenue;
  const qrisRevenue = dailyTransactions
    .filter((t) => t.type === 'QRIS')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const otherRevenue = totalRevenue - qrisRevenue;
  const regionalCommission = Math.round(totalRevenue * 0.15);

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-6 no-print">
        {/* ── BANNER GRADIENT ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
          <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> REKAPITULASI KAS & PENDAPATAN POS ({posInfo?.posName || 'TERMINAL'})
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Laporan Finansial Pos Terminal
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
                Kelola setoran tunai harian, rekonsiliasi kasir, dan pantau pendapatan total pos dari server.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm shrink-0 self-start sm:self-auto flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan Shift</span>
            </button>
          </div>
          <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
          <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="TOTAL PENDAPATAN POS"
            value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
            subtitle={`Total omzet terdaftar`}
            icon={DollarSign}
          />
          <StatCard
            title="PENDAPATAN QRIS"
            value={`Rp ${qrisRevenue.toLocaleString('id-ID')}`}
            subtitle={`Non-QRIS / Lainnya: Rp ${otherRevenue.toLocaleString('id-ID')}`}
            icon={Wallet}
          />
          <StatCard
            title="SETORAN REGIONAL (15%)"
            value={`Rp ${regionalCommission.toLocaleString('id-ID')}`}
            subtitle="Potongan otomatis sistem"
            icon={FileText}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold text-neutral-800">
              Rincian Transaksi Shift Aktif (Database)
            </h2>

            {/* Selector Option Limit */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-[13px]">
              <span className="text-neutral-500 font-semibold">Tampilkan:</span>
              <select
                value={limit}
                onChange={handleLimitChange}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] cursor-pointer"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={20}>20 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">ID TRX & WAKTU</th>
                  <th className="py-3 px-4">GATEWAY PEMBAYARAN</th>
                  <th className="py-3 px-4">METODE</th>
                  <th className="py-3 px-4 text-right">TOTAL NOMINAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-[12px]">
                {isLoadingTransactions ? (
                  <SkeletonTableRows rows={limit > 5 ? 5 : limit} columns={4} />
                ) : dailyTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon={FileText}
                        title="Belum Ada Transaksi"
                        description="Belum ada data transaksi finansial tercatat di database pos Anda."
                      />
                    </td>
                  </tr>
                ) : (
                  dailyTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-neutral-800 font-mono text-[13px]">
                          {trx.id}
                        </p>
                        <p className="text-[11px] text-neutral-400">{trx.time}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-700">
                        {trx.type}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge variant={trx.status === 'success' ? 'emerald' : 'amber'}>
                          <Wallet size={10} className="mr-1 inline" /> {trx.method}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-800">
                        Rp {trx.amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Controls Pagination UI Footer */}
          {!isLoadingTransactions && dailyTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 text-[13px]">
              <span className="text-neutral-500">
                Menampilkan halaman <strong>{paginationMeta.currentPage}</strong> dari <strong>{paginationMeta.totalPages}</strong> (Total {paginationMeta.totalData} data)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronLeft size={12} />
                  Sebelumnya
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: paginationMeta.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === paginationMeta.totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, array) => {
                      const prevPage = array[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-neutral-400 px-1">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 rounded-lg text-[13px] font-bold cursor-pointer transition ${
                              currentPage === page
                                ? 'bg-[#10367D] text-white shadow-xs'
                                : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  disabled={currentPage >= paginationMeta.totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, paginationMeta.totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  Selanjutnya
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="print-area" className="hidden print:block text-black">
        <div className="border-b-2 border-black pb-4 mb-5 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black tracking-wide uppercase">NEBENG SYSTEM</h1>
            <p className="text-xs font-semibold uppercase">Laporan Rekapitulasi Kasir & Kas Pos Operasional</p>
            <p className="text-[13px] text-gray-600">
              Pos: {posInfo?.posName || user?.assignedPickupPointName || user?.posName || 'Pos Terminal Utama'}
            </p>
          </div>
          <div className="text-right text-[13px]">
            <p><span className="font-bold">Tanggal Cetak:</span> {printDate}</p>
            <p><span className="font-bold">Operator:</span> {user?.name || 'Operator Pos'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div className="border border-black p-2.5 rounded">
            <p className="text-[12px] font-bold uppercase text-gray-700">Total Transaksi Pos</p>
            <p className="text-sm font-black mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-gray-500">{paginationMeta.totalData || dailyTransactions.length} Transaksi Tercatat</p>
          </div>
          <div className="border border-black p-2.5 rounded">
            <p className="text-[12px] font-bold uppercase text-gray-700">Pendapatan QRIS</p>
            <p className="text-sm font-black mt-1">Rp {qrisRevenue.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-gray-500">Tunai/Lainnya: Rp {otherRevenue.toLocaleString('id-ID')}</p>
          </div>
          <div className="border border-black p-2.5 rounded">
            <p className="text-[12px] font-bold uppercase text-gray-700">Bagi Hasil Regional (15%)</p>
            <p className="text-sm font-black mt-1">Rp {regionalCommission.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-gray-500">Potongan Sistem</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase mb-2 border-b border-gray-400 pb-1">
            Rincian Transaksi Shift
          </h2>
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-black text-black uppercase font-bold">
                <th className="py-2 px-2">No / ID TRX</th>
                <th className="py-2 px-2">Waktu</th>
                <th className="py-2 px-2">Gateway</th>
                <th className="py-2 px-2">Metode Pembayaran</th>
                <th className="py-2 px-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {dailyTransactions.map((trx) => (
                <tr key={trx.id}>
                  <td className="py-2 px-2 font-mono font-bold">{trx.id}</td>
                  <td className="py-2 px-2">{trx.time}</td>
                  <td className="py-2 px-2 font-semibold">{trx.type}</td>
                  <td className="py-2 px-2">{trx.method}</td>
                  <td className="py-2 px-2 text-right font-bold">
                    Rp {trx.amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={4} className="py-2 px-2 text-right uppercase">Total Kas Masuk:</td>
                <td className="py-2 px-2 text-right text-xs">Rp {totalRevenue.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center text-[13px] pt-4 mt-8 break-inside-avoid">
          <div>
            <p className="font-bold">Diserahkan Oleh (Operator Shift),</p>
            <div className="h-16"></div>
            <p className="font-bold underline uppercase">{user?.name || 'Operator Pos'}</p>
            <p className="text-[12px] text-gray-600">NIP / ID Operator</p>
          </div>
          <div>
            <p className="font-bold">Diterima & Diverifikasi Oleh,</p>
            <div className="h-16"></div>
            <p className="font-bold underline uppercase">( Supervisor / Finance Pos )</p>
            <p className="text-[12px] text-gray-600">Manajer Keuangan Regional</p>
          </div>
        </div>
      </div>
    </div>
  );
}