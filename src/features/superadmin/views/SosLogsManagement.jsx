import { useState, useEffect, useCallback } from 'react';
import {
  Siren,
  Search,
  RotateCw,
  MapPin,
  Phone,
  Car,
  User,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  X,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import emergencyService from '../../../services/emergencyService';
import StatCard from '../../../components/ui/StatCard';
import { useToast } from '../../../context/ToastContext';

const STATUS_META = {
  ACTIVE: {
    label: 'Darurat Aktif',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500 animate-pulse',
  },
  INVESTIGATING: {
    label: 'Investigasi',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  RESOLVED: {
    label: 'Selesai Ditangani',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  FALSE_ALARM: {
    label: 'Alarm Palsu',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

const CATEGORY_LABELS = {
  emergency: 'Darurat Umum',
  accident: 'Kecelakaan',
  crime: 'Kriminal / Ancaman',
  medical: 'Medis',
  vehicle_issue: 'Kendala Armada',
};

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SosLogsManagement() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    investigating: 0,
    resolved: 0,
    falseAlarm: 0,
  });
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Detail & Resolve Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await emergencyService.getSosLogs({
        status: statusFilter,
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: 15,
      });
      setLogs(Array.isArray(res?.data) ? res.data : []);
      if (res?.meta) setMeta(res.meta);
      if (res?.summary) setSummary(res.summary);
    } catch (err) {
      console.error('Gagal memuat log darurat SOS:', err);
      toast.error(err?.response?.data?.message || 'Gagal memuat log darurat SOS.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, debouncedSearch, currentPage, toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleOpenDetail = (log) => {
    setSelectedLog(log);
    setResolveStatus('RESOLVED');
    setResolveNotes('');
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLog) return;

    setIsSubmitting(true);
    try {
      await emergencyService.resolveSosAlert(selectedLog.id, {
        status: resolveStatus,
        notes: resolveNotes.trim() || undefined,
      });
      toast.success(
        resolveStatus === 'FALSE_ALARM'
          ? 'Insiden SOS ditandai sebagai Alarm Palsu.'
          : 'Insiden SOS berhasil ditandai Selesai Ditangani.'
      );
      setSelectedLog(null);
      loadLogs();
    } catch (err) {
      console.error('Gagal memperbarui status SOS:', err);
      toast.error(err?.response?.data?.message || 'Gagal memperbarui status insiden SOS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTotal = (summary.active || 0) + (summary.investigating || 0);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2684ff] px-6 py-5 sm:py-0 sm:h-[104px] flex items-center text-white shadow-card">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5 truncate">
                <Siren className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">PUSAT LOG &amp; RESPON DARURAT SOS</span>
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              Log Darurat SOS
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2 shadow-xs whitespace-nowrap">
              <span className={`w-2 h-2 rounded-full ${activeTotal > 0 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-xs font-bold text-white">
                {activeTotal} Aktif
              </span>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-[#1356d6] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Log</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Log SOS"
          value={String(summary.total || 0)}
          subtitle="Seluruh riwayat sinyal"
          badgeText="Tercatat"
          badgeVariant="blue"
          icon={FileText}
          iconVariant="blue"
          variant="light"
        />
        <StatCard
          title="Darurat Aktif"
          value={String(activeTotal)}
          subtitle="Perlu respon cepat"
          badgeText={activeTotal > 0 ? 'Prioritas' : 'Aman'}
          badgeVariant="blue"
          icon={Siren}
          iconVariant="blue"
          variant="light"
        />
        <StatCard
          title="Selesai Ditangani"
          value={String(summary.resolved || 0)}
          subtitle="Telah diselesaikan"
          badgeText="Resolved"
          badgeVariant="blue"
          icon={CheckCircle2}
          iconVariant="blue"
          variant="light"
        />
        <StatCard
          title="Alarm Palsu"
          value={String(summary.falseAlarm || 0)}
          subtitle="Ditutup sebagai false alarm"
          badgeText="False Alarm"
          badgeVariant="blue"
          icon={AlertTriangle}
          iconVariant="blue"
          variant="light"
        />
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID SOS, nama pelapor, driver, plat nomor, atau wilayah..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1356d6]/20 focus:border-[#1356d6]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'ACTIVE', label: 'Darurat Aktif' },
            { key: 'RESOLVED', label: 'Selesai' },
            { key: 'FALSE_ALARM', label: 'Alarm Palsu' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-[#1356d6] text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE LOG DARURAT SOS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Memuat riwayat log darurat SOS...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum ada log darurat SOS</p>
            <p className="text-xs text-slate-400">
              Catatan sinyal darurat SOS dari perjalanan aktif akan muncul secara otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Waktu &amp; ID</th>
                  <th className="py-3.5 px-4">Pelapor</th>
                  <th className="py-3.5 px-4">Armada &amp; Rute</th>
                  <th className="py-3.5 px-4">Kategori &amp; Lokasi</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const statusInfo = STATUS_META[log.status] || STATUS_META.ACTIVE;
                  const lat = log.latitude ? Number(log.latitude).toFixed(5) : null;
                  const lng = log.longitude ? Number(log.longitude).toFixed(5) : null;
                  const mapsUrl = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : null;
                  const isMitraReporter = log.reporterRole === 'mitra' || (!log.customer && Boolean(log.mitra));
                  const reporter = isMitraReporter ? (log.mitra || log.trip?.mitra) : log.customer;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#1356d6]">#SOS-{log.id}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {formatDateTime(log.createdAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">{reporter?.name || '-'}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isMitraReporter
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {isMitraReporter ? 'Mitra Driver' : 'Customer'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {reporter?.phone || '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {log.trip?.mitra?.name || '-'}
                          {log.trip?.vehicle?.plateNumber && (
                            <span className="ml-1.5 font-mono text-[11px] text-[#1356d6] bg-blue-50 px-1.5 py-0.5 rounded">
                              {log.trip.vehicle.plateNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {log.trip?.originPoint?.name || '-'} &rarr; {log.trip?.destinationPoint?.name || '-'}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          Wilayah: {log.region?.name || '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {CATEGORY_LABELS[log.category] || log.category || 'Darurat'}
                        </span>
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 flex items-center gap-1 text-[11px] font-mono text-[#1356d6] hover:underline"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{lat}, {lng}</span>
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>
                        {log.resolvedByUser?.name && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Oleh: {log.resolvedByUser.name}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(log)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            log.status === 'ACTIVE' || log.status === 'INVESTIGATING'
                              ? 'bg-[#1356d6] hover:bg-[#0b3ba8] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {log.status === 'ACTIVE' || log.status === 'INVESTIGATING'
                            ? 'Tindak Lanjut'
                            : 'Detail'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Halaman {meta.page} dari {meta.totalPages} ({meta.total} log)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= meta.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DETAIL & FORM TINDAK LANJUT SOS ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0b3ba8] via-[#1356d6] to-[#1e58b8] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Siren className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-bold text-base">Detail Log Darurat #SOS-{selectedLog.id}</h3>
                  <p className="text-[11px] text-blue-100">
                    {formatDateTime(selectedLog.createdAt)} &bull; {selectedLog.region?.name || 'Wilayah'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" />{' '}
                    {selectedLog.reporterRole === 'mitra' || (!selectedLog.customer && Boolean(selectedLog.mitra))
                      ? 'Pelapor (Mitra Driver)'
                      : 'Pelapor (Customer)'}
                  </span>
                  <p className="font-bold text-slate-900">
                    {(selectedLog.reporterRole === 'mitra' || (!selectedLog.customer && Boolean(selectedLog.mitra))
                      ? selectedLog.mitra?.name || selectedLog.trip?.mitra?.name
                      : selectedLog.customer?.name) || '-'}
                  </p>
                  <p className="text-xs font-mono text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />{' '}
                    {(selectedLog.reporterRole === 'mitra' || (!selectedLog.customer && Boolean(selectedLog.mitra))
                      ? selectedLog.mitra?.phone || selectedLog.trip?.mitra?.phone
                      : selectedLog.customer?.phone) || '-'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Car className="w-3 h-3" /> Mitra Driver &amp; Armada
                  </span>
                  <p className="font-bold text-slate-900">{selectedLog.trip?.mitra?.name || '-'}</p>
                  <p className="text-xs font-mono text-[#1356d6] font-bold">
                    {selectedLog.trip?.vehicle?.plateNumber || '-'} &bull; {selectedLog.trip?.mitra?.phone || '-'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Koordinat Lokasi GPS
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                    {selectedLog.latitude}, {selectedLog.longitude}
                  </p>
                </div>
                {selectedLog.latitude && selectedLog.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${selectedLog.latitude},${selectedLog.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1356d6] hover:bg-[#0b3ba8] text-white text-xs font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Maps
                  </a>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Catatan Insiden &amp; Penanganan
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedLog.notes || 'Tidak ada catatan tambahan.'}
                </p>
                {selectedLog.resolvedAt && (
                  <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                    Diselesaikan pada {formatDateTime(selectedLog.resolvedAt)} oleh {selectedLog.resolvedByUser?.name || 'Admin'}
                  </p>
                )}
              </div>

              {(selectedLog.status === 'ACTIVE' || selectedLog.status === 'INVESTIGATING') && (
                <form onSubmit={handleResolveSubmit} className="pt-2 border-t border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    Form Tindak Lanjut &amp; Penyelesaian SOS
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setResolveStatus('RESOLVED')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        resolveStatus === 'RESOLVED'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Selesai Ditangani (RESOLVED)
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolveStatus('FALSE_ALARM')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        resolveStatus === 'FALSE_ALARM'
                          ? 'bg-slate-100 border-slate-500 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Alarm Palsu (FALSE_ALARM)
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Penanganan Admin
                    </label>
                    <textarea
                      rows={3}
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      placeholder="Tuliskan tindakan yang telah dilakukan atau hasil konfirmasi ke driver/customer..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1356d6]/20 focus:border-[#1356d6]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl bg-[#1356d6] hover:bg-[#0b3ba8] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Simpan & Tutup Insiden'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
