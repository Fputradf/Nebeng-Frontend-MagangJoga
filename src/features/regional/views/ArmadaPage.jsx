import { useState, useEffect } from 'react';
import { Truck, Search, CheckCircle2, AlertTriangle, ExternalLink, ShieldAlert, Check, X, ShieldCheck, FileText } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import BaseModal from '../../../components/ui/BaseModal';
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
  const [selectedMitraForSanctions, setSelectedMitraForSanctions] = useState(null);
  const [mitraSanctionsData, setMitraSanctionsData] = useState(null);
  const [isLoadingSanctions, setIsLoadingSanctions] = useState(false);
  const [reviewNotesMap, setReviewNotesMap] = useState({});
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleOpenSanctionsModal = async (mitra) => {
    setSelectedMitraForSanctions(mitra);
    setIsLoadingSanctions(true);
    try {
      const res = await apiClient.get('/admin/mitra/' + mitra.id + '/sanctions');
      setMitraSanctionsData(res.data);
    } catch (err) {
      console.error('Gagal mengambil data sanksi mitra:', err);
      toast.error(err.response?.data?.message || 'Gagal mengambil data sanksi mitra.', { title: 'Gagal' });
    } finally {
      setIsLoadingSanctions(false);
    }
  };

  const handleReviewAppeal = async (appealId, approved) => {
    setIsSubmittingReview(true);
    try {
      const notes = reviewNotesMap[appealId] || '';
      const res = await apiClient.patch('/admin/sanctions/appeals/' + appealId + '/review', {
        approved,
        reviewNotes: notes.trim() ? notes.trim() : (approved ? 'Banding disetujui oleh Admin Regional' : 'Banding ditolak oleh Admin Regional')
      });
      toast.success(res.data?.message || 'Review banding berhasil diproses.', { title: 'Sukses' });

      // Refresh data sanksi
      if (selectedMitraForSanctions) {
        const fresh = await apiClient.get('/admin/mitra/' + selectedMitraForSanctions.id + '/sanctions');
        setMitraSanctionsData(fresh.data);
      }
    } catch (err) {
      console.error('Gagal meninjau banding:', err);
      toast.error(err.response?.data?.message || 'Gagal memproses review banding.', { title: 'Gagal' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

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

      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> MANAJEMEN ARMADA & KENDARAAN (MITRA)
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Status Kendaraan & Verifikasi Mitra
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kendaraan didaftarkan langsung oleh masing-masing akun Mitra melalui menu panel mereka.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                {mitraFleetList.length} Mitra Terdaftar
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

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
                <th className="py-3 px-5 text-center">Sanksi & Poin</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoading ? (
                <SkeletonTableRows rows={4} columns={7} />
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
                    <td className="py-3.5 px-5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenSanctionsModal(item)}
                        className="px-3 py-1.5 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[11px] font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Sanksi & Banding</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
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

        {/* MOBILE CARD VIEW */}
        <div className="sm:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 text-center text-neutral-400 text-xs">Memuat data armada...</div>
          ) : filteredData.length > 0 ? (
            filteredData.map((item) => (
              <div key={item.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-neutral-800 text-[14px]">{item.name}</h4>
                    <p className="text-[11px] text-[#10367D] font-mono font-bold">ID: {item.id}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">{item.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[12px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Kendaraan:</span>
                    <span className="font-bold text-neutral-700">{item.hasVehicle ? `${item.vehicleType} - ${item.vehicleModel}` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Plat Nomor:</span>
                    <span className="font-mono font-bold text-neutral-700">{item.hasVehicle ? item.plateNumber : '-'}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenSanctionsModal(item)}
                    className="w-full py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[12px] font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Review Sanksi & Banding</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-neutral-400 text-xs">
              Tidak ada mitra di wilayah ini.
            </div>
          )}
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

      {/* MODAL SANKSI & BANDING MITRA */}
      <BaseModal
        isOpen={Boolean(selectedMitraForSanctions)}
        onClose={() => { if (!isSubmittingReview) setSelectedMitraForSanctions(null); }}
        title="Riwayat Sanksi & Skor Integritas"
        subtitle={selectedMitraForSanctions ? `${selectedMitraForSanctions.name} (ID: ${selectedMitraForSanctions.id})` : ''}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-[13px]">
          {isLoadingSanctions ? (
            <div className="py-8 text-center text-neutral-400">
              <span className="w-6 h-6 border-2 border-[#10367D] border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>Memuat rekam jejak integritas mitra...</p>
            </div>
          ) : mitraSanctionsData ? (
            <div className="space-y-4">
              {/* Header Banner Biru Bergaya Sidebar */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] p-4 sm:p-5 text-white shadow-md">
                <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute bottom-0 right-20 h-16 w-16 rounded-full bg-cyan-400/20 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        PANEL REVIEW BANDING WILAYAH
                      </span>
                    </div>
                    <h4 className="text-[17px] font-bold text-white">
                      {selectedMitraForSanctions?.name || 'Mitra'}
                    </h4>
                    <p className="text-[11px] text-blue-100 font-mono mt-0.5">
                      ID Mitra: #{selectedMitraForSanctions?.id} &bull; {selectedMitraForSanctions?.email}
                    </p>
                  </div>

                  <div className="px-3.5 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2.5 self-start sm:self-auto shadow-xs">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200 block">
                        Skor Integritas
                      </span>
                      <span className={`text-[16px] font-extrabold ${
                        (mitraSanctionsData.currentScore ?? 100) >= 80 ? 'text-emerald-300' :
                        (mitraSanctionsData.currentScore ?? 100) >= 50 ? 'text-amber-300' : 'text-rose-300'
                      }`}>
                        {mitraSanctionsData.currentScore} <span className="text-xs text-blue-200 font-normal">/ {mitraSanctionsData.baseScore || 100}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ringkasan Status Akun */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Status Kepatuhan Akun</p>
                  <p className="text-[13px] font-bold text-neutral-800">
                    {mitraSanctionsData.isSuspended ? (
                      <span className="text-rose-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> TERSUSPENSI AKTIF
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> AKTIF & BEREPUTASI BAIK
                      </span>
                    )}
                  </p>
                </div>

                {mitraSanctionsData.suspendedUntil && (
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Masa Suspensi</p>
                    <p className="text-[12px] font-bold text-rose-600">
                      Hingga {new Date(mitraSanctionsData.suspendedUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  </div>
                )}
              </div>

              {/* Daftar Sanksi */}
              <div className="space-y-3">
                <h4 className="text-[14px] font-bold text-neutral-800">Daftar Sanksi & Pengajuan Banding</h4>
                {(!mitraSanctionsData.sanctions || mitraSanctionsData.sanctions.length === 0) ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Mitra ini belum pernah menerima sanksi atau potongan poin (Rekam jejak bersih).</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {mitraSanctionsData.sanctions.map((s) => {
                      const latestAppeal = s.appeals?.[0];
                      const isWaived = s.status === 'WAIVED';

                      return (
                        <div key={s.id} className="p-3.5 bg-white border border-neutral-200 rounded-2xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                                isWaived ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {s.violationType === 'MITRA_CANCEL_EARLY' ? 'Batal Awal' :
                                 s.violationType === 'MITRA_CANCEL_LATE' ? 'Batal Mendadak' :
                                 s.violationType === 'MITRA_NO_SHOW' ? 'Tidak Hadir (No-Show)' : s.violationType}
                              </span>
                              <span className="text-[11px] text-neutral-400">
                                {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isWaived ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isWaived ? 'Sanksi Dicabut' : `-${s.scoreDeduction} Poin`}
                              </span>
                              {s.isSuspended && !isWaived && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                  Suspensi
                                </span>
                              )}
                            </div>
                          </div>

                          {s.tripDetails && (
                            <div className="text-[12px] text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 flex items-center justify-between flex-wrap gap-2">
                              <span>Trip #{s.tripDetails.id}: <strong>{s.tripDetails.from} &rarr; {s.tripDetails.to}</strong></span>
                              <span className="text-[11px] text-neutral-400">{s.tripDetails.date ? s.tripDetails.date.split('T')[0] : ''}</span>
                            </div>
                          )}

                          {/* Bagian Banding */}
                          {latestAppeal ? (
                            <div className="rounded-2xl border-2 border-blue-200/90 bg-gradient-to-br from-white via-blue-50/40 to-slate-50 p-4 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-blue-100">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-[#10367D] text-white rounded-lg shadow-2xs">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-neutral-800 text-[12px] block">
                                      Permohonan Banding Mitra
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      Diajukan {new Date(latestAppeal.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                                    </span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                  latestAppeal.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  latestAppeal.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                }`}>
                                  {latestAppeal.status === 'APPROVED' ? 'Disetujui' :
                                   latestAppeal.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Review Admin'}
                                </span>
                              </div>

                              {/* Alasan Mitra */}
                              <div className="p-3 bg-white rounded-xl border border-neutral-200/80 text-[12px] space-y-1 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">
                                  Alasan / Kronologi dari Mitra:
                                </span>
                                <p className="text-neutral-800 leading-relaxed font-medium">
                                  &ldquo;{latestAppeal.reason}&rdquo;
                                </p>
                              </div>

                              {latestAppeal.evidenceUrl && (
                                <div>
                                  <a
                                    href={latestAppeal.evidenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100/70 hover:bg-blue-200 text-[#10367D] font-bold rounded-xl text-[11px] transition shadow-2xs"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Lihat Lampiran Bukti Dokumen / Foto &rarr;</span>
                                  </a>
                                </div>
                              )}

                              {/* Form Review Jika Masih Pending */}
                              {latestAppeal.status === 'PENDING' && (
                                <div className="pt-2.5 border-t border-blue-200/80 space-y-2.5">
                                  <label className="block text-[11px] font-bold text-neutral-700">
                                    Catatan Tinjauan & Verifikasi Admin:
                                  </label>
                                  <input
                                    type="text"
                                    value={reviewNotesMap[latestAppeal.id] || ''}
                                    onChange={(e) => setReviewNotesMap({ ...reviewNotesMap, [latestAppeal.id]: e.target.value })}
                                    placeholder="Contoh: Bukti kuitansi bengkel terverifikasi sah / Alasan penolakan..."
                                    className="w-full px-3.5 py-2 text-[12px] border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10367D] bg-white text-neutral-800 shadow-2xs transition"
                                  />
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={isSubmittingReview}
                                      onClick={() => handleReviewAppeal(latestAppeal.id, true)}
                                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 text-white rounded-xl font-bold text-[12px] transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Setujui Banding (Cabut Sanksi)</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSubmittingReview}
                                      onClick={() => handleReviewAppeal(latestAppeal.id, false)}
                                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-105 text-white rounded-xl font-bold text-[12px] transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Tolak Banding</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {latestAppeal.reviewNotes && latestAppeal.status !== 'PENDING' && (
                                <div className="p-2.5 bg-neutral-100/70 rounded-xl border border-neutral-200 text-[11px] text-neutral-600">
                                  <strong>Catatan Review:</strong> &ldquo;{latestAppeal.reviewNotes}&rdquo;
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-neutral-400 italic">Mitra belum mengajukan banding untuk sanksi ini.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 text-center py-4">Data tidak tersedia.</p>
          )}

          <div className="flex justify-end pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setSelectedMitraForSanctions(null)}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl transition cursor-pointer text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}