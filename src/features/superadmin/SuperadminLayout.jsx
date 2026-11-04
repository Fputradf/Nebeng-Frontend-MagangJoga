import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { BASE_URL } from '../../config/env';
import SuperadminSidebar from './components/SuperadminSidebar';
import SuperadminProfileModal from './components/SuperadminProfileModal';
import EmergencySosAlertModal from '../regional/components/EmergencySosAlertModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';
import useActiveMenu from '../../hooks/useActiveMenu';
import { useAuth } from '../../context/AuthContext';
import emergencyService from '../../services/emergencyService';

const SUPERADMIN_MENU_PATH = {
  Dashboard: 'dashboard',
  'Manajemen Wilayah': 'wilayah',
  'Admin Wilayah': 'admin-wilayah',
  'Pos Mitra': 'pos-mitra',
  'Driver': 'driver',
  'Verifikasi KYC': 'verifikasi-kyc',
  'Konfigurasi Tarif': 'tarif',
  'Konfigurasi Sanksi': 'sanksi',
  'Laporan Pelanggaran': 'reports',
  'Bank Pencairan': 'bank-pencairan',
  'Konfigurasi Bank Pencairan': 'bank-pencairan',
  'Konfigurasi Logo & Nama': 'konfigurasi-aplikasi',
  Merchandise: 'merchandise',
  Banner: 'banner',
  Voucher: 'voucher',
  'Sosial Link': 'sosial-link',
  'Audit & Keuangan': 'audit',
  'User Governance': 'governance',
  'Pengaturan Akun': 'profile/pengaturan',
  // Aliases
  'Armada': 'driver',
  'Armada & Kurir': 'driver',
  'Armada & Driver': 'driver',
  'Verifikasi ID & Face': 'verifikasi-kyc',
  'Pusat Verifikasi': 'verifikasi-kyc',
  'Konfigurasi Aplikasi': 'konfigurasi-aplikasi',
  'Manajemen Merchandise': 'merchandise',
  'Manajemen Banner': 'banner',
  'Manajemen Voucher': 'voucher',
  'Manajemen Sanksi': 'sanksi',
};

export default function SuperadminLayout() {
  const navigate = useNavigate();
  const { session, role, superadminProfile, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { activeMenu } = useActiveMenu('/admin', SUPERADMIN_MENU_PATH, 'Dashboard');

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
          console.warn('[SuperadminLayout] Active SOS Alert found:', res.data[0]);
          setSosAlertData(res.data[0]);
          setIsSosAlertModalOpen(true);
        }
      } catch (err) {
        console.warn('[SuperadminLayout] Could not check active SOS alerts:', err);
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
        console.warn('[SuperadminLayout] 🚨 INCOMING SOS ALERT RECEIVED VIA WEBSOCKET:', sosData);
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

  const handleMenuSelect = (name) => {
    const slug = SUPERADMIN_MENU_PATH[name];
    if (!slug) {
      console.warn(`Menu path tidak ditemukan untuk: ${name}`);
      return;
    }
    navigate(`/admin/${slug}`);
  };

  return (
    <AppShell role="superadmin"
      sidebar={
        <SuperadminSidebar
          activeMenu={activeMenu}
          onMenuSelect={handleMenuSelect}
          onLogout={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        />
      }
      topbar={
        <AppTopbar
          basePath="/admin"
          profile={superadminProfile || session}
          roleLabel="Super Admin"
          onProfileClick={() => setShowProfileModal(true)}
        />
      }
    >
      <SuperadminProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        session={session}
        role={role}
        superadminProfile={superadminProfile}
        onSettingsClick={() => navigate('/admin/profile/pengaturan')}
      />

      {/* Modal Peringatan Darurat SOS untuk Super Admin */}
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
