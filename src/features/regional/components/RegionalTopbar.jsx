import { useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import { BASE_URL } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';

export default function RegionalTopbar({ onSettingsClick }) {
  const { adminProfile, updateAdminProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function syncRegionalTopbar() {
      try {
        const res = await apiClient.get('/auth/me');

        if (isMounted && res?.data) {
          const dbUser = res.data;

          const freshName =
            dbUser.name ||
            dbUser.fullName ||
            'Admin Regional';

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
            });
          }
        }
      } catch (err) {
        console.error(
          'Gagal menyinkronkan profil topbar regional:',
          err
        );
      }
    }

    syncRegionalTopbar();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}