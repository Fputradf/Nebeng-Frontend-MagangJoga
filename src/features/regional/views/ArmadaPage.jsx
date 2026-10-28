import { useState, useEffect } from 'react';
import { Truck, Search, ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
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
              {/* Ringkasan Skor & Status */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Status Akun</p>
                  <p className="text-[14px] font-bold text-neutral-800">
                    {mitraSanctionsData.isSuspended ? (
                      <span className="text-rose-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-4 h-4" /> TERSUSPENSI AKTIF
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" /> AKTIF & BEREPUTASI
                      </span>
                    )}
                  </p>
                  {mitraSanctionsData.suspendedUntil && (
                    <p className="text-[11px] text-rose-500 mt-0.5">
                      Suspensi hingga: {new Date(mitraSanctionsData.suspendedUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Skor Integritas</p>
                  <p className={`text-[22px] font-extrabold ${
                    mitraSanctionsData.currentScore >= 80 ? 'text-emerald-600' :
                    mitraSanctionsData.currentScore >= 50 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {mitraSanctionsData.currentScore} <span className="text-[13px] text-neutral-400 font-normal">/ {mitraSanctionsData.baseScore}</span>
                  </p>
                </div>
              </div>

              {/* Daftar Sanksi */}
              <div className="space-y-3">
                <h4 className="text-[14px] font-bold text-neutral-800">Daftar Sanksi Pelanggaran</h4>
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
                        <div key={s.id} className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
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
                            <div className="text-[12px] text-neutral-600 bg-neutral-50 p-2 rounded-lg border border-neutral-100 flex items-center justify-between">
                              <span>Trip #{s.tripDetails.id}: {s.tripDetails.from} &rarr; {s.tripDetails.to}</span>
                              <span className="text-[11px] text-neutral-400">{s.tripDetails.date ? s.tripDetails.date.split('T')[0] : ''}</span>
                            </div>
                          )}

                          {/* Bagian Banding */}
                          {latestAppeal ? (
                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-[12px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-neutral-800">Pengajuan Banding Mitra:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  latestAppeal.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                  latestAppeal.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {latestAppeal.status === 'APPROVED' ? 'DISETUJUI' :
                                   latestAppeal.status === 'REJECTED' ? 'DITOLAK' : 'MENUNGGU TINJAUAN ADMIN'}
                                </span>
                              </div>

                              <p className="text-neutral-700 bg-white p-2 rounded border border-neutral-200/60 text-[11px]">
                                "{latestAppeal.reason}"
                              </p>

                              {latestAppeal.evidenceUrl && (
                                <a
                                  href={latestAppeal.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline inline-flex items-center gap-1 text-[11px] font-bold"
                                >
                                  <ExternalLink className="w-3 h-3" /> Lihat Bukti Dokumen / Foto
                                </a>
                              )}

                              {/* Form Review Jika Masih Pending */}
                              {latestAppeal.status === 'PENDING' && (
                                <div className="pt-2 border-t border-blue-200/50 space-y-2">
                                  <label className="block text-[11px] font-bold text-neutral-700">
                                    Catatan Tinjauan Admin:
                                  </label>
                                  <input
                                    type="text"
                                    value={reviewNotesMap[latestAppeal.id] || ''}
                                    onChange={(e) => setReviewNotesMap({ ...reviewNotesMap, [latestAppeal.id]: e.target.value })}
                                    placeholder="Contoh: Bukti bengkel terverifikasi sah / Alasan ditolak..."
                                    className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                                  />
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={isSubmittingReview}
                                      onClick={() => handleReviewAppeal(latestAppeal.id, true)}
                                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      Setujui Banding (Cabut Sanksi)
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSubmittingReview}
                                      onClick={() => handleReviewAppeal(latestAppeal.id, false)}
                                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      Tolak Banding
                                    </button>
                                  </div>
                                </div>
                              )}

                              {latestAppeal.reviewNotes && latestAppeal.status !== 'PENDING' && (
                                <p className="text-[11px] text-neutral-500 italic">
                                  Catatan Tinjauan: "{latestAppeal.reviewNotes}"
                                </p>
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