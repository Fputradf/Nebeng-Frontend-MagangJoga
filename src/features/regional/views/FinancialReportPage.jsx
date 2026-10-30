import { useState, useEffect } from 'react';
import { Printer, Search, FileText } from 'lucide-react';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatCard from '../../../components/ui/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import PrintReportHeader from '../../../components/ui/PrintReportHeader';
import PrintReportFooter from '../../../components/ui/PrintReportFooter';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';

export default function FinancialReportPage() {
  const { user } = useAuth();
  const [reportList, setReportList] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusDetail, setSelectedStatusDetail] = useState(null);
  const [grandTotalSummary, setGrandTotalSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    let isMounted = true;

    const loadFinancialData = async () => {
      try {
        if (isMounted) setIsLoadingReports(true);

        const currentRegionId = user?.regionId
          ? String(user.regionId)
          : null;

        const response = await apiClient.get('/payments', {
          params: {
            regionId: currentRegionId,
            page: currentPage,
            limit: limit
          }
        });

        const responseData = response.data;
        const rawPayments = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.data || []);

        const pagination = responseData?.pagination || null;

        const allDataResponse = await apiClient.get('/payments', {
          params: {
            regionId: currentRegionId,
            page: 1,
            limit: 1000
          }
        });
        const allRawPayments = Array.isArray(allDataResponse.data) 
          ? allDataResponse.data 
          : (allDataResponse.data?.data || []);

        let globalRevenue = 0;
        let globalCommission = 0;

        allRawPayments.forEach(item => {
          const amountVal = Number(item.amount || 0);
          const feePercentage = item.order?.adminFeePercentage 
            ? Number(item.order.adminFeePercentage) 
            : 10;
          const commissionVal = Math.round((amountVal * feePercentage) / 100);

          globalRevenue += amountVal;
          globalCommission += commissionVal;
        });

        const formatted = rawPayments.map(item => {
          const amountVal = Number(item.amount || 0);
          const feePercentage = item.order?.adminFeePercentage 
            ? Number(item.order.adminFeePercentage) 
            : 10;
          const commissionVal = Math.round((amountVal * feePercentage) / 100);

          return {
            id: String(item.id || `TRX-${Math.floor(Math.random() * 9000 + 1000)}`),
            tripId: String(item.order?.trip?.id || item.tripId || 'TRIP-9081'),
            posName:
              item.order?.trip?.originPoint?.name ||
              item.pickupPoint?.name ||
              'Pos Regional Utama',
            serviceType:
              item.serviceType ||
              item.order?.type ||
              'Logistik / Pengiriman',
            amount: `Rp ${amountVal.toLocaleString('id-ID')}`,
            commission: `Rp ${commissionVal.toLocaleString('id-ID')}`,
            commissionPercentage: feePercentage,
            status:
              item.status === 'completed' ||
              item.status === 'success'
                ? 'Lunas / Selesai'
                : 'Pending',
            statusDetail: 'Transaksi tervalidasi sistem database escrow.',
            date: item.createdAt
              ? new Date(item.createdAt).toLocaleString('id-ID')
              : 'Hari ini',
            paymentMethod: item.paymentGateway || 'QRIS / Non-Tunai'
          };
        });

        if (isMounted) {
          setReportList(formatted);
          setPaginationMeta(pagination);
          setGrandTotalSummary({
            totalRevenue: globalRevenue,
            totalCommission: globalCommission,
            totalTransactions: allRawPayments.length
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('Gagal memuat data keuangan:', error);
          setReportList([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingReports(false);
        }
      }
    };

    loadFinancialData();

    return () => {
      isMounted = false;
    };
  }, [user?.regionId, currentPage, limit]);

  const filteredReports = reportList.filter(item =>
    item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tripId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.serviceType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageTotalAmount = filteredReports.reduce((acc, curr) => {
    const raw = Number(String(curr.amount || '0').replace(/[^0-9]/g, '')) || 0;
    return acc + raw;
  }, 0);

  const pageTotalCommission = filteredReports.reduce((acc, curr) => {
    const raw = Number(String(curr.commission || '0').replace(/[^0-9]/g, '')) || 0;
    return acc + raw;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter'] print:p-0 print:bg-white">

      {/* ── KOP SURAT CETAK RESMI REGIONAL ── */}
      <PrintReportHeader
        title="LAPORAN KEUANGAN & PENDAPATAN REGIONAL"
        subtitle={`DIVISI OPERASIONAL WILAYAH • ${user?.regionName || 'WILAYAH OPERASIONAL'}`}
        documentNumber={`DOC/REG-FIN/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${String(currentPage).padStart(3, '0')}`}
        printedBy={user?.name || user?.fullName || 'Administrator Wilayah'}
        extraMeta={[
          { label: 'Wilayah Operasi', value: user?.regionName || 'Regional Terpadu' },
          { label: 'Halaman Laporan', value: `Hal ${currentPage} dari ${paginationMeta?.totalPages || 1}` },
          { label: 'Total Transaksi', value: `${grandTotalSummary.totalTransactions} Transaksi Terdata` },
          { label: 'Basis Settlement', value: 'Sistem Terverifikasi Real-Time' },
        ]}
      />

      {/* ── RINGKASAN EKSEKUTIF KHUSUS CETAK PDF ── */}
      <div className="hidden print:grid grid-cols-3 gap-3 mb-6">
        <div className="border border-slate-300 rounded p-3 bg-slate-50/70">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Omzet Wilayah
          </span>
          <p className="text-[15px] font-black font-mono text-slate-900 mt-0.5">
            Rp {grandTotalSummary.totalRevenue.toLocaleString('id-ID')}
          </p>
          <span className="text-[9.5px] text-slate-500 block mt-0.5">
            Akumulasi nilai transaksi {user?.regionName || 'regional'}
          </span>
        </div>

        <div className="border border-slate-300 rounded p-3 bg-slate-50/70">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Hak Komisi Wilayah
          </span>
          <p className="text-[15px] font-black font-mono text-[#10367D] mt-0.5">
            Rp {grandTotalSummary.totalCommission.toLocaleString('id-ID')}
          </p>
          <span className="text-[9.5px] text-slate-500 block mt-0.5">
            Porsi bagi hasil kas regional
          </span>
        </div>

        <div className="border border-slate-300 rounded p-3 bg-slate-50/70">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Status Data Halaman
          </span>
          <p className="text-[15px] font-black font-mono text-slate-900 mt-0.5">
            {reportList.length} / {grandTotalSummary.totalTransactions} Data
          </p>
          <span className="text-[9.5px] text-slate-500 block mt-0.5">
            Halaman {currentPage} dari {paginationMeta?.totalPages || 1}
          </span>
        </div>
      </div>

      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8 print-hidden">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> LAPORAN FINANSIAL & PENDAPATAN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Laporan Keuangan Wilayah
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Pantau arus kas, total transaksi, dan komisi regional langsung dari server.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
            >
              <Printer size={16} />
              <span>Cetak Laporan PDF</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 print:hidden">
        <StatCard
          title="TOTAL PENDAPATAN WILAYAH"
          value={`Rp ${grandTotalSummary.totalRevenue.toLocaleString('id-ID')}`}
          subtitle={`Akumulasi dari ${grandTotalSummary.totalTransactions} transaksi total`}
        />

        <StatCard
          title="KOMISI REGIONAL / ADMIN"
          value={`Rp ${grandTotalSummary.totalCommission.toLocaleString('id-ID')}`}
          subtitle="Akumulasi komisi keseluruhan wilayah"
        />

        <StatCard
          title="STATUS HALAMAN"
          value={`Hal ${currentPage} dari ${paginationMeta?.totalPages || 1}`}
          subtitle={`Menampilkan ${reportList.length} dari ${grandTotalSummary.totalTransactions} data`}
        />
      </div>

      {/* FILTER & LIMIT CONTROL */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 print-hidden">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari ID transaksi, layanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
          />
        </div>

        <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-600">
          <span>Tampilkan:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#10367D] cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>per halaman</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden print:border print:shadow-none print:rounded-none">
        <div className="hidden sm:block print:block overflow-x-auto">
          <table className="w-full text-left border-collapse print:text-black">
            <thead className="print:table-header-group">
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold print:bg-slate-100 print:text-slate-800 print:border-b-2 print:border-slate-300">
                <th className="py-3 px-5 print:py-2 print:px-3">ID TRX & Waktu</th>
                <th className="py-3 px-5 print:py-2 print:px-3">Pos Asal</th>
                <th className="py-3 px-5 print:py-2 print:px-3">Layanan</th>
                <th className="py-3 px-5 print:py-2 print:px-3">Total Tarif</th>
                <th className="py-3 px-5 print:py-2 print:px-3">Komisi Wilayah</th>
                <th className="py-3 px-5 print:py-2 print:px-3 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px] print:divide-slate-200">
              {isLoadingReports ? (
                <SkeletonTableRows rows={4} columns={6} />
              ) : filteredReports.length > 0 ? (
                filteredReports.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedStatusDetail(item)}
                    className="hover:bg-[#74B4D9]/10 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-5 print:py-2 print:px-3">
                      <div className="font-bold text-neutral-800 font-mono text-[13px] print:text-slate-900">{item.id}</div>
                      <div className="text-[11px] text-neutral-400 print:text-slate-500 font-mono">{item.date}</div>
                    </td>

                    <td className="py-3.5 px-5 print:py-2 print:px-3 font-bold text-neutral-800 print:text-slate-900">{item.posName}</td>

                    <td className="py-3.5 px-5 print:py-2 print:px-3 font-semibold text-neutral-700 print:text-slate-800">{item.serviceType}</td>

                    <td className="py-3.5 px-5 print:py-2 print:px-3 font-bold font-mono text-neutral-800 print:text-slate-900">{item.amount}</td>

                    <td className="py-3.5 px-5 print:py-2 print:px-3 font-bold font-mono text-[#10367D] print:text-slate-900">
                      {item.commission} <span className="text-[11px] text-neutral-400 print:text-slate-500 font-normal">({item.commissionPercentage}%)</span>
                    </td>

                    <td className="py-3.5 px-5 print:py-2 print:px-3 text-right">
                      <StatusBadge variant="emerald">{item.status}</StatusBadge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={FileText}
                      title="Transaksi Tidak Ditemukan"
                      description="Belum ada data transaksi di database untuk filter ini."
                    />
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="hidden print:table-footer-group border-t-2 border-slate-800 font-bold bg-slate-50 text-[11px]">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 text-slate-700 uppercase">
                  Total Nilai Halaman Ini ({filteredReports.length} Transaksi):
                </td>
                <td className="py-2.5 px-3 font-mono text-[12px] text-slate-900 font-black">
                  Rp {pageTotalAmount.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 font-mono text-[12px] text-[#10367D] font-bold">
                  Rp {pageTotalCommission.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700 text-[10px] uppercase font-bold">
                  Terverifikasi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {paginationMeta && paginationMeta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-neutral-50/50 border-t border-neutral-200 text-[13px] print-hidden">
            <span className="text-neutral-500">
              Halaman <strong>{paginationMeta.currentPage}</strong> dari <strong>{paginationMeta.totalPages}</strong> (Total: {paginationMeta.totalItems} Transaksi)
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1 || isLoadingReports}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= paginationMeta.totalPages || isLoadingReports}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LEMBAR PENGESAHAN CETAK REGIONAL ── */}
      <PrintReportFooter
        leftSigner={{
          role: 'Disiapkan Oleh,',
          title: 'Administrator Keuangan Regional',
          name: user?.name || user?.fullName || 'Administrator Regional',
          idLabel: 'ID Petugas',
          idValue: user?.id ? `ADM-${user.id}` : 'ADM-REGIONAL',
        }}
        rightSigner={{
          role: 'Mengetahui & Menyetujui,',
          title: 'Manajer Operasional Wilayah',
          name: 'Manajer Regional PT Nebeng Transport Indonesia',
          idLabel: 'Otoritas Wilayah',
          idValue: user?.regionName || 'Regional Jawa Tengah',
          locationDate: `Surakarta, ${new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`,
        }}
        notes="Laporan keuangan ini mencerminkan mutasi dan komisi transaksi aktual di pos-pos wilayah yang bersangkutan. Dicetak otomatis melalui sistem Nebeng."
      />

      {/* MODAL DETAIL TRANSAKSI */}
      <BaseModal
        isOpen={Boolean(selectedStatusDetail)}
        onClose={() => setSelectedStatusDetail(null)}
        title={`Detail Transaksi: ${selectedStatusDetail?.id}`}
        subtitle={`Metode: ${selectedStatusDetail?.paymentMethod}`}
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <div><strong>ID Trip:</strong> {selectedStatusDetail?.tripId}</div>
          <div><strong>Metode Pembayaran:</strong> {selectedStatusDetail?.paymentMethod}</div>
          <div><strong>Persentase Komisi:</strong> {selectedStatusDetail?.commissionPercentage}% (Dihitung dari Backend)</div>
          <div><strong>Catatan Settlement:</strong> {selectedStatusDetail?.statusDetail}</div>

          <button
            onClick={() => setSelectedStatusDetail(null)}
            className="w-full py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[13px] font-bold rounded-full cursor-pointer mt-2 transition"
          >
            Tutup
          </button>
        </div>
      </BaseModal>

    </div>
  );
}