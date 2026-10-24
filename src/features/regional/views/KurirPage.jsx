import { useState, useEffect } from 'react';
import { UserCheck, Search, ShieldAlert } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { useAuth } from '../../../context/AuthContext';
import { regionalService } from '../../../services/regionalService';
import StatusBadge from '../../../components/ui/StatusBadge';

export default function KurirPage() {
  const toast = useToast();
  const { session, adminProfile } = useAuth();
  const [kurirList, setKurirList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadKurirData = async () => {
      try {
        if (isMounted) setIsLoading(true);

        const operatorProfile = adminProfile || session;
        const currentRegionId = operatorProfile?.regionId ? String(operatorProfile.regionId) : null;
        const response = await regionalService.getUsersByRole(
          'operator', 
          currentRegionId, 
          currentPage, 
          limit
        ).catch(() => ({ data: [], meta: null }));

        const rawData = Array.isArray(response) ? response : (response?.data || []);
        const metaData = response?.meta || null;

        const formatted = rawData.map((item) => ({
          id: String(item.id),
          name: item.name,
          email: item.email,
          phone: item.phone || '-',
          status: item.status === 'active' ? 'Aktif' : 'Nonaktif',
          statusVerification: item.statusVerification || 'unverified',
          assignedPos: item.assignedPickupPointName || (item.assignedPickupPointId ? `Pos ID: ${item.assignedPickupPointId}` : 'Belum Ditugaskan')
        }));

        if (isMounted) {
          setKurirList(formatted);
          setPaginationMeta(metaData);
        }
      } catch (error) {
        console.error('Gagal memuat data kurir/driver:', error);
        toast.error('Gagal mengambil data kurir dari server.', { title: 'Koneksi Gagal' });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadKurirData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.regionId, adminProfile?.regionId, currentPage, limit]);

  const filteredData = kurirList.filter((k) =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">

      {/* HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10367D] animate-pulse"></span>
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#10367D]">
              MANAJEMEN OPERATOR
            </span>
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Daftar Operator
          </h1>
          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Kelola dan pantau status keaktifan serta penugasan pos kurir di wilayah operasional Anda.
          </p>
        </div>
      </div>

      {/* INFORMASI */}
      <div className="bg-[#74B4D9]/10 border border-[#74B4D9]/30 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#10367D] shrink-0 mt-0.5" />
        <div className="text-[13px] text-neutral-800 space-y-1">
          <p>Data kurir dan operator pos divalidasi langsung berdasarkan wilayah regional yang terikat pada akun Anda.</p>
        </div>
      </div>

      {/* SEARCH & LIMIT CONTROL */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama kurir, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
          />
        </div>

        <div className="flex items-center gap-3">
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
          </div>

          <div className="text-[13px] font-semibold text-neutral-400 px-2">
            Total: <span className="font-bold text-neutral-800">{paginationMeta?.totalData || filteredData.length} Orang</span>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">ID & Nama Kurir</th>
                <th className="py-3 px-5">Kontak Email / HP</th>
                <th className="py-3 px-5">Penugasan Pos</th>
                <th className="py-3 px-5">Status Verifikasi</th>
                <th className="py-3 px-5">Status Akun</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoading ? (
                <SkeletonTableRows rows={4} columns={5} />
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-[#74B4D9]/10 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-neutral-800 text-[13px]">{item.name}</div>
                      <div className="text-[11px] font-bold text-[#10367D] font-mono">ID: {item.id}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-neutral-700">{item.email}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{item.phone}</div>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-neutral-800">
                      {item.assignedPos}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.statusVerification === 'approved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.statusVerification.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge variant={item.status === 'Aktif' ? 'emerald' : 'rose'}>
                        {item.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={UserCheck}
                      title="Tidak Ada Kurir"
                      description="Belum ada data kurir atau operator pos di database wilayah ini."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {paginationMeta && paginationMeta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-neutral-50/50 border-t border-neutral-200 text-[13px]">
            <span className="text-neutral-500">
              Halaman <strong>{paginationMeta.currentPage}</strong> dari <strong>{paginationMeta.totalPages}</strong> (Total: {paginationMeta.totalData} Data)
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= paginationMeta.totalPages || isLoading}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}