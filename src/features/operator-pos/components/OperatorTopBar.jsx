import { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';
import { BASE_URL } from '../../../config/env';

export default function OperatorTopbar({ onSettingsClick }) {
  const { adminProfile, updateAdminProfile } = useAuth();

  // Sinkronisasi data user real-time dari backend (aman dari infinite loop)
  useEffect(() => {
    let isMounted = true;

    async function syncOperatorTopbar() {
      try {
        const res = await apiClient.get('/auth/me');

        if (isMounted && res?.data) {
          const dbUser = res.data;

          const freshName =
            dbUser.name ||
            dbUser.fullName ||
            'Operator Pos';

          const freshEmail = dbUser.email || '';
          const freshPhone = dbUser.phone || '';

          const rawAvatar =
            dbUser.avatar ||
            dbUser.photoDataUrl ||
            '';

          let formattedAvatar = rawAvatar;

          if (
            rawAvatar &&
            !rawAvatar.startsWith('http') &&
            !rawAvatar.startsWith('data:')
          ) {
            const baseURL = apiClient.defaults.baseURL
              ? apiClient.defaults.baseURL.replace('/api', '')
              : BASE_URL;

            formattedAvatar = `${baseURL}${rawAvatar}`;
          }

          if (updateAdminProfile) {
            updateAdminProfile({
              fullName: freshName,
              name: freshName,
              email: freshEmail,
              phone: freshPhone,
              photoDataUrl: formattedAvatar,
              assignedPickupPointName: dbUser.assignedPickupPointName,
            });
          }
        }
      } catch (err) {
        console.error(
          'Gagal menyinkronkan profil topbar operator:',
          err
        );
      }
    }

    syncOperatorTopbar();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}



