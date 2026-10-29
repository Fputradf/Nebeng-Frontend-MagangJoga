import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  MapPin, 
  Car, 
  Bike, 
  Plus, 
  XCircle, 
  Users, 
  Package, 
  Navigation, 
  Radio, 
  PauseCircle, 
  PlayCircle, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useGPS } from '../../../context/GPSContext';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import apiClient from '../../../services/apiClient';
import { estimateFare } from '../../../services/mitraPricing';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

const formatTripDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr.split('T')[0] || '-';
  }
};

const formatTripTime = (timeStr) => {
  if (!timeStr) return '-';
  try {
    if (typeof timeStr === 'string') {
      if (timeStr.includes('T')) {
        const timePart = timeStr.split('T')[1];
        return timePart.substring(0, 5) + ' WIB';
      }
      if (timeStr.includes(':')) {
        return timeStr.substring(0, 5) + ' WIB';
      }
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
  } catch {
    // fallback
  }
  return '-';
};

export default function MitraTripManagement() {
  const toast = useToast();
  const {
    currentPosition,
    isTracking,
    activeTripId,
    socketConnected,
    startGPSTracking,
    stopGPSTracking
  } = useGPS();

  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [points, setPoints] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Self Tracking Modal State
  const [isSelfTrackingModalOpen, setIsSelfTrackingModalOpen] = useState(false);
  const [activeTrackingTrip, setActiveTrackingTrip] = useState(null);
  const leafletMapInstance = useRef(null);
  const movingMarkerRef = useRef(null);

  const [layananCategory, setLayananCategory] = useState('penumpang');

  const [formData, setFormData] = useState({
    originPointId: '',
    destinationPointId: '',
    date: '',
    time: '08:00',
    vehicleId: '',
    price: 20000,
    totalSeats: 1,
    maxWeightCapacityKg: 15,
  });

  const [cancelConfirmTarget, setCancelConfirmTarget] = useState(null);
  const [cancelReasonOption, setCancelReasonOption] = useState('Kendaraan bermasalah / rusak teknis');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelEvidenceUrl, setCancelEvidenceUrl] = useState('');
  const [isCancellingTrip, setIsCancellingTrip] = useState(false);
  const [isPriceManual, setIsPriceManual] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const todayISO = new Date().toISOString().slice(0, 10);

  const setDatePreset = (daysOffset) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const iso = target.toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: iso }));
  };

  const calculateSuggestedFare = (originId, destinationId, vehId, currentPoints, currentVehicles) => {
    if (!originId || !destinationId || !vehId) return null;
    const originPoint = currentPoints.find(p => String(p.id) === String(originId));
    const destinationPoint = currentPoints.find(p => String(p.id) === String(destinationId));
    const vehicle = currentVehicles.find(v => String(v.id) === String(vehId));

    if (!originPoint || !destinationPoint || !vehicle) return null;

    const vehicleLabel = vehicle.type ? vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1).toLowerCase() : 'Motor';
    return estimateFare(originPoint.name, destinationPoint.name, vehicleLabel);
  };

  const loadMitraData = async (isMounted = true) => {
    setIsLoading(true);
    try {
      const [resPoints, resVehicles, resMyTrips, resUserMe] = await Promise.all([
        apiClient.get('/pickup-points').catch(() => ({ data: [] })),
        apiClient.get('/vehicles/me').catch(() => ({ data: [] })),
        apiClient.get('/trips/me').catch(() => ({ data: [] })),
        apiClient.get('/auth/me').catch(() => ({ data: null })),
      ]);

      if (!isMounted) return;

      const allPoints = resPoints.data?.data || resPoints.data || [];
      const myVehicles = resVehicles.data?.data || resVehicles.data || [];
      const myTrips = resMyTrips.data?.data || resMyTrips.data || [];

      setPoints(allPoints);
      setVehicles(myVehicles);
      setTrips(myTrips);
      if (resUserMe?.data) {
        setCurrentUser(resUserMe.data);
      }

      if (allPoints.length >= 2 && myVehicles.length > 0) {
        const initialOrigin = String(allPoints[0].id);
        const initialDestination = String(allPoints[1].id);
        const initialVehicleId = String(myVehicles[0].id);
        const isMotor = myVehicles[0].type?.toLowerCase() === 'motor';
        const initialSeats = isMotor ? 1 : (myVehicles[0].capacitySeats || 1);
        const initialMaxWeight = Number(myVehicles[0].maxWeightCapacityKg) || 15;

        let initialPrice = 175000;
        if (!isPriceManual) {
          const suggested = calculateSuggestedFare(initialOrigin, initialDestination, initialVehicleId, allPoints, myVehicles);
          if (suggested) initialPrice = suggested;
        }

        setFormData(prev => ({
          ...prev,
          originPointId: prev.originPointId || initialOrigin,
          destinationPointId: prev.destinationPointId || initialDestination,
          vehicleId: prev.vehicleId || initialVehicleId,
          totalSeats: initialSeats,
          maxWeightCapacityKg: initialMaxWeight,
          price: initialPrice,
        }));
      }
    } catch (err) {
      console.error('Gagal memuat data trip:', err);
      if (isMounted) {
        toast.error('Gagal menyambungkan data ke server.', { title: 'Error' });
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      await loadMitraData(isMounted);
    };
    initData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setIsPriceManual(true);
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (!isPriceManual && (name === 'originPointId' || name === 'destinationPointId' || name === 'vehicleId')) {
        const suggested = calculateSuggestedFare(
          name === 'originPointId' ? value : prev.originPointId,
          name === 'destinationPointId' ? value : prev.destinationPointId,
          name === 'vehicleId' ? value : prev.vehicleId,
          points,
          vehicles
        );
        if (suggested) {
          updated.price = suggested;
        }
      }
      return updated;
    });
  };

  const handleVehicleSelect = (e) => {
    const vId = e.target.value;
    const selectedVeh = vehicles.find(v => String(v.id) === vId);
    if (selectedVeh) {
      const isMotor = selectedVeh.type?.toLowerCase() === 'motor';
      setFormData(prev => {
        const updated = {
          ...prev,
          vehicleId: vId,
          totalSeats: isMotor ? 1 : (selectedVeh.capacitySeats || 1),
          maxWeightCapacityKg: Number(selectedVeh.maxWeightCapacityKg) || 15,
        };
        if (!isPriceManual) {
          const suggested = calculateSuggestedFare(prev.originPointId, prev.destinationPointId, vId, points, vehicles);
          if (suggested) updated.price = suggested;
        }
        return updated;
      });
    }
  };

  const formatPointLabel = (point) => {
    const areaName = point?.city?.name || point?.area?.name || point?.region?.name;
    return areaName ? `${point.name} (${areaName})` : point.name;
  };

  const isSameOriginDestination = formData.originPointId && formData.destinationPointId && formData.originPointId === formData.destinationPointId;
  const isPastDate = Boolean(formData.date) && formData.date < todayISO;

  const originPointObj = points.find(p => String(p.id) === String(formData.originPointId));
  const destPointObj = points.find(p => String(p.id) === String(formData.destinationPointId));
  const mitraRegionId = currentUser?.regionId ? String(currentUser.regionId) : null;
  const isOriginMatchHome = Boolean(mitraRegionId && originPointObj?.regionId && String(originPointObj.regionId) === mitraRegionId);
  const isDestMatchHome = Boolean(mitraRegionId && destPointObj?.regionId && String(destPointObj.regionId) === mitraRegionId);
  const isOutsideHomeBase = Boolean(
    mitraRegionId && 
    originPointObj && 
    destPointObj && 
    !isOriginMatchHome && 
    !isDestMatchHome
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSameOriginDestination) {
      toast.warning('Pos Asal dan Pos Tujuan tidak boleh sama.', { title: 'Rute Tidak Valid' });
      return;
    }
    if (isOutsideHomeBase) {
      toast.warning(
        `Sesuai aturan wilayah (Home Base), salah satu pos harus berada di wilayah asal Anda (${currentUser?.region?.name || 'wilayah terdaftar'}).`,
        { title: 'Di Luar Wilayah Operasi' }
      );
      return;
    }
    if (isPastDate) {
      toast.warning('Tanggal trip tidak boleh di masa lalu.', { title: 'Tanggal Tidak Valid' });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedVeh = vehicles.find(v => String(v.id) === String(formData.vehicleId));
      const vehType = selectedVeh?.type?.toLowerCase() || 'mobil';
      const isMotor = vehType === 'motor';

      const finalServiceType = layananCategory === 'barang' ? 'barang' : vehType;
      const isPenumpang = layananCategory === 'penumpang';

      const totalSeatsPayload = isPenumpang
        ? (isMotor ? 1 : Math.max(1, Number(formData.totalSeats) || 1))
        : undefined; // Barang tidak punya kursi

      const maxWeightCapacityKgPayload = isPenumpang
        ? Number(selectedVeh?.maxWeightCapacityKg || 15)
        : Math.max(1, Number(formData.maxWeightCapacityKg) || 1);

      const payload = {
        vehicleId: String(formData.vehicleId),
        originPointId: String(formData.originPointId),
        destinationPointId: String(formData.destinationPointId),
        departureDate: formData.date,
        departureTime: `${formData.date}T${formData.time}:00.000Z`,
        price: Number(formData.price),
        maxWeightCapacityKg: maxWeightCapacityKgPayload,
        serviceType: finalServiceType,
      };

      // Hanya kirim totalSeats untuk trip penumpang
      if (isPenumpang) {
        payload.totalSeats = totalSeatsPayload;
      }

      await apiClient.post('/trips', payload);

      toast.success('Trip baru berhasil dibuat dan dipublikasikan!', { title: 'Sukses' });
      setFormData(prev => ({ ...prev, date: '' }));
      loadMitraData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat trip baru.', { title: 'Gagal' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelConfirmTarget) return;
    try {
      await apiClient.patch(`/trips/${cancelConfirmTarget}`, { status: 'cancelled' });
      toast.success('Trip berhasil dibatalkan.', { title: 'Sukses' });
      setCancelConfirmTarget(null);
      loadMitraData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan trip.', { title: 'Gagal' });
    }
  };

  const filteredTrips = trips.filter((t) => {
    if (t.status === 'cancelled') return false;
    if (filterStatus === 'scheduled') {
      if (t.status !== 'scheduled') return false;
    } else if (filterStatus === 'in_transit') {
      if (t.status !== 'in_transit' && t.status !== 'in_origin_pos') return false;
    } else if (filterStatus === 'completed') {
      if (t.status !== 'completed') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const originName = (t.originPoint?.name || '').toLowerCase();
      const destName = (t.destinationPoint?.name || '').toLowerCase();
      const idStr = String(t.id);
      const vehicleModel = (t.vehicle?.model || '').toLowerCase();
      return originName.includes(q) || destName.includes(q) || idStr.includes(q) || vehicleModel.includes(q);
    }
    return true;
  });

  // Start GPS Tracking (using GPSContext)
  const handleStartGPSTracking = async (trip) => {
    const success = await startGPSTracking(trip.id);
    if (success) {
      setActiveTrackingTrip(trip);
      toast.success('GPS tracking aktif! Lokasi akan dikirim secara real-time.', { title: 'Tracking Aktif' });
    } else {
      toast.error('Gagal memulai GPS tracking', { title: 'Error' });
    }
  };

  // Stop GPS Tracking (using GPSContext)
  const handleStopGPSTracking = () => {
    stopGPSTracking();
    setActiveTrackingTrip(null);
    toast.info('GPS tracking telah dihentikan', { title: 'Tracking Berhenti' });
  };

  // Open Self Tracking Modal
  const openSelfTrackingModal = (trip) => {
    console.log('[Mitra GPS] Opening tracking for trip:', trip);
    console.log('[Mitra GPS] Origin Point:', trip.originPoint);
    console.log('[Mitra GPS] Destination Point:', trip.destinationPoint);
    setActiveTrackingTrip(trip);
    setIsSelfTrackingModalOpen(true);
  };

  // Close Self Tracking Modal
  const closeSelfTrackingModal = () => {
    setIsSelfTrackingModalOpen(false);
    setActiveTrackingTrip(null);
  };

  // Load Leaflet CSS
  useEffect(() => {
    if (!document.getElementById('leaflet-css-mitra')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-mitra';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Initialize Map for Self Tracking
  useEffect(() => {
    if (!activeTrackingTrip || !isSelfTrackingModalOpen) {
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      try {
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
        const container = document.getElementById('mitra-tracking-map');

        if (!container) {
          console.error('[Mitra GPS] Map container not found');
          return;
        }
        if (container._leaflet_id) {
          container._leaflet_id = null;
        }

        if (leafletMapInstance.current) {
          leafletMapInstance.current.remove();
          leafletMapInstance.current = null;
        }

        const startLat = activeTrackingTrip.originPoint?.lat || currentPosition?.lat || -7.7956;
        const startLng = activeTrackingTrip.originPoint?.lng || currentPosition?.lng || 110.3695;
        const endLat = activeTrackingTrip.destinationPoint?.lat || currentPosition?.lat || -7.7956;
        const endLng = activeTrackingTrip.destinationPoint?.lng || currentPosition?.lng || 110.3695;

        console.log('[Mitra GPS] Final coordinates:', { startLat, startLng, endLat, endLng });
        console.log('[Mitra GPS] Current GPS:', currentPosition);
        console.log('[Mitra GPS] Trip originPoint:', activeTrackingTrip.originPoint);
        console.log('[Mitra GPS] Trip destinationPoint:', activeTrackingTrip.destinationPoint);

        const centerLat = currentPosition?.lat || startLat;
        const centerLng = currentPosition?.lng || startLng;

        // Use only 2 points (origin and destination) or 1 point (GPS position)
        // No OSRM route to prevent zooming out to wrong area
        let routeCoords;
        if (currentPosition) {
          routeCoords = [[currentPosition.lat, currentPosition.lng]];
          console.log('[Mitra GPS] Using GPS position only (1 point)');
        } else {
          routeCoords = [
            [startLat, startLng],
            [endLat, endLng]
          ];
          console.log('[Mitra GPS] Using origin and destination only (2 points)');
        }

        console.log('[Mitra GPS] Final route coordinates:', routeCoords);

        const map = L.map('mitra-tracking-map', {
          center: [centerLat, centerLng],
          zoom: 16, // Maximum zoom in as requested
          zoomControl: true,
          minZoom: 14, // Prevent zooming out too much
          maxZoom: 18
        });

        leafletMapInstance.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Add origin marker
        const originIcon = L.divIcon({
          className: 'custom-origin-marker',
          html: `
            <div style="
              display:flex;
              flex-direction:column;
              align-items:center;
              pointer-events:none;
            ">
              <div style="
                background:linear-gradient(135deg, #10B981 0%, #059669 100%);
                color:white;
                padding:6px 12px;
                border-radius:8px;
                font-weight:600;
                font-size:11px;
                border:2px solid white;
                box-shadow:0 4px 12px rgba(16, 185, 129, 0.4);
                white-space:nowrap;
                margin-bottom:4px;
              ">
                📍 Pos Asal: ${activeTrackingTrip.originPoint?.name || 'Asal'}
              </div>
              <div style="
                width:20px;
                height:20px;
                background:#10B981;
                border:3px solid white;
                border-radius:50%;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
              "></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        L.marker([startLat, startLng], { icon: originIcon }).addTo(map);

        // Add destination marker
        const destIcon = L.divIcon({
          className: 'custom-dest-marker',
          html: `
            <div style="
              display:flex;
              flex-direction:column;
              align-items:center;
              pointer-events:none;
            ">
              <div style="
                background:linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
                color:white;
                padding:6px 12px;
                border-radius:8px;
                font-weight:600;
                font-size:11px;
                border:2px solid white;
                box-shadow:0 4px 12px rgba(239, 68, 68, 0.4);
                white-space:nowrap;
                margin-bottom:4px;
              ">
                🏁 Pos Tujuan: ${activeTrackingTrip.destinationPoint?.name || 'Tujuan'}
              </div>
              <div style="
                width:20px;
                height:20px;
                background:#EF4444;
                border:3px solid white;
                border-radius:50%;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
              "></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        L.marker([endLat, endLng], { icon: destIcon }).addTo(map);

        // Add route line (using the routeCoords defined above)
        L.polyline(routeCoords, {
          color: PRIMARY_COLOR,
          weight: 5,
          dashArray: '10, 10',
          opacity: 0.8,
          lineCap: 'round'
        }).addTo(map);

        // Add current position marker if available
        if (currentPosition) {
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
                  background:linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #0C2C66 100%);
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
                  🚗 Lokasi Saya
                </div>
                <div style="
                  width:24px;
                  height:24px;
                  background:${PRIMARY_COLOR};
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

          movingMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
            icon: vehicleIcon
          }).addTo(map);
        }

        map.fitBounds(routeCoords, { padding: [50, 50] });
      } catch (error) {
        console.error('[Mitra GPS] Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, [activeTrackingTrip, isSelfTrackingModalOpen, currentPosition]);

  // Update map marker when position changes
  useEffect(() => {
    if (!currentPosition || !leafletMapInstance.current || !isSelfTrackingModalOpen) {
      return;
    }

    try {
      if (movingMarkerRef.current) {
        // Only update marker position, don't auto-center or zoom
        movingMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
      } else {
        const L = window.L;
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
                background:linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #0C2C66 100%);
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
                🚗 Lokasi Saya
              </div>
              <div style="
                width:24px;
                height:24px;
                background:${PRIMARY_COLOR};
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

        movingMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
          icon: vehicleIcon
        }).addTo(leafletMapInstance.current);

        // Set initial zoom level
        if (leafletMapInstance.current._mapPane) {
          leafletMapInstance.current.setView([currentPosition.lat, currentPosition.lng], 14);
        }
      }
    } catch (error) {
      console.error('[Mitra GPS] Error updating map marker:', error);
    }
  }, [currentPosition, isSelfTrackingModalOpen]);

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
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> MANAJEMEN JADWAL TRIP MITRA
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Kelola Jadwal & Trip
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl">
              Buat jadwal perjalanan baru, tentukan tipe layanan (Penumpang / Barang), dan kelola trip Anda secara interaktif.
            </p>
          </div>

          <button
            onClick={() => loadMitraData()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl backdrop-blur text-white text-xs font-bold transition cursor-pointer self-start sm:self-auto shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Segarkan Data</span>
          </button>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* Interactive Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-blue-50/70 border-[#10367D] shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Trip</span>
            <Calendar className="w-4 h-4 text-[#10367D]" />
          </div>
          <div className="text-2xl font-black text-slate-900">{trips.filter(t => t.status !== 'cancelled').length}</div>
          <span className="text-[11px] text-slate-400 font-medium">Klik untuk lihat semua</span>
        </div>

        <div
          onClick={() => setFilterStatus('scheduled')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'scheduled'
              ? 'bg-blue-50/70 border-[#10367D] shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Terjadwal</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{trips.filter(t => t.status === 'scheduled').length}</div>
          <span className="text-[11px] text-blue-500 font-medium">Siap berangkat</span>
        </div>

        <div
          onClick={() => setFilterStatus('in_transit')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'in_transit'
              ? 'bg-amber-50/70 border-amber-500 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Berjalan</span>
            <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {trips.filter(t => t.status === 'in_transit' || t.status === 'in_origin_pos').length}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Live GPS tracking</span>
        </div>

        <div
          onClick={() => setFilterStatus('completed')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'completed'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{trips.filter(t => t.status === 'completed').length}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Riwayat trip sukses</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form Buat Trip Baru */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4" style={{ color: PRIMARY_COLOR }} /> Buat Trip Baru
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3.5 text-[13px]">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tipe Layanan Trip</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const selectedVeh = vehicles.find(v => String(v.id) === String(formData.vehicleId));
                    const isMotor = selectedVeh?.type?.toLowerCase() === 'motor';
                    setLayananCategory('penumpang');
                    setFormData(prev => ({
                      ...prev,
                      totalSeats: isMotor ? 1 : (selectedVeh?.capacitySeats || 1),
                      maxWeightCapacityKg: Number(selectedVeh?.maxWeightCapacityKg) || 15
                    }));
                  }}
                  className={`py-2 px-3 rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    layananCategory === 'penumpang' 
                      ? 'text-white shadow-sm' 
                      : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                  style={layananCategory === 'penumpang' ? { backgroundColor: PRIMARY_COLOR } : undefined}
                >
                  <Users className="w-3.5 h-3.5" /> Penumpang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selectedVeh = vehicles.find(v => String(v.id) === String(formData.vehicleId));
                    setLayananCategory('barang');
                    setFormData(prev => ({
                      ...prev,
                      totalSeats: selectedVeh?.capacitySeats || 1,
                      maxWeightCapacityKg: Number(selectedVeh?.maxWeightCapacityKg) || 15
                    }));
                  }}
                  className={`py-2 px-3 rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    layananCategory === 'barang' 
                      ? 'text-white shadow-sm' 
                      : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                  style={layananCategory === 'barang' ? { backgroundColor: PRIMARY_COLOR } : undefined}
                >
                  <Package className="w-3.5 h-3.5" /> Barang
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pos Asal</label>
              <select 
                name="originPointId" 
                value={formData.originPointId} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] truncate"
              >
                {points.length === 0 ? (
                  <option value="">Belum ada pos terdaftar di sistem</option>
                ) : (
                  points.map((p) => <option key={p.id} value={p.id}>{formatPointLabel(p)}</option>)
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pos Tujuan</label>
              <select 
                name="destinationPointId" 
                value={formData.destinationPointId} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] truncate"
              >
                {points.length === 0 ? (
                  <option value="">Belum ada pos terdaftar di sistem</option>
                ) : (
                  points.map((p) => <option key={p.id} value={p.id}>{formatPointLabel(p)}</option>)
                )}
              </select>
            </div>

            {isOutsideHomeBase && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[12px] flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-900">
                    Aturan Wilayah Operasi (Home Base)
                  </span>
                  <span className="text-[12px] text-amber-800 leading-snug block">
                    Salah satu pos (Asal atau Tujuan) harus berada di wilayah domisili terdaftar Anda (<strong>{currentUser?.region?.name || 'Wilayah Terdaftar'}</strong>).
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tanggal</label>
                <input 
                  type="date" 
                  name="date" 
                  required
                  min={todayISO}
                  value={formData.date} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                />
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {(() => {
                    const getPresetISO = (offset) => {
                      const t = new Date();
                      t.setDate(t.getDate() + offset);
                      return t.toISOString().split('T')[0];
                    };

                    return [
                      { label: 'Hari Ini', offset: 0 },
                      { label: 'Besok', offset: 1 },
                      { label: 'Lusa', offset: 2 },
                    ].map((preset) => {
                      const isSelected = formData.date === getPresetISO(preset.offset);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setDatePreset(preset.offset)}
                          className={`w-full py-1.5 px-1 rounded-lg text-center text-[11px] font-bold transition cursor-pointer whitespace-nowrap border flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-50 text-[#10367D] border-[#10367D]/40 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Jam Berangkat</label>
                <input 
                  type="time" 
                  name="time" 
                  required
                  value={formData.time} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pilih Kendaraan Anda</label>
              <select 
                name="vehicleId" 
                value={formData.vehicleId} 
                onChange={handleVehicleSelect}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] truncate"
              >
                {vehicles.length === 0 ? (
                  <option value="">Belum ada kendaraan terdaftar</option>
                ) : (
                  vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.plateNumber}) - {v.type.toUpperCase()}
                    </option>
                  ))
                )}
              </select>
            </div>

            {(() => {
              const selectedVehicle = vehicles.find(v => String(v.id) === String(formData.vehicleId));
              const isMotor = selectedVehicle?.type?.toLowerCase() === 'motor';
              const maxSeatsAllowed = isMotor ? 1 : (selectedVehicle?.capacitySeats || 6);
              const maxWeightAllowed = Number(selectedVehicle?.maxWeightCapacityKg) || 15;

              if (layananCategory === 'penumpang') {
                return (
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Kapasitas Kursi {isMotor ? '(Terkunci 1 Kursi untuk Motor)' : `(Maks: ${maxSeatsAllowed} Kursi)`}
                    </label>
                    <input 
                      type="number" 
                      name="totalSeats" 
                      min={1}
                      max={maxSeatsAllowed}
                      disabled={isMotor}
                      required
                      value={isMotor ? 1 : formData.totalSeats} 
                      onChange={handleChange}
                      className={`w-full px-3.5 py-2.5 border rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] ${
                        isMotor 
                          ? 'bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed' 
                          : 'bg-neutral-50 border-neutral-200'
                      }`}
                    />
                  </div>
                );
              }

              return (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Kapasitas Bagasi (Kg) {selectedVehicle ? `(Maks: ${maxWeightAllowed} Kg)` : ''}
                  </label>
                  <input 
                    type="number" 
                    name="maxWeightCapacityKg" 
                    min={1}
                    max={maxWeightAllowed}
                    required
                    value={formData.maxWeightCapacityKg} 
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] truncate"
                  />
                </div>
              );
            })()}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  {layananCategory === 'penumpang' ? 'Tarif Dasar Per Kursi (Rp)' : 'Tarif Dasar Per Paket (Rp)'}
                </label>
                {(() => {
                  const suggested = calculateSuggestedFare(formData.originPointId, formData.destinationPointId, formData.vehicleId, points, vehicles);
                  if (suggested && Number(formData.price) !== Number(suggested)) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPriceManual(false);
                          setFormData(prev => ({ ...prev, price: suggested }));
                          toast.info(`Tarif disesuaikan dengan rekomendasi: Rp ${suggested.toLocaleString('id-ID')}`);
                        }}
                        className="text-[10px] font-bold text-[#10367D] hover:underline cursor-pointer"
                      >
                        Pakai Rekomendasi (Rp {suggested.toLocaleString('id-ID')})
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
              <input 
                type="number" 
                name="price" 
                min={1000}
                required
                value={formData.price} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D] truncate"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Tarif otomatis diestimasi berdasarkan rute & jenis kendaraan.
              </span>
            </div>

            <button 
              type="submit"
              disabled={isSameOriginDestination || isPastDate || isSubmitting || vehicles.length === 0}
              className={`w-full py-3 rounded-xl text-[13px] font-bold transition shadow-sm ${
                isSameOriginDestination || isPastDate || isSubmitting || vehicles.length === 0
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'text-white cursor-pointer'
              }`}
              style={!(isSameOriginDestination || isPastDate || isSubmitting || vehicles.length === 0) ? { backgroundColor: PRIMARY_COLOR } : undefined}
            >
              {isSubmitting ? 'Memproses...' : 'Publikasikan Trip Jadwal'}
            </button>
          </form>
        </div>

        {/* Daftar Trip Terjadwal Mitra */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" style={{ color: PRIMARY_COLOR }} /> Daftar Trip Terjadwal
              </h2>
              <p className="text-xs text-neutral-400">Pantau ketersediaan kursi & bagasi secara real-time</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              {[
                { id: 'all', label: 'Semua', count: trips.filter(t => t.status !== 'cancelled').length },
                { id: 'scheduled', label: 'Terjadwal', count: trips.filter(t => t.status === 'scheduled').length },
                { id: 'in_transit', label: 'Berjalan', count: trips.filter(t => t.status === 'in_transit' || t.status === 'in_origin_pos').length },
                { id: 'completed', label: 'Selesai', count: trips.filter(t => t.status === 'completed').length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    filterStatus === tab.id
                      ? 'bg-white text-[#10367D] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1 rounded-full ${
                    filterStatus === tab.id ? 'bg-[#10367D]/10 text-[#10367D]' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pos asal, tujuan, atau ID trip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#10367D] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-[13px] text-neutral-400 p-8 text-center bg-slate-50 rounded-2xl">
                Memuat data trip...
              </div>
            ) : filteredTrips.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Tidak Ada Trip yang Cocok"
                description={
                  searchQuery 
                    ? `Tidak ditemukan trip dengan kata kunci "${searchQuery}".` 
                    : "Belum ada trip pada filter ini. Buat trip baru lewat form di sebelah kiri."
                }
              />
            ) : filteredTrips.map((trip) => {
              const isBarang = trip.serviceType === 'barang';
              const maxCapacity = isBarang
                ? Number(trip.maxWeightCapacityKg || 1)
                : Number(trip.seatTotal ?? trip.totalSeats ?? 1);
              const remainingCapacity = isBarang
                ? Number(trip.remainingWeightCapacityKg ?? maxCapacity)
                : Number(trip.seatAvailable ?? maxCapacity);
              const usedCapacity = Math.max(0, maxCapacity - remainingCapacity);
              const occupancyPct = Math.min(100, Math.round((usedCapacity / maxCapacity) * 100));

              return (
                <div 
                  key={trip.id} 
                  className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 bg-white hover:border-[#10367D]/40 hover:shadow-sm transition-all duration-200 space-y-3.5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Badge bar: Clean styling without corrupted fonts */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-neutral-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          #TRIP-{trip.id}
                        </span>
                        
                        {trip.status === 'completed' ? (
                          <StatusBadge variant="emerald">Selesai</StatusBadge>
                        ) : trip.status === 'in_transit' || trip.status === 'in_origin_pos' ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Dalam Perjalanan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Dijadwalkan
                          </span>
                        )}

                        {/* Service & Capacity: Bug fixed (clean dot separator, no broken bullet) */}
                        {isBarang ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#4B2172] border border-purple-200 flex items-center gap-1.5">
                            <Package className="w-3 h-3 text-[#4B2172]" />
                            <span>Nebeng Barang</span>
                            <span className="w-1 h-1 rounded-full bg-purple-300" />
                            <span>Bagasi: {trip.remainingWeightCapacityKg ?? trip.maxWeightCapacityKg} Kg</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#10367D] border border-blue-200 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-[#10367D]" />
                            <span>{trip.vehicle?.type?.toLowerCase() === 'motor' ? 'Motor' : 'Mobil'}</span>
                            <span className="w-1 h-1 rounded-full bg-blue-300" />
                            <span>Kursi: {trip.seatTotal ?? trip.totalSeats ?? 1}</span>
                          </span>
                        )}
                      </div>

                      {/* Visual Route */}
                      <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-800">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
                        <span className="truncate">{trip.originPoint?.name || 'Pos Asal'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10367D] ring-2 ring-blue-100 shrink-0" />
                        <span className="truncate">{trip.destinationPoint?.name || 'Pos Tujuan'}</span>
                      </div>

                      {/* Metadata Grid */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTripDate(trip.departureDate)}</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTripTime(trip.departureTime)}</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <div className="flex items-center gap-1">
                          {trip.vehicle?.type === 'motor' ? <Bike className="w-3.5 h-3.5 text-slate-400" /> : <Car className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="font-semibold text-slate-700">{trip.vehicle?.model || 'Kendaraan'}</span>
                          {trip.vehicle?.plateNumber && (
                            <span className="text-slate-400 text-[11px]">({trip.vehicle.plateNumber})</span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Occupancy Progress Bar */}
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-medium">
                            {isBarang ? 'Muatan Terisi:' : 'Kursi Terisi:'}
                          </span>
                          <span className="font-bold text-slate-700">
                            {usedCapacity} / {maxCapacity} {isBarang ? 'Kg' : 'Kursi'} ({occupancyPct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              occupancyPct >= 100 
                                ? 'bg-rose-500' 
                                : occupancyPct >= 60 
                                ? 'bg-amber-500' 
                                : 'bg-[#10367D]'
                            }`}
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          {isBarang ? 'Tarif / Paket' : 'Tarif / Kursi'}
                        </span>
                        <span className="text-lg font-black text-emerald-600">
                          Rp {Number(trip.price || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {trip.status === 'scheduled' && (
                          <button
                            onClick={() => setCancelConfirmTarget(trip.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Batalkan
                          </button>
                        )}

                        {(trip.status === 'in_transit' || trip.status === 'in_origin_pos') && (
                          <div className="flex items-center gap-1.5">
                            {isTracking && activeTripId === trip.id ? (
                              <button
                                onClick={handleStopGPSTracking}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                              >
                                <PauseCircle className="w-3.5 h-3.5" /> Stop GPS
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartGPSTracking(trip)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 transition shadow-xs cursor-pointer"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> Start GPS
                              </button>
                            )}
                            <button
                              onClick={() => openSelfTrackingModal(trip)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" /> Peta
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BaseModal
        isOpen={Boolean(cancelConfirmTarget)}
        onClose={() => setCancelConfirmTarget(null)}
        title="Batalkan Trip?"
        subtitle={`Trip #${cancelConfirmTarget}`}
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-neutral-600">
            Trip yang dibatalkan tidak akan lagi tampil di daftar aktif. Semua penumpang akan di-refund penuh. Tindakan ini tidak dapat diurungkan.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCancelConfirmTarget(null)}
              className="flex-1 py-2 bg-neutral-100 text-neutral-700 rounded-full font-bold cursor-pointer"
            >
              Tidak
            </button>
            <button
              onClick={handleConfirmCancel}
              className="flex-1 py-2 bg-rose-600 text-white rounded-full font-bold cursor-pointer shadow-sm"
            >
              Ya, Batalkan
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Self Tracking Modal */}
      <BaseModal
        isOpen={isSelfTrackingModalOpen}
        onClose={closeSelfTrackingModal}
        title={`Self Tracking - Trip #${activeTrackingTrip?.id}`}
        subtitle={`${activeTrackingTrip?.originPoint?.name} → ${activeTrackingTrip?.destinationPoint?.name}`}
        maxWidth="max-w-2xl"
      >
        {activeTrackingTrip && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-xl">
              <div id="mitra-tracking-map" className="w-full h-72 z-0" />

              <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 p-4 text-white space-y-3 relative z-10 border-t border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isTracking && currentPosition ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Status GPS</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-[12px] transition ${
                    isTracking && currentPosition
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                      : 'bg-neutral-700 text-neutral-300'
                  }`}>
                    <Radio size={12} />
                    <span>{isTracking && currentPosition ? 'Tracking Aktif' : 'Tracking Tidak Aktif'}</span>
                  </div>
                </div>

                {currentPosition && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-700">
                    <div className="bg-neutral-800/50 rounded-lg p-2.5 border border-neutral-700">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Latitude
                      </div>
                      <div className="font-mono text-[13px] font-bold text-white">{currentPosition.lat.toFixed(6)}</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2.5 border border-neutral-700">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        Longitude
                      </div>
                      <div className="font-mono text-[13px] font-bold text-white">{currentPosition.lng.toFixed(6)}</div>
                    </div>
                    {currentPosition.speed && (
                      <div className="bg-neutral-800/50 rounded-lg p-2.5 border border-neutral-700">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Speed
                        </div>
                        <div className="font-mono text-[13px] font-bold text-white">{currentPosition.speed.toFixed(1)} m/s</div>
                      </div>
                    )}
                    {currentPosition.heading && (
                      <div className="bg-neutral-800/50 rounded-lg p-2.5 border border-neutral-700">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Heading
                        </div>
                        <div className="font-mono text-[13px] font-bold text-white">{currentPosition.heading.toFixed(0)}Â°</div>
                      </div>
                    )}
                  </div>
 )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3">
              {isTracking && activeTripId === activeTrackingTrip?.id ? (
                <button
                  onClick={handleStopGPSTracking}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-[13px] font-bold rounded-xl transition cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  Stop GPS
                </button>
              ) : (
                <button
                  onClick={() => handleStartGPSTracking(activeTrackingTrip)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-[13px] font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  Start GPS
                </button>
              )}
              <button
                onClick={closeSelfTrackingModal}
                className="px-5 py-2.5 bg-gradient-to-r from-[#10367D] to-[#0C2C66] hover:from-[#0C2C66] hover:to-[#082044] text-white text-[13px] font-bold rounded-xl transition cursor-pointer shadow-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}

