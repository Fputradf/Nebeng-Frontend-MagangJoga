import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import RegionalSidebar from './components/RegionalSidebar';
import UserProfileModal from './components/UserProfileModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';
import { useAuth } from '../../context/AuthContext';

const REGIONAL_MENU_PATH = {
  'Dashboard Wilayah': 'dashboard',
  'Pos Mitra & Terminal': 'pos-mitra',
  'Armada & Kurir': 'armada-kurir',
  'Verifikasi ID & Face': 'verifikasi',
  'Pemantauan Trip': 'trip-order',
  'Laporan Keuangan': 'laporan',
  'Bantuan Chat Wilayah': 'bantuan-chat',
  'Pengaturan Akun': 'profile/pengaturan',
};

const ROLE_LABELS = {
  regional_admin: 'Admin Regional',
  admin_regional: 'Admin Regional',
  operator: 'Operator Pos',
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
    <AppShell role="regional"
      sidebar={
        <RegionalSidebar
          activeMenu={activeMenu}
          onMenuSelect={handleMenuSelect}
          onLogout={handleLogout}
        />
      }
      topbar={
        <AppTopbar
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
    </AppShell>
  );
}
