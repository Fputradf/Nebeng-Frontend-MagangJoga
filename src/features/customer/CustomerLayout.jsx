import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import CustomerSidebar from './components/CustomerSidebar';
import CustomerProfileModal from './components/CustomerProfileModal';
import AppShell from '../../components/layout/AppShell';
import AppTopbar from '../../components/layout/AppTopbar';

import { useAuth } from '../../context/AuthContext';

const CUSTOMER_MENU_PATH = {
  'Onboarding Biometrik': 'onboarding',
  'Cari & Booking Trip': 'booking',
  'Tickets & Digital QR': 'tickets',
  'Rewards & Penukaran': 'rewards',
  'Dompet Saya': 'wallet',
  'Profil Saya': 'profile',
};

export default function CustomerLayout() {
  const navigate = useNavigate();
  const { logout, customerProfile, isCustomerVerified } = useAuth();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const currentPath = location.pathname.replace(/\/$/, '');

  // Redirect jika sudah verified tapi membuka halaman onboarding
  useEffect(() => {
    if (isCustomerVerified && (currentPath.endsWith('/customer/onboarding') || currentPath === '/customer/onboarding')) {
      navigate('/customer/booking', { replace: true });
    }
  }, [isCustomerVerified, currentPath, navigate]);
  const activeMenu = Object.keys(CUSTOMER_MENU_PATH).find((menu) => {
    const slug = CUSTOMER_MENU_PATH[menu];
    return currentPath.endsWith(`/customer/${slug}`) || currentPath.includes(`/customer/${slug}/`);
  }) || 'Cari & Booking Trip';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuSelect = (name) => {
    const slug = CUSTOMER_MENU_PATH[name];
    if (!slug) {
      console.warn('Menu tidak dikenal:', name);
      return;
    }
    navigate(`/customer/${slug}`);
  };

  return (
    <AppShell
      sidebar={
        <CustomerSidebar
          activeMenu={activeMenu}
          isCustomerVerified={isCustomerVerified}
          customerProfile={customerProfile}
          onMenuSelect={handleMenuSelect}
          onLogout={handleLogout}
        />
      }
      topbar={
        <AppTopbar
          profile={customerProfile}
          roleLabel="Customer"
          onProfileClick={() => setShowProfileModal(true)}
        />
      }
    >
      <CustomerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={customerProfile}
        onSettingsClick={() => navigate('/customer/profile/pengaturan')}
      />
    </AppShell>
  );
}
