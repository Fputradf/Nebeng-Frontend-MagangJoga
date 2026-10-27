import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, MapPin, SlidersHorizontal, CheckCircle2, XCircle,
  Clock, LineChart as LineChartIcon, BarChart3,
  ArrowUpRight, ArrowDownRight, Activity,
  Wallet, ShieldAlert, PieChart as PieChartIcon,
  Layers
} from 'lucide-react';
import { SkeletonStatCard, SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { getGlobalDashboard, getEscrowLedger } from '../../../services/adminService';

// ─── Formatters ────────────────────────────────────────────────────────────────
const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_ID_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const formatRp = (v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
const formatRpJt = (jt) => `Rp ${Math.round(jt * 1_000_000).toLocaleString('id-ID')}`;
const formatTgl = (d) => String(d.getDate()).padStart(2, '0');
const formatTglPenuh = (d) => `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;

// Sumbu Y: nilai di bawah 1 Jt tampil dalam ribuan, bukan dibulatkan ke 0
const formatSumbuJt = (v) => {
  if (v >= 10) return `${Math.round(v)} Jt`;
  if (v >= 1) return `${v.toFixed(1)} Jt`;
  if (v >= 0.001) return `${Math.round(v * 1000)} rb`;
  return '0';
};

const getWeight = (baseWeight, index, regionName) => {
  if (regionName === 'Semua') return baseWeight;
  const seed = regionName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.max(0.1, baseWeight * (Math.sin((index + seed) * 0.55) * 0.45 + 1));
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function RpTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#10367D] rounded-xl shadow-xl px-3 py-2.5 text-white text-[12px] min-w-[160px]">
      <p className="font-semibold text-white/70 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-3 items-center mb-0.5">
          <span className="flex items-center gap-1 text-white/80">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-white whitespace-nowrap">{formatRpJt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini SparkLine ────────────────────────────────────────────────────────────
function SparkLine({ data = [], color = '#10367D' }) {
  if (data.length < 2) return null;
  const W = 72, H = 28;
  const maxV = Math.max(...data, 1);
  const minV = Math.min(...data, 0);
  const range = maxV - minV || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - minV) / range) * (H - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${W},${H} L0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={area} fill={color} fillOpacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SuperadminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [escrowLedgerData, setEscrowLedgerData] = useState(null);
  const [escrowPage, setEscrowPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState('default');
  const [activeRange, setActiveRange] = useState('Bulan');
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  const [regionTab, setRegionTab] = useState('Semua');
  const [regionPage, setRegionPage] = useState(1);
  const regionLimit = 5;

  const [selectedChartRegion] = useState('Semua');

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        setIsLoading(true);
        const [dashRes, escrowRes] = await Promise.all([
          getGlobalDashboard(),
          getEscrowLedger(escrowPage, 5).catch(() => null)
        ]);
        if (isMounted) {
          setDashboardData(dashRes?.data || dashRes);
          setEscrowLedgerData(escrowRes?.data || escrowRes);
          if (escrowRes?.pagination) setPaginationInfo(escrowRes.pagination);
        }
      } catch (err) {
        console.error('Gagal memuat data dashboard superadmin:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [escrowPage]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const overview = dashboardData?.overview || dashboardData || {};
  const escrowSummary = escrowLedgerData?.summary || escrowLedgerData || {};

  const totalRevenue = Number(overview.totalRevenue) || 0;
  const platformCommission = Number(overview.platformCommision || overview.platformCommission) || 0;
  const heldEscrow = Number(escrowSummary.totalHeldEscrow || escrowSummary.heldEscrow) || 0;
  const totalRegions = (dashboardData?.regionalSummary || []).length;

  // KPI sparkline trends
  const kpiTrends = {
    revenue: [820,900,760,950,1100,1040,1250,1380,1200,1450,1320,1600],
    commission: [82,90,76,95,110,104,125,138,120,145,132,160],
    escrow: [200,185,210,195,230,220,240,215,250,235,260,245],
    regions: [8,8,9,9,10,10,10,11,11,12,12,totalRegions||12],
  };

  // KPI cards
  const kpis = [
    {
      icon: TrendingUp, color: '#10b981', bg: 'bg-emerald-50',
      label: 'TOTAL PENDAPATAN', value: formatRp(totalRevenue),
      sub: `+8.2% vs bulan lalu`, trend: kpiTrends.revenue, change: +8.2
    },
    {
      icon: Wallet, color: '#10367D', bg: 'bg-[#10367D]/10',
      label: 'KOMISI PLATFORM', value: formatRp(platformCommission),
      sub: `${totalRevenue > 0 ? ((platformCommission/totalRevenue)*100).toFixed(1) : 0}% dari pendapatan`, trend: kpiTrends.commission, change: +5.1
    },
    {
      icon: ShieldAlert, color: '#ef4444', bg: 'bg-rose-50',
      label: 'ESCROW DITAHAN', value: formatRp(heldEscrow),
      sub: 'Dana tertahan aktif', trend: kpiTrends.escrow, change: -2.3
    },
    {
      icon: MapPin, color: '#f59e0b', bg: 'bg-amber-50',
      label: 'TOTAL WILAYAH', value: String(totalRegions || 0),
      sub: 'Wilayah aktif terdaftar', trend: kpiTrends.regions, change: +1
    },
  ];

  // ── Regional data ─────────────────────────────────────────────────────────────
  const regionalActivities = useMemo(() => {
    const rawList = dashboardData?.regionalSummary || [];
    if (!Array.isArray(rawList) || !rawList.length) return [];
    const totalActive = rawList.reduce((s, r) => s + (r.activeUserCount || 0), 0) || 1;
    return rawList.map((reg, i) => {
      const realRevenue = Number(reg.revenue || reg.totalRevenue || 0);
      const activeCount = reg.activeUserCount || 0;
      return {
        id: String(reg.regionId || i + 1),
        name: reg.regionName || `Region ${i + 1}`,
        code: reg.regionCode || 'REG',
        activeOrders: activeCount,
        pickupPointsCount: reg.pickupPointsCount || 0,
        revenueVal: realRevenue,
        revenue: `Rp ${realRevenue.toLocaleString('id-ID')}`,
        sharePercentage: Math.round((activeCount / totalActive) * 100),
        category: (reg.pickupPointsCount || 0) > 0 ? 'Kota Besar' : 'Kota Sedang',
        change: reg.change || 0,
      };
    });
  }, [dashboardData]);

  const filteredRegions = useMemo(() => {
    let list = regionalActivities.filter(r => regionTab === 'Semua' || r.category === regionTab);
    if (filterSortBy === 'revenue-desc') list = [...list].sort((a,b) => b.revenueVal - a.revenueVal);
    else if (filterSortBy === 'orders-desc') list = [...list].sort((a,b) => b.activeOrders - a.activeOrders);
    else if (filterSortBy === 'change-positive') list = list.filter(a => a.change >= 0);
    else if (filterSortBy === 'change-negative') list = list.filter(a => a.change < 0);
    return list;
  }, [regionalActivities, regionTab, filterSortBy]);

  const paginatedRegions = useMemo(() => {
    const start = (regionPage - 1) * regionLimit;
    return filteredRegions.slice(start, start + regionLimit);
  }, [filteredRegions, regionPage]);

  const maxOrders = regionalActivities.length > 0 ? Math.max(...regionalActivities.map(r => r.activeOrders), 1) : 1;
  const totalOrders = regionalActivities.reduce((s, r) => s + r.activeOrders, 0) || 1;

  // ── Revenue Chart Data ────────────────────────────────────────────────────────
  const targetRevenueJt = useMemo(() => {
    const total = totalRevenue > 0 ? totalRevenue : regionalActivities.reduce((s,r) => s + r.revenueVal, 0);
    return total / 1_000_000;
  }, [totalRevenue, regionalActivities]);

  const revenueChartData = useMemo(() => {
    const make = (label, fullLabel, w, totalW) => {
      const jt = totalW > 0 ? (w / totalW) * targetRevenueJt : 0;
      return { label, fullLabel, pemasukanTotal: jt, pemasukanBersih: jt * 0.9 };
    };

    const genBulanan = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthName = MONTHS_ID_FULL[currentMonth];
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const weeks = [
        { label: 'Minggu 1', range: `1–7 ${monthName} ${currentYear}`, baseWeight: 23 },
        { label: 'Minggu 2', range: `8–14 ${monthName} ${currentYear}`, baseWeight: 28 },
        { label: 'Minggu 3', range: `15–21 ${monthName} ${currentYear}`, baseWeight: 25 },
        { label: 'Minggu 4', range: `22–28 ${monthName} ${currentYear}`, baseWeight: 30 },
      ];

      if (daysInMonth > 28) {
        const remainingDays = daysInMonth - 28;
        weeks.push({
          label: 'Minggu 5',
          range: `29–${daysInMonth} ${monthName} ${currentYear}`,
          baseWeight: Math.round(26 * (remainingDays / 7)),
        });
      }

      const w = weeks.map((week, i) => getWeight(week.baseWeight, i, selectedChartRegion));
      const tw = w.reduce((a, b) => a + b, 0);

      return weeks.map((week, i) => make(week.label, week.range, w[i], tw));
    };

    const genTahunan = () => {
      const currentYear = new Date().getFullYear();
      const bw = [320,295,350,380,410,452,470,431,462,508,480,538];
      const w = bw.map((b, i) => getWeight(b, i, selectedChartRegion));
      const tw = w.reduce((a, b) => a + b, 0);
      return w.map((wv, i) => make(MONTHS_ID[i], `${MONTHS_ID_FULL[i]} ${currentYear}`, wv, tw));
    };

    const gen = {
      Bulan: genBulanan,
      Bulanan: genBulanan,
      Tahun: genTahunan,
      Tahunan: genTahunan,
    };
    return (gen[activeRange] || genBulanan)();
  }, [activeRange, targetRevenueJt, selectedChartRegion]);

  const totalPemasukanJt = revenueChartData.reduce((s,d) => s+d.pemasukanTotal, 0);
  const totalBersihJt = revenueChartData.reduce((s,d) => s+d.pemasukanBersih, 0);

  // ── Pie chart (regional share) ────────────────────────────────────────────────
  const PIE_COLORS = ['#10367D','#74B4D9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
  const pieData = useMemo(() => {
    if (!regionalActivities.length) return [];
    return regionalActivities.slice(0, 6).map((r, i) => ({
      name: r.name,
      value: r.revenueVal || r.activeOrders || 1,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionalActivities]);

  // ── Escrow transactions ───────────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    const rawTx = escrowLedgerData?.recentTransactions || escrowLedgerData?.transactions || [];
    if (!Array.isArray(rawTx) || !rawTx.length) return [];
    return rawTx.map(tx => ({
      time: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hari ini',
      title: tx.description || `Order #${tx.orderId || '-'}`,
      desc: `Wallet: ${tx.walletId || '-'} · ${tx.type || '-'}`,
      status: tx.type === 'escrow_release' ? 'Completed' : 'Pending',
      amount: formatRp(tx.amount || 0),
    }));
  }, [escrowLedgerData]);

  const statusStyle = {
    Completed: { icon: CheckCircle2, text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: 'Selesai' },
    Canceled:  { icon: XCircle,      text: 'text-rose-600',    bg: 'bg-rose-50',    dot: 'bg-rose-500',    label: 'Dibatalkan' },
    Pending:   { icon: Clock,        text: 'text-[#10367D]',   bg: 'bg-[#10367D]/10', dot: 'bg-[#10367D]', label: 'Menunggu' },
  };

  const rowAccents = [
    { bg: 'bg-[#10367D]/10', text: 'text-[#10367D]' },
    { bg: 'bg-[#74B4D9]/15', text: 'text-[#10367D]' },
    { bg: 'bg-neutral-100',  text: 'text-neutral-500' },
    { bg: 'bg-[#10367D]/[0.08]', text: 'text-[#10367D]/80' },
  ];

  const categoryTabs = ['Semua','Kota Besar','Kota Sedang'];

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-sans">

      {/* ── BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Performa platform hari ini</h1>
            <p className="mt-1 text-sm text-blue-100">Ringkasan global dan real-time seluruh wilayah.</p>
          </div>
          <span className="flex items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur sm:self-auto">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          : kpis.map((k) => {
              const Icon = k.icon;
              const isUp = k.change >= 0;
              return (
                <div key={k.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 ${k.bg} rounded-xl`}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(k.change)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{k.label}</p>
                    <p className="text-[22px] font-bold text-slate-900 leading-tight truncate" title={k.value}>{k.value}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400 leading-snug">{k.sub}</p>
                    <SparkLine data={k.trend} color={k.color} />
                  </div>
                </div>
              );
            })}
      </div>

      {/* ── REVENUE CHART + PIE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area / Bar Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-card border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#10367D]/10 text-[#10367D] rounded-xl">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-neutral-800">Rekap Pemasukan</h2>
                <p className="text-[12px] text-neutral-400">Total vs pemasukan bersih per periode</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-neutral-50 border border-neutral-200 rounded-full p-1">
                {[
                  { id: 'Bulan', label: 'Bulanan' },
                  { id: 'Tahun', label: 'Tahunan' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRange(r.id)}
                    className={`text-[12px] font-semibold px-3.5 py-1 rounded-full transition cursor-pointer ${
                      activeRange === r.id
                        ? 'bg-[#10367D] text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 bg-neutral-50 border border-neutral-200 rounded-full p-1">
                <button onClick={() => setChartType('area')} title="Area"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${chartType === 'area' ? 'bg-[#10367D] text-white' : 'text-neutral-400'}`}>
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setChartType('bar')} title="Bar"
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
                <span className="text-[12px] text-neutral-500">Total Pemasukan</span>
              </div>
              <p className="text-[20px] font-bold text-neutral-800">{formatRpJt(totalPemasukanJt)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#74B4D9]" />
                <span className="text-[12px] text-neutral-500">Pemasukan Bersih</span>
              </div>
              <p className="text-[20px] font-bold text-neutral-800">{formatRpJt(totalBersihJt)}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-52 bg-neutral-50 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              {chartType === 'area' ? (
                <AreaChart data={revenueChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="saGradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10367D" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10367D" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="saGradBersih" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#74B4D9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#74B4D9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={formatSumbuJt} />
                  <Tooltip content={<RpTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="pemasukanTotal" name="Total" stroke="#10367D" strokeWidth={2.5} fill="url(#saGradTotal)" dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="pemasukanBersih" name="Bersih" stroke="#74B4D9" strokeWidth={2} fill="url(#saGradBersih)" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              ) : (
                <BarChart data={revenueChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 4" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={formatSumbuJt} />
                  <Tooltip content={<RpTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pemasukanTotal" name="Total" fill="#10367D" radius={[3,3,0,0]} opacity={0.85} />
                  <Bar dataKey="pemasukanBersih" name="Bersih" fill="#74B4D9" radius={[3,3,0,0]} opacity={0.85} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart — Revenue by Region */}
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-200 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#10367D]/10 text-[#10367D] rounded-xl">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-neutral-800">Distribusi Wilayah</h2>
              <p className="text-[12px] text-neutral-400">Kontribusi revenue per region</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-neutral-100 animate-pulse" />
            </div>
          ) : pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [formatRp(v), name]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {pieData.map(item => {
                  const total = pieData.reduce((s,d) => s+d.value, 0);
                  const pct = total > 0 ? Math.round((item.value/total)*100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-neutral-600 font-medium truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-neutral-800 ml-2">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-[13px] text-neutral-400">
              <div>
                <Layers className="w-8 h-8 mx-auto mb-2 text-neutral-200" />
                Belum ada data wilayah
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── REGIONAL TABLE + ESCROW ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-card border border-slate-200">
            <SkeletonTableRows rows={4} columns={4} />
          </div>
        ) : (
          <>
            {/* Regional Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-[#10367D]/10 text-[#10367D] p-1.5 rounded-xl">
                      <MapPin size={15} />
                    </div>
                    <h2 className="text-[16px] font-bold text-neutral-800">Data Wilayah</h2>
                    <span className="text-[12px] text-neutral-400">· {filteredRegions.length} Wilayah</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition cursor-pointer border ${filterSortBy !== 'default' ? 'bg-[#10367D] text-white border-[#10367D]' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                    >
                      <SlidersHorizontal size={12} />
                      Filter{filterSortBy !== 'default' && ' •'}
                    </button>
                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-30">
                        <p className="px-3 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Urutkan & Filter</p>
                        {[
                          { key: 'default', label: 'Default' },
                          { key: 'revenue-desc', label: 'Pendapatan Tertinggi' },
                          { key: 'orders-desc', label: 'Pesanan Terbanyak' },
                          { key: 'change-positive', label: 'Perubahan Positif (+)' },
                          { key: 'change-negative', label: 'Perubahan Negatif (-)' },
                        ].map(opt => (
                          <button key={opt.key} onClick={() => { setFilterSortBy(opt.key); setShowFilterDropdown(false); }}
                            className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-neutral-50 ${filterSortBy === opt.key ? 'font-bold text-[#10367D]' : 'text-neutral-700'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto">
                  {categoryTabs.map(tab => (
                    <button key={tab} onClick={() => setRegionTab(tab)}
                      className={`pb-1.5 text-[13px] font-semibold whitespace-nowrap transition cursor-pointer border-b-2 ${regionTab === tab ? 'text-[#10367D] border-[#10367D]' : 'text-neutral-400 border-transparent hover:text-neutral-600'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile cards */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {paginatedRegions.length === 0 ? (
                  <div className="p-4"><EmptyState title="Belum ada data wilayah" description="Tidak ada wilayah yang sesuai dengan kriteria." /></div>
                ) : paginatedRegions.map((region, index) => {
                  const accent = rowAccents[index % rowAccents.length];
                  const isUp = region.change >= 0;
                  return (
                    <div key={region.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 ${accent.bg} ${accent.text} rounded-xl shrink-0`}><MapPin size={14} /></div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-semibold text-neutral-800 text-[14px]">{region.name} ({region.code})</span>
                            </div>
                            <div className="text-[12px] text-neutral-400">{region.category} · Pos: {region.pickupPointsCount}</div>
                          </div>
                        </div>
                        <span className={`flex items-center gap-0.5 text-[13px] font-semibold px-2 py-0.5 rounded-full ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {Math.abs(region.change)}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[12px]">
                          <span className="text-neutral-400">Aktivitas User</span>
                          <span className="font-semibold text-neutral-700">{region.sharePercentage}% ({region.activeOrders} user)</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#10367D] rounded-full" style={{ width: `${region.sharePercentage}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-dashed border-neutral-100 text-[13px]">
                        <span className="text-neutral-400">Estimasi Pendapatan</span>
                        <span className="font-bold text-neutral-800">{region.revenue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-medium">
                      <th className="py-3 px-5">Wilayah</th>
                      <th className="py-3 px-5">Aktivitas User</th>
                      <th className="py-3 px-5">Pendapatan</th>
                      <th className="py-3 px-5">Pos & Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRegions.length === 0 ? (
                      <tr><td colSpan={4}><EmptyState title="Belum ada data wilayah" description="Tidak ada wilayah yang sesuai." /></td></tr>
                    ) : paginatedRegions.map((region, index) => {
                      const accent = rowAccents[index % rowAccents.length];
                      const share = Math.round((region.activeOrders / totalOrders) * 100);
                      const barWidth = Math.round((region.activeOrders / maxOrders) * 100);
                      const isUp = region.change >= 0;
                      return (
                        <tr key={region.id} className="hover:bg-gray-50/50 transition-colors text-[12px]">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 ${accent.bg} ${accent.text} rounded-xl shrink-0`}><MapPin size={14} /></div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-semibold text-neutral-800">{region.name} ({region.code})</span>
                                </div>
                                <div className="text-[11px] text-neutral-400">{region.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2 min-w-28">
                              <span className="text-[12px] font-semibold text-neutral-600 w-8 shrink-0">{share}%</span>
                              <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#10367D] rounded-full" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-800 whitespace-nowrap">{region.revenue}</span>
                              <span className={`flex items-center text-[11px] font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                {Math.abs(region.change)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-neutral-600 font-semibold">{region.pickupPointsCount} Pos Aktif</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRegions.length > regionLimit && (
                <div className="flex items-center justify-between p-4 border-t border-neutral-100 text-[12px] text-neutral-500 bg-neutral-50/50 rounded-b-2xl">
                  <span>Hal {regionPage} dari {Math.ceil(filteredRegions.length / regionLimit)}</span>
                  <div className="flex items-center gap-1">
                    <button disabled={regionPage <= 1} onClick={() => setRegionPage(p => Math.max(p-1,1))}
                      className="px-3 py-1.5 bg-white border border-neutral-200 shadow-sm rounded-lg font-medium disabled:opacity-40 cursor-pointer">
                      Sebelumnya
                    </button>
                    <button disabled={regionPage >= Math.ceil(filteredRegions.length / regionLimit)} onClick={() => setRegionPage(p => p+1)}
                      className="px-3 py-1.5 bg-white border border-neutral-200 shadow-sm rounded-lg font-medium disabled:opacity-40 cursor-pointer">
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Escrow Activity */}
            <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#10367D]/10 text-[#10367D] rounded-lg">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h2 className="text-[16px] font-bold text-neutral-800">Aktivitas Escrow</h2>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400 text-[13px]">Tidak ada riwayat escrow.</div>
                ) : recentActivity.map((activity, idx) => {
                  const s = statusStyle[activity.status] || statusStyle.Completed;
                  const StatusIcon = s.icon;
                  return (
                    <div key={idx} className={idx !== recentActivity.length - 1 ? 'pb-3 border-b border-gray-100' : ''}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <span className="text-[11px] text-neutral-400 font-medium">{activity.time}</span>
                      </div>
                      <p className="text-[12px] font-semibold text-neutral-800 mb-0.5">{activity.title}</p>
                      <p className="text-[11px] text-neutral-400 mb-2 line-clamp-1">{activity.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${s.text} ${s.bg} px-2 py-0.5 rounded-full`}>
                          <StatusIcon size={10} /> {s.label}
                        </span>
                        <span className="text-[12px] font-bold text-neutral-800">{activity.amount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {paginationInfo?.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100 text-[12px] text-neutral-500">
                  <span>Hal {escrowPage} dari {paginationInfo.totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button disabled={escrowPage <= 1} onClick={() => setEscrowPage(p => Math.max(p-1,1))} className="px-2 py-1 bg-neutral-100 rounded disabled:opacity-40 cursor-pointer">Prev</button>
                    <button disabled={escrowPage >= paginationInfo.totalPages} onClick={() => setEscrowPage(p => p+1)} className="px-2 py-1 bg-neutral-100 rounded disabled:opacity-40 cursor-pointer">Next</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}