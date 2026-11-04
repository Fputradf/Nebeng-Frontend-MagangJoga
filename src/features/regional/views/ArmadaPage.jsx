import { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Check,
  X,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Building,
  Flag,
  AlertCircle,
  MapPin,
  ArrowRight
} from 'lucide-react';
import apiClient from '../../../services/apiClient';
import reportService from '../../../services/reportService';
import { BASE_URL } from '../../../config/env';
import BaseModal from '../../../components/ui/BaseModal';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { useAuth } from '../../../context/AuthContext';
import { regionalService } from '../../../services/regionalService';

const getFullFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseURL = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;
  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function FleetCourierPage() {
  const toast = useToast();
  const { session, adminProfile } = useAuth();
  const [scopeTab, setScopeTab] = useState('homebase'); // 'homebase' (Mitra Binaan) | 'active_pos' (Mitra di Pos Wilayah)
  const [mitraFleetList, setMitraFleetList] = useState([]);
  const [activePosMitraList, setActivePosMitraList] = useState([]);
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

  // Pelaporan Insiden Operasional Pos
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedActiveMitraForReport, setSelectedActiveMitraForReport] = useState(null);
  const [reportCategory, setReportCategory] = useState('SERVICE_QUALITY');
  const [reportSeverity, setReportSeverity] = useState('MEDIUM');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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

  const handleOpenActiveMitraReportModal = (item) => {
    setSelectedActiveMitraForReport(item);
    setReportTitle(`Pelanggaran Operasional di Pos: ${item.posName}`);
    setReportCategory('SERVICE_QUALITY');
    setReportSeverity('MEDIUM');
    setReportDescription('');
    setReportModalOpen(true);
  };

  const handleSubmitActiveMitraReport = async (e) => {
    e.preventDefault();
    if (!selectedActiveMitraForReport) return;
    if (!reportDescription.trim()) {
      toast.error('Harap tuliskan rincian kejadian di pos.', { title: 'Form Belum Lengkap' });
      return;
    }

    try {
      setIsSubmittingReport(true);
      await reportService.createReport({
        reportedUserId: selectedActiveMitraForReport.driverId,
        tripId: selectedActiveMitraForReport.tripId,
        pickupPointId: selectedActiveMitraForReport.posId,
        category: reportCategory,
        severity: reportSeverity,
        title: reportTitle.trim() || `Laporan Operasional Pos ${selectedActiveMitraForReport.posName}`,
        description: `[LAPORAN POS WILAYAH]\nMitra: ${selectedActiveMitraForReport.name} (Homebase: ${selectedActiveMitraForReport.homeRegionName})\nPos Keberangkatan: ${selectedActiveMitraForReport.posName}\nInsiden: ${reportDescription.trim()}`
      });

      toast.success('Laporan insiden pos berhasil dikirimkan ke admin homebase & pusat.', { title: 'Laporan Terkirim' });
      setReportModalOpen(false);
      setSelectedActiveMitraForReport(null);
    } catch (err) {
      console.error('Gagal melaporkan:', err);
      toast.error(err.response?.data?.message || 'Gagal mengirimkan laporan.', { title: 'Gagal' });
    } finally {
      setIsSubmittingReport(false);
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

        if (scopeTab === 'active_pos') {
          // Mode 2: Mitra yang sedang aktif mengambil trip dari pos di wilayah ini (lintas wilayah)
          const tripRes = await apiClient.get('/trips', {
            params: {
              ...(currentRegionId ? { regionId: currentRegionId } : {}),
              scope: 'origin',
              page: currentPage,
              limit: limit
            }
          }).catch(() => ({ data: { data: [], meta: null } }));

          const rawTrips = Array.isArray(tripRes.data)
            ? tripRes.data
            : (tripRes.data?.data || []);
          const metaData = tripRes.data?.meta || null;

          const formattedActive = rawTrips.map(t => {
            const driverHomeRegionId = t.mitra?.homeRegionId ? String(t.mitra.homeRegionId) : (t.mitra?.regionId ? String(t.mitra.regionId) : null);
            const isLocal = Boolean(currentRegionId && driverHomeRegionId && String(currentRegionId) === driverHomeRegionId);
            return {
              tripId: String(t.id),
              driverId: t.mitra?.id ? String(t.mitra.id) : (t.mitraId ? String(t.mitraId) : '-'),
              name: t.mitra?.name || 'Driver Mitra',
              phone: t.mitra?.phone || '-',
              email: t.mitra?.email || '-',
              homeRegionName: t.mitra?.homeRegionName || (isLocal ? 'Wilayah Lokal' : 'Lintas Wilayah'),
              isLocal,
              posName: t.originPoint?.name || 'Pos Wilayah',
              posId: t.originPoint?.id ? String(t.originPoint.id) : null,
              destinationPos: t.destinationPoint?.name || 'Tujuan',
              vehicleType: t.vehicle?.type || '-',
              vehicleModel: t.vehicle?.model || '-',
              plateNumber: t.vehicle?.plateNumber || '-',
              status: t.status === 'in_transit' ? 'Sedang Berjalan' : (t.status === 'scheduled' ? 'Terjadwal' : t.status),
              rawStatus: t.status
            };
          });

          if (isMounted) {
            setActivePosMitraList(formattedActive);
            setPaginationMeta(metaData);
          }
        } else {
          // Mode 1: Mitra Binaan yang terdaftar di wilayah ini (Homebase)
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
  }, [session?.regionId, adminProfile?.regionId, currentPage, limit, scopeTab]);

  const filteredHomebaseData = mitraFleetList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActivePosData = activePosMitraList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.posName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* DUAL SCOPE SELECTOR TAB */}
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setScopeTab('homebase'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition flex items-center gap-2 cursor-pointer ${
              scopeTab === 'homebase'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Building size={14} />
            <span>Mitra Binaan (Homebase Saya)</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              scopeTab === 'homebase' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {mitraFleetList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setScopeTab('active_pos'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition flex items-center gap-2 cursor-pointer ${
              scopeTab === 'active_pos'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Truck size={14} />
            <span>Mitra Aktif di Pos (Operasional Lapangan)</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              scopeTab === 'active_pos' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {activePosMitraList.length}
            </span>
          </button>
        </div>

        <div className="text-[12px] text-neutral-500 font-medium px-2">
          {scopeTab === 'homebase'
            ? '🏛️ Mitra terdaftar di wilayah Anda (Wewenang Penuh: verifikasi, ubah status akun & sanksi administratif).'
            : '⚡ Mitra (dari pos/wilayah mana saja) yang sedang standby atau jalan di pos wilayah Anda.'}
        </div>
      </div>

      {/* SEARCH & LIMIT CONTROL */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={scopeTab === 'homebase' ? "Cari nama mitra, email..." : "Cari mitra, pos asal, plat nomor..."}
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
            Total: <span className="font-bold text-neutral-800">
              {scopeTab === 'homebase' ? filteredHomebaseData.length : filteredActivePosData.length} Data
            </span>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          {scopeTab === 'homebase' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-5">ID & Nama Mitra Pemilik</th>
                  <th className="py-3 px-5">Email & Kontak</th>
                  <th className="py-3 px-5">Kendaraan</th>
                  <th className="py-3 px-5">Plat Nomor</th>
                  <th className="py-3 px-5">Status Akun</th>
                  <th className="py-3 px-5">Wewenang Wilayah</th>
                  <th className="py-3 px-5 text-center">Sanksi & Banding</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-[12px]">
                {isLoading ? (
                  <SkeletonTableRows rows={4} columns={7} />
                ) : filteredHomebaseData.length > 0 ? (
                  filteredHomebaseData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#74B4D9]/10 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 text-[13px]">{item.name}</div>
                        <div className="text-[11px] font-bold text-[#10367D] font-mono">ID: {item.id}</div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-700">
                        <div>{item.email}</div>
                        <div className="text-[11px] text-neutral-400">{item.phone}</div>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-neutral-800">
                        {item.hasVehicle ? `${item.vehicleType} - ${item.vehicleModel}` : '-'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-neutral-800">
                        {item.hasVehicle ? item.plateNumber : '-'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#10367D] border border-blue-200">
                          <ShieldCheck size={12} /> Wewenang Penuh
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
                        description="Belum ada akun ber-role mitra di bawah binaan homebase wilayah ini."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* TAB 2: ACTIVE MITRA IN POS */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-5">Mitra Driver</th>
                  <th className="py-3 px-5">Homebase Mitra</th>
                  <th className="py-3 px-5">Pos Operasional di Wilayah Ini</th>
                  <th className="py-3 px-5">Kendaraan & Plat</th>
                  <th className="py-3 px-5">Status Operasional</th>
                  <th className="py-3 px-5">Lingkup Wewenang</th>
                  <th className="py-3 px-5 text-center">Aksi Operasional</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-[12px]">
                {isLoading ? (
                  <SkeletonTableRows rows={4} columns={7} />
                ) : filteredActivePosData.length > 0 ? (
                  filteredActivePosData.map((item) => (
                    <tr key={item.tripId} className="hover:bg-[#74B4D9]/10 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 text-[13px]">{item.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">Trip #{item.tripId} | {item.phone}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        {item.isLocal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck size={12} /> Mitra Lokal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Homebase mitra berada di wilayah lain">
                            <Building size={12} /> Lintas: {item.homeRegionName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 flex items-center gap-1">
                          <MapPin size={12} className="text-[#10367D] shrink-0" />
                          <span>{item.posName}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <span>Menuju:</span>
                          <span className="font-medium text-neutral-600">{item.destinationPos}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800">{item.vehicleType} - {item.vehicleModel}</div>
                        <div className="font-mono text-[11px] text-neutral-500">{item.plateNumber}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.rawStatus === 'in_transit' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Flag size={12} /> Operasional Pos
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenActiveMitraReportModal(item)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 border border-rose-200"
                        >
                          <Flag className="w-3.5 h-3.5 text-rose-600" />
                          <span>Laporkan Pos</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">
                      <EmptyState
                        icon={Truck}
                        title="Tidak Ada Trip / Mitra di Pos"
                        description="Belum ada armada mitra yang sedang mengambil trip dari pos di wilayah ini."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="sm:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 text-center text-neutral-400 text-xs">Memuat data armada...</div>
          ) : (scopeTab === 'homebase' ? filteredHomebaseData : filteredActivePosData).length > 0 ? (
            (scopeTab === 'homebase' ? filteredHomebaseData : filteredActivePosData).map((item) => (
              <div key={item.id || item.tripId} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-neutral-800 text-[14px]">{item.name}</h4>
                    <p className="text-[11px] text-[#10367D] font-mono font-bold">
                      {scopeTab === 'homebase' ? `ID: ${item.id}` : `Trip #${item.tripId}`}
                    </p>
                    <p className="text-[12px] text-neutral-500 mt-0.5">{item.email || item.phone}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'Aktif' || item.rawStatus === 'in_transit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {(item.status || item.rawStatus || '').toUpperCase()}
                  </span>
                </div>

                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[12px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Kendaraan:</span>
                    <span className="font-bold text-neutral-700">
                      {item.hasVehicle ? `${item.vehicleType} - ${item.vehicleModel}` : (item.vehicleType ? `${item.vehicleType} - ${item.vehicleModel}` : '-')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Plat Nomor:</span>
                    <span className="font-mono font-bold text-neutral-700">{item.plateNumber || '-'}</span>
                  </div>
                  {scopeTab === 'active_pos' && (
                    <div className="flex justify-between pt-1 border-t border-neutral-200/50">
                      <span className="text-neutral-400">Pos Wilayah:</span>
                      <span className="font-semibold text-neutral-800">{item.posName}</span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-end">
                  {scopeTab === 'homebase' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenSanctionsModal(item)}
                      className="w-full py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[12px] font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Review Sanksi & Banding</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenActiveMitraReportModal(item)}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[12px] font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-600" />
                      <span>Laporkan Masalah di Pos</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-neutral-400 text-xs">
              Tidak ada data mitra untuk kategori ini.
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
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={getFullFileUrl(latestAppeal.evidenceUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100/70 hover:bg-blue-200 text-[#10367D] font-bold rounded-xl text-[11px] transition shadow-2xs"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>Buka Lampiran Bukti Foto &rarr;</span>
                                    </a>
                                  </div>
                                  {/\.(jpg|jpeg|png|webp)($|\?)/i.test(latestAppeal.evidenceUrl) && (
                                    <div className="max-w-xs rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xs">
                                      <img
                                        src={getFullFileUrl(latestAppeal.evidenceUrl)}
                                        alt="Bukti Banding"
                                        className="w-full max-h-48 object-contain bg-black/5"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                    </div>
                                  )}
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

      {/* MODAL LAPORKAN INSIDEN OPERASIONAL POS */}
      <BaseModal
        isOpen={reportModalOpen}
        onClose={() => { if (!isSubmittingReport) setReportModalOpen(false); }}
        title="Laporkan Insiden Operasional di Pos"
        maxWidth="max-w-lg"
      >
        {selectedActiveMitraForReport && (
          <form onSubmit={handleSubmitActiveMitraReport} className="space-y-4 font-['Inter']">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-900 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>Pencatatan Insiden Pos Wilayah</span>
              </div>
              Jika mitra (baik mitra lokal maupun lintas wilayah) melanggar tata tertib pos atau merugikan penumpang, admin pos setempat dapat mencatat laporan ini. Laporan akan otomatis diteruskan ke admin homebase mitra dan superadmin.
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-[12px] space-y-1">
              <div><span className="text-neutral-500">Nama Mitra:</span> <span className="font-bold text-neutral-800">{selectedActiveMitraForReport.name}</span></div>
              <div><span className="text-neutral-500">Trip Aktif:</span> <span className="font-mono font-bold text-neutral-800">#{selectedActiveMitraForReport.tripId}</span></div>
              <div>
                <span className="text-neutral-500">Homebase Mitra:</span>{' '}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedActiveMitraForReport.isLocal ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {selectedActiveMitraForReport.homeRegionName}
                </span>
              </div>
              <div><span className="text-neutral-500">Pos Operasional:</span> <span className="font-semibold text-neutral-800">{selectedActiveMitraForReport.posName}</span></div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Kategori Pelanggaran
              </label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]"
              >
                <option value="SERVICE_QUALITY">Pelayanan / Keterlambatan Jadwal Pos</option>
                <option value="SAFETY_AND_HARASSMENT">Ketertiban / Keamanan di Pos</option>
                <option value="FRAUD_AND_FINANCIAL">Kecurangan / Penarikan Ongkos Ilegal</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Tingkat Urgensi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'LOW', label: 'Rendah (Teguran)' },
                  { id: 'MEDIUM', label: 'Sedang (Peringatan)' },
                  { id: 'HIGH', label: 'Tinggi (Tindakan Cepat)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setReportSeverity(s.id)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                      reportSeverity === s.id
                        ? 'bg-[#10367D] text-white border-[#10367D]'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Judul Laporan
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Contoh: Ketidaktertiban di antrean Pos X"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[13px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Kronologi Kejadian di Pos
              </label>
              <textarea
                rows={3}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Tuliskan kronologi secara detail..."
                className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-[13px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]"
              />
            </div>

            <div className="pt-2 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                disabled={isSubmittingReport}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[13px] font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold rounded-xl transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmittingReport ? 'Mengirim...' : 'Kirim Laporan Pos'}
              </button>
            </div>
          </form>
        )}
      </BaseModal>
    </div>
  );
}