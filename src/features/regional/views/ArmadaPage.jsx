import { useState, useEffect } from 'react';
import { Truck, Search, ShieldAlert } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { useAuth } from '../../../context/AuthContext';
import { regionalService } from '../../../services/regionalService';

export default function FleetCourierPage() {
  const toast = useToast();
  const { session, adminProfile } = useAuth();
  const [mitraFleetList, setMitraFleetList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (isMounted) setIsLoading(true);

        const operatorProfile = adminProfile || session;
        const currentRegionId = operatorProfile?.regionId
          ? String(operatorProfile.regionId)
          : null;

        const [userRes, vehicleRes] = await Promise.all([
          regionalService
            .getUsersByRole('mitra', currentRegionId, currentPage, limit)
            .catch(() => ({ data: [], meta: null })),

          regionalService
            .getVehicles(currentRegionId, currentPage, limit)
            .catch(() => ({ data: [], meta: null }))
        ]);

        const rawUsers = Array.isArray(userRes)
          ? userRes
          : (userRes?.data || []);

        const rawVehicles = Array.isArray(vehicleRes)
          ? vehicleRes
          : (vehicleRes?.data || []);

        const metaData = userRes?.meta || null;

        const mitraOnly = rawUsers.filter(
          (u) => (u.role || '').toLowerCase() === 'mitra'
        );

        const vehicleByUserId = new Map();
        rawVehicles.forEach((v) => {
          const ownerId = v.userId ?? v.user_id ?? v.user?.id;
          if (ownerId == null) return;
          const key = String(ownerId);
          if (!vehicleByUserId.has(key)) {
            vehicleByUserId.set(key, v);
          }
        });

        const formatted = mitraOnly.map((u) => {
          const vehicle = vehicleByUserId.get(String(u.id)) || null;
          const hasVehicle = Boolean(vehicle);

          return {
            id: String(u.id),
            name: u.name,
            email: u.email,
            phone: u.phone || '-',
            status: u.status === 'active' ? 'Aktif' : 'Nonaktif',
            hasVehicle,
            vehicleType: vehicle?.type || '-',
            vehicleModel: vehicle?.model || '-',
            vehicleColor: vehicle?.color || '-',
            plateNumber: vehicle?.plateNumber || '-'
          };
        });

        if (isMounted) {
          setMitraFleetList(formatted);
          setPaginationMeta(metaData);
        }

      } catch (error) {
        console.error('Gagal memuat data:', error);
        toast.error('Gagal mengambil data dari server.', {
          title: 'Koneksi Gagal'
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.regionId, adminProfile?.regionId, currentPage, limit]);

  const filteredData = mitraFleetList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">

      {/* HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10367D] animate-pulse"></span>
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#10367D]">
              MANAJEMEN ARMADA & KENDARAAN (MITRA)
            </span>
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Status Kendaraan & Verifikasi Mitra
          </h1>
          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Kendaraan didaftarkan langsung oleh masing-masing akun Mitra melalui menu panel mereka.
          </p>
        </div>
      </div>

      {/* INFORMATION */}
      <div className="bg-[#74B4D9]/10 border border-[#74B4D9]/30 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#10367D] shrink-0 mt-0.5" />
        <div className="text-[13px] text-neutral-800 space-y-1">
          <p>Halaman ini menampilkan daftar Mitra di wilayah Anda yang berhak mendaftarkan kendaraan.</p>
        </div>
      </div>

      {/* SEARCH & LIMIT CONTROL */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama mitra, email..."
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
                <th className="py-3 px-5">ID & Nama Mitra Pemilik</th>
                <th className="py-3 px-5">Email Akun</th>
                <th className="py-3 px-5">Kendaraan</th>
                <th className="py-3 px-5">Plat Nomor</th>
                <th className="py-3 px-5">Status Kendaraan</th>
                <th className="py-3 px-5">Status Akun</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoading ? (
                <SkeletonTableRows rows={4} columns={6} />
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-[#74B4D9]/10 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-neutral-800 text-[13px]">{item.name}</div>
                      <div className="text-[11px] font-bold text-[#10367D] font-mono">ID: {item.id}</div>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-neutral-700">{item.email}</td>
                    <td className="py-3.5 px-5 font-bold text-neutral-800">
                      {item.hasVehicle ? `${item.vehicleType} - ${item.vehicleModel}` : '-'}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-neutral-800">
                      {item.hasVehicle ? item.plateNumber : '-'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.hasVehicle ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                      }`}>
                        {item.hasVehicle ? 'TERDAFTAR' : 'BELUM TERDAFTAR'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Truck}
                      title="Tidak Ada Mitra"
                      description="Belum ada akun ber-role mitra di database wilayah ini."
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