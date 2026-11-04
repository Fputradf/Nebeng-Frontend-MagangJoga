import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import OperatorSidebar from './components/OperatorSidebar';
import OperatorTopbar from './components/OperatorTopBar';
import OperatorProfileModal from './components/OperatorProfileModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { BASE_URL } from '../../config/env';
import emergencyService from '../../services/emergencyService';
import EmergencySosAlertModal from '../regional/components/EmergencySosAlertModal';

const OPERATOR_MENU_PATH = {
  'Dashboard': 'dashboard',
  'Kehadiran': 'manifest',
  'Scan QR': 'scanner',
  'Panduan': 'guide',
  'Pengaturan': 'pengaturan',

  // Fallback aliases
  'Manifest': 'manifest',
  'Dashboard Pos': 'dashboard',
  'Manifest Keberangkatan': 'manifest',
  'Dual Scanner (Validasi & Serah Terima)': 'scanner',
  'Panduan Operasional SOP': 'guide',
  'Pengaturan Akun': 'pengaturan',
  'Daftar Penumpang & Kehadiran': 'manifest',
  'Manifes & No-Show': 'manifest',
  'Inspection & Sealing': 'scanner',
  'Scan QR Pos': 'scanner',
  'Dual QR Scanner': 'scanner',
  'Handover & OTP': 'scanner',
  'Panduan Pos': 'guide',
};

export default function OperatorLayout() {
  const navigate = useNavigate();
  const { logout, adminProfile } = useAuth();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Emergency SOS State
  const [sosAlertData, setSosAlertData] = useState(null);
  const [isSosAlertModalOpen, setIsSosAlertModalOpen] = useState(false);
  const socketRef = useRef(null);

  // Helper untuk token otentikasi
  const getAuthToken = () => {
    try {
      const raw = localStorage.getItem('nebeng_auth') || sessionStorage.getItem('nebeng_auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.token || parsed.accessToken || parsed.access_token;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Ambil SOS aktif jika ada insiden belum tertangani saat reload
    const checkActiveSos = async () => {
      try {
        const res = await emergencyService.getActiveSosAlerts();
        if (isMounted && res?.data && res.data.length > 0) {
          console.warn('[OperatorLayout] Active SOS Alert found:', res.data[0]);
          setSosAlertData(res.data[0]);
          setIsSosAlertModalOpen(true);
        }
      } catch (err) {
        console.warn('[OperatorLayout] Could not check active SOS alerts:', err);
      }
    };

    checkActiveSos();

    // 2. Setup WebSocket listener untuk event darurat instan
    const token = getAuthToken();
    if (token) {
      const socketUrl = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : BASE_URL;

      const socket = io(`${socketUrl}/notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on('emergency:sos_alert', (sosData) => {
        console.warn('[OperatorLayout] 🚨 INCOMING SOS ALERT RECEIVED VIA WEBSOCKET:', sosData);
        if (isMounted) {
          setSosAlertData(sosData);
          setIsSosAlertModalOpen(true);
        }
      });

      socket.on('emergency:sos_resolved', (resolvedData) => {
        if (isMounted) {
          setSosAlertData((prev) => (prev?.id === resolvedData?.id ? null : prev));
          setIsSosAlertModalOpen(false);
        }
      });
    }

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const currentPath = location.pathname.replace(/\/$/, '');
  const activeMenu = Object.keys(OPERATOR_MENU_PATH).find((menu) => {
    const slug = OPERATOR_MENU_PATH[menu];
    return (
      currentPath.endsWith(`/operator-pos/${slug}`) ||
      currentPath.includes(`/operator-pos/${slug}/`) ||
      (slug === 'pengaturan' && (currentPath.includes('/operator-pos/profile') || currentPath.includes('/operator-pos/pengaturan')))
    );
  }) || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuSelect = (name, path) => {
    const slug = path || OPERATOR_MENU_PATH[name] || name;
    if (!slug) {
      console.warn('Menu tidak dikenal:', name);
      return;
    }
    navigate(`/operator-pos/${slug}`);
  };

  return (
    <AppShell role="operator"
      sidebar={
        <OperatorSidebar
          activeMenu={activeMenu}
          onMenuSelect={handleMenuSelect}
          onLogout={handleLogout}
        />
      }
      topbar={
        <AppTopbar
          basePath="/operator-pos"
          profile={adminProfile}
          roleLabel="Mitra Pos"
          onProfileClick={() => setShowProfileModal(true)}
        />
      }
    >
      <OperatorProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={adminProfile}
        onSettingsClick={() => navigate('/operator-pos/profile/pengaturan')}
      />

      {/* Modal Peringatan Darurat SOS untuk Mitra Pos */}
      <EmergencySosAlertModal
        isOpen={isSosAlertModalOpen}
        onClose={() => setIsSosAlertModalOpen(false)}
        alertData={sosAlertData}
        onResolved={(id) => {
          setSosAlertData(null);
          setIsSosAlertModalOpen(false);
        }}
      />
    </AppShell>
  );
}
