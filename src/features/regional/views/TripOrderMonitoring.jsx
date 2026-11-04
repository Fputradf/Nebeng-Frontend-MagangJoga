import { BASE_URL } from '../../../config/env';
import { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Search,
  Play,
  Pause,
  RotateCcw,
  BrainCircuit,
  ShieldAlert,
  Award,
  MapPin,
  ArrowRight,
  Car,
  Radio,
  Clock,
  Gauge,
  Compass,
  Flag,
  Building,
  AlertCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatCard from '../../../components/ui/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import reportService from '../../../services/reportService';
import { parseRoutePolyline } from '../../../utils/mapRouteUtil';

export default function RegionalTripMonitoringPage() {
  const toast = useToast();
  const { session, adminProfile } = useAuth();
  const leafletMapInstance = useRef(null);
  const movingMarkerRef = useRef(null);
  const traveledLineRef = useRef(null);
  const fullLineRef = useRef(null);
  const socketRef = useRef(null);
  const [tripList, setTripList] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [scopeFilter, setScopeFilter] = useState('origin'); // 'origin' (Pos Lokal) | 'all' | 'destination'
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('replay');
  const [routedCoordinates, setRoutedCoordinates] = useState([]);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLiveTrackingActive, setIsLiveTrackingActive] = useState(false);
  const [livePosition, setLivePosition] = useState(null);
  const [eta, setEta] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);

  // Modal Pelaporan Insiden Operasional Pos
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTripTarget, setReportTripTarget] = useState(null);
  const [reportCategory, setReportCategory] = useState('SERVICE_QUALITY');
  const [reportSeverity, setReportSeverity] = useState('MEDIUM');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTrips = async () => {
      try {
        if (isMounted) setIsLoadingTrips(true);
        const currentRegionId = (adminProfile?.regionId || session?.regionId) ? String(adminProfile?.regionId || session?.regionId) : null;

        const params = {
          page: currentPage,
          limit: limit,
          ...(currentRegionId ? { regionId: currentRegionId } : {}),
          ...(scopeFilter !== 'all' ? { scope: scopeFilter } : {}),
          ...(statusFilter !== 'Semua' ? { status: statusFilter } : {}),
          ...(searchQuery.trim() !== '' ? { search: searchQuery } : {})
        };

        const response = await apiClient.get('/trips', { params }).catch(() => ({ data: { data: [], meta: null } }));

        const rawData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || []);

        const metaData = response.data?.meta || null;

        const formatted = rawData.map(t => {
          const STATUS_MAP = {
            scheduled: 'Terjadwal',
            pending: 'Terjadwal',
            in_transit: 'Sedang Berjalan',
            completed: 'Selesai',
            cancelled: 'Dibatalkan',
            canceled: 'Dibatalkan',
          };

          const mappedStatus =
            STATUS_MAP[t.status] ||
            (t.status ? String(t.status) : 'Terjadwal');

          const driverHomeRegionId = t.mitra?.homeRegionId ? String(t.mitra.homeRegionId) : (t.mitra?.regionId ? String(t.mitra.regionId) : null);
          const isLocalDriver = Boolean(currentRegionId && driverHomeRegionId && currentRegionId === driverHomeRegionId);
          const driverHomeRegionName = t.mitra?.homeRegionName || (isLocalDriver ? 'Wilayah Lokal' : 'Lintas Wilayah');
          const originRegionId = t.originPoint?.regionId ? String(t.originPoint.regionId) : null;
          const isOriginLocal = Boolean(currentRegionId && originRegionId && currentRegionId === originRegionId);
          const originRegionName = t.originPoint?.regionName || '';
          const destinationRegionName = t.destinationPoint?.regionName || '';

          return {
            id: String(t.id),
            rawStatus: t.status,
            passenger: t.customer?.name || t.passengerName || 'Pelanggan Umum',
            driver: t.mitra?.name || t.driver?.name || 'Driver Mitra',
            driverId: t.mitra?.id ? String(t.mitra.id) : (t.mitraId ? String(t.mitraId) : null),
            driverPhone: t.mitra?.phone || '-',
            isLocalDriver,
            driverHomeRegionName,
            vehicle: t.vehicle
              ? `${t.vehicle.type} (${t.vehicle.plateNumber})`
              : 'Kendaraan Standar',
            originPos: t.originPoint?.name || 'Pos Asal',
            originPointId: t.originPoint?.id ? String(t.originPoint.id) : null,
            isOriginLocal,
            originRegionName,
            destinationPos: t.destinationPoint?.name || 'Pos Tujuan',
            destinationPointId: t.destinationPoint?.id ? String(t.destinationPoint.id) : null,
            destinationRegionName,
            status: mappedStatus,
            fare: t.price
              ? `Rp ${Number(t.price).toLocaleString('id-ID')}`
              : 'Rp 35.000',
            time: t.createdAt
              ? new Date(t.createdAt).toLocaleString('id-ID')
              : 'Hari ini',
            originCoord: (t.originPoint?.lat && t.originPoint?.lng) ? { lat: t.originPoint.lat, lng: t.originPoint.lng } : { lat: -7.7956, lng: 110.3695 }, // Yogyakarta area default
            destinationCoord: (t.destinationPoint?.lat && t.destinationPoint?.lng) ? { lat: t.destinationPoint.lat, lng: t.destinationPoint.lng } : { lat: -7.7892, lng: 110.4095 }, // Nearby area default
            dms: {
              fatigueStatus: 'Aman / Normal',
              distractionAlerts: 0,
              eyeClosureScore: '98%',
              phoneUsageDetected: false,
              lastAiLog: 'AI Camera: Mata fokus & berkonsentrasi'
            },
            driverScore: 92,
            geofenceZone: 'Zona Regional Wilayah',
            geofenceStatus: 'Inside Boundary',
            speedLimit: '50 km/jam'
          };
        });

        if (isMounted) {
          setTripList(formatted);
          setPaginationMeta(metaData);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Gagal memuat trip:', error);
          setTripList([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTrips(false);
        }
      }
    };

    loadTrips();

    return () => {
      isMounted = false;
    };
  }, [adminProfile?.regionId, session?.regionId, currentPage, limit, statusFilter, scopeFilter, searchQuery]);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!currentTrip || !isDetailOpen) return;

    let isSubscribed = true;
    const baseURL = apiClient.defaults.baseURL
      ? apiClient.defaults.baseURL.replace(/\/api\/?$/, '')
      : BASE_URL;

    const socket = io(`${baseURL}/tracking`, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinTrip', { tripId: currentTrip.id });
    });

    socket.on('locationUpdated', (data) => {
      if (isSubscribed && data.tripId === currentTrip.id) {
        setLivePosition({
          lat: Number(data.latitude),
          lng: Number(data.longitude)
        });
        setCurrentSpeed(data.speed || 0);
        setCurrentHeading(data.heading || 0);
        setLastLocationUpdate(new Date());
      }
    });

    socket.on('etaUpdated', (data) => {
      if (isSubscribed && data.tripId === currentTrip.id) {
        setEta(data.eta);
      }
    });

    socket.on('geofenceAlert', (data) => {
      if (isSubscribed && data.tripId === currentTrip.id) {
        console.log('Geofence Alert:', data);
        // Could add toast notification here
      }
    });

    socket.on('deviationAlert', (data) => {
      if (isSubscribed && data.tripId === currentTrip.id) {
        console.log('Deviation Alert:', data);
        // Could add toast notification here
      }
    });

    // Gunakan rute OSRM dari mapsPolyline jika tersedia, atau fallback ke 2 titik
    const parsedCoords = parseRoutePolyline(
      currentTrip.mapsPolyline,
      currentTrip.originCoord,
      currentTrip.destinationCoord
    );
    if (parsedCoords.length > 0) {
      setRoutedCoordinates(parsedCoords.map(([lat, lng]) => ({ lat, lng })));
    } else {
      setRoutedCoordinates([currentTrip.originCoord, currentTrip.destinationCoord]);
    }

    return () => {
      isSubscribed = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentTrip, isDetailOpen]);

  useEffect(() => {
    if (activeTab !== 'replay' || !currentTrip || routedCoordinates.length === 0 || !isDetailOpen) {
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (!isMounted) return;

      const L = window.L;
      const container = document.getElementById('real-leaflet-map');

      if (!container) return;
      if (container._leaflet_id) {
        container._leaflet_id = null;
      }

      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }

      const coords = routedCoordinates.map(c => [c.lat, c.lng]);
      const map = L.map('real-leaflet-map', {
        center: coords[0],
        zoom: 16, // Maximum zoom in as requested
        zoomControl: true,
        minZoom: 14, // Prevent zooming out too much
        maxZoom: 18
      });

      leafletMapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      fullLineRef.current = L.polyline(coords, {
        color: '#4B5563',
        weight: 5,
        dashArray: '2, 6',
        opacity: 0.6
      }).addTo(map);

      traveledLineRef.current = L.polyline([coords[0]], {
        color: '#10367D',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div style="
            display:flex;
            flex-direction:column;
            align-items:center;
            pointer-events:none;
          ">
            <div style="
              background:linear-gradient(135deg, #10367D 0%, #0C2C66 100%);
              color:white;
              padding:6px 12px;
              border-radius:8px;
              font-weight:600;
              font-size:11px;
              border:2px solid white;
              box-shadow:0 4px 12px rgba(16, 54, 125, 0.5);
              white-space:nowrap;
              margin-bottom:4px;
            ">
              🚗 ${currentTrip.driver}
            </div>
            <div style="
              width:24px;
              height:24px;
              background:#10367D;
              border:3px solid white;
              border-radius:50%;
              box-shadow:0 2px 12px rgba(16, 54, 125, 0.5);
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              <div style="
                width:8px;
                height:8px;
                background:white;
                border-radius:50%;
              "></div>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 48]
      });

      movingMarkerRef.current = L.marker(coords[0], {
        icon: vehicleIcon
      }).addTo(map);
    };

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, [activeTab, currentTrip, routedCoordinates, isDetailOpen]);

  const getCurrentTelemetry = (points, progress) => {
    if (!points || points.length === 0) return { lat: -7.5623, lng: 110.8122 };
    if (points.length === 1 || progress <= 0) return points[0];
    if (progress >= 100) return points[points.length - 1];

    const totalSegments = points.length - 1;
    const scaledProgress = (progress / 100) * totalSegments;
    const index = Math.floor(scaledProgress);
    const t = scaledProgress - index;

    const p1 = points[index];
    const p2 = points[Math.min(index + 1, totalSegments)];

    return {
      lat: p1.lat + (p2.lat - p1.lat) * t,
      lng: p1.lng + (p2.lng - p1.lng) * t
    };
  };

  useEffect(() => {
    if (!currentTrip || routedCoordinates.length === 0 || !leafletMapInstance.current || !isDetailOpen) {
      return;
    }

    try {
      const currentPos = isLiveTrackingActive && livePosition
        ? livePosition
        : getCurrentTelemetry(routedCoordinates, replayProgress);

      if (movingMarkerRef.current) {
        // Only update marker position, don't auto-center
        movingMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng]);
      }

      if (traveledLineRef.current && !isLiveTrackingActive) {
        const totalSegments = routedCoordinates.length - 1;
        const scaledProgress = (replayProgress / 100) * totalSegments;
        const currentIndex = Math.floor(scaledProgress);

        const traveledPoints = routedCoordinates
          .slice(0, currentIndex + 1)
          .map(c => [c.lat, c.lng]);

        traveledPoints.push([currentPos.lat, currentPos.lng]);
        traveledLineRef.current.setLatLngs(traveledPoints);
      }
    } catch (error) {
      console.error('[Regional GPS] Error updating map marker:', error);
    }
  }, [replayProgress, livePosition, isLiveTrackingActive, currentTrip, routedCoordinates, isDetailOpen]);

  useEffect(() => {
    let interval;
    if (isPlayingReplay && isDetailOpen && !isLiveTrackingActive) {
      interval = setInterval(() => {
        setReplayProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingReplay(false);
            return 100;
          }
          return prev + (0.4 * playbackSpeed);
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlayingReplay, playbackSpeed, isDetailOpen, isLiveTrackingActive]);

  const handleCloseDetailModal = () => {
    setIsPlayingReplay(false);
    setReplayProgress(0);
    setIsLiveTrackingActive(false);
    setLivePosition(null);
    setEta(null);
    setCurrentSpeed(0);
    setCurrentHeading(0);
    setLastLocationUpdate(null);
    setIsDetailOpen(false);

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    if (leafletMapInstance.current) {
      leafletMapInstance.current.remove();
      leafletMapInstance.current = null;
    }
  };

  const handleOpenDetail = (trip, defaultTab = 'replay') => {
    setRoutedCoordinates([]);
    setCurrentTrip(trip);
    setActiveTab(defaultTab);
    setReplayProgress(0);
    setIsPlayingReplay(false);
    setPlaybackSpeed(1);
    setIsLiveTrackingActive(false);
    setLivePosition(null);
    setIsDetailOpen(true);
  };

  const handleOpenReportModal = (trip) => {
    setReportTripTarget(trip);
    setReportTitle(`Pelanggaran Operasional di Pos: ${trip.originPos}`);
    setReportCategory('SERVICE_QUALITY');
    setReportSeverity('MEDIUM');
    setReportDescription('');
    setReportModalOpen(true);
  };

  const handleSubmitOperationalReport = async (e) => {
    e.preventDefault();
    if (!reportTripTarget) return;

    if (!reportDescription.trim()) {
      toast.error('Harap berikan rincian laporan insiden operasional.', { title: 'Form Belum Lengkap' });
      return;
    }

    try {
      setIsSubmittingReport(true);
      await reportService.createReport({
        reportedUserId: reportTripTarget.driverId,
        tripId: reportTripTarget.id,
        pickupPointId: reportTripTarget.originPointId,
        category: reportCategory,
        severity: reportSeverity,
        title: reportTitle.trim() || `Laporan Operasional Pos ${reportTripTarget.originPos}`,
        description: `[LAPORAN OPERASIONAL POS WILAYAH]\nMitra: ${reportTripTarget.driver} (Homebase: ${reportTripTarget.driverHomeRegionName})\nPos Keberangkatan: ${reportTripTarget.originPos}\nCatatan Insiden: ${reportDescription.trim()}`
      });

      toast.success('Laporan insiden operasional pos berhasil diajukan ke admin pusat & homebase mitra.', {
        title: 'Laporan Terkirim'
      });
      setReportModalOpen(false);
      setReportTripTarget(null);
    } catch (err) {
      console.error('Gagal mengirim laporan operasional:', err);
      toast.error(err.response?.data?.message || 'Gagal mengirim laporan operasional pos.', {
        title: 'Gagal Kirim Laporan'
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

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
                <Navigation className="w-3.5 h-3.5" /> MONITORING CERDAS OPERASIONAL & HOMEBASE MITRA
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pemantauan Trip & Operasional Pos
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Pantau trip real-time di seluruh pos wilayah Anda. Mitra bebas beroperasi di pos mana saja, dengan atribusi operasional & homebase yang transparan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                {paginationMeta?.total || tripList.length} Trip Terpantau
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* DUAL SCOPE SUMMARY / TAB PILIH PERSPEKTIF */}
      <div className="bg-white p-2 sm:p-3 rounded-2xl shadow-sm border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => { setScopeFilter('origin'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition flex items-center gap-2 cursor-pointer ${
              scopeFilter === 'origin'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <span>🚩 Keberangkatan Pos Wilayah</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              scopeFilter === 'origin' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}>
              Operasional & Komisi
            </span>
          </button>

          <button
            onClick={() => { setScopeFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition flex items-center gap-2 cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <span>🌐 Semua Rute Terkait</span>
          </button>

          <button
            onClick={() => { setScopeFilter('destination'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition flex items-center gap-2 cursor-pointer ${
              scopeFilter === 'destination'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <span>🏁 Kedatangan Menuju Wilayah</span>
          </button>
        </div>

        <div className="text-[12px] text-neutral-500 font-medium px-2">
          {scopeFilter === 'origin'
            ? '📌 Menampilkan trip yang berangkat dari pos di wilayah Anda (aset demand & komisi masuk wilayah ini).'
            : scopeFilter === 'destination'
            ? '📍 Menampilkan trip yang bertujuan akhir ke pos wilayah Anda.'
            : '🌐 Menampilkan seluruh trip yang bersinggungan dengan wilayah ini.'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL TRIP TERCATAT"
          value={`${paginationMeta?.total || tripList.length} Trip`}
          subtitle="Sesuai filter lingkup pos"
          icon={Car}
        />
        <StatCard
          title="RATA-RATA DRIVER SCORE"
          value="92.0 / 100"
          subtitle="Kategori Sangat Aman"
          icon={Award}
        />
        <StatCard
          title="PERINGATAN AI DMS"
          value="0 Deteksi"
          subtitle="Aman terkontrol"
          icon={BrainCircuit}
        />
        <StatCard
          title="STATUS GEOFENCE"
          value="Aman"
          subtitle="Dalam batas wilayah"
          icon={ShieldAlert}
        />
      </div>

      {/* FILTER & LIMIT CONTROL */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari pos asal, tujuan, atau mitra..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-full px-3 py-1.5 text-[13px] font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#10367D] cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="scheduled">Terjadwal (Scheduled)</option>
            <option value="in_transit">Sedang Berjalan (In Transit)</option>
            <option value="completed">Selesai (Completed)</option>
            <option value="cancelled">Dibatalkan (Cancelled)</option>
          </select>

          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-bold text-neutral-800 text-[13px] focus:outline-none cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">ID & Waktu</th>
                <th className="py-3 px-5">Driver & Homebase</th>
                <th className="py-3 px-5">Rute (Asal &rarr; Tujuan)</th>
                <th className="py-3 px-5">Status Trip</th>
                <th className="py-3 px-5 text-center">Driver Score</th>
                <th className="py-3 px-5 text-center">Aksi Operasional</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingTrips ? (
                <SkeletonTableRows rows={4} columns={6} />
              ) : tripList.length > 0 ? (
                tripList.map((trip) => (
                  <tr key={trip.id} className="hover:bg-[#74B4D9]/10 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-neutral-800 font-mono text-[13px]">{trip.id}</div>
                      <div className="text-[11px] text-neutral-400">{trip.time}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-neutral-800">{trip.driver}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{trip.vehicle}</div>
                      <div className="mt-1 flex items-center gap-1">
                        {trip.isLocalDriver ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Mitra Lokal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800" title="Homebase mitra di luar wilayah Anda">
                            Lintas: {trip.driverHomeRegionName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 font-semibold text-neutral-700">
                        <MapPin size={11} className="text-[#10367D] shrink-0" />
                        <span className="truncate">
                          {trip.originPos}
                          {trip.isOriginLocal && (
                            <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">Pos Lokal</span>
                          )}
                        </span>
                        <ArrowRight size={10} className="text-[#10367D] shrink-0" />
                        <span className="truncate">{trip.destinationPos}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Tarif: <span className="font-semibold text-neutral-600">{trip.fare}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge variant={trip.rawStatus === 'in_transit' ? 'blue' : 'amber'}>
                        {trip.status}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <StatusBadge variant="emerald">★ {trip.driverScore}/100</StatusBadge>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(trip, 'replay')}
                          title="Visual Replay & Live Tracking"
                          className="p-1.5 bg-[#74B4D9]/15 hover:bg-[#74B4D9]/25 text-[#10367D] rounded-lg transition cursor-pointer"
                        >
                          <Play size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenReportModal(trip)}
                          title="Laporkan Masalah Operasional Pos"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <Flag size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Navigation}
                      title="Trip Tidak Ditemukan"
                      description="Belum ada data trip di database untuk filter ini."
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
              Halaman <strong>{paginationMeta.page}</strong> dari <strong>{paginationMeta.totalPages}</strong> (Total: {paginationMeta.total} Trip)
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1 || isLoadingTrips}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= paginationMeta.totalPages || isLoadingTrips}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL MONITORING & WEBSOCKET LIVE TRACKING */}
      <BaseModal
        isOpen={Boolean(isDetailOpen && currentTrip)}
        onClose={handleCloseDetailModal}
        title={`Detail Monitoring Trip ${currentTrip?.id}`}
        subtitle={`Driver: ${currentTrip?.driver}`}
        maxWidth="max-w-2xl"
      >
        {currentTrip && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-xl">
              <div id="real-leaflet-map" className="w-full h-72 z-0" />

              <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 p-4 text-white space-y-3 relative z-10 border-t border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLiveTrackingActive && livePosition ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Mode Tampilan</span>
                  </div>
                  <button
                    onClick={() => setIsLiveTrackingActive(!isLiveTrackingActive)}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-[12px] transition ${
                      isLiveTrackingActive
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                  >
                    <Radio size={12} />
                    <span>{isLiveTrackingActive ? (livePosition ? 'Live Tracking Aktif' : 'Menunggu GPS Mitra...') : 'Mode Replay Simulasi'}</span>
                  </button>
                </div>

                {isLiveTrackingActive && livePosition && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-700">
                    <div className="bg-neutral-800/50 rounded-lg p-2.5 border border-neutral-700">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Speed
                      </div>
                      <div className="font-mono text-[13px] font-bold text-white">{currentSpeed.toFixed(1)} m/s</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2.5 border border-neutral-700">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Heading
                      </div>
                      <div className="font-mono text-[13px] font-bold text-white">{currentHeading.toFixed(0)}°</div>
                    </div>
                    {eta && (
                      <div className="bg-emerald-900/30 rounded-lg p-2.5 border border-emerald-700/50 col-span-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 uppercase tracking-wider mb-1">
                          <Clock size={10} />
                          Estimated Time of Arrival
                        </div>
                        <div className="font-mono text-[13px] font-bold text-emerald-300">{new Date(eta).toLocaleTimeString('id-ID')}</div>
                      </div>
                    )}
                    {lastLocationUpdate && (
                      <div className="col-span-2 text-[11px] text-neutral-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
                        Last Update: {lastLocationUpdate.toLocaleTimeString('id-ID')}
                      </div>
                    )}
                  </div>
                )}

                {!isLiveTrackingActive && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={isFetchingRoute}
                      value={replayProgress}
                      onChange={(e) => {
                        setReplayProgress(Number(e.target.value));
                        setIsPlayingReplay(false);
                      }}
                      className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#10367D] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundImage: 'linear-gradient(to right, #10367D 0%, #10367D ' + replayProgress + '%, #374151 ' + replayProgress + '%, #374151 100%)'
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                      <span>0%</span>
                      <span>{Math.round(replayProgress)}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {!isLiveTrackingActive && (
                      <>
                        <button
                          onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                          disabled={isFetchingRoute}
                          className="px-4 py-2 bg-gradient-to-r from-[#10367D] to-[#0C2C66] hover:from-[#0C2C66] hover:to-[#082044] text-white rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPlayingReplay ? <Pause size={12} /> : <Play size={12} />}
                          <span>{isPlayingReplay ? 'Pause' : 'Mulai Replay'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setReplayProgress(0);
                            setIsPlayingReplay(false);
                          }}
                          className="p-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-xl transition cursor-pointer shadow-md"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex justify-end">
              <button
                onClick={handleCloseDetailModal}
                className="px-5 py-2.5 bg-gradient-to-r from-[#10367D] to-[#0C2C66] hover:from-[#0C2C66] hover:to-[#082044] text-white text-[13px] font-bold rounded-xl transition cursor-pointer shadow-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* MODAL LAPORKAN INSIDEN OPERASIONAL POS */}
      <BaseModal
        isOpen={reportModalOpen}
        onClose={() => { if (!isSubmittingReport) setReportModalOpen(false); }}
        title="Laporkan Insiden Operasional di Pos"
        maxWidth="max-w-lg"
      >
        {reportTripTarget && (
          <form onSubmit={handleSubmitOperationalReport} className="space-y-4 font-['Inter']">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-900 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>Wewenang Operasional Pos (Dispute & Incident Flagging)</span>
              </div>
              Laporan ini ditujukan untuk mencatat pelanggaran sopan-santun, keterlambatan, atau ketidakpatuhan SOP pos oleh mitra yang mengambil order di pos wilayah Anda. Laporan akan diteruskan ke <strong>Admin Homebase Mitra</strong> dan <strong>Superadmin</strong> untuk evaluasi sanksi administratif.
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-[12px] space-y-1">
              <div><span className="text-neutral-500">Trip ID:</span> <span className="font-mono font-bold text-neutral-800">#{reportTripTarget.id}</span></div>
              <div><span className="text-neutral-500">Nama Mitra:</span> <span className="font-bold text-neutral-800">{reportTripTarget.driver}</span></div>
              <div>
                <span className="text-neutral-500">Homebase Mitra:</span>{' '}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  reportTripTarget.isLocalDriver ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {reportTripTarget.driverHomeRegionName}
                </span>
              </div>
              <div><span className="text-neutral-500">Pos Keberangkatan:</span> <span className="font-semibold text-neutral-800">{reportTripTarget.originPos}</span></div>
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
                <option value="SERVICE_QUALITY">Pelayanan / Ketidakpatuhan Jadwal Pos</option>
                <option value="SAFETY_AND_HARASSMENT">Keamanan / Ketertiban di Area Pos</option>
                <option value="FRAUD_AND_FINANCIAL">Kecurangan Transaksi / Tarif di Luar Aplikasi</option>
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
                placeholder="Contoh: Mitra terlambat lebih dari 30 menit di Pos A"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[13px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Rincian Kronologi Kejadian di Pos
              </label>
              <textarea
                rows={3}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Tuliskan kronologi kejadian di pos secara objektif..."
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
                {isSubmittingReport ? 'Mengirim...' : 'Kirim Laporan Insiden'}
              </button>
            </div>
          </form>
        )}
      </BaseModal>
    </div>
  );
}