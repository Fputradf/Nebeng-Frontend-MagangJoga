import { BASE_URL } from '../../../config/env';
import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  MapPin, Compass, ShieldCheck, AlertTriangle,
  ShieldAlert, CheckCircle2, PhoneCall, History,
  Eye, EyeOff, TrendingUp, TrendingDown,
  Users, Clock, BarChart3, LineChart as LineChartIcon,
  ArrowUpRight, ArrowDownRight,
  Activity, Truck, ClipboardCheck, Zap, PieChart as PieChartIcon
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import BaseModal from '../../../components/ui/BaseModal';
import { regionalService } from '../../../services/regionalService';
import { disruptedTripsService } from '../../../services/disruptedTripsService';
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

// ─── Mini SparkLine SVG (tanpa library, untuk KPI card) ───────────────────────
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminRegionalDashboard() {
  const toast = useToast();
  const { session, adminProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const [disruptedTrips, setDisruptedTrips] = useState([]);
  const confirm = useConfirm();
  const [selectedAssistTrip, setSelectedAssistTrip] = useState(null);
  const [unmaskedPhone, setUnmaskedPhone] = useState(false);
  const [emergencyLogs, setEmergencyLogs] = useState([]);
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
        if (data.disruptedTrips && Array.isArray(data.disruptedTrips) && data.disruptedTrips.length > 0) {
          setDisruptedTrips(data.disruptedTrips);
        } else {
          setDisruptedTrips(disruptedTripsService.getDisruptedTrips(regionId));
        }
        if (data.activities) setRecentRegionalActivities(Array.isArray(data.activities) ? data.activities : []);
      }
    } catch (err) {
      console.error('[AdminRegionalDashboard]', err);
      toast.error('Gagal mengambil data dari server backend.', { title: 'Koneksi Gagal' });
      setDisruptedTrips(disruptedTripsService.getDisruptedTrips(regionId));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchDashboard();

    const unsubDisrupted = disruptedTripsService.subscribe((updated) => {
      if (!isMounted) return;
      setDisruptedTrips(regionId ? updated.filter(t => !t.regionId || String(t.regionId) === String(regionId)) : updated);
    });

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
      unsubDisrupted();
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

  // ── Chart Data (simulated visual, scaled to real metric & disrupted trips) ─
  const chartData = useMemo(() => {
    const base = Math.max(totalTrips, 20);
    const wk = [0.6, 0.85, 1.0, 1.3, 1.5, 1.8, 1.2];
    const yr = [0.6, 0.65, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 0.95, 0.85, 0.9, 1.0];

    const getDisruptedTripDate = (trip) => {
      if (trip?.createdAt) {
        const d = new Date(trip.createdAt);
        if (!isNaN(d.getTime())) return d;
      }
      return new Date();
    };

    if (activeRange === 'Minggu') {
      const gangguanPerDay = [0, 0, 0, 0, 0, 0, 0];
      disruptedTrips.forEach((trip) => {
        const d = getDisruptedTripDate(trip);
        const dayIdx = (d.getDay() + 6) % 7; // 0: Sen, 1: Sel, ..., 6: Min
        gangguanPerDay[dayIdx] = (gangguanPerDay[dayIdx] || 0) + 1;
      });

      return DAYS_ID.map((l, i) => {
        const gangguan = gangguanPerDay[i] || 0;
        let total = Math.max(1, Math.round((base / 7) * wk[i]));
        const varianceFactor = 0.85 + ((i * 3) % 5) * 0.02;
        let selesai = Math.round(total * varianceFactor);

        if (selesai + gangguan > total) {
          total = selesai + gangguan;
        } else if (gangguan > 0 && total === selesai) {
          selesai = Math.max(0, total - gangguan);
        }

        return {
          label: l,
          fullLabel: DAYS_FULL[i] || l,
          total,
          selesai,
          gangguan,
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

      const gangguanPerWeek = [0, 0, 0, 0, 0];
      disruptedTrips.forEach((trip) => {
        const d = getDisruptedTripDate(trip);
        const dayOfMonth = d.getDate(); // 1 - 31
        const weekIdx = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
        gangguanPerWeek[weekIdx] = (gangguanPerWeek[weekIdx] || 0) + 1;
      });

      return monthWeeks.map((mw, i) => {
        const gangguan = gangguanPerWeek[i] || 0;
        let total = Math.max(1, Math.round((base / 4.9) * mw.w));
        const varianceFactor = 0.86 + ((i * 2) % 4) * 0.02;
        let selesai = Math.round(total * varianceFactor);

        if (selesai + gangguan > total) {
          total = selesai + gangguan;
        } else if (gangguan > 0 && total === selesai) {
          selesai = Math.max(0, total - gangguan);
        }

        return {
          label: mw.label,
          fullLabel: mw.fullLabel,
          total,
          selesai,
          gangguan,
        };
      });
    }

    const gangguanPerMonth = new Array(12).fill(0);
    disruptedTrips.forEach((trip) => {
      const d = getDisruptedTripDate(trip);
      const m = d.getMonth();
      if (m >= 0 && m < 12) {
        gangguanPerMonth[m] += 1;
      }
    });

    return MONTHS_ID.map((l, i) => {
      const gangguan = gangguanPerMonth[i] || 0;
      let total = Math.max(1, Math.round((base / 12) * yr[i]));
      const varianceFactor = 0.85 + ((i * 3) % 5) * 0.02;
      let selesai = Math.round(total * varianceFactor);

      if (selesai + gangguan > total) {
        total = selesai + gangguan;
      } else if (gangguan > 0 && total === selesai) {
        selesai = Math.max(0, total - gangguan);
      }

      return {
        label: l,
        fullLabel: `${MONTHS_FULL[i]} ${new Date().getFullYear()}`,
        total,
        selesai,
        gangguan,
      };
    });
  }, [activeRange, totalTrips, disruptedTrips]);

  const chartSummary = useMemo(() => {
    const t = chartData.reduce((s, d) => s + d.total, 0);
    const c = chartData.reduce((s, d) => s + d.selesai, 0);
    const g = chartData.reduce((s, d) => s + d.gangguan, 0);
    return { total: t, selesai: c, gangguan: g, rate: t > 0 ? Math.round((c / t) * 100) : 0 };
  }, [chartData]);

  // ── Pie Chart data (Trip Status Breakdown) ─────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Selesai', value: arrivedCount || chartSummary.selesai, color: '#10b981' },
    { name: 'Berangkat', value: departedCount || Math.round(chartSummary.total * 0.15), color: '#10367D' },
    { name: 'Gangguan', value: disruptedTrips.length, color: '#ef4444' },
    { name: 'Pending KYC', value: pendingVerif, color: '#f59e0b' },
  ].filter(d => d.value > 0), [arrivedCount, departedCount, disruptedTrips.length, pendingVerif, chartSummary]);

  // ── KPI Card Trends (sparkline data) ──────────────────────────────────────
  const trends = {
    pos: [8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12, 13],
    trips: [12, 15, 11, 18, 22, 19, 25, 28, 21, 30, 26, 35],
    verif: [3, 4, 2, 5, 3, 6, 4, 7, 5, 4, 6, 9],
    disrupted: [2, 1, 3, 0, 1, 2, 0, 1, 3, 2, 0, disruptedTrips.length],
  };

  const kpis = [
    { label: 'POS AKTIF', value: activePosCount, unit: 'Pos', sub: 'Pos terdaftar & beroperasi', icon: MapPin, trend: trends.pos, color: '#10367D', change: +2 },
    { label: 'TOTAL TRIP', value: totalTrips, unit: 'Trip', sub: `Berangkat: ${departedCount} · Tiba: ${arrivedCount}`, icon: Compass, trend: trends.trips, color: '#10b981', change: +8 },
    { label: 'TRIP DISRUPTED', value: disruptedTrips.length, unit: 'Aktif', sub: 'Membutuhkan respons segera', icon: AlertTriangle, trend: trends.disrupted, color: '#ef4444', change: disruptedTrips.length > 0 ? +1 : -1 },
    { label: 'ANTREAN KYC', value: pendingVerif, unit: 'Berkas', sub: 'KTP & Face ID pending review', icon: ShieldCheck, trend: trends.verif, color: '#f59e0b', change: -3 },
  ];

  // ── Event handlers ─────────────────────────────────────────────────────────
  const maskPhone = (p) => p?.length >= 8 ? `${p.slice(0, 4)}****${p.slice(-3)}` : p;

  const handleResolveTrip = async (trip) => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Resolusi Trip',
      message: `Apakah Anda yakin ingin menandai rute untuk ${trip?.mitra} (${trip?.id}) telah kembali normal?`,
      confirmText: 'Ya, Selesaikan',
      cancelText: 'Batal',
      variant: 'info',
    });
    if (!isConfirmed) return;
    setEmergencyLogs([{
      id: `LOG-EMG-${Date.now().toString().slice(-4)}`,
      tripId: trip.id,
      mitra: trip.mitra,
      action: 'RUTE RESOLVED',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      admin: adminName,
    }, ...emergencyLogs]);
    disruptedTripsService.resolveDisruptedTrip(trip.id);
    setDisruptedTrips(prev => prev.filter(t => t.id !== trip.id));
    toast.success(`Kendala Trip ${trip.id} telah diselesaikan.`, { title: 'Trip Dipulihkan' });

  };

  const handleDispatchAssistance = () => {
    if (!selectedAssistTrip) return;
    setEmergencyLogs([{
      id: `LOG-EMG-${Date.now().toString().slice(-4)}`,
      tripId: selectedAssistTrip.id,
      mitra: selectedAssistTrip.mitra,
      action: 'DISPATCH ASSISTANCE',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      admin: adminName,
    }, ...emergencyLogs]);
    setDisruptedTrips(disruptedTrips.map(t =>
      t.id === selectedAssistTrip.id ? { ...t, assistanceStatus: 'Tim Darurat Menuju Lokasi' } : t
    ));
    toast.info('Tim Pos terdekat telah dikirim ke lokasi.', { title: 'Bantuan Dikirim' });
    setSelectedAssistTrip(null);
    setUnmaskedPhone(false);
  };

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
              const isUp = k.change >= 0;
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${k.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(k.change)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{k.label}</p>
                    <p className="text-[28px] font-bold text-neutral-800 leading-tight">
                      {k.value}
                      <span className="text-[14px] font-medium text-neutral-400 ml-1">{k.unit}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400 leading-snug">{k.sub}</p>
                    <SparkLine data={k.trend} color={k.color} />
                  </div>
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
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-[12px] font-medium text-neutral-500">Gangguan</span>
              </div>
              <p className="text-[22px] font-bold text-neutral-800">{chartSummary.gangguan}</p>
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
                    <linearGradient id="gradGangguan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#A3A3A3', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }} />
                  <Area type="monotone" dataKey="total" name="Total Trip" stroke="#10367D" strokeWidth={2.5} fill="url(#gradTotal)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="selesai" name="Selesai" stroke="#10b981" strokeWidth={2} fill="url(#gradSelesai)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                  <Area
                    type="monotone"
                    dataKey="gangguan"
                    name="Gangguan"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#gradGangguan)"
                    dot={(props) => (props.payload?.gangguan > 0 ? (
                      <circle
                        key={props.key || `dot-gangguan-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={3.5}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    ) : null)}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
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
                  <Bar dataKey="gangguan" name="Gangguan" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.85} />
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

      {/* ── DISRUPTED TRIPS + QUICK STATS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Disrupted Trips */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-neutral-800">Pemantauan Trip Disrupted</h2>
                <p className="text-[12px] text-neutral-400">Perjalanan yang mengalami hambatan di lapangan</p>
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold self-start sm:self-auto ${disruptedTrips.length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {disruptedTrips.length > 0 ? `${disruptedTrips.length} Aktif` : 'Semua Normal'}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map(i => (
                <div key={i} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2 animate-pulse">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : disruptedTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {disruptedTrips.map((trip) => (
                <div key={trip.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">{trip.id}</span>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{trip.assistanceStatus || 'Pending'}</span>
                    </div>
                    <div className="text-[14px] font-bold text-neutral-800 flex items-center gap-1.5">
                      <span>{trip.origin}</span>
                      <span className="text-rose-600">&rarr;</span>
                      <span>{trip.destination}</span>
                    </div>
                    <p className="text-[13px] text-neutral-600">
                      Mitra: <strong className="text-neutral-800">{trip.mitra}</strong> ({trip.vehicle})
                    </p>
                    <div className="p-2 bg-white rounded-lg border border-rose-100 text-[12px] space-y-0.5">
                      <p className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Kendala: {trip.issue}
                      </p>
                      <p className="text-neutral-400">📍 Posisi: {trip.location} ({trip.time})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-rose-100">
                    <button onClick={() => { setSelectedAssistTrip(trip); setUnmaskedPhone(false); }}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-full text-[12px] font-bold transition cursor-pointer flex items-center justify-center gap-1">
                      <PhoneCall className="w-3 h-3 text-[#10367D]" /> Kirim Bantuan
                    </button>
                    <button onClick={() => handleResolveTrip(trip)}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[12px] font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Selesaikan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-neutral-50 rounded-xl border border-neutral-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-[14px] font-bold text-neutral-800">Semua Perjalanan Normal</h3>
              <p className="text-[12px] text-neutral-400 mt-0.5">Tidak ada trip disrupted di wilayah ini saat ini.</p>
            </div>
          )}
        </div>

        {/* Compliance + Quick Stats */}
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Truck, label: 'Berangkat', val: departedCount, bg: 'bg-blue-50', color: 'text-blue-600' },
              { icon: ClipboardCheck, label: 'Tiba', val: arrivedCount, bg: 'bg-emerald-50', color: 'text-emerald-600' },
              { icon: Zap, label: 'Insiden', val: disruptedTrips.length, bg: 'bg-rose-50', color: 'text-rose-600' },
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
      </div>

      {/* ── EMERGENCY LOGS ── */}
      {emergencyLogs.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#10367D]/10 text-[#10367D] rounded-lg">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-bold text-neutral-800">Log Respon Darurat Sesi Ini</h3>
            </div>
            <span className="text-[12px] font-bold text-[#10367D] bg-[#10367D]/10 px-2.5 py-0.5 rounded-full">{emergencyLogs.length} Aksi</span>
          </div>
          <div className="space-y-2">
            {emergencyLogs.map((log) => (
              <div key={log.id} className="p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-[12px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-neutral-800 font-mono shrink-0">{log.id}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold shrink-0 ${log.action === 'DISPATCH ASSISTANCE' ? 'bg-[#74B4D9]/15 text-[#10367D]' : 'bg-emerald-50 text-emerald-700'}`}>
                    {log.action}
                  </span>
                  <span className="text-neutral-600 truncate">Trip: <strong>{log.tripId}</strong> ({log.mitra})</span>
                </div>
                <span className="text-[11px] text-neutral-400 whitespace-nowrap shrink-0">{log.timestamp} · {log.admin}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* ── MODALS ── */}

      <BaseModal
        isOpen={Boolean(selectedAssistTrip)}
        onClose={() => { setSelectedAssistTrip(null); setUnmaskedPhone(false); }}
        title="Koordinasi Bantuan Lapangan"
        subtitle={`Trip ${selectedAssistTrip?.id}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-3 text-[13px]">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
            <p className="text-neutral-500">Mitra: <strong className="text-neutral-800">{selectedAssistTrip?.mitra}</strong> ({selectedAssistTrip?.vehicle})</p>
            <div className="flex items-center justify-between text-neutral-500">
              <span>Kontak: <strong className="text-neutral-800 font-mono">{unmaskedPhone ? selectedAssistTrip?.phone : maskPhone(selectedAssistTrip?.phone)}</strong></span>
              <button onClick={() => setUnmaskedPhone(!unmaskedPhone)} className="p-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 transition cursor-pointer">
                {unmaskedPhone ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
            <p className="text-neutral-500">Kendala: <strong className="text-rose-600">{selectedAssistTrip?.issue}</strong></p>
            <p className="text-neutral-500">Lokasi: <strong className="text-neutral-800">{selectedAssistTrip?.location}</strong></p>
          </div>
          <p className="text-neutral-600">Sistem akan menugaskan Tim Pos Lapangan terdekat untuk memberikan bantuan.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setSelectedAssistTrip(null); setUnmaskedPhone(false); }} className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-full font-bold cursor-pointer">Batal</button>
            <button onClick={handleDispatchAssistance} className="px-4 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-full font-bold cursor-pointer shadow-sm transition">Kirim Tim Bantuan</button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
