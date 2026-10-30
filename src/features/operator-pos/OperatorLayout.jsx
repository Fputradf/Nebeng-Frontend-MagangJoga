import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import OperatorSidebar from './components/OperatorSidebar';
import OperatorTopbar from './components/OperatorTopBar';
import OperatorProfileModal from './components/OperatorProfileModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';
import { useAuth } from '../../context/AuthContext';

const OPERATOR_MENU_PATH = {
  'Dashboard Pos': 'dashboard',
  'Manifes & No-Show': 'manifest',
  'Inspection & Sealing': 'inspection',
  'Dual QR Scanner': 'scanner',
  'Handover & OTP': 'handover',
  'Laporan Kas Pos': 'financial',
  'Panduan Pos': 'guide',
  'Pengaturan Akun': 'pengaturan',
};

export default function OperatorLayout() {
  const navigate = useNavigate();
  const { logout, adminProfile } = useAuth();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const currentPath = location.pathname.replace(/\/$/, '');
  const activeMenu = Object.keys(OPERATOR_MENU_PATH).find((menu) => {
    const slug = OPERATOR_MENU_PATH[menu];
    return currentPath.endsWith(`/operator-pos/${slug}`) || currentPath.includes(`/operator-pos/${slug}/`);
  }) || 'Dashboard Pos';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuSelect = (name) => {
    const slug = OPERATOR_MENU_PATH[name];
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
          profile={adminProfile}
          roleLabel="Operator Pos"
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
    </AppShell>
  );
}
