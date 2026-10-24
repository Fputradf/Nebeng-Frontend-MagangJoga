import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SuperadminSidebar from './components/SuperadminSidebar';
import SuperadminHeader from './components/SuperadminHeader';
import SuperadminProfileModal from './components/SuperadminProfileModal';
import { useAuth } from '../../context/AuthContext';

const SUPERADMIN_MENU_PATH = {
  'Dashboard': 'dashboard',
  'Manajemen Wilayah': 'wilayah',
  'Admin Wilayah': 'admin-wilayah',
  'Konfigurasi Tarif': 'tarif',
  'Manajemen Merchandise': 'merchandise',
  'Manajemen Banner': 'banner',
  'Audit & Keuangan': 'audit',
  'User Governance': 'governance',
};

export default function SuperadminLayout() {
  const navigate = useNavigate();
  const { session, role, superadminProfile, logout } = useAuth();
  const location = useLocation();

  const [showProfileModal, setShowProfileModal] = useState(false);

  const currentPath = location.pathname.replace(/\/$/, '');
  const activeMenu = Object.keys(SUPERADMIN_MENU_PATH).find(menu => {
    const slug = SUPERADMIN_MENU_PATH[menu];
    return currentPath.endsWith(`/admin/${slug}`) || currentPath.includes(`/admin/${slug}/`);
  }) || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen bg-brand-100 overflow-hidden font-sans">
      <div className="pointer-events-none absolute -top-24 -left-24 w-104 h-104 bg-brand-900/10 rounded-full blur-[110px] z-0"></div>
      <div className="pointer-events-none absolute top-1/2 -right-32 w-[24rem] h-96 bg-brand-900/10 rounded-full blur-[100px] z-0"></div>
      <div className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 bg-brand-400/10 rounded-full blur-[90px] z-0"></div>

      <SuperadminSidebar
        activeMenu={activeMenu}
        onMenuSelect={(name) => navigate(`/admin/${SUPERADMIN_MENU_PATH[name]}`)}
        onLogout={handleLogout}
      />

      <div className="relative z-10 flex-1 lg:ml-64 min-h-screen">
        <SuperadminHeader
          session={session}
          role={role}
          superadminProfile={superadminProfile}
          onViewProfile={() => setShowProfileModal(true)}
          onSettingsClick={() => navigate('/admin/profile/pengaturan')}
        />
        <div className="pt-2 lg:pt-0">
          <Outlet />
        </div>
      </div>

      <SuperadminProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        session={session}
        role={role}
        superadminProfile={superadminProfile}
        onSettingsClick={() => navigate('/admin/profile/pengaturan')}
      />
    </div>
  );
}