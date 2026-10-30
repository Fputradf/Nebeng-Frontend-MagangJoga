import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../../../config/env';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ticket,
  QrCode,
  Clock,
  CreditCard,
  ArrowRight,
  Award,
  Star,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  History,
  MapPin,
  Navigation,
  Radio,
  Phone,
  Car,
  Package,
  Users,
  X,
} from 'lucide-react';
import { io } from 'socket.io-client';

import { useToast } from '../../../context/ToastContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import StatCard from '../../../components/ui/StatCard';
import apiClient from '../../../services/apiClient';
import TicketTimelineModal from '../components/TicketTimelineModal';
import PhoneCallModal from '../../../components/ui/PhoneCallModal';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

const formatRupiah = (value) =>
  `Rp ${Math.max(0, Math.round(value || 0)).toLocaleString('id-ID')}`;

const CANCELLABLE_STATUS_TEXT = 'pending_payment';

export default function MyTickets() {
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('aktif');
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const [rewardSummary, setRewardSummary] = useState({
    totalPoints: 0,
    history: [],
  });

  const [isLoadingRewards, setIsLoadingRewards] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeModalType, setActiveModalType] = useState(null);
  const [showOtpMap, setShowOtpMap] = useState({});

  // State untuk Modal Timeline Checkpoint Real Log
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedTimelineTicket, setSelectedTimelineTicket] = useState(null);

  const [qrDynamicToken, setQrDynamicToken] = useState('SEC-9081');
  const [qrCountdown, setQrCountdown] = useState(60);
  const [isCancelling, setIsCancelling] = useState(false);
  const [payingTicketId, setPayingTicketId] = useState(null);

  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const chatBottomRef = useRef(null);
  const conversationIdRef = useRef(chatConversationId);

  useEffect(() => {
    conversationIdRef.current = chatConversationId;
  }, [chatConversationId]);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // GPS Tracking State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingTicket, setTrackingTicket] = useState(null);
  const [livePosition, setLivePosition] = useState(null);
  const leafletMapInstance = useRef(null);
  const movingMarkerRef = useRef(null);
  const socketRef = useRef(null);

  // 1. Memuat Data Tiket & Poin dari Backend
  const refreshData = useCallback(async () => {
    try {
      const [resOrders, resReward] = await Promise.all([
        apiClient.get('/orders/me').catch(() => ({ data: [] })),
        apiClient.get('/rewards/me').catch(() => ({ data: {} })),
      ]);

      const ordersData = resOrders.data?.data || resOrders.data || [];
      const mappedTickets = ordersData.map((order) => {
        const isParcel = order.type === 'parcel' || order.type === 'barang';
        const trip = order.trip || {};

        const origin = trip.originPoint?.name || 'Pos Asal';
        const destination = trip.destinationPoint?.name || 'Pos Tujuan';
        const mitraName = trip.mitra?.name || 'Mitra';

        const vehicleModel = trip.vehicle
          ? `${trip.vehicle.model} (${trip.vehicle.plateNumber})`
          : 'Kendaraan Resmi';

        let statusText = 'Aktif';
        if (order.status === 'pending_payment') {
          statusText = 'Menunggu Pembayaran';
        } else if (order.status === 'cancelled' || order.status === 'cancelled_by_mitra') {
          statusText = 'Batal';
        } else if (order.status === 'completed') {
          statusText = 'Selesai';
        } else if (order.status === 'no_show') {
          statusText = order.isDisputed ? 'Sedang Dispute' : 'Tidak Datang (Hangus)';
        }

        return {
          id: order.id,
          rawId: order.id,
          tripId: trip.id,
          tripStatus: trip.status,
          customerId: order.customerId,
          revieweeId: trip.mitraId || trip.mitra?.id || trip.mitra?.userId,
          type: order.type,
          title: isParcel
            ? `Nebeng Barang (${order.itemOrders?.[0]?.itemCategory || 'Paket'})`
            : 'Nebeng Penumpang',
          from: origin,
          to: destination,
          mitra: mitraName,
          mitraPhone: trip.mitra?.phone || null,
          vehicle: vehicleModel,
          schedule: `${trip.departureDate?.split('T')[0] || 'Segera'} • Sesuai Jadwal`,
          totalPrice: formatRupiah(order.totalPrice),
          subtotal: order.subtotal != null ? formatRupiah(order.subtotal) : formatRupiah(order.totalPrice),
          discountAmount: Number(order.discountAmount || 0),
          discountFormatted: formatRupiah(order.discountAmount || 0),
          voucherCode: order.voucherCode || null,
          detail: isParcel
            ? `${order.totalItemsCount || 1} Item (${order.totalWeightKg || 1} Kg)`
            : `${order.seatsBooked || 1} Kursi Penumpang`,
          status: statusText,
          currentStatusText: order.status,
          otp: order.otpClaim || null,
          qrCodeTicket: order.qrCodeTicket,
          createdAt: order.createdAt,
          checkpointsLogs: order.checkpointsLogs || [], // Data audit log nyata dari backend
          originCoord: (trip.originPoint?.lat && trip.originPoint?.lng)
            ? { lat: trip.originPoint.lat, lng: trip.originPoint.lng }
            : { lat: -7.7956, lng: 110.3695 }, // Yogyakarta area default
          destinationCoord: (trip.destinationPoint?.lat && trip.destinationPoint?.lng)
            ? { lat: trip.destinationPoint.lat, lng: trip.destinationPoint.lng }
            : { lat: -7.7892, lng: 110.4095 }, // Nearby area default
        };
      });

      setTickets(mappedTickets);

      const rewardData = resReward.data?.data || resReward.data || {};
      setRewardSummary({
        totalPoints:
          rewardData.currentPoints ??
          rewardData.totalPoints ??
          rewardData.rewardPoints ??
          0,
        history: rewardData.history || [],
      });
    } catch (err) {
      console.error('Gagal memperbarui data:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      setIsLoadingTickets(true);
      setIsLoadingRewards(true);
      await refreshData();
      if (isMounted) {
        setIsLoadingTickets(false);
        setIsLoadingRewards(false);
      }
    };
    initialLoad();
    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  // 2. KONEKSI WEBSOCKET REAL-TIME CHECKPOINT
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
      : BASE_URL;
    const socket = io(`${socketUrl}/tracking`, {
      transports: ['websocket', 'polling'],
    });

    // Bergabung ke kamar trip masing-masing tiket yang sedang aktif
    tickets.forEach((t) => {
      if (t.tripId && t.status === 'Aktif') {
        socket.emit('joinTrip', { tripId: String(t.tripId) });
      }
    });

    // Mendengarkan sinyal scan dari Operator Pos Asal / Tujuan
    socket.on('checkpointScanned', (data) => {
      console.log('Live Checkpoint Scanned via WebSocket:', data);

      toast.info(data.message || 'Status checkpoint tiket telah diperbarui!', {
        title: 'Pembaruan Checkpoint Live',
      });

      // Muat ulang data tiket secara instan agar QR baru & status in_transit langsung muncul
      refreshData();
    });

    return () => {
      socket.disconnect();
    };
  }, [tickets, refreshData, toast]);

  // Load Leaflet CSS
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // GPS Tracking WebSocket & Map Initialization
  useEffect(() => {
    if (!trackingTicket || !isTrackingModalOpen) return;

    let isSubscribed = true;
    let receivedUpdate = false;

    // DISABLED OSRM route fetch to prevent wrong coordinates (1864 points causing zoom out)
    // Using direct coordinates only as requested
    console.log('[Customer GPS] OSRM route fetch DISABLED - using direct coordinates only');

    // WebSocket connection for GPS tracking
    const socketUrl = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
      : BASE_URL;
    const socket = io(`${socketUrl}/tracking`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    console.log('[Customer GPS] Connecting to:', `${socketUrl}/tracking`);

    socket.on('connect', () => {
      console.log('[Customer GPS] Connected to tracking server');
      console.log('[Customer GPS] Socket ID:', socket.id);

      // Try joining with multiple formats to handle different backend implementations
      const tripIdToJoin = String(trackingTicket.tripId || trackingTicket.rawId);
      const rawIdToJoin = String(trackingTicket.rawId || trackingTicket.tripId);
      const tripIdNumber = Number(trackingTicket.tripId || trackingTicket.rawId);

      console.log('[Customer GPS] Ticket tripId:', trackingTicket.tripId);
      console.log('[Customer GPS] Ticket rawId (order ID):', trackingTicket.rawId);
      console.log('[Customer GPS] Attempting to join with tripId (string):', tripIdToJoin);
      console.log('[Customer GPS] Attempting to join with tripId (number):', tripIdNumber);

      // Try different room formats
      socket.emit('joinTrip', { tripId: tripIdToJoin });
      socket.emit('joinTrip', { tripId: tripIdNumber });
      socket.emit('joinTrip', { tripId: `trip_${tripIdToJoin}` });

      if (rawIdToJoin !== tripIdToJoin) {
        console.log('[Customer GPS] Also attempting to join with rawId:', rawIdToJoin);
        socket.emit('joinTrip', { tripId: rawIdToJoin });
        socket.emit('joinTrip', { tripId: `trip_${rawIdToJoin}` });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Customer GPS] Connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Customer GPS] Disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.error('[Customer GPS] Socket error:', error);
    });

    // Listen for ALL events for debugging
    socket.onAny((eventName, ...args) => {
      if (eventName === 'locationUpdated' || eventName === 'joinTrip') {
        console.log('[Customer GPS] Socket event:', eventName, args);
      }
    });

    // Listen for location updates
    socket.on('locationUpdated', (data) => {
      console.log('[Customer GPS] âœ… Received location update:', data);
      console.log('[Customer GPS] Current tracking trip ID:', String(trackingTicket.tripId));
      console.log('[Customer GPS] Current tracking order ID:', String(trackingTicket.rawId));
      console.log('[Customer GPS] Data trip ID:', data.tripId);
      console.log('[Customer GPS] Data trip ID type:', typeof data.tripId);
      console.log('[Customer GPS] Match by tripId (string):', data.tripId === String(trackingTicket.tripId));
      console.log('[Customer GPS] Match by tripId (number):', data.tripId === Number(trackingTicket.tripId));
      console.log('[Customer GPS] Match by rawId (string):', data.tripId === String(trackingTicket.rawId));
      console.log('[Customer GPS] Match by rawId (number):', data.tripId === Number(trackingTicket.rawId));

      // Try matching by tripId and rawId, both string and number
      const isMatch = data.tripId === String(trackingTicket.tripId) ||
                     data.tripId === Number(trackingTicket.tripId) ||
                     data.tripId === String(trackingTicket.rawId) ||
                     data.tripId === Number(trackingTicket.rawId);

      if (isSubscribed && isMatch) {
        console.log('[Customer GPS] âœ… Position update matched! Updating map.');
        receivedUpdate = true;
        setLivePosition({
          lat: Number(data.latitude),
          lng: Number(data.longitude)
        });
      } else {
        console.log('[Customer GPS] âŒ Position update NOT matched. Ignoring.');
      }
    });

    // Warning if no updates received after 5 seconds
    const warningTimeout = setTimeout(() => {
      if (isSubscribed && !receivedUpdate) {
        console.log('[Customer GPS] âš ï¸ Warning: No location updates received after 5 seconds');
        console.log('[Customer GPS] This is likely a BACKEND issue. Please check:');
        console.log('[Customer GPS] 1. Backend is running on', socketUrl);
        console.log('[Customer GPS] 2. Backend /tracking namespace is accessible');
        console.log('[Customer GPS] 3. Backend broadcasts locationUpdated to the correct room');
        console.log('[Customer GPS] 4. Room naming matches between Mitra and Customer');
        console.log('[Customer GPS] 5. Mitra is actually sending location updates');
      }
    }, 5000);

    return () => {
      isSubscribed = false;
      clearTimeout(warningTimeout);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [trackingTicket, isTrackingModalOpen]);

  // Initialize Map
  useEffect(() => {
    if (!trackingTicket || !isTrackingModalOpen) {
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
      const container = document.getElementById('customer-tracking-map');

      if (!container) return;
      if (container._leaflet_id) {
        container._leaflet_id = null;
      }

      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }

      // If live position is available, use only that (single point)
      // Otherwise, use only origin and destination (2 points only, no OSRM route)
      let coords;
      if (livePosition) {
        coords = [[livePosition.lat, livePosition.lng]];
        console.log('[Customer GPS] Using live position only');
      } else {
        coords = [
          [trackingTicket.originCoord.lat, trackingTicket.originCoord.lng],
          [trackingTicket.destinationCoord.lat, trackingTicket.destinationCoord.lng]
        ];
        console.log('[Customer GPS] Using origin and destination only (2 points)');
      }

      console.log('[Customer GPS] Final map coordinates:', coords);
      console.log('[Customer GPS] Live position:', livePosition);
      console.log('[Customer GPS] Ticket originCoord:', trackingTicket.originCoord);
      console.log('[Customer GPS] Ticket destinationCoord:', trackingTicket.destinationCoord);

      // Log actual coordinate values
      if (trackingTicket.originCoord) {
        console.log('[Customer GPS] Origin lat:', trackingTicket.originCoord.lat, 'lng:', trackingTicket.originCoord.lng);
      }
      if (trackingTicket.destinationCoord) {
        console.log('[Customer GPS] Destination lat:', trackingTicket.destinationCoord.lat, 'lng:', trackingTicket.destinationCoord.lng);
      }

      // Use originCoord as center if no live position
      const centerPoint = livePosition
        ? [livePosition.lat, livePosition.lng]
        : [trackingTicket.originCoord.lat, trackingTicket.originCoord.lng];

      const map = L.map('customer-tracking-map', {
        center: centerPoint,
        zoom: 16, // Maximum zoom in as requested
        zoomControl: true,
        minZoom: 14, // Prevent zooming out too much
        maxZoom: 18
      });

      leafletMapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Add markers based on live position or coordinates
      if (livePosition) {
        // Only vehicle marker when live position is available
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
                Mitra: ${trackingTicket.mitra}
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

        movingMarkerRef.current = L.marker([livePosition.lat, livePosition.lng], {
          icon: vehicleIcon
        }).addTo(map);
      } else {
        // Show origin and destination markers when no live position
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
                Pos Asal
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
                Pos Tujuan
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

        L.marker([coords[0][0], coords[0][1]], { icon: originIcon }).addTo(map);
        L.marker([coords[1][0], coords[1][1]], { icon: destIcon }).addTo(map);

        // Add route line
        L.polyline(coords, {
          color: PRIMARY_COLOR,
          weight: 5,
          dashArray: '10, 10',
          opacity: 0.8,
          lineCap: 'round'
        }).addTo(map);
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
  }, [trackingTicket, isTrackingModalOpen]);

  // Update map marker position
  useEffect(() => {
    if (!trackingTicket || !leafletMapInstance.current || !isTrackingModalOpen) {
      return;
    }

    try {
      if (livePosition) {
        if (movingMarkerRef.current) {
          // Update existing marker position
          console.log('[Customer GPS] Updating existing marker position to:', livePosition);
          movingMarkerRef.current.setLatLng([livePosition.lat, livePosition.lng]);
        } else {
          // Create marker if it doesn't exist yet
          console.log('[Customer GPS] Creating new marker at:', livePosition);
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
                Mitra: 
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

          movingMarkerRef.current = L.marker([livePosition.lat, livePosition.lng], {
            icon: vehicleIcon
          }).addTo(leafletMapInstance.current);
        }
      }
    } catch (error) {
      console.error('[Customer GPS] Error updating map marker:', error);
    }
  }, [livePosition, trackingTicket, isTrackingModalOpen]);

  const handleCloseTrackingModal = () => {
    setIsTrackingModalOpen(false);
    setTrackingTicket(null);
    setLivePosition(null);

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    if (leafletMapInstance.current) {
      leafletMapInstance.current.remove();
      leafletMapInstance.current = null;
    }
  };

  const handleOpenTracking = (ticket) => {
    // Get coordinates from trip data if available (using Yogyakarta area as default based on actual GPS)
    const originCoord = ticket.originCoord || { lat: -7.7956, lng: 110.3695 }; // Yogyakarta area
    const destCoord = ticket.destinationCoord || { lat: -7.7892, lng: 110.4095 }; // Nearby area

    console.log('[Customer GPS] Opening tracking for ticket:', ticket);
    console.log('[Customer GPS] Trip ID:', ticket.tripId);
    console.log('[Customer GPS] Order ID:', ticket.id);
    console.log('[Customer GPS] Origin:', originCoord);
    console.log('[Customer GPS] Destination:', destCoord);

    setTrackingTicket({
      ...ticket,
      originCoord,
      destinationCoord: destCoord
    });
    setLivePosition(null);
    setIsTrackingModalOpen(true);
  };

  // 3. Auto Polling untuk Transaksi Pending Payment Xendit
  useEffect(() => {
    let interval;
    const pendingTickets = tickets.filter(
      (t) => t.currentStatusText === 'pending_payment'
    );

    if (pendingTickets.length > 0) {
      interval = setInterval(() => {
        pendingTickets.forEach(async (ticket) => {
          try {
            const res = await apiClient.get(`/payments/check-status/${ticket.rawId}`);
            if (res.data.status === 'PAID') {
              toast.success(`Pembayaran untuk tiket #${ticket.rawId} otomatis terkonfirmasi lunas!`, {
                title: 'Pembayaran Sukses',
              });
              refreshData();
            }
          } catch {
            // silent error untuk polling
          }
        });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tickets, refreshData, toast]);

  // Chat Polling Fallback
  useEffect(() => {
    if (activeModalType !== 'chat') return;

    let isMounted = true;
    const fetchMessagesPeriodic = async () => {
      const currentId = conversationIdRef.current;
      if (!currentId) return;

      try {
        const resMsg = await apiClient.get(`/chat/conversation/${currentId}/messages`);
        if (isMounted) {
          setChatMessages(resMsg.data || []);
        }
      } catch {
        // Safe catch
      }
    };

    const interval = setInterval(fetchMessagesPeriodic, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeModalType]);

  // Dynamic QR Token Countdown Simulation
  useEffect(() => {
    let timer;
    if (activeModalType === 'qr') {
      timer = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            setQrDynamicToken(`SEC-${Math.floor(1000 + Math.random() * 9000)}`);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeModalType]);

  useEffect(() => {
    if (activeModalType === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeModalType]);

  const toggleOtpVisibility = (ticketId) => {
    setShowOtpMap((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesTab =
      activeTab === 'aktif'
        ? ticket.status === 'Aktif' || ticket.status === 'Menunggu Pembayaran'
        : activeTab === 'riwayat'
        ? ticket.status === 'Selesai' || ticket.status === 'Batal'
        : true;

    if (!matchesTab) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.trim().toLowerCase();
    return (
      String(ticket.id).toLowerCase().includes(q) ||
      ticket.from.toLowerCase().includes(q) ||
      ticket.to.toLowerCase().includes(q) ||
      ticket.mitra.toLowerCase().includes(q)
    );
  });

  const handleCancelTicket = async () => {
    if (!selectedTicket || isCancelling) return;
    setIsCancelling(true);

    try {
      await apiClient.patch(`/orders/${selectedTicket.rawId}/cancel`);
      toast.success('Pesanan berhasil dibatalkan dan kuota dikembalikan.', { title: 'Sukses' });
      setActiveModalType(null);
      setSelectedTicket(null);
      await refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan pesanan.', { title: 'Gagal' });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePayPendingTicket = async (ticket) => {
    if (payingTicketId) return;
    setPayingTicketId(ticket.rawId);
    try {
      toast.info('Menghubungkan ke gateway pembayaran Xendit...', { title: 'Tunggu Sebentar' });
      const resPayment = await apiClient.post('/payments/xendit/create-invoice', {
        orderId: String(ticket.rawId),
      });

      const invoiceUrl = resPayment.data?.invoiceUrl;
      if (!invoiceUrl || invoiceUrl === '/customer/tickets') {
        throw new Error('Gagal mendapatkan tautan pembayaran Xendit yang valid.');
      }

      toast.success('Mengalihkan ke halaman pembayaran...', { title: 'Menuju Pembayaran' });
      window.location.href = invoiceUrl;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Gagal memproses pembayaran tiket.';
      const formatted = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
      toast.error(formatted, { title: 'Gagal Membuka Pembayaran' });
    } finally {
      setPayingTicketId(null);
    }
  };

  const openModal = async (ticket, type) => {
    setSelectedTicket(ticket);
    setActiveModalType(type);

    if (type === 'qr') {
      setQrDynamicToken(`SEC-${Math.floor(1000 + Math.random() * 9000)}`);
      setQrCountdown(60);
    }

    if (type === 'chat') {
      setIsLoadingChat(true);
      setChatMessages([]);

      try {
        const payload = {
          tripId: String(ticket.tripId),
        };
        if (ticket.customerId) {
          payload.customerId = String(ticket.customerId);
        }

        const resConv = await apiClient.post('/chat/conversation', payload);
        const convData = resConv.data?.data || resConv.data;
        const convId = convData?.id;
        if (!convId) {
          throw new Error('ID percakapan tidak ditemukan');
        }
        setChatConversationId(convId);

        const resMsg = await apiClient.get(`/chat/conversation/${convId}/messages`);
        setChatMessages(resMsg.data?.data || resMsg.data || []);
      } catch (err) {
        console.error('Gagal memuat chat:', err);
        const errMsg = err.response?.data?.message || err.message || 'Gagal membuka ruang chat dengan mitra.';
        toast.error(errMsg, { title: 'Error' });
      } finally {
        setIsLoadingChat(false);
      }
    }
  };

  const [chatCooldownSeconds, setChatCooldownSeconds] = useState(0);

  useEffect(() => {
    if (chatCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setChatCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [chatCooldownSeconds]);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !chatConversationId || chatCooldownSeconds > 0) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');

    try {
      const res = await apiClient.post(`/chat/conversation/${chatConversationId}/messages`, {
        messageText: textToSend,
      });
      setChatMessages((prev) => [...prev, res.data]);
      setChatCooldownSeconds(15);
    } catch (err) {
      console.error('Gagal kirim pesan:', err);
      toast.error(err.response?.data?.message || 'Gagal mengirim pesan.', { title: 'Error' });
      setNewMessageText(textToSend);
    }
  };

  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const submitReview = async (e) => {
    e.preventDefault();
    if (!selectedTicket || isSubmittingReview) return;
    setIsSubmittingReview(true);

    try {
      const payload = {
        tripId: String(selectedTicket.tripId),
        revieweeId: String(selectedTicket.revieweeId),
        rating: Number(rating),
        comment: reviewText.trim() || undefined,
      };

      await apiClient.post('/reviews', payload);
      toast.success('Ulasan berhasil dikirim!', { title: 'Terkirim' });
      setActiveModalType(null);
      setReviewText('');
      setRating(5);
      await refreshData();
    } catch (err) {
      console.error('Gagal mengirim ulasan:', err);
      toast.error(
        err.response?.data?.message || 'Gagal mengirim ulasan. Coba lagi nanti.',
        { title: 'Gagal' }
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  
  

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5" /> TIKET & LIVE DIGITAL QR
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              My Tickets & Live Digital QR
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl">
              Tunjukkan QR Code digital di Pos, pantau audit checkpoint secara live, dan chat langsung dengan Mitra.
            </p>
          </div>

          <button
            onClick={() => refreshData()}
            disabled={isLoadingTickets}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl text-white text-xs font-bold transition cursor-pointer self-start sm:self-auto shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <RefreshCw className={`w-4 h-4 text-accent ${isLoadingTickets ? 'animate-spin' : ''}`} />
            <span>{isLoadingTickets ? 'Memperbarui...' : 'Segarkan Tiket'}</span>
          </button>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* Pencarian Tiket (Full Width sampai ujung) */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari No. Tiket, Rute, atau Mitra..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-neutral-200/90 rounded-xl text-[13px] font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#10367D]/10 focus:border-[#10367D] shadow-xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition p-0.5 rounded-full hover:bg-neutral-100 cursor-pointer"
            title="Hapus pencarian"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab Navigasi */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
        <button
          onClick={() => setActiveTab('aktif')}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition cursor-pointer ${
            activeTab === 'aktif' ? 'text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
          style={activeTab === 'aktif' ? { backgroundColor: PRIMARY_COLOR } : undefined}
        >
          Tiket Aktif ({tickets.filter((t) => t.status === 'Aktif' || t.status === 'Menunggu Pembayaran').length})
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition cursor-pointer ${
            activeTab === 'riwayat' ? 'text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
          style={activeTab === 'riwayat' ? { backgroundColor: PRIMARY_COLOR } : undefined}
        >
          Riwayat Perjalanan ({tickets.filter((t) => t.status !== 'Aktif').length})
        </button>

        <button
          onClick={() => setActiveTab('reward')}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reward' ? 'text-white shadow-sm' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
          style={activeTab === 'reward' ? { backgroundColor: PRIMARY_COLOR } : undefined}
        >
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Poin & Reward ({rewardSummary.totalPoints} Poin)</span>
        </button>
      </div>

      {/* Konten Tab */}
      {activeTab !== 'reward' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {isLoadingTickets ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-xs border border-neutral-200/90 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-36 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => {
              const isParcel = ticket.type === 'parcel' || ticket.type === 'barang';
              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md border border-neutral-200/90 flex flex-col justify-between space-y-4 transition-all duration-200"
                >
                  <div className="space-y-3.5">
                    {/* Header Card: Kategori Tiket & ID */}
                    <div className="flex justify-between items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#10367D] border border-blue-200/70">
                        {isParcel ? (
                          <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span>{ticket.title}</span>
                      </div>
                      <span className="text-[12px] font-mono font-bold text-neutral-600 bg-neutral-100/90 px-2 py-0.5 rounded-md border border-neutral-200">
                        ID: #{ticket.id}
                      </span>
                    </div>

                    {/* Rute Perjalanan Visual */}
                    <div className="bg-blue-50/30 rounded-xl p-3 border border-blue-100/70 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 inline-block" />
                          Pos Asal
                        </span>
                        <p className="text-[13px] font-bold text-neutral-800 truncate mt-0.5" title={ticket.from}>
                          {ticket.from}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-xs">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-end gap-1">
                          Pos Tujuan
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 inline-block" />
                        </span>
                        <p className="text-[13px] font-bold text-neutral-800 truncate mt-0.5" title={ticket.to}>
                          {ticket.to}
                        </p>
                      </div>
                    </div>

                    {/* Detail Mitra, Jadwal, & Biaya */}
                    <div className="bg-neutral-50/70 rounded-xl p-3 border border-neutral-100 space-y-2 text-[12px]">
                      <div className="flex items-center gap-2 text-neutral-700">
                        <Car className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-neutral-800 font-semibold">Mitra:</strong> {ticket.mitra} ({ticket.vehicle})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-700">
                        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-neutral-800 font-semibold">Jadwal:</strong> {ticket.schedule}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-700">
                        <Ticket className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-neutral-800 font-semibold">Detail:</strong> {ticket.detail}
                        </span>
                      </div>

                      {ticket.totalPrice && (
                        ticket.discountAmount > 0 ? (
                          <div className="pt-2 border-t border-neutral-200/70 space-y-1">
                            <div className="flex justify-between text-neutral-600">
                              <span>Subtotal:</span>
                              <span className="font-semibold text-neutral-800">{ticket.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Diskon {ticket.voucherCode ? `(${ticket.voucherCode})` : ''}:</span>
                              <span>- {ticket.discountFormatted}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-neutral-800 pt-1 border-t border-neutral-200/50">
                              <span>Total Bayar:</span>
                              <span className="text-[13px] font-bold text-emerald-600">{ticket.totalPrice}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1.5 border-t border-neutral-200/70 flex justify-between items-center font-bold text-neutral-800">
                            <span>Total Bayar:</span>
                            <span className="text-[13px] font-bold text-emerald-600">{ticket.totalPrice}</span>
                          </div>
                        )
                      )}
                    </div>

                    {/* OTP Penyerahan Barang jika ada */}
                    {ticket.otp && (
                      <div className="p-2.5 rounded-xl flex items-center justify-between text-[12px] bg-blue-50/70 border border-blue-200/60">
                        <span className="font-bold flex items-center gap-1.5 text-[#10367D]">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          OTP Penyerahan Barang:
                        </span>
                        <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-xs">
                          <span className="font-mono font-extrabold text-[13px] tracking-wider text-[#10367D]">
                            {showOtpMap[ticket.id] ? ticket.otp : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleOtpVisibility(ticket.id)}
                            className="cursor-pointer text-neutral-400 hover:text-blue-700 transition"
                            title={showOtpMap[ticket.id] ? 'Sembunyikan OTP' : 'Tampilkan OTP'}
                          >
                            {showOtpMap[ticket.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bagian Bawah: Status & Aksi Tombol */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 flex-wrap gap-2">
                      {ticket.status === 'Aktif' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                          {(ticket.tripStatus === 'in_origin_pos' || ticket.checkpointsLogs?.some(l => l.scanType === 'checkin_origin')) && ticket.currentStatusText === 'paid' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                              🚗 Sopir Telah Tiba di Pos
                            </span>
                          )}
                          {(ticket.tripStatus === 'in_transit' || ticket.currentStatusText === 'in_transit') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              🚀 Dalam Perjalanan
                            </span>
                          )}
                        </div>
                      ) : ticket.status === 'Menunggu Pembayaran' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Menunggu Pembayaran
                        </span>
                      ) : (
                        <StatusBadge variant={ticket.status === 'Selesai' ? 'default' : 'rose'}>
                          {ticket.status}
                        </StatusBadge>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Tombol Audit Checkpoint Timeline (Warna Biru) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTimelineTicket(ticket);
                            setIsTimelineModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#10367D] rounded-lg text-[12px] font-bold transition flex items-center gap-1 cursor-pointer border border-blue-200"
                        >
                          <History className="w-3 h-3 text-blue-600" />
                          Audit Checkpoint
                        </button>

                        {/* Aksi Khusus Tiket Menunggu Pembayaran */}
                        {ticket.status === 'Menunggu Pembayaran' && (
                          <button
                            type="button"
                            onClick={() => handlePayPendingTicket(ticket)}
                            disabled={payingTicketId === ticket.rawId}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[12px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {payingTicketId === ticket.rawId ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5" />
                            )}
                            <span>Bayar Sekarang</span>
                          </button>
                        )}

                        {ticket.status === 'Menunggu Pembayaran' && (
                          <button
                            type="button"
                            onClick={() => openModal(ticket, 'cancel')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[12px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Batalkan</span>
                          </button>
                        )}

                        {/* Aksi Tiket Aktif (Lunas) */}
                        {ticket.status === 'Aktif' && (
                          <button
                            type="button"
                            onClick={() => openModal(ticket, 'chat')}
                            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#10367D] rounded-lg text-[12px] font-bold transition flex items-center gap-1 cursor-pointer border border-sky-200"
                          >
                            <MessageSquare className="w-3 h-3 text-sky-600" />
                            <span>Chat Mitra</span>
                          </button>
                        )}

                        {ticket.status === 'Aktif' && (
                          <button
                            type="button"
                            onClick={() => handleOpenTracking(ticket)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[12px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            <span>Live GPS</span>
                          </button>
                        )}

                        {ticket.status === 'Aktif' && (
                          <button
                            type="button"
                            onClick={() => openModal(ticket, 'qr')}
                            className="px-2.5 py-1.5 text-white rounded-lg text-[12px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs hover:opacity-95"
                            style={{ backgroundColor: PRIMARY_COLOR }}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Pos</span>
                          </button>
                        )}

                        {ticket.status === 'Selesai' && (
                          <button
                            type="button"
                            onClick={() => openModal(ticket, 'review')}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[12px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                            <span>Ulasan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 bg-white rounded-2xl border border-neutral-200">
              <EmptyState
                icon={searchQuery.trim() ? Search : Clock}
                title={searchQuery.trim() ? 'Tiket Tidak Ditemukan' : 'Belum Ada Tiket'}
                description={searchQuery.trim() ? 'Tidak ada tiket yang cocok dengan pencarian Anda.' : 'Belum ada data perjalanan pada kategori ini.'}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <StatCard
            variant="primary"
            title="LOYALTY REWARD POINTS"
            value={`${rewardSummary.totalPoints} Poin Tersedia`}
            subtitle="Kumpulkan poin dari setiap perjalanan aman di Pos Mitra!"
            icon={Award}
          />

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 space-y-3">
            <h3 className="text-[17px] font-bold text-neutral-800">Riwayat Perolehan Poin</h3>
            {isLoadingRewards ? (
              <div className="text-neutral-400 text-[13px]">Memuat riwayat poin...</div>
            ) : rewardSummary.history.length > 0 ? (
              <div className="space-y-2">
                {rewardSummary.history.map((item) => (
                  <div key={item.id} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-between text-[13px]">
                    <div>
                      <p className="font-bold text-neutral-800">{item.description || 'Reward Trip Selesai'}</p>
                      <p className="text-[11px] text-neutral-400">{item.createdAt?.split('T')[0]}</p>
                    </div>
                    <span className={`font-bold font-mono text-[14px] ${item.type === 'earn' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.type === 'earn' ? `+${item.points}` : `-${item.points}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-neutral-400">Belum ada riwayat transaksi poin.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Chat dengan Mitra */}
      <BaseModal
        isOpen={Boolean(selectedTicket && activeModalType === 'chat')}
        onClose={() => {
          setSelectedTicket(null);
          setChatConversationId(null);
        }}
        title={`Chat dengan Mitra (${selectedTicket?.mitra})`}
        subtitle={`Trip: ${selectedTicket?.from} âž” ${selectedTicket?.to}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3 text-[13px]">
          {/* Header Action: Panggilan Telepon ke Mitra */}
          <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-semibold text-neutral-700">
                Mitra: {selectedTicket?.mitra}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const phone = selectedTicket?.mitraPhone;
                if (!phone) {
                  toast.error('Nomor telepon mitra tidak tersedia.', { title: 'Panggilan' });
                  return;
                }
                setIsPhoneModalOpen(true);
              }}
              title="Hubungi Mitra via Telepon Langsung"
              className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Telepon Mitra</span>
            </button>
          </div>

          <div className="h-72 overflow-y-auto p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5 flex flex-col">
            {isLoadingChat ? (
              <div className="flex items-center justify-center h-full text-neutral-400">Memuat pesan dari server...</div>
            ) : chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => {
                const isMe = msg.sender?.role === 'customer' || msg.senderId === selectedTicket?.customerId;
                return (
                  <div key={index} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <span className="text-[13px] text-neutral-400 mb-0.5">{msg.sender?.name || 'Pengguna'}</span>
                    <div className={`p-2.5 rounded-2xl text-[13px] ${isMe ? 'text-white rounded-br-none' : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-none shadow-sm'}`} style={isMe ? { backgroundColor: PRIMARY_COLOR } : undefined}>
                      {msg.messageText}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 space-y-1">
                <MessageSquare className="w-6 h-6 opacity-40" />
                <p>Belum ada percakapan. Mulai chat dengan mitra sekarang.</p>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChatMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder={chatCooldownSeconds > 0 ? `Tunggu ${chatCooldownSeconds} detik...` : "Tulis pesan ke mitra..."}
              disabled={chatCooldownSeconds > 0}
              className="flex-1 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
            />
            <button type="submit" disabled={!newMessageText.trim() || chatCooldownSeconds > 0} className="px-4 py-2.5 text-white rounded-xl font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1" style={{ backgroundColor: PRIMARY_COLOR }}>
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        </div>
      </BaseModal>

      {/* Modal QR Code Tiket */}
      <BaseModal
        isOpen={Boolean(selectedTicket && activeModalType === 'qr')}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.title}
        subtitle="Live Digital Dynamic QR Pos"
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-3">
          <div className="w-40 h-40 bg-white rounded-xl mx-auto flex items-center justify-center border border-neutral-200 p-2 shadow-sm">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=NEBENG-${selectedTicket?.qrCodeTicket || selectedTicket?.id}-${qrDynamicToken}`}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-[12px] font-mono font-bold text-neutral-600 bg-neutral-50 py-1 px-2.5 rounded-lg border border-neutral-200">
            {selectedTicket?.qrCodeTicket || `NEBENG-${selectedTicket?.id}-${qrDynamicToken}`}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
            <RefreshCw size={11} className="animate-spin" /> Auto-refresh QR: {qrCountdown} detik
          </div>
          <button onClick={() => setSelectedTicket(null)} className="w-full py-2.5 text-white rounded-xl text-[13px] font-bold transition cursor-pointer shadow-sm" style={{ backgroundColor: PRIMARY_COLOR }}>
            Tutup
          </button>
        </div>
      </BaseModal>

      {/* Modal Ulasan */}
      <BaseModal
        isOpen={Boolean(selectedTicket && activeModalType === 'review')}
        onClose={() => {
          if (!isSubmittingReview) setSelectedTicket(null);
        }}
        title="Beri Ulasan Perjalanan"
        subtitle={`Tiket #${selectedTicket?.id}`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={submitReview} className="space-y-3.5 text-[13px]">
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Pilih Rating
            </label>
            <div className="flex gap-2 justify-center py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  disabled={isSubmittingReview}
                  className="cursor-pointer disabled:opacity-50"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Catatan Ulasan
            </label>
            <textarea
              rows="3"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={isSubmittingReview}
              placeholder="Bagikan pengalaman Anda..."
              className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              disabled={isSubmittingReview}
              className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-bold disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="flex-1 py-2.5 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSubmittingReview ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Kirim Ulasan'
              )}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Modal Batalkan Tiket */}
      <BaseModal
        isOpen={Boolean(selectedTicket && activeModalType === 'cancel')}
        onClose={() => { if (!isCancelling) setSelectedTicket(null); }}
        title="Batalkan Tiket"
        subtitle={`Tiket #${selectedTicket?.id}`}
        maxWidth="max-w-sm"
      >
        <div className="text-center space-y-4 text-[13px]">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <p className="text-neutral-500">
            Yakin ingin membatalkan pesanan <strong className="text-neutral-800">{selectedTicket?.from} â†’ {selectedTicket?.to}</strong>? Kuota kursi/bagasi akan dikembalikan.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setSelectedTicket(null)} disabled={isCancelling} className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-bold">Tidak, Kembali</button>
            <button onClick={handleCancelTicket} disabled={isCancelling} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm">
              {isCancelling ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><XCircle className="w-3.5 h-3.5" /><span>Ya, Batalkan</span></>}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal Riwayat & Audit Checkpoint Real-time (Stepper) */}
      <TicketTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => {
          setIsTimelineModalOpen(false);
          setSelectedTimelineTicket(null);
        }}
        ticket={selectedTimelineTicket}
      />

      {/* Modal Live GPS Tracking */}
      <BaseModal
        isOpen={isTrackingModalOpen}
        onClose={handleCloseTrackingModal}
        title={`Live GPS Tracking - Trip #${trackingTicket?.id}`}
        subtitle={`Mitra: ${trackingTicket?.mitra} (${trackingTicket?.vehicle})`}
        maxWidth="max-w-2xl"
      >
        {trackingTicket && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-xl">
              <div id="customer-tracking-map" className="w-full h-72 z-0" />

              <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 p-4 text-white space-y-3 relative z-10 border-t border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${livePosition ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Status GPS</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-[12px] transition ${
                    livePosition
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                      : 'bg-neutral-700 text-neutral-300'
                  }`}>
                    <Radio size={12} />
                    <span>{livePosition ? 'Live Tracking Aktif' : 'Menunggu GPS Mitra...'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-700">
                  <MapPin size={14} className="text-neutral-400" />
                  <span className="text-[12px] font-medium text-neutral-300">{trackingTicket.from} â†’ {trackingTicket.to}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex justify-end">
              <button
                onClick={handleCloseTrackingModal}
                className="px-5 py-2.5 bg-gradient-to-r from-[#10367D] to-[#0C2C66] hover:from-[#0C2C66] hover:to-[#082044] text-white text-[13px] font-bold rounded-xl transition cursor-pointer shadow-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Modal Kustom Panggilan Telepon / Kontak Mitra */}
      <PhoneCallModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        targetName={selectedTicket?.mitra || 'Mitra'}
        phoneNumber={selectedTicket?.mitraPhone || ''}
        role="mitra"
        tripId={selectedTicket?.tripId ? String(selectedTicket.tripId) : ''}
      />
    </div>
  );
}





