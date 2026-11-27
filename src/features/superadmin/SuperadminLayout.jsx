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
  'Wilayah & Pos': 'wilayah',
  'Driver & KYC': 'driver',
  'Tarif & Pembayaran': 'tarif',
  'Audit & Keuangan': 'audit',
  'Kepatuhan & User': 'governance',
  'Promo & Konten': 'banner',
  'Branding & Sosial': 'konfigurasi-aplikasi',
  'Pengaturan Akun': 'profile/pengaturan',
  // Sub-tab & legacy route mappings
  'Manajemen Wilayah': 'wilayah',
  'Admin Wilayah': 'admin-wilayah',
  'Pos Mitra': 'pos-mitra',
  Driver: 'driver',
  'Verifikasi KYC': 'verifikasi-kyc',
  'Konfigurasi Tarif': 'tarif',
  'Gateway Pembayaran': 'pembayaran',
  'Metode Pembayaran': 'pembayaran',
  'Bank Pencairan': 'bank-pencairan',
  'Konfigurasi Bank Pencairan': 'bank-pencairan',
  'User Governance': 'governance',
  'Laporan Pelanggaran': 'reports',
  'Konfigurasi Sanksi': 'sanksi',
  'Log Darurat SOS': 'sos-logs',
  Banner: 'banner',
  Voucher: 'voucher',
  Merchandise: 'merchandise',
  'Konfigurasi Logo & Nama': 'konfigurasi-aplikasi',
  'Sosial Link': 'sosial-link',
  // Aliases
  Armada: 'driver',
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

const SIDEBAR_GROUP_BY_MENU = {
  'Manajemen Wilayah': 'Wilayah & Pos',
  'Admin Wilayah': 'Wilayah & Pos',
  'Pos Mitra': 'Wilayah & Pos',
  Driver: 'Driver & KYC',
  'Verifikasi KYC': 'Driver & KYC',
  'Konfigurasi Tarif': 'Tarif & Pembayaran',
  'Gateway Pembayaran': 'Tarif & Pembayaran',
  'Metode Pembayaran': 'Tarif & Pembayaran',
  'Bank Pencairan': 'Tarif & Pembayaran',
  'Konfigurasi Bank Pencairan': 'Tarif & Pembayaran',
  'User Governance': 'Kepatuhan & User',
  'Laporan Pelanggaran': 'Kepatuhan & User',
  'Konfigurasi Sanksi': 'Kepatuhan & User',
  'Log Darurat SOS': 'Kepatuhan & User',
  Banner: 'Promo & Konten',
  Voucher: 'Promo & Konten',
  Merchandise: 'Promo & Konten',
  'Konfigurasi Logo & Nama': 'Branding & Sosial',
  'Sosial Link': 'Branding & Sosial',
};

export default function SuperadminLayout() {
  const navigate = useNavigate();
  const { session, role, superadminProfile, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { activeMenu: matchedMenu } = useActiveMenu('/admin', SUPERADMIN_MENU_PATH, 'Dashboard');
  const activeMenu = SIDEBAR_GROUP_BY_MENU[matchedMenu] || matchedMenu;

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
