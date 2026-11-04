import { useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import { BASE_URL } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';

export default function MitraTopbar() {
  const { user, mitraProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function syncMitraTopbar() {
      try {
        const res = await apiClient.get('/auth/me');

        if (isMounted && res?.data) {
          const dbUser = res.data;

          const freshName =
            dbUser.name ||
            dbUser.fullName ||
            'Mitra Nebeng';

          const freshEmail = dbUser.email || '';
          const freshPhone = dbUser.phone || '';

          const rawAvatar =
            dbUser.avatar ||
            dbUser.photoDataUrl ||
            dbUser.profilePicture ||
            dbUser.photo ||
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

          // Update mitraProfile if available
          if (mitraProfile && typeof mitraProfile === 'object') {
            Object.assign(mitraProfile, {
              name: freshName,
              fullName: freshName,
              email: freshEmail,
              phone: freshPhone,
              avatar: formattedAvatar,
              photoDataUrl: formattedAvatar,
            });
          }

          // Update user if available
          if (user && typeof user === 'object') {
            Object.assign(user, {
              name: freshName,
              fullName: freshName,
              email: freshEmail,
              phone: freshPhone,
              avatar: formattedAvatar,
              photoDataUrl: formattedAvatar,
            });
          }
        }
      } catch (err) {
        console.error(
          'Gagal menyinkronkan profil topbar mitra:',
          err
        );
      }
    }

    syncMitraTopbar();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}



