import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  X,
  FileText,
  UserCheck,
  UserX,
  RotateCcw,
  MapPin,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import reportService from '../../../services/reportService';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import BaseModal from '../../../components/ui/BaseModal';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';

const STATUS_CONFIG = {
  PENDING: { label: 'Menunggu', variant: 'amber', icon: Clock },
  INVESTIGATING: { label: 'Diinvestigasi', variant: 'blue', icon: AlertTriangle },
  RESOLVED_VALID: { label: 'Terbukti Valid', variant: 'emerald', icon: CheckCircle },
  RESOLVED_INVALID: { label: 'Laporan Palsu', variant: 'rose', icon: AlertCircle },
  DISMISSED: { label: 'Ditolak / Diabaikan', variant: 'default', icon: X },
};

export default function ReportManagement() {
  const toast = useToast();
  const { session, role, adminProfile } = useAuth();

  const isSuperAdmin = role === 'admin' || session?.role === 'admin';
  const regionName = adminProfile?.region || session?.region || (isSuperAdmin ? 'Seluruh Wilayah' : 'Wilayah Regional');

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Form Resolusi
  const [resolveStatus, setResolveStatus] = useState('RESOLVED_VALID');
  const [actionNotes, setActionNotes] = useState('');
  const [applySanction, setApplySanction] = useState(false);
  const [scoreDeduction, setScoreDeduction] = useState(10);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState('');
  const [penalizeReporter, setPenalizeReporter] = useState(false);

  // Modal Image Zoom
  const [zoomedImage, setZoomedImage] = useState(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await reportService.getAllReportsForAdmin(params);
      const dataList = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : (res?.data?.data || []);

      setReports(dataList);
    } catch (err) {
      console.error('Gagal memuat laporan:', err);
      toast.error('Gagal mengambil daftar laporan dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReports();
  };

  const handleResetFilter = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTimeout(() => {
      loadReports();
    }, 0);
  };

  const openDetail = async (reportItem) => {
    try {
      const detailRes = await reportService.getReportDetail(reportItem.id);
      const detail = detailRes?.data || detailRes || reportItem;
      setSelectedReport(detail);
      setResolveStatus(
        detail.status === 'PENDING' ? 'RESOLVED_VALID' : detail.status
      );
      setActionNotes(detail.actionNotes || '');
      setApplySanction(false);
      setScoreDeduction(10);
      setIsSuspended(false);
      setSuspendedUntil('');
      setPenalizeReporter(false);
      setIsDetailOpen(true);
    } catch (err) {
      console.error('Gagal memuat detail laporan:', err);
      toast.error('Gagal memuat detail tiket laporan.');
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!actionNotes.trim()) {
      toast.error('Catatan tindakan investigasi wajib diisi.');
      return;
    }

    setIsResolving(true);
    try {
      const payload = {
        status: resolveStatus,
        actionNotes: actionNotes.trim(),
        applySanction: resolveStatus === 'RESOLVED_VALID' ? applySanction : false,
        scoreDeduction: applySanction ? Number(scoreDeduction) : undefined,
        isSuspended: applySanction ? isSuspended : undefined,
        suspendedUntil:
          applySanction && isSuspended && suspendedUntil
            ? new Date(suspendedUntil).toISOString()
            : undefined,
        penalizeReporter:
          resolveStatus === 'RESOLVED_INVALID' ? penalizeReporter : false,
      };

      await reportService.resolveReport(selectedReport.id, payload);
      toast.success('Tiket laporan berhasil ditindaklanjuti.');
      setIsDetailOpen(false);
      loadReports();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Gagal menyimpan penyelesaian laporan.'
      );
    } finally {
      setIsResolving(false);
    }
  };

  // KPI Counters
  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;
  const investigatingCount = reports.filter((r) => r.status === 'INVESTIGATING').length;
  const resolvedValidCount = reports.filter((r) => r.status === 'RESOLVED_VALID').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20 blur-lg pointer-events-none" />

        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> PUSAT INVESTIGASI & LAPORAN PELANGGARAN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Laporan Pelanggaran
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Audit dan tindak lanjut aduan 3 arah antar Customer, Mitra Driver, dan Pos Checkpoint secara objektif & transparan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white/15 border border-white/25 rounded-full backdrop-blur-xs text-xs font-semibold text-white shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>{isSuperAdmin ? 'Cakupan: Seluruh Wilayah (Pusat)' : `Wilayah: ${regionName}`}</span>
            </div>

            <button
              onClick={loadReports}
              disabled={isLoading}
              title="Segarkan data laporan"
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-full text-xs font-bold transition cursor-pointer backdrop-blur-xs border border-white/20 shadow-xs disabled:opacity-50"
            >
              <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── CARD GRADIENT (STATISTIK LAPORAN) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tiket */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c2353] via-[#10367D] to-[#1e58b8] p-5 text-white shadow-sm transition hover:shadow-md">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
                Total Aduan Masuk
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {totalCount}
              </div>
              <p className="text-[11px] text-blue-200/80">Akumulasi laporan tercatat</p>
            </div>
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl text-white shrink-0 border border-white/15">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Menunggu Investigasi */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-5 text-white shadow-sm transition hover:shadow-md">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-amber-100 uppercase tracking-wider block">
                Menunggu Investigasi
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {pendingCount}
              </div>
              <p className="text-[11px] text-amber-100/90 font-medium">
                {pendingCount > 0 ? 'Perlu respon segera' : 'Semua aduan ditanggapi'}
              </p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white shrink-0 border border-white/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Dalam Investigasi */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-sm transition hover:shadow-md">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
                Sedang Diinvestigasi
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {investigatingCount}
              </div>
              <p className="text-[11px] text-blue-100/80">Klarifikasi & verifikasi bukti</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white shrink-0 border border-white/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Terbukti Valid & Disanksi */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-5 text-white shadow-sm transition hover:shadow-md">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/15 blur-xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                Terbukti & Disanksi
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {resolvedValidCount}
              </div>
              <p className="text-[11px] text-emerald-100/80">Sanksi & penalti dieksekusi</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white shrink-0 border border-white/20">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER & PENCARIAN ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari nomor tiket, nama pelapor, atau pihak terlapor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 focus:border-[#10367D] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter berdasarkan status tiket"
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu Investigasi</option>
              <option value="INVESTIGATING">Sedang Diinvestigasi</option>
              <option value="RESOLVED_VALID">Terbukti Valid</option>
              <option value="RESOLVED_INVALID">Laporan Palsu</option>
              <option value="DISMISSED">Ditolak / Diabaikan</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-[#10367D] hover:bg-[#0c2b66] text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
            >
              Cari
            </button>

            {(searchQuery || statusFilter) && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-neutral-500 font-medium">
          <span>Menampilkan <strong className="text-neutral-800">{reports.length}</strong> tiket</span>
        </div>
      </div>

      {/* ── REPORTS TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold border-b border-neutral-100">
                <th className="py-3.5 px-5">Nomor Tiket & Waktu</th>
                <th className="py-3.5 px-5">Pelapor</th>
                <th className="py-3.5 px-5">Pihak Terlapor</th>
                <th className="py-3.5 px-5">Kategori Pelanggaran</th>
                <th className="py-3.5 px-5">Status Tiket</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoading ? (
                <SkeletonTableRows rows={5} columns={6} />
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10">
                    <EmptyState
                      icon={ShieldAlert}
                      title="Tidak ada tiket laporan ditemukan"
                      description="Belum ada tiket aduan yang cocok dengan kriteria pencarian atau filter status yang dipilih."
                    />
                  </td>
                </tr>
              ) : (
                reports.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || {
                    label: item.status,
                    variant: 'default',
                    icon: AlertCircle,
                  };

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900 font-mono text-[13px]">
                          #{item.ticketNumber || item.id?.slice?.(0, 8) || item.id}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800">
                          {item.reporter?.name || 'Pengguna Anonim'}
                        </div>
                        <div className="text-[11px] text-neutral-400 uppercase font-medium">
                          {item.reporter?.role || 'Pelapor'}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-bold text-rose-900">
                          {item.reportedUser?.name || 'Terlapor'}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold uppercase mt-0.5">
                          {item.reportedUser?.role || 'Terlapor'}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-medium text-neutral-700 capitalize">
                          {item.category ? item.category.replace(/_/g, ' ').toLowerCase() : 'Pelanggaran Umum'}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <StatusBadge variant={statusConf.variant} icon={statusConf.icon}>
                          {statusConf.label}
                        </StatusBadge>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="px-3 py-1.5 bg-[#10367D]/10 hover:bg-[#10367D]/20 text-[#10367D] rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Investigasi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL & RESOLUTION MODAL ── */}
      {isDetailOpen && selectedReport && (
        <BaseModal
          isOpen={isDetailOpen}
          onClose={() => {
            if (!isResolving) setIsDetailOpen(false);
          }}
          title={`Investigasi Tiket #${selectedReport.ticketNumber || selectedReport.id}`}
          subtitle={`Diajukan pada ${new Date(selectedReport.createdAt).toLocaleString('id-ID')}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 pt-1 font-['Inter']">
            {/* Para Pihak Terlibat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Identitas Pelapor
                </span>
                <div className="font-bold text-neutral-900 text-[13px]">
                  {selectedReport.reporter?.name || 'Anonim'}
                </div>
                <div className="text-[11px] text-neutral-600">
                  Role: <span className="uppercase font-bold text-blue-700">{selectedReport.reporter?.role || '-'}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Telepon: {selectedReport.reporter?.phone || '-'}
                </div>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-neutral-200 pt-2 sm:pt-0 sm:pl-3.5 space-y-0.5">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                  Pihak Terlapor
                </span>
                <div className="font-bold text-neutral-900 text-[13px]">
                  {selectedReport.reportedUser?.name || 'Terlapor'}
                </div>
                <div className="text-[11px] text-neutral-600">
                  Role: <span className="uppercase font-bold text-rose-700">{selectedReport.reportedUser?.role || '-'}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Telepon: {selectedReport.reportedUser?.phone || '-'}
                </div>
              </div>
            </div>

            {/* Konteks Operasional */}
            {(selectedReport.trip || selectedReport.order || selectedReport.pickupPoint) && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-[#10367D] block mb-1">
                  Konteks Operasional Terkait:
                </span>
                {selectedReport.trip && (
                  <div className="text-neutral-700">
                    • Trip ID: <span className="font-mono font-semibold text-neutral-900">{selectedReport.trip.qrCodeTrip || selectedReport.trip.id}</span>{' '}
                    ({selectedReport.trip.originPoint?.name || 'Asal'} → {selectedReport.trip.destinationPoint?.name || 'Tujuan'})
                  </div>
                )}
                {selectedReport.order && (
                  <div className="text-neutral-700">
                    • Tiket Order: <span className="font-mono font-semibold text-neutral-900">{selectedReport.order.qrCodeTicket || selectedReport.order.id}</span>
                  </div>
                )}
                {selectedReport.pickupPoint && (
                  <div className="text-neutral-700">
                    • Pos Checkpoint: <span className="font-semibold text-neutral-900">{selectedReport.pickupPoint.name}</span> ({selectedReport.pickupPoint.address})
                  </div>
                )}
              </div>
            )}

            {/* Kronologi Pelapor */}
            <div>
              <span className="block text-[11px] font-bold text-neutral-700 uppercase mb-1.5">
                Kronologi & Keluhan Pelapor:
              </span>
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 whitespace-pre-wrap leading-relaxed text-xs font-normal">
                {selectedReport.description || 'Tidak ada uraian kronologi.'}
              </div>
            </div>

            {/* Bukti Foto Lampiran */}
            {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
              <div>
                <span className="block text-[11px] font-bold text-neutral-700 uppercase mb-2">
                  Berkas / Foto Bukti Pendukung ({selectedReport.evidenceUrls.length}):
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {selectedReport.evidenceUrls.map((url, idx) => {
                    const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
                    return (
                      <div
                        key={idx}
                        onClick={() => setZoomedImage(fullUrl)}
                        className="cursor-pointer group relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 hover:ring-2 hover:ring-[#10367D] transition shadow-xs"
                      >
                        <img
                          src={fullUrl}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                          Perbesar
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formulir Keputusan Investigasi */}
            <form onSubmit={handleResolveSubmit} className="pt-3 border-t border-neutral-200 space-y-3.5">
              <div className="flex items-center gap-1.5 text-neutral-900 font-bold text-[13px]">
                <UserCheck className="w-4 h-4 text-[#10367D]" />
                <span>Keputusan & Tindak Lanjut Investigasi</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  Keputusan Status Akhir:
                </label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  disabled={isResolving}
                  className="w-full min-h-[40px] px-3.5 py-2 border border-neutral-300 rounded-xl text-xs text-neutral-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 cursor-pointer"
                >
                  <option value="INVESTIGATING">Tetap Dalam Investigasi (Kumpulkan Bukti Lanjutan)</option>
                  <option value="RESOLVED_VALID">Terbukti Valid (Terapkan Tindakan & Sanksi)</option>
                  <option value="RESOLVED_INVALID">Laporan Palsu / Tidak Terbukti (Evaluasi Pelapor)</option>
                  <option value="DISMISSED">Abaikan / Kasus Selesai Damai</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                  Catatan Resmi Putusan Investigasi:
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  disabled={isResolving}
                  placeholder="Tuliskan pertimbangan, hasil klarifikasi para pihak, atau solusi yang diberikan..."
                  className="w-full p-3 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-[#10367D]/20 resize-none leading-relaxed"
                />
              </div>

              {/* Opsi Sanksi ke Mitra Driver */}
              {resolveStatus === 'RESOLVED_VALID' && selectedReport.reportedUser?.role === 'mitra' && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                    <input
                      type="checkbox"
                      checked={applySanction}
                      onChange={(e) => setApplySanction(e.target.checked)}
                      disabled={isResolving}
                      className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                    />
                    <span>Terapkan Penalti / Sanksi Disiplin pada Driver</span>
                  </label>

                  {applySanction && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-200/80">
                      <div>
                        <label className="block font-semibold text-neutral-800 mb-1">
                          Pengurangan Skor Performa:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={scoreDeduction}
                          onChange={(e) => setScoreDeduction(e.target.value)}
                          disabled={isResolving}
                          className="w-full min-h-[38px] px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-hidden"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 font-semibold text-neutral-800 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSuspended}
                            onChange={(e) => setIsSuspended(e.target.checked)}
                            disabled={isResolving}
                            className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                          />
                          <span>Tangguhkan Akun (Suspend)</span>
                        </label>
                      </div>

                      {isSuspended && (
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-neutral-800 mb-1">
                            Tangguhkan Hingga Tanggal:
                          </label>
                          <input
                            type="date"
                            value={suspendedUntil}
                            onChange={(e) => setSuspendedUntil(e.target.value)}
                            disabled={isResolving}
                            className="w-full min-h-[38px] px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Opsi Penalti Laporan Palsu untuk Pelapor */}
              {resolveStatus === 'RESOLVED_INVALID' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                    <input
                      type="checkbox"
                      checked={penalizeReporter}
                      onChange={(e) => setPenalizeReporter(e.target.checked)}
                      disabled={isResolving}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <span>Beri Penalti pada Pelapor (Pengurangan Skor Reputasi Akibat Aduan Palsu)</span>
                  </label>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  disabled={isResolving}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResolving || !actionNotes.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
                >
                  {isResolving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Simpan Putusan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </BaseModal>
      )}

      {/* ── MODAL ZOOM GAMBAR BUKTI ── */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/85 z-60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={zoomedImage}
              alt="Bukti Diperbesar"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setZoomedImage(null)}
              aria-label="Tutup Tampilan Bukti"
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-neutral-800 flex items-center justify-center shadow-lg hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
