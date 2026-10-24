import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import MitraSidebar from './components/MitraSidebar';
import MitraTopbar from './components/MitraTopbar';
import { useAuth } from '../../context/AuthContext';
import { MitraDataProvider } from '../../context/MitraDataContext';
import apiClient from '../../services/apiClient';

const MITRA_MENU_PATH = {
  'Dashboard Mitra': 'dashboard',
  'Onboarding & Verifikasi': 'onboarding',
  'Kelola Trip & Jadwal': 'trip',
  'Digital QR Trip': 'qr',
  'Saldo & Komisi': 'saldo',
  'Chat Pelanggan': 'chat',
  'Profil & Pengaturan': 'profile',
};

// Kunci SEMUA menu selain onboarding jika mitra belum disetujui Admin Regional
const VERIFIED_ONLY_SLUGS = ['dashboard', 'trip', 'qr', 'saldo', 'chat', 'profile'];

export default function MitraLayout() {
  const navigate = useNavigate();
  const { logout, user, mitraProfile } = useAuth();
  const location = useLocation();

  const [isVerified, setIsVerified] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Menyimpan status verifikasi sebelumnya untuk mendeteksi perubahan status live
  const previousStatusRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLiveStatus = async () => {
      try {
        const res = await apiClient.get('/auth/me');

        if (isMounted && res.data) {
          // Sesuaikan dengan struktur respons backend (res.data.data atau res.data)
          const userData = res.data.data || res.data;
          const currentStatus = userData.statusVerification;
          const approved = currentStatus === 'approved';

          // Jika sebelumnya bukan 'approved' lalu di-approve oleh Admin Regional
          if (
            previousStatusRef.current !== null &&
            previousStatusRef.current !== 'approved' &&
            currentStatus === 'approved'
          ) {
            alert('Status akun Anda telah disetujui oleh Admin Regional! Silakan login ulang untuk memperbarui hak akses Anda.');
            logout();
            navigate('/login', { replace: true });
            return;
          }

          previousStatusRef.current = currentStatus;
          setIsVerified(approved);
        }
      } catch (err) {
        console.error('Gagal mengambil status live mitra:', err);
      } finally {
        if (isMounted) setIsLoadingStatus(false);
      }
    };

    // Ambil data pertama kali
    fetchLiveStatus();

    // Polling setiap 10 detik untuk mengecek persetujuan Admin Regional
    const intervalId = setInterval(fetchLiveStatus, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [logout, navigate]);

  const currentPath = location.pathname.replace(/\/$/, '');
  
  // Tentukan menu aktif, dengan fallback 'Onboarding & Verifikasi' jika belum terverifikasi
  const activeMenu =
    Object.keys(MITRA_MENU_PATH).find((menu) => {
      const slug = MITRA_MENU_PATH[menu];
      return (
        currentPath.endsWith(`/mitra/${slug}`) ||
        currentPath.includes(`/mitra/${slug}/`)
      );
    }) || (isVerified ? 'Dashboard Mitra' : 'Onboarding & Verifikasi');

  const activeSlug = MITRA_MENU_PATH[activeMenu];

  // Restriksi Rute: Redirect paksa ke onboarding jika belum verified dan mengakses halaman terkunci
  useEffect(() => {
    if (!isLoadingStatus && !isVerified && VERIFIED_ONLY_SLUGS.includes(activeSlug)) {
      navigate('/mitra/onboarding', { replace: true });
    }
  }, [isLoadingStatus, isVerified, activeSlug, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuSelect = (name) => {
    const slug = MITRA_MENU_PATH[name];

    if (!isVerified && VERIFIED_ONLY_SLUGS.includes(slug)) {
      alert('Akun Anda belum disetujui oleh Admin Regional. Selesaikan verifikasi terlebih dahulu.');
      navigate('/mitra/onboarding');
      return;
    }

    navigate(`/mitra/${slug}`);
  };

  if (isLoadingStatus) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#10367D] border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-600">Memeriksa hak akses akun...</p>
        </div>
      </div>
    );
  }

  return (
    <MitraDataProvider>
      <div className="flex min-h-screen bg-[#f8f9fa] font-['Inter'] overflow-x-hidden">
        <MitraSidebar
          activeMenu={activeMenu}
          isVerified={isVerified}
          onMenuSelect={handleMenuSelect}
          onLogout={handleLogout}
        />

        <div className="flex-1 lg:ml-64 min-h-screen w-full flex flex-col pb-20 lg:pb-0">
          <MitraTopbar
            profile={user || mitraProfile}
            onSettingsClick={() => {
              if (isVerified) {
                navigate('/mitra/profile/pengaturan');
              } else {
                alert('Akses pengaturan profil terkunci sampai akun Anda disetujui.');
              }
            }}
          />
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </MitraDataProvider>
  );
}