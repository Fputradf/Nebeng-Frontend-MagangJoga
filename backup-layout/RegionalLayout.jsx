import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import RegionalSidebar from './components/RegionalSidebar';
import RegionalTopbar from './components/RegionalTopbar';
import { useAuth } from '../../context/AuthContext';

const REGIONAL_MENU_PATH = {
  'Dashboard Wilayah': 'dashboard',
  'Pos Mitra & Terminal': 'pos-mitra',
  'Armada & Kurir': 'armada-kurir',
  'Verifikasi ID & Face': 'verifikasi',
  'Pemantauan Trip': 'trip-order',
  'Laporan Keuangan': 'laporan',
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

  const currentPath = location.pathname.replace(/\/$/, '');

  const activeMenu =
    Object.keys(REGIONAL_MENU_PATH).find((menu) => {
      const slug = REGIONAL_MENU_PATH[menu];

      return (
        currentPath.endsWith(`/regional/${slug}`) ||
        currentPath.includes(`/regional/${slug}/`)
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

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] font-['Inter']">

      {/* SIDEBAR */}
      <RegionalSidebar
        activeMenu={activeMenu}
        onMenuSelect={(name) => {
          const targetPath = REGIONAL_MENU_PATH[name];

          if (targetPath) {
            navigate(`/regional/${targetPath}`);
          }
        }}
        onLogout={() => {
          logout();
          navigate('/login', {
            replace: true,
          });
        }}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 lg:ml-64 min-h-screen">

        <RegionalTopbar
          user={currentUser}
          onSettingsClick={() =>
            navigate('/regional/profile/pengaturan')
          }
        />

        <Outlet />

      </div>
    </div>
  );
}