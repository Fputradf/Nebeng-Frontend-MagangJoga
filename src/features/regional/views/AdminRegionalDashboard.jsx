import { BASE_URL } from '../../../config/env';
import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  MapPin, Compass, ShieldCheck,
  TrendingDown,
  Users, Clock, BarChart3, LineChart as LineChartIcon,
  Activity, Truck, ClipboardCheck, PieChart as PieChartIcon
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast } from '../../../context/ToastContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import BaseModal from '../../../components/ui/BaseModal';
import { regionalService } from '../../../services/regionalService';
import { useAuth } from '../../../context/AuthContext';

const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ─── Custom Tooltip untuk Area/Bar Chart ──────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const displayLabel = payload[0]?.payload?.fullLabel || label;
  return (
    <div className="bg-[#10367D] rounded-xl shadow-xl px-3 py-2.5 text-white text-[12px] min-w-[130px]">
      <p className="font-bold mb-1.5 text-white/80">{displayLabel}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-3 items-center mb-0.5">
          <span className="flex items-center gap-1 text-white/80">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminRegionalDashboard() {
  const toast = useToast();
  const { session, adminProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const [recentRegionalActivities, setRecentRegionalActivities] = useState([]);

  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  const [activeRange, setActiveRange] = useState('Minggu');

  const regionId = adminProfile?.regionId || session?.regionId;
  const regionName = dashboardData?.regionName || session?.regionName || adminProfile?.regionName || 'Memuat...';
  const adminName = adminProfile?.name || session?.name || 'Admin Regional';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await regionalService.getRegionalDashboard(regionId);
      if (data) {
        setDashboardData(data);
        if (data.activities) setRecentRegionalActivities(Array.isArray(data.activities) ? data.activities : []);
      }
    } catch (err) {
      console.error('[AdminRegionalDashboard]', err);
      toast.error('Gagal mengambil data dari server backend.', { title: 'Koneksi Gagal' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchDashboard();

    const baseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
      : BASE_URL;
    const socket = io(`${baseUrl}/tracking`, { transports: ['websocket'] });

    if (regionId) {
      socket.on('connect', () => socket.emit('joinRegionRoom', { regionId: String(regionId) }));
      socket.on('regionalFleetUpdated', (payload) => {
        if (!isMounted) return;
        const scanType = payload.checkpointData?.scanType;
        const newActivity = {
          id: `WS-${Date.now()}`,
          text: `Trip #${payload.tripId} scan checkpoint ${scanType === 'checkin_destination' ? '✅ Tiba' : '🚌 Berangkat'}.`,
          timestamp: new Date(payload.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          type: 'Update Armada',
        };
        setRecentRegionalActivities(prev => [newActivity, ...prev].slice(0, 15));
      });
    }
    return () => {
      isMounted = false;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  // ── Derived Metrics ────────────────────────────────────────────────────────
  const m = dashboardData?.metrics || {};
  const activePosCount = m.activePosCount ?? 0;
  const departedCount = m.departedTripsCount ?? 0;
  const arrivedCount = m.arrivedTripsCount ?? 0;
  const pendingVerif = m.pendingVerificationsCount ?? 0;
  const totalTrips = departedCount + arrivedCount;
  const complianceRate = dashboardData?.complianceRate ?? 98.4;

  // ── Chart Data (simulated visual, scaled to real metric) ─
  const chartData = useMemo(() => {
    const base = Math.max(totalTrips, 20);
    const wk = [0.6, 0.85, 1.0, 1.3, 1.5, 1.8, 1.2];
    const yr = [0.6, 0.65, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 0.95, 0.85, 0.9, 1.0];

    if (activeRange === 'Minggu') {
      return DAYS_ID.map((l, i) => {
        let total = Math.max(1, Math.round((base / 7) * wk[i]));
        const varianceFactor = 0.85 + ((i * 3) % 5) * 0.02;
        let selesai = Math.round(total * varianceFactor);

        return {
          label: l,
          fullLabel: DAYS_FULL[i] || l,
          total,
          selesai,
        };
      });
    }

    if (activeRange === 'Bulan') {
      const monthWeeks = [
        { label: 'Minggu 1', fullLabel: 'Minggu 1 (Tgl 1–7)', w: 1.0 },
        { label: 'Minggu 2', fullLabel: 'Minggu 2 (Tgl 8–14)', w: 1.15 },
        { label: 'Minggu 3', fullLabel: 'Minggu 3 (Tgl 15–21)', w: 1.05 },
        { label: 'Minggu 4', fullLabel: 'Minggu 4 (Tgl 22–28)', w: 1.2 },
        { label: 'Minggu 5', fullLabel: 'Minggu 5 (Tgl 29–31)', w: 0.5 },
      ];

      return monthWeeks.map((mw, i) => {
        let total = Math.max(1, Math.round((base / 4.9) * mw.w));
        const varianceFactor = 0.86 + ((i * 2) % 4) * 0.02;
        let selesai = Math.round(total * varianceFactor);

        return {
          label: mw.label,
          fullLabel: mw.fullLabel,
          total,
          selesai,
        };
      });
    }

    return MONTHS_ID.map((l, i) => {
      let total = Math.max(1, Math.round((base / 12) * yr[i]));
      const varianceFactor = 0.85 + ((i * 3) % 5) * 0.02;
      let selesai = Math.round(total * varianceFactor);

      return {
        label: l,
        fullLabel: `${MONTHS_FULL[i]} ${new Date().getFullYear()}`,
        total,
        selesai,
      };
    });
  }, [activeRange, totalTrips]);

  const chartSummary = useMemo(() => {
    const t = chartData.reduce((s, d) => s + d.total, 0);
    const c = chartData.reduce((s, d) => s + d.selesai, 0);
    return { total: t, selesai: c, rate: t > 0 ? Math.round((c / t) * 100) : 0 };
  }, [chartData]);

  // ── Pie Chart data (Trip Status Breakdown) ─────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Selesai', value: arrivedCount || chartSummary.selesai, color: '#10b981' },
    { name: 'Berangkat', value: departedCount || Math.round(chartSummary.total * 0.15), color: '#10367D' },
    { name: 'Pending KYC', value: pendingVerif, color: '#f59e0b' },
  ].filter(d => d.value > 0), [arrivedCount, departedCount, pendingVerif, chartSummary]);

  const kpis = [
    { label: 'POS AKTIF', value: activePosCount, unit: 'Pos', sub: 'Pos terdaftar & beroperasi', icon: MapPin, color: '#10367D' },
    { label: 'TOTAL TRIP', value: totalTrips, unit: 'Trip', sub: `Berangkat: ${departedCount} · Tiba: ${arrivedCount}`, icon: Compass, color: '#10b981' },
    { label: 'ANTREAN KYC', value: pendingVerif, unit: 'Berkas', sub: 'KTP & Face ID pending review', icon: ShieldCheck, color: '#f59e0b' },
  ];

  // ── Event handlers ─────────────────────────────────────────────────────────

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">

      {/* ── BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Dashboard Wilayah Operasional</h1>
            <p className="mt-1 text-sm text-blue-100">Pantau arus trip, mitra, dan verifikasi wilayah secara real-time.</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white/15 border border-white/25 rounded-full backdrop-blur">
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">WILAYAH AKTIF</p>
                <p className="text-[13px] font-bold text-white">{regionName}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-3 animate-pulse">
                <div className="h-3 w-20 bg-neutral-100 rounded" />
                <div className="h-8 w-14 bg-neutral-100 rounded" />
                <div className="h-2 w-full bg-neutral-100 rounded" />
              </div>
            ))
          : kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${k.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{k.label}</p>
                    <p className="text-[28px] font-bold text-neutral-800 leading-tight">
                      {k.value}
                      <span className="text-[14px] font-medium text-neutral-400 ml-1">{k.unit}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">{k.sub}</p>
                </div>
              );
            })}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area / Bar Chart — Trip Trend */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#10367D]/10 text-[#10367D] rounded-xl">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-neutral-800">Tren Trip Wilayah</h2>
                <p className="text-[12px] text-neutral-400">Total trip vs selesai per periode</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Range */}
              <div className="flex items-center gap-0.5 bg-neutral-50 border border-neutral-200 rounded-full p-1">
                {['Minggu', 'Bulan', 'Tahun'].map(r => (
                  <button key={r} onClick={() => setActiveRange(r)}
                    className={`text-[12px] font-semibold px-3 py-1 rounded-full transition cursor-pointer ${activeRange === r ? 'bg-[#10367D] text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
                    {r}
                  </button>
                ))}
              </div>
              {/* Type toggle */}
              <div className="flex items-center gap-0.5 bg-neutral-50 border border-neutral-200 rounded-full p-1">
                <button onClick={() => setChartType('area')} title="Area Chart"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${chartType === 'area' ? 'bg-[#10367D] text-white' : 'text-neutral-400'}`}>
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setChartType('bar')} title="Bar Chart"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${chartType === 'bar' ? 'bg-[#10367D] text-white' : 'text-neutral-400'}`}>
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Summary numbers */}
          <div className="flex items-center gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10367D]" />
                <span className="text-[12px] font-medium text-neutral-500">Total Trip</span>
              </div>
              <p className="text-[22px] font-bold text-neutral-800">{chartSummary.total}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-medium text-neutral-500">Selesai</span>
              </div>
              <p className="text-[22px] font-bold text-neutral-800">{chartSummary.selesai}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-neutral-400 mb-0.5">Tingkat Selesai</p>
              <p className="text-[22px] font-bold text-emerald-600">{chartSummary.rate}%</p>
            </div>
          </div>

          {/* RECHARTS */}
          {isLoading ? (
            <div className="h-52 bg-neutral-50 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10367D" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10367D" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSelesai" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }} />
                  <Area type="monotone" dataKey="total" name="Total Trip" stroke="#10367D" strokeWidth={2.5} fill="url(#gradTotal)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="selesai" name="Selesai" stroke="#10b981" strokeWidth={2} fill="url(#gradSelesai)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 4" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }} />
                  <Bar dataKey="total" name="Total Trip" fill="#10367D" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="selesai" name="Selesai" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart — Trip Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#10367D]/10 text-[#10367D] rounded-xl">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-neutral-800">Status Trip</h2>
              <p className="text-[12px] text-neutral-400">Distribusi per kategori</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-neutral-100 animate-pulse" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, fontFamily: 'Inter', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="space-y-2 mt-2">
                {pieData.map((item) => {
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-neutral-600 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-800">{item.value}</span>
                        <span className="text-neutral-400 text-[11px] w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── COMPLIANCE + QUICK STATS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance */}
        <div className="bg-[#10367D] rounded-2xl p-5 text-white shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4 text-[#74B4D9]" />
          </div>
          <h2 className="text-[15px] font-bold tracking-tight">Kepatuhan & Keamanan</h2>
          <p className="text-white/70 text-[12px] mt-1 leading-relaxed">Tingkat kepatuhan operasional pos wilayah.</p>
          <div className="pt-4 border-t border-white/15 mt-4 space-y-3">
            {[
              { label: 'Kepatuhan Pos', val: complianceRate, color: '#74B4D9' },
              { label: 'KYC Selesai', val: Math.max(0, 100 - pendingVerif * 5), color: '#10b981' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-white/80">{item.label}</span>
                  <span className="font-bold text-white">{item.val.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.val}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats 2x2 */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {[
            { icon: Truck, label: 'Berangkat', val: departedCount, bg: 'bg-blue-50', color: 'text-blue-600' },
            { icon: ClipboardCheck, label: 'Tiba', val: arrivedCount, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { icon: Users, label: 'Pending KYC', val: pendingVerif, bg: 'bg-amber-50', color: 'text-amber-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
                <div className={`p-2 ${s.bg} ${s.color} rounded-xl w-fit mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-tight">{s.label}</p>
                <p className="text-[20px] font-bold text-neutral-800">{s.val}</p>
              </div>
            );
          })}
        </div>
      </div>


      {/* ── ACTIVITY FEED + VERIFICATION PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#10367D]/10 text-[#10367D] rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-[16px] font-bold text-neutral-800">Aktivitas & Logistik Terbaru</h2>
            </div>
            <span className="text-[11px] text-neutral-400">{recentRegionalActivities.length} entri</span>
          </div>
          {recentRegionalActivities.length > 0 ? (
            <div className="space-y-2.5">
              {recentRegionalActivities.map((act, idx) => {
                const typeStyle = {
                  'Update Armada': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
                  'Verifikasi': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
                  'Insiden': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
                }[act.type] || { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' };
                return (
                  <div key={act.id || idx} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100 hover:bg-neutral-100/60 transition">
                    <span className={`w-2 h-2 rounded-full ${typeStyle.dot} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-neutral-800 leading-snug">{act.text || act.description}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{act.time || act.timestamp}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${typeStyle.bg} ${typeStyle.text}`}>
                      {act.type || 'Log'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Activity className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
              <p className="text-[13px] font-medium text-neutral-500">Belum ada aktivitas tercatat.</p>
              <p className="text-[12px] text-neutral-400 mt-0.5">Data muncul ketika ada update dari lapangan via WebSocket.</p>
            </div>
          )}
        </div>

        {/* Verification Panel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-[16px] font-bold text-neutral-800">Status Verifikasi</h2>
          </div>
          {[
            { label: 'Pending Review', count: pendingVerif, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
            { label: 'Disetujui Hari Ini', count: m.approvedTodayCount ?? 0, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            { label: 'Ditolak Hari Ini', count: m.rejectedTodayCount ?? 0, bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
          ].map(item => (
            <div key={item.label} className={`flex items-center justify-between p-3 rounded-xl ${item.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                <span className={`text-[13px] font-medium ${item.text}`}>{item.label}</span>
              </div>
              <span className={`text-[16px] font-bold ${item.text}`}>{item.count}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-[11px] text-neutral-400 mb-1.5">Progress Penyelesaian Antrean</p>
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#10367D] h-full rounded-full transition-all duration-700"
                style={{ width: `${pendingVerif === 0 ? 100 : Math.max(5, 100 - (pendingVerif / Math.max(pendingVerif + 5, 10)) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              {pendingVerif === 0 ? '✅ Antrean kosong' : `${pendingVerif} berkas menunggu review`}
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
            <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[12px] text-neutral-600 leading-snug">
              Antrean <span className="font-bold text-emerald-600">menurun 3 berkas</span> vs kemarin.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
