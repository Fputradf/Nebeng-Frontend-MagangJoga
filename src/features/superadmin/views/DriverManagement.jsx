import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Car,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Eye,
  EyeOff,
  UserCheck,
  Users,
  Phone,
  Mail,
  MapPin,
  Truck,
  ShieldCheck,
  Calendar,
  X,
  Check,
  Filter,
  RefreshCw,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { BASE_URL } from '../../../config/env';
import BaseModal from '../../../components/ui/BaseModal';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { regionalService } from '../../../services/regionalService';
import { getAllRegions } from '../../../services/regionService';
import { updateUserStatus } from '../../../services/userService';

const getFullFileUrl = (path) => {
  if (!path) return null;
  if (
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const baseURL = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;
  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function DriverManagement() {
  const toast = useToast();

  const [drivers, setDrivers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState(null);

  // PII masking phone
  const [unmaskedPhones, setUnmaskedPhones] = useState({});

  // Modals
  const [selectedDriverForDetail, setSelectedDriverForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedDriverForSanctions, setSelectedDriverForSanctions] = useState(null);
  const [mitraSanctionsData, setMitraSanctionsData] = useState(null);
  const [isLoadingSanctions, setIsLoadingSanctions] = useState(false);
  const [reviewNotesMap, setReviewNotesMap] = useState({});
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Load regions
  useEffect(() => {
    let isMounted = true;
    const fetchRegions = async () => {
      try {
        const res = await getAllRegions(1, 100);
        const regionList = Array.isArray(res) ? res : res?.data || [];
        if (isMounted) setRegions(regionList);
      } catch (err) {
        console.warn('Gagal memuat daftar wilayah:', err);
      }
    };
    fetchRegions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load drivers & vehicles
  const loadDriversData = useCallback(async () => {
    setIsLoading(true);
    try {
      const regionParam = selectedRegionId || null;
      const [usersRes, vehiclesRes] = await Promise.all([
        regionalService
          .getUsersByRole('mitra', regionParam, currentPage, limit)
          .catch(() => ({ data: [], meta: null })),
        regionalService
          .getVehicles(regionParam, currentPage, limit)
          .catch(() => ({ data: [], meta: null }))
      ]);

      const rawUsers = Array.isArray(usersRes)
        ? usersRes
        : usersRes?.data || [];
      const rawVehicles = Array.isArray(vehiclesRes)
        ? vehiclesRes
        : vehiclesRes?.data || [];
      const meta = usersRes?.meta || null;

      // Map vehicle by owner
      const vehicleByUserId = new Map();
      rawVehicles.forEach((v) => {
        const ownerId = v.userId ?? v.user_id ?? v.user?.id;
        if (ownerId == null) return;
        const key = String(ownerId);
        if (!vehicleByUserId.has(key)) {
          vehicleByUserId.set(key, v);
        }
      });

      const formatted = rawUsers.map((u) => {
        const uid = String(u.id);
        const vehicle = vehicleByUserId.get(uid) || (u.vehicles && u.vehicles[0]) || null;
        const profile = u.profile || {};

        return {
          id: uid,
          name: u.name || 'Mitra Driver',
          email: u.email || '-',
          phone: u.phone || '-',
          avatar: u.avatarUrl || profile.faceImageUrl || null,
          role: u.role || 'mitra',
          status: u.status || 'active',
          statusVerification: u.statusVerification || 'unverified',
          regionId: u.regionId ? String(u.regionId) : null,
          regionName:
            u.region?.name ||
            regions.find((r) => String(r.id) === String(u.regionId))?.name ||
            'Nasional / Umum',
          driverScore: u.driverScore ?? profile.driverScore ?? 100,
          vehicle: vehicle
            ? {
                id: vehicle.id,
                type: vehicle.type || 'Mobil',
                brand: vehicle.brand || vehicle.model || 'Kendaraan Mitra',
                model: vehicle.model || '',
                plateNumber: vehicle.plateNumber || '-',
                capacity: vehicle.capacity || 4,
                year: vehicle.year || '-'
              }
            : null,
          createdAt: u.createdAt
        };
      });

      setDrivers(formatted);
      setPaginationMeta(meta);
    } catch (err) {
      console.error('Gagal memuat data driver:', err);
      toast.error('Gagal memuat data driver dari server.', { title: 'Gagal' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegionId, currentPage, limit, regions, toast]);

  useEffect(() => {
    loadDriversData();
  }, [loadDriversData]);

  // Masking helpers
  const maskPhone = (phone) => {
    if (!phone || phone.length < 8) return phone;
    return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
  };

  const toggleMaskPhone = (id) => {
    setUnmaskedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sanctions modal logic
  const handleOpenSanctionsModal = async (driver) => {
    setSelectedDriverForSanctions(driver);
    setIsLoadingSanctions(true);
    try {
      const res = await apiClient.get(`/admin/mitra/${driver.id}/sanctions`);
      setMitraSanctionsData(res.data);
    } catch (err) {
      console.error('Gagal mengambil data sanksi mitra:', err);
      toast.error(err.response?.data?.message || 'Gagal mengambil data sanksi driver.', { title: 'Gagal' });
    } finally {
      setIsLoadingSanctions(false);
    }
  };

  const handleReviewAppeal = async (appealId, approved) => {
    setIsSubmittingReview(true);
    try {
      const notes = reviewNotesMap[appealId] || '';
      const res = await apiClient.patch(`/admin/sanctions/appeals/${appealId}/review`, {
        approved,
        reviewNotes: notes.trim()
          ? notes.trim()
          : approved
            ? 'Banding disetujui oleh Superadmin'
            : 'Banding ditolak oleh Superadmin'
      });
      toast.success(res.data?.message || 'Review banding berhasil diproses.', { title: 'Sukses' });

      if (selectedDriverForSanctions) {
        const fresh = await apiClient.get(`/admin/mitra/${selectedDriverForSanctions.id}/sanctions`);
        setMitraSanctionsData(fresh.data);
      }
    } catch (err) {
      console.error('Gagal meninjau banding:', err);
      toast.error(err.response?.data?.message || 'Gagal memproses review banding.', { title: 'Gagal' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Status alert confirmation modal
  const [driverStatusModal, setDriverStatusModal] = useState({
    isOpen: false,
    driver: null,
    targetStatus: null
  });

  const handleInitiateStatusChange = (driver) => {
    const targetStatus = driver.status === 'active' ? 'suspended' : 'active';
    setDriverStatusModal({
      isOpen: true,
      driver,
      targetStatus
    });
  };

  const handleConfirmStatusChange = async () => {
    const { driver, targetStatus } = driverStatusModal;
    if (!driver || !targetStatus) return;

    setIsUpdatingStatus(true);
    try {
      await updateUserStatus(driver.id, targetStatus);
      toast.success(
        targetStatus === 'active'
          ? `Akun driver ${driver.name} berhasil diaktifkan kembali.`
          : `Akun driver ${driver.name} berhasil ditangguhkan (SUSPENDED).`,
        {
          title: 'Status Akun Diperbarui'
        }
      );
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, status: targetStatus } : d))
      );
      if (selectedDriverForDetail && selectedDriverForDetail.id === driver.id) {
        setSelectedDriverForDetail((prev) => ({ ...prev, status: targetStatus }));
      }
      setDriverStatusModal({ isOpen: false, driver: null, targetStatus: null });
    } catch (err) {
      console.error('Gagal mengubah status akun driver:', err);
      toast.error(err.response?.data?.message || 'Gagal memperbarui status akun driver.', { title: 'Gagal' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filtered data in-memory (search & sub-filters)
  const filteredDrivers = useMemo(() => {
    return drivers.filter((item) => {
      // Search
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.vehicle?.plateNumber &&
          item.vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.status === 'active') ||
        (statusFilter === 'INACTIVE' && (item.status === 'inactive' || item.status === 'suspended'));

      // KYC
      const matchKyc =
        kycFilter === 'ALL' ||
        (kycFilter === 'APPROVED' && item.statusVerification === 'approved') ||
        (kycFilter === 'PENDING' && item.statusVerification === 'pending') ||
        (kycFilter === 'UNVERIFIED' && (item.statusVerification === 'unverified' || !item.statusVerification)) ||
        (kycFilter === 'REJECTED' && item.statusVerification === 'rejected');

      return matchSearch && matchStatus && matchKyc;
    });
  }, [drivers, searchQuery, statusFilter, kycFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => d.status === 'active').length;
    const kycApproved = drivers.filter((d) => d.statusVerification === 'approved').length;
    const suspended = drivers.filter((d) => d.status === 'suspended' || d.status === 'inactive').length;
    return { total, active, kycApproved, suspended };
  }, [drivers]);

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
                <Car className="w-3.5 h-3.5" /> FITUR OPERASIONAL REGIONAL &bull; SUPERADMIN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manajemen Driver & Pengemudi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Pantau seluruh akun Mitra Pengemudi (Driver), status kepemilikan kendaraan, rekam jejak sanksi, dan verifikasi KYC.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              onClick={loadDriversData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/25 flex items-center gap-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                {stats.total} Driver Terdata
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Driver</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-800">{stats.total}</span>
            <span className="text-xs text-neutral-400">Akun Mitra</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Driver Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.active}</span>
            <span className="text-xs text-emerald-600 font-semibold">Siap Narik</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">KYC Terverifikasi</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.kycApproved}</span>
            <span className="text-xs text-blue-600 font-semibold">Dokumen Sah</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Suspensi / Nonaktif</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{stats.suspended}</span>
            <span className="text-xs text-rose-600 font-semibold">Perlu Tindakan</span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH CONTROLS ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari driver berdasarkan nama, email, nomor HP, atau plat nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <MapPin size={15} className="text-neutral-400 shrink-0 hidden sm:inline" />
            <select
              value={selectedRegionId}
              onChange={(e) => {
                setSelectedRegionId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-48 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#10367D] cursor-pointer"
            >
              <option value="">Semua Wilayah</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
            <span className="font-bold flex items-center gap-1 text-neutral-400 uppercase tracking-wider">
              <Filter size={12} /> Filter:
            </span>

            {/* Status Akun Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#10367D] cursor-pointer"
            >
              <option value="ALL">Status Akun: Semua</option>
              <option value="ACTIVE">Status: Aktif</option>
              <option value="INACTIVE">Status: Nonaktif / Suspend</option>
            </select>

            {/* Status KYC Filter */}
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#10367D] cursor-pointer"
            >
              <option value="ALL">KYC: Semua</option>
              <option value="APPROVED">KYC: Disetujui</option>
              <option value="PENDING">KYC: Menunggu Review</option>
              <option value="UNVERIFIED">KYC: Belum Verifikasi</option>
              <option value="REJECTED">KYC: Ditolak</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-neutral-600">
              <span>Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#10367D] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="text-[12px] font-semibold text-neutral-400">
              Ditemukan: <span className="font-bold text-neutral-800">{filteredDrivers.length} Driver</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── DRIVERS TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5 whitespace-nowrap">ID & Driver</th>
                <th className="py-3 px-5 whitespace-nowrap">Kontak</th>
                <th className="py-3 px-5 whitespace-nowrap">Wilayah</th>
                <th className="py-3 px-5 whitespace-nowrap">Armada / Kendaraan</th>
                <th className="py-3 px-5 text-center whitespace-nowrap">Status Akun</th>
                <th className="py-3 px-5 text-center whitespace-nowrap">Status KYC</th>
                <th className="py-3 px-5 text-center whitespace-nowrap min-w-[260px]">Aksi & Sanksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoading ? (
                <SkeletonTableRows rows={5} columns={7} />
              ) : filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => {
                  const isUnmasked = unmaskedPhones[driver.id];
                  return (
                    <tr key={driver.id} className="hover:bg-[#74B4D9]/10 transition">
                      {/* Driver info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-sm">
                            {driver.avatar ? (
                              <img
                                src={getFullFileUrl(driver.avatar)}
                                alt={driver.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              driver.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-800 text-[13px]">{driver.name}</div>
                            <div className="text-[11px] font-bold text-[#10367D] font-mono">
                              ID: #{driver.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-5">
                        <div className="text-neutral-700 font-medium">{driver.email}</div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 mt-0.5">
                          <span>{isUnmasked ? driver.phone : maskPhone(driver.phone)}</span>
                          <button
                            type="button"
                            onClick={() => toggleMaskPhone(driver.id)}
                            className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                            title={isUnmasked ? 'Sembunyikan Telepon' : 'Lihat Nomor Telepon Lengkap'}
                          >
                            {isUnmasked ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-neutral-700 font-semibold">
                          <MapPin size={13} className="text-brand-600 shrink-0" />
                          <span>{driver.regionName}</span>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3.5 px-5">
                        {driver.vehicle ? (
                          <div>
                            <div className="font-bold text-neutral-800">
                              {driver.vehicle.brand}
                            </div>
                            <div className="font-mono text-[11px] font-bold text-[#10367D] mt-0.5">
                              {driver.vehicle.plateNumber} &bull; {driver.vehicle.type}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
                            Belum Ada Kendaraan
                          </span>
                        )}
                      </td>

                      {/* Status Akun */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleInitiateStatusChange(driver)}
                          className={`w-28 py-1 rounded-full text-[11px] font-bold text-center inline-flex items-center justify-center transition cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-95 tracking-wide ${
                            driver.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title={`Status saat ini: ${driver.status === 'active' ? 'AKTIF' : 'SUSPENDED'}. Klik untuk mengubah status.`}
                        >
                          {driver.status === 'active' ? 'AKTIF' : 'SUSPENDED'}
                        </button>
                      </td>

                      {/* Status KYC */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span
                          className={`w-32 py-1 rounded-full text-[11px] font-bold text-center inline-flex items-center justify-center tracking-wide ${
                            driver.statusVerification === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : driver.statusVerification === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : driver.statusVerification === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          }`}
                        >
                          {driver.statusVerification === 'approved'
                            ? 'TERVERIFIKASI'
                            : driver.statusVerification === 'pending'
                              ? 'REVIEW PENDING'
                              : driver.statusVerification === 'rejected'
                                ? 'DITOLAK'
                                : 'BELUM KYC'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDriverForDetail(driver);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-700 border border-neutral-200 hover:border-neutral-300 text-xs font-semibold rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
                            title="Lihat detail lengkap profil driver"
                          >
                            <Eye className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Detail</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenSanctionsModal(driver)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-[#10367D] border border-blue-200 text-xs font-semibold rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
                            title="Lihat data sanksi dan permohonan banding"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-[#10367D]" />
                            <span>Sanksi</span>
                          </button>

                          {driver.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => handleInitiateStatusChange(driver)}
                              disabled={isUpdatingStatus}
                              className="w-[88px] justify-center px-2 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Tangguhkan (Suspend) Akun Driver"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Suspend</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiateStatusChange(driver)}
                              disabled={isUpdatingStatus}
                              className="w-[88px] justify-center px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Aktifkan Kembali Akun Driver"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Aktifkan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      title="Tidak Ada Driver Ditemukan"
                      description="Tidak ada data mitra driver yang sesuai dengan kriteria pencarian atau filter yang dipilih."
                      actionLabel="Reset Filter"
                      onAction={() => {
                        setSearchQuery('');
                        setSelectedRegionId('');
                        setStatusFilter('ALL');
                        setKycFilter('ALL');
                      }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {paginationMeta && paginationMeta.totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
            <div>
              Halaman {paginationMeta.currentPage} dari {paginationMeta.totalPages} ({paginationMeta.totalData} total driver)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= paginationMeta.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      <BaseModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Profil Mitra Driver"
      >
        {selectedDriverForDetail && (
          <div className="space-y-5 text-neutral-800">
            {/* Header Profil */}
            <div className="flex items-center gap-3.5 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-800 font-bold text-xl flex items-center justify-center shrink-0 overflow-hidden border border-brand-200">
                {selectedDriverForDetail.avatar ? (
                  <img
                    src={getFullFileUrl(selectedDriverForDetail.avatar)}
                    alt={selectedDriverForDetail.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedDriverForDetail.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">{selectedDriverForDetail.name}</h3>
                <p className="text-xs text-neutral-500 font-mono">ID Driver: #{selectedDriverForDetail.id}</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedDriverForDetail.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    STATUS: {selectedDriverForDetail.status.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedDriverForDetail.statusVerification === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    KYC: {selectedDriverForDetail.statusVerification.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Informasi Kontak & Akun */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-1">
                <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Email</span>
                <p className="font-semibold text-neutral-800">{selectedDriverForDetail.email}</p>
              </div>

              <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-1">
                <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Nomor Telepon</span>
                <p className="font-semibold font-mono text-neutral-800">{selectedDriverForDetail.phone}</p>
              </div>

              <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-1">
                <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Wilayah Operasional</span>
                <p className="font-semibold text-neutral-800">{selectedDriverForDetail.regionName}</p>
              </div>

              <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-1">
                <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Driver Score</span>
                <p className="font-bold text-emerald-600 text-sm">{selectedDriverForDetail.driverScore} / 100 Poin</p>
              </div>
            </div>

            {/* Kendaraan Terdaftar */}
            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-brand-600" /> Kendaraan Aktif Mitra
              </h4>
              {selectedDriverForDetail.vehicle ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-neutral-400 text-[11px]">Plat Nomor</span>
                    <p className="font-mono font-bold text-neutral-900">{selectedDriverForDetail.vehicle.plateNumber}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[11px]">Model / Merk</span>
                    <p className="font-semibold text-neutral-900">{selectedDriverForDetail.vehicle.brand}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[11px]">Jenis & Kapasitas</span>
                    <p className="font-semibold text-neutral-900">
                      {selectedDriverForDetail.vehicle.type} ({selectedDriverForDetail.vehicle.capacity} Kursi)
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic">Belum ada kendaraan yang didaftarkan untuk driver ini.</p>
              )}
            </div>

            {/* Aksi footer modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const driver = selectedDriverForDetail;
                    setIsDetailModalOpen(false);
                    handleOpenSanctionsModal(driver);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-[#10367D] border border-blue-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#10367D]" />
                  <span>Lihat Sanksi</span>
                </button>

                {selectedDriverForDetail.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleInitiateStatusChange(selectedDriverForDetail);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Suspend Driver</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleInitiateStatusChange(selectedDriverForDetail);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aktifkan Driver</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* ── SANCTIONS & APPEALS MODAL ── */}
      <BaseModal
        isOpen={!!selectedDriverForSanctions}
        onClose={() => {
          setSelectedDriverForSanctions(null);
          setMitraSanctionsData(null);
        }}
        title={`Sanksi & Banding: ${selectedDriverForSanctions?.name || 'Driver'}`}
      >
        <div className="space-y-4">
          {isLoadingSanctions ? (
            <div className="p-8 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#10367D] border-t-transparent rounded-full animate-spin" />
              <span>Memuat data sanksi driver...</span>
            </div>
          ) : mitraSanctionsData ? (
            <div className="space-y-4">
              {/* Header Skor & Suspensi */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Driver Score</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black text-neutral-800">
                      {mitraSanctionsData.driverScore ?? 100}
                    </span>
                    <span className="text-[12px] font-semibold text-neutral-400">/ 100 Poin</span>
                  </div>
                </div>

                {mitraSanctionsData.suspendedUntil && (
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Masa Suspensi</p>
                    <p className="text-[12px] font-bold text-rose-600">
                      Hingga{' '}
                      {new Date(mitraSanctionsData.suspendedUntil).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}{' '}
                      WIB
                    </p>
                  </div>
                )}
              </div>

              {/* Daftar Sanksi */}
              <div className="space-y-3">
                <h4 className="text-[13px] font-bold text-neutral-800">Daftar Pelanggaran & Pengajuan Banding</h4>
                {!mitraSanctionsData.sanctions || mitraSanctionsData.sanctions.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mitra driver ini belum pernah menerima sanksi atau potongan poin (Rekam jejak bersih).</span>
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
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                                  isWaived ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {s.violationType === 'MITRA_CANCEL_EARLY'
                                  ? 'Batal Awal'
                                  : s.violationType === 'MITRA_CANCEL_LATE'
                                    ? 'Batal Mendadak'
                                    : s.violationType === 'MITRA_NO_SHOW'
                                      ? 'Tidak Hadir (No-Show)'
                                      : s.violationType}
                              </span>
                              <span className="text-[11px] text-neutral-400">
                                {new Date(s.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}{' '}
                                WIB
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  isWaived
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isWaived ? 'Sanksi Dicabut' : `-${s.scoreDeduction} Poin`}
                              </span>
                            </div>
                          </div>

                          {/* Bagian Banding */}
                          {latestAppeal ? (
                            <div className="rounded-2xl border-2 border-blue-200/90 bg-gradient-to-br from-white via-blue-50/40 to-slate-50 p-4 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-blue-100">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-[#10367D] text-white rounded-lg shadow-2xs">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <h5 className="text-[12px] font-black text-neutral-900 tracking-tight">
                                      Permohonan Banding Driver
                                    </h5>
                                    <p className="text-[10px] font-semibold text-blue-600">
                                      Diajukan:{' '}
                                      {new Date(latestAppeal.createdAt).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    latestAppeal.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : latestAppeal.status === 'REJECTED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {latestAppeal.status === 'PENDING'
                                    ? 'Menunggu Review Superadmin'
                                    : latestAppeal.status === 'APPROVED'
                                      ? 'Banding Disetujui'
                                      : 'Banding Ditolak'}
                                </span>
                              </div>

                              <div className="text-xs text-neutral-700 bg-white/80 p-2.5 rounded-xl border border-blue-100">
                                <span className="font-bold text-neutral-500 block mb-0.5 text-[10px] uppercase">
                                  Alasan Pengajuan Banding:
                                </span>
                                {latestAppeal.reason}
                              </div>

                              {latestAppeal.status === 'PENDING' && (
                                <div className="space-y-2 pt-1">
                                  <input
                                    type="text"
                                    placeholder="Catatan peninjauan Superadmin (opsional)..."
                                    value={reviewNotesMap[latestAppeal.id] || ''}
                                    onChange={(e) =>
                                      setReviewNotesMap((prev) => ({
                                        ...prev,
                                        [latestAppeal.id]: e.target.value
                                      }))
                                    }
                                    className="w-full text-xs p-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#10367D]"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isSubmittingReview}
                                      onClick={() => handleReviewAppeal(latestAppeal.id, true)}
                                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      <Check size={13} />
                                      <span>Setujui Banding & Pulihkan Poin</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSubmittingReview}
                                      onClick={() => handleReviewAppeal(latestAppeal.id, false)}
                                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      <X size={13} />
                                      <span>Tolak Banding</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">Data sanksi tidak tersedia.</p>
          )}

          <div className="flex justify-end pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                setSelectedDriverForSanctions(null);
                setMitraSanctionsData(null);
              }}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── POP-UP ALERT / MODAL KONFIRMASI STATUS DRIVER ── */}
      <BaseModal
        isOpen={driverStatusModal.isOpen}
        onClose={() => {
          if (!isUpdatingStatus) {
            setDriverStatusModal({ isOpen: false, driver: null, targetStatus: null });
          }
        }}
        title={
          driverStatusModal.targetStatus === 'suspended'
            ? 'Konfirmasi Penangguhan Akun Driver'
            : 'Konfirmasi Pengaktifan Akun Driver'
        }
        subtitle="Peringatan Operasional Superadmin"
        maxWidth="max-w-md"
      >
        {driverStatusModal.driver && (
          <div className="space-y-4 pt-1 text-neutral-800">
            {/* Alert Banner / Icon Header */}
            <div
              className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
                driverStatusModal.targetStatus === 'suspended'
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  driverStatusModal.targetStatus === 'suspended'
                    ? 'bg-rose-100 text-rose-600 ring-4 ring-rose-50'
                    : 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50'
                }`}
              >
                {driverStatusModal.targetStatus === 'suspended' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h4
                  className={`font-bold text-sm leading-tight ${
                    driverStatusModal.targetStatus === 'suspended' ? 'text-rose-900' : 'text-emerald-900'
                  }`}
                >
                  {driverStatusModal.targetStatus === 'suspended'
                    ? 'Apakah Anda yakin ingin menangguhkan driver ini?'
                    : 'Apakah Anda yakin ingin mengaktifkan kembali driver ini?'}
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    driverStatusModal.targetStatus === 'suspended' ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {driverStatusModal.targetStatus === 'suspended'
                    ? 'Driver yang disuspend tidak akan dapat menerima order tebengan baru dan tidak muncul di hasil pencarian aplikasi penumpang.'
                    : 'Driver akan langsung aktif kembali di sistem dan siap menerima order tebengan pelanggan.'}
                </p>
              </div>
            </div>

            {/* Driver Profile Summary Card */}
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-sm">
                  {driverStatusModal.driver.avatar ? (
                    <img
                      src={getFullFileUrl(driverStatusModal.driver.avatar)}
                      alt={driverStatusModal.driver.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    driverStatusModal.driver.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-sm truncate">
                    {driverStatusModal.driver.name}
                  </p>
                  <p className="text-[11px] font-mono text-[#10367D] font-bold">
                    ID Driver: #{driverStatusModal.driver.id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/60 text-[11px]">
                <div>
                  <span className="text-neutral-400 block">Wilayah:</span>
                  <span className="font-semibold text-neutral-800">
                    {driverStatusModal.driver.regionName}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Kendaraan:</span>
                  <span className="font-semibold text-neutral-800 truncate block">
                    {driverStatusModal.driver.vehicle
                      ? `${driverStatusModal.driver.vehicle.brand} (${driverStatusModal.driver.vehicle.plateNumber})`
                      : 'Belum Terdaftar'}
                  </span>
                </div>
              </div>

              {/* Status Transition Visual */}
              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-neutral-200/80 text-xs">
                <span className="text-neutral-500 font-medium">Perubahan Status:</span>
                <div className="flex items-center gap-2 font-bold text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      driverStatusModal.driver.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {driverStatusModal.driver.status === 'active' ? 'AKTIF' : 'SUSPENDED'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      driverStatusModal.targetStatus === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {driverStatusModal.targetStatus === 'active' ? 'AKTIF' : 'SUSPENDED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() =>
                  setDriverStatusModal({ isOpen: false, driver: null, targetStatus: null })
                }
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                  driverStatusModal.targetStatus === 'suspended'
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200'
                }`}
              >
                {isUpdatingStatus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : driverStatusModal.targetStatus === 'suspended' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Ya, Suspend Driver</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ya, Aktifkan Driver</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
