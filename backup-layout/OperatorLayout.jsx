import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import OperatorSidebar from './components/OperatorSidebar';
import OperatorTopbar from './components/OperatorTopBar';
import { useAuth } from '../../context/AuthContext';

const OPERATOR_MENU_PATH = {
  'Dashboard Pos': 'dashboard',
  'Inspection & Sealing': 'inspection',
  'Dual QR Scanner': 'scanner',
  'Handover & OTP': 'handover',
  'Laporan Kas Pos': 'financial',
};

export default function OperatorLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname.replace(/\/$/, '');
  const activeMenu = Object.keys(OPERATOR_MENU_PATH).find((menu) => {
    const slug = OPERATOR_MENU_PATH[menu];
    return currentPath.endsWith(`/operator-pos/${slug}`) || currentPath.includes(`/operator-pos/${slug}/`);
  }) || 'Dashboard Pos';

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-['Inter']">
      <OperatorSidebar
        activeMenu={activeMenu}
        onMenuSelect={(name) => navigate(`/operator-pos/${OPERATOR_MENU_PATH[name]}`)}
        onLogout={() => {
          logout();
          navigate('/login', { replace: true });
        }}
      />
      
      <div className="flex-1 lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <OperatorTopbar onSettingsClick={() => navigate('/operator-pos/profile/pengaturan')} />
        <Outlet />
      </div>
    </div>
  );
}