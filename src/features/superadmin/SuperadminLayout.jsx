import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperadminSidebar from './components/SuperadminSidebar';
import SuperadminProfileModal from './components/SuperadminProfileModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';
import useActiveMenu from '../../hooks/useActiveMenu';
import { useAuth } from '../../context/AuthContext';

const SUPERADMIN_MENU_PATH = {
  Dashboard: 'dashboard',
  'Manajemen Wilayah': 'wilayah',
  'Admin Wilayah': 'admin-wilayah',
  'Konfigurasi Tarif': 'tarif',
  Merchandise: 'merchandise',
  Banner: 'banner',
  Voucher: 'voucher',
  'Sosial Link': 'sosial-link',
  'Audit & Keuangan': 'audit',
  'User Governance': 'governance',
  'Pengaturan Akun': 'profile/pengaturan',
  // Aliases
  'Manajemen Merchandise': 'merchandise',
  'Manajemen Banner': 'banner',
  'Manajemen Voucher': 'voucher',
};

export default function SuperadminLayout() {
  const navigate = useNavigate();
  const { session, role, superadminProfile, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { activeMenu } = useActiveMenu('/admin', SUPERADMIN_MENU_PATH, 'Dashboard');

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
    </AppShell>
  );
}
