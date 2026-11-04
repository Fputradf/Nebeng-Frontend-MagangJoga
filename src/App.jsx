import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppConfig } from './context/AppConfigContext';

import Login from './features/auth/Login';
import Register from './features/auth/Register';
import ForgotPassword from './features/auth/ForgotPassword';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Superadmin
import SuperadminLayout from './features/superadmin/SuperadminLayout';
import SuperadminDashboard from './features/superadmin/views/SuperadminDashboard';
import RegionsManagement from './features/superadmin/views/RegionsManagement';
import RegionalAdminsManagement from './features/superadmin/views/RegionalAdminsManagement';
import PricingManagement from './features/superadmin/views/PricingManagement';
import AuditLedger from './features/superadmin/views/AuditLedger';
import UserGovernance from './features/superadmin/views/UserGovernance';
import SuperadminAccountSettings from './features/superadmin/views/SuperadminAccountSettings';
import MerchandiseManagement from './features/superadmin/views/MerchandiseManagement';
import BannerManagement from './features/superadmin/views/BannerManagement';
import VoucherManagement from './features/superadmin/views/VoucherManagement';
import SocialLinksManagement from './features/superadmin/views/SocialLinksManagement';
import SanctionManagement from './features/superadmin/views/SanctionManagement';
import AppConfigManagement from './features/superadmin/views/AppConfigManagement';
import DisbursementBankManagement from './features/superadmin/views/DisbursementBankManagement';
import DriverManagement from './features/superadmin/views/DriverManagement';

// Regional
import RegionalLayout from './features/regional/RegionalLayout';
import RegionalSupportChat from './features/regional/views/RegionalSupportChat';
import AdminRegionalDashboard from './features/regional/views/AdminRegionalDashboard';
import PosMitraManagement from './features/regional/views/PosMitraManagement';
import OperatorPosPage from './features/regional/views/OperatorPosManagement';
import VerificationCenterPage from './features/regional/views/VerificationCenter';
import TripOrderPage from './features/regional/views/TripOrderMonitoring';
import ArmadaKurirTabs from './features/regional/views/ArmadaKurirTabs';
import FinancialReportPage from './features/regional/views/FinancialReportPage';
import ReportManagement from './features/regional/views/ReportManagement';
import RegionalAccountSettings from './features/regional/views/RegionalAccountSettings';

// Mitra Pos
import OperatorLayout from './features/operator-pos/OperatorLayout';
import OperatorDashboard from './features/operator-pos/views/OperatorDashboard';
import OperatorManifest from './features/operator-pos/views/OperatorManifest';
import OperatorInspection from './features/operator-pos/views/OperatorInspection';
import OperatorDualScanner from './features/operator-pos/views/OperatorDualScanner';
import OperatorHandover from './features/operator-pos/views/OperatorHandover';
import OperatorFinancial from './features/operator-pos/views/OperatorFinancial';
import OperatorGuide from './features/operator-pos/views/OperatorGuide';
import OperatorAccountSettings from './features/operator-pos/components/OperatorAccountSettings';

// Mitra
import MitraLayout from './features/mitra/MitraLayout';
import MitraDashboard from './features/mitra/views/MitraDashboard';
import MitraOnboarding from './features/mitra/views/MitraOnboarding';
import MitraTripManagement from './features/mitra/views/MitraTripManagement';
import MitraQrDisplay from './features/mitra/views/MitraQrDisplay';
import MitraBalance from './features/mitra/views/MitraBalance';
import MitraChat from './features/mitra/views/MitraChat';
import MitraAccountSettings from './features/mitra/views/MitraAccountSettings';

// Help & FAQ
import HelpCenterView from './features/help/HelpCenterView';

// Customer
import CustomerLayout from './features/customer/CustomerLayout';
import BiometricOnboarding from './features/customer/views/BiometricOnboarding';
import SearchTrip from './features/customer/views/SearchTrip';
import MyTickets from './features/customer/views/MyTickets';
import CustomerQrDisplay from './features/customer/views/CustomerQrDisplay';
import CustomerAccountSettings from './features/customer/views/CustomerAccountSettings';
import CustomerRewards from './features/customer/views/CustomerRewards';
import CustomerVouchers from './features/customer/views/CustomerVouchers';
import CustomerChat from './features/customer/views/CustomerChat';
import CustomerWallet from './features/customer/views/CustomerWallet';
import { NotificationSettings, NotificationHistory, NotificationPermissionRequest } from './features/notifications';

// PWA Components
import OfflineIndicator from './components/pwa/OfflineIndicator';
import PWAInstallPrompt from './components/pwa/PWAInstallPrompt';
import PWAUpdateToast from './components/pwa/PWAUpdateToast';

function CustomerIndexRedirect() {
  const { isCustomerVerified } = useAuth();
  const destination = isCustomerVerified ? 'booking' : 'onboarding';
  return <Navigate to={destination} replace />;
}

const ROLE_HOME = {
  admin: '/admin/dashboard',
  regional: '/regional/dashboard',
  operator: '/operator-pos/dashboard',
  mitra: '/mitra/dashboard',
  customer: '/customer',
};

function GuestRoute({ children }) {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    // Pastikan role valid sebelum redirect
    const homePath = ROLE_HOME[role];
    if (homePath) {
      return <Navigate to={homePath} replace />;
    }
    // Jika role tidak dikenali, redirect ke dashboard admin sebagai fallback
    return <Navigate to={ROLE_HOME.admin} replace />;
  }

  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, setPageTitle } = useAppConfig();

  // ─── JUDUL TAB BROWSER ────────────────────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;
    const PAGE_TITLES = {
      '/login':                        'Masuk',
      '/register':                     'Daftar',
      '/forgot-password':              'Lupa Password',
      '/admin/dashboard':              'Dashboard Superadmin',
      '/admin/wilayah':                'Manajemen Wilayah',
      '/admin/pos-mitra':              'Pos Mitra',
      '/admin/admin-wilayah':          'Admin Wilayah',
      '/admin/armada':                 'Manajemen Armada',
      '/admin/driver':                 'Manajemen Driver',
      '/admin/verifikasi-kyc':         'Pusat Verifikasi KYC',
      '/admin/tarif':                  'Manajemen Tarif',
      '/admin/sanksi':                 'Sanksi',
      '/admin/reports':                'Laporan',
      '/admin/laporan-pelanggaran':    'Laporan Pelanggaran',
      '/admin/bank-pencairan':         'Bank Pencairan',
      '/admin/bank':                   'Bank',
      '/admin/konfigurasi-aplikasi':   'Konfigurasi Aplikasi',
      '/admin/konfigurasi-logo':       'Konfigurasi Logo',
      '/admin/merchandise':            'Merchandise',
      '/admin/banner':                 'Banner',
      '/admin/voucher':                'Voucher',
      '/admin/sosial-link':            'Link Sosial',
      '/admin/audit':                  'Audit Ledger',
      '/admin/governance':             'User Governance',
      '/admin/notifications':          'Notifikasi',
      '/admin/pengaturan':             'Pengaturan Akun',
      '/regional/dashboard':           'Dashboard Regional',
      '/regional/pos-mitra':           'Pos Mitra',
      '/regional/operator-pos':        'Operator Pos',
      '/regional/verifikasi':          'Pusat Verifikasi',
      '/regional/trip-order':          'Monitor Trip Order',
      '/regional/armada-kurir':        'Armada & Kurir',
      '/regional/laporan':             'Laporan Keuangan',
      '/regional/reports':             'Laporan',
      '/regional/bantuan-chat':        'Chat Bantuan',
      '/regional/notifications':       'Notifikasi',
      '/regional/pengaturan':          'Pengaturan Akun',
      '/operator-pos/dashboard':       'Dashboard Operator',
      '/operator-pos/manifest':        'Manifest',
      '/operator-pos/scanner':         'Scanner QR',
      '/operator-pos/financial':       'Keuangan',
      '/operator-pos/guide':           'Panduan',
      '/operator-pos/pengaturan':      'Pengaturan Akun',
      '/operator-pos/notifications':   'Notifikasi',
      '/mitra/dashboard':              'Dashboard Mitra',
      '/mitra/onboarding':             'Onboarding Mitra',
      '/mitra/trip':                   'Manajemen Trip',
      '/mitra/qr':                     'QR Mitra',
      '/mitra/saldo':                  'Saldo',
      '/mitra/chat':                   'Chat',
      '/mitra/bantuan':                'Bantuan',
      '/mitra/notifications':          'Notifikasi',
      '/customer/booking':             'Cari Tumpangan',
      '/customer/tickets':             'Tiket Saya',
      '/customer/qr':                  'QR Tiket',
      '/customer/vouchers':            'Voucher',
      '/customer/rewards':             'Rewards',
      '/customer/wallet':              'Dompet',
      '/customer/chat':                'Chat',
      '/customer/bantuan':             'Bantuan',
      '/customer/notifications':       'Notifikasi',
      '/customer/onboarding':          'Onboarding',
    };

    const pageTitle = PAGE_TITLES[path];
    setPageTitle(pageTitle || null);
  }, [location.pathname, setPageTitle]);

  const handleLogin = (role) => {
    const from = location.state?.from;
    const destination =
      from && from.startsWith(`/${role}`) ? from : ROLE_HOME[role] || ROLE_HOME.admin;
    navigate(destination, { replace: true });
  };

  return (
    <>
      <OfflineIndicator />
      <NotificationPermissionRequest />
      <PWAInstallPrompt />
      <PWAUpdateToast />
      <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login
              onSwitchToRegister={() => navigate('/register')}
              onSwitchToForgotPassword={() => navigate('/forgot-password')}
              onLogin={handleLogin}
            />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword onSwitchToLogin={() => navigate('/login')} />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register onSwitchToLogin={() => navigate('/login')} />
          </GuestRoute>
        }
      />

      {/* Superadmin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SuperadminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperadminDashboard />} />
        <Route path="wilayah" element={<RegionsManagement />} />
        <Route path="pos-mitra" element={<PosMitraManagement />} />
        <Route path="admin-wilayah" element={<RegionalAdminsManagement />} />
        <Route path="armada" element={<ArmadaKurirTabs defaultTab="armada" />} />
        <Route path="armada-kurir" element={<Navigate to="/admin/armada" replace />} />
        <Route path="driver" element={<DriverManagement />} />
        <Route path="verifikasi-kyc" element={<VerificationCenterPage />} />
        <Route path="verifikasi" element={<Navigate to="/admin/verifikasi-kyc" replace />} />
        <Route path="tarif" element={<PricingManagement />} />
        <Route path="sanksi" element={<SanctionManagement />} />
        <Route path="reports" element={<ReportManagement />} />
        <Route path="laporan-pelanggaran" element={<ReportManagement />} />
        <Route path="bank-pencairan" element={<DisbursementBankManagement />} />
        <Route path="bank" element={<DisbursementBankManagement />} />
        <Route path="konfigurasi-aplikasi" element={<AppConfigManagement />} />
        <Route path="konfigurasi-logo" element={<AppConfigManagement />} />
        <Route path="merchandise" element={<MerchandiseManagement />} />
        <Route path="banner" element={<BannerManagement />} />
        <Route path="voucher" element={<VoucherManagement />} />
        <Route path="sosial-link" element={<SocialLinksManagement />} />
        <Route path="audit" element={<AuditLedger />} />
        <Route path="governance" element={<UserGovernance />} />
        <Route path="notifications" element={<NotificationHistory />} />
        <Route path="notifications/settings" element={<NotificationSettings />} />
        <Route path="profile/pengaturan" element={<SuperadminAccountSettings />} />
        <Route path="pengaturan" element={<SuperadminAccountSettings />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Admin Regional */}
      <Route
        path="/regional"
        element={
          <ProtectedRoute allowedRoles={['regional']}>
            <RegionalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminRegionalDashboard />} />
        <Route path="pos-mitra" element={<PosMitraManagement />} />
        <Route path="operator-pos" element={<OperatorPosPage />} />
        <Route path="verifikasi" element={<VerificationCenterPage />} />
        <Route path="trip-order" element={<TripOrderPage />} />
        <Route path="armada-kurir" element={<ArmadaKurirTabs />} />
        <Route path="laporan" element={<FinancialReportPage />} />
        <Route path="reports" element={<ReportManagement />} />
        <Route path="bantuan-chat" element={<RegionalSupportChat />} />
        <Route path="notifications" element={<NotificationHistory />} />
        <Route path="notifications/settings" element={<NotificationSettings />} />
        <Route path="profile/pengaturan" element={<RegionalAccountSettings />} />
        <Route path="pengaturan" element={<RegionalAccountSettings />} />
        <Route path="*" element={<Navigate to="/regional/dashboard" replace />} />
      </Route>

      {/* Mitra Pos */}
      <Route
        path="/operator-pos"
        element={
          <ProtectedRoute allowedRoles={['operator']}>
            <OperatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OperatorDashboard />} />
        <Route path="manifest" element={<OperatorManifest />} />
        <Route path="inspection" element={<Navigate to="/operator-pos/scanner" replace />} />
        <Route path="scanner" element={<OperatorDualScanner />} />
        <Route path="handover" element={<Navigate to="/operator-pos/scanner" replace />} />
        <Route path="financial" element={<OperatorFinancial />} />
        <Route path="guide" element={<OperatorGuide />} />
        <Route path="pengaturan" element={<OperatorAccountSettings />} />
        <Route path="notifications" element={<NotificationHistory />} />
        <Route path="notifications/settings" element={<NotificationSettings />} />
        <Route path="profile" element={<Navigate to="pengaturan" replace />} />
        <Route path="profile/pengaturan" element={<OperatorAccountSettings />} />
        <Route path="*" element={<Navigate to="/operator-pos/dashboard" replace />} />
      </Route>

      {/* Mitra */}
      <Route
        path="/mitra"
        element={
          <ProtectedRoute allowedRoles={['mitra']}>
            <MitraLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<MitraDashboard />} />
        <Route path="onboarding" element={<MitraOnboarding />} />
        <Route path="trip" element={<MitraTripManagement />} />
        <Route path="qr" element={<MitraQrDisplay />} />
        <Route path="saldo" element={<MitraBalance />} />
        <Route path="chat" element={<MitraChat />} />
        <Route path="bantuan" element={<HelpCenterView userRole="mitra" />} />
        <Route path="notifications" element={<NotificationHistory />} />
        <Route path="notifications/settings" element={<NotificationSettings />} />
        <Route path="profile/pengaturan" element={<MitraAccountSettings />} />
        <Route path="*" element={<Navigate to="/mitra/dashboard" replace />} />
      </Route>

      {/* Customer */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerIndexRedirect />} />
        <Route path="onboarding" element={<BiometricOnboarding />} />
        <Route path="booking" element={<SearchTrip />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="qr" element={<CustomerQrDisplay />} />
        <Route path="vouchers" element={<CustomerVouchers />} />
        <Route path="chat" element={<CustomerChat />} />
        <Route path="rewards" element={<CustomerRewards />} />
        <Route path="wallet" element={<CustomerWallet />} />
        <Route path="bantuan" element={<HelpCenterView userRole="customer" />} />
        <Route path="notifications" element={<NotificationHistory />} />
        <Route path="notifications/settings" element={<NotificationSettings />} />
        <Route path="profile" element={<Navigate to="pengaturan" replace />} />
        <Route path="profile/pengaturan" element={<CustomerAccountSettings />} />
        <Route path="*" element={<CustomerIndexRedirect />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  );
}
