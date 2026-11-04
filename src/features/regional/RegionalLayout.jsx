import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { BASE_URL } from '../../config/env';
import RegionalSidebar from './components/RegionalSidebar';
import UserProfileModal from './components/UserProfileModal';
import EmergencySosAlertModal from './components/EmergencySosAlertModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';
import { useAuth } from '../../context/AuthContext';
import emergencyService from '../../services/emergencyService';

const REGIONAL_MENU_PATH = {
  'Dashboard Wilayah': 'dashboard',
  'Pos Mitra & Terminal': 'pos-mitra',
  'Armada & Kurir': 'armada-kurir',
  'Verifikasi ID & Face': 'verifikasi',
  'Pemantauan Trip': 'trip-order',
  'Laporan Pelanggaran': 'reports',
  'Laporan Keuangan': 'laporan',
  'Bantuan Chat Wilayah': 'bantuan-chat',
  'Pengaturan Akun': 'profile/pengaturan',
};

const ROLE_LABELS = {
  regional_admin: 'Admin Regional',
  admin_regional: 'Admin Regional',
  operator: 'Mitra Pos',
};

function formatRoleLabel(role) {
  if (!role) return 'Admin Regional';

  if (ROLE_LABELS[role]) {
    return ROLE_LABELS[role];
  }

  return role
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RegionalLayout() {
  const navigate = useNavigate();

  const {
    logout,
    session,
    role,
    adminProfile,
  } = useAuth();

  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Emergency SOS State
  const [sosAlertData, setSosAlertData] = useState(null);
  const [isSosAlertModalOpen, setIsSosAlertModalOpen] = useState(false);
  const socketRef = useRef(null);

  const currentPath = location.pathname.replace(/\/$/, '');

  const activeMenu =
    Object.keys(REGIONAL_MENU_PATH).find((menu) => {
      const slug = REGIONAL_MENU_PATH[menu];

      return (
        currentPath.endsWith(`/regional/${slug}`) ||
        currentPath.includes(`/regional/${slug}/`) ||
        (menu === 'Pengaturan Akun' && (currentPath.includes('/regional/profile') || currentPath.includes('/regional/pengaturan')))
      );
    }) || 'Dashboard Wilayah';

  const currentUser = {
    name:
      adminProfile?.name ||
      session?.name ||
      '',

    email:
      adminProfile?.email ||
      session?.email ||
      '',

    phone:
      adminProfile?.phone ||
      session?.phone ||
      '',

    region:
      adminProfile?.region ||
      session?.region ||
      'Belum ditetapkan',

    photoDataUrl:
      adminProfile?.photoDataUrl ||
      '',

    role: formatRoleLabel(role),
  };

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

  // Cek insiden SOS aktif saat pertama kali mount & sambungkan WebSocket
  useEffect(() => {
    let isMounted = true;

    // 1. Ambil SOS aktif jika ada insiden belum tertangani saat reload
    const checkActiveSos = async () => {
      try {
        const res = await emergencyService.getActiveSosAlerts();
        if (isMounted && res?.data && res.data.length > 0) {
          console.warn('[RegionalLayout] Active SOS Alert found:', res.data[0]);
          setSosAlertData(res.data[0]);
          setIsSosAlertModalOpen(true);
        }
      } catch (err) {
        console.warn('[RegionalLayout] Could not check active SOS alerts:', err);
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
        console.warn('[RegionalLayout] 🚨 INCOMING SOS ALERT RECEIVED VIA WEBSOCKET:', sosData);
        if (isMounted) {
          setSosAlertData(sosData);
          setIsSosAlertModalOpen(true);
        }
      });

      socket.on('emergency:sos_resolved', (resolvedData) => {
        console.log('[RegionalLayout] SOS Alert resolved:', resolvedData);
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

  const handleLogout = () => {
    logout();
    navigate('/login', {
      replace: true,
    });
  };

  const handleMenuSelect = (name) => {
    const targetPath = REGIONAL_MENU_PATH[name];
    if (!targetPath) {
      console.warn('Menu tidak dikenal:', name);
      return;
    }
    navigate(`/regional/${targetPath}`);
  };

  return (
    <AppShell
      role="regional"
      sidebar={
        <RegionalSidebar
          activeMenu={activeMenu}
          onMenuSelect={handleMenuSelect}
          onLogout={handleLogout}
        />
      }
      topbar={
        <AppTopbar
          basePath="/regional"
          profile={currentUser}
          roleLabel={currentUser.role}
          onProfileClick={() => setShowProfileModal(true)}
        />
      }
    >
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        onSettingsClick={() => navigate('/regional/profile/pengaturan')}
      />

      {/* Modal Peringatan Darurat SOS untuk Admin Regional */}
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
