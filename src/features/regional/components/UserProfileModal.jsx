import { BASE_URL } from '../../../config/env';
import { useState, useEffect } from 'react';
import {
  createPortal,
} from 'react-dom';

import {
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';

const formatRole = (role) => {
  if (!role) return 'Admin Regional';

  return role
    .split(/[-_ ]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function UserProfileModal({
  isOpen,
  onClose,
  user: initialUser,
  onSettingsClick,
}) {
  const { session } = useAuth();
  const [currentUser, setCurrentUser] = useState(initialUser || {});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchLatestUserData() {
      if (!isOpen) return;

      try {
        setIsLoading(true);
        const res = await apiClient.get('/auth/me');

        if (isMounted && res?.data) {
          setCurrentUser(res.data);
        }
      } catch (err) {
        console.error('Gagal mengambil data user yang sedang login:', err);
        if (initialUser) {
          setCurrentUser(initialUser);
        } else if (session) {
          setCurrentUser(session);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchLatestUserData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialUser, session]);

  if (!isOpen) {
    return null;
  }

  const displayName =
    currentUser?.name?.trim() ||
    session?.name?.trim() ||
    'Admin Regional';

  const rawAvatar = currentUser?.avatar || currentUser?.photoDataUrl || '';
  
  let photoDataUrl = '';
  if (rawAvatar) {
    const baseURL = apiClient.defaults.baseURL
      ? apiClient.defaults.baseURL.replace('/api', '')
      : BASE_URL;

    photoDataUrl = rawAvatar.startsWith('http')
      ? rawAvatar
      : `${baseURL}${rawAvatar}`;
  }

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'AR';

  const userRole = formatRole(currentUser?.role || session?.role || 'Admin Regional');
  const regionDisplay = 
    currentUser?.region?.name || 
    currentUser?.regionName || 
    currentUser?.region || 
    (currentUser?.regionId ? `Wilayah ID: ${currentUser.regionId}` : 'Wilayah Tugas Utama');

  const fields = [
    {
      icon: Mail,
      label: 'Email',
      value: currentUser?.email || session?.email || '-',
    },
    {
      icon: Phone,
      label: 'No. Telepon',
      value: currentUser?.phone || session?.phone || '-',
    },
    {
      icon: MapPin,
      label: 'Wilayah Tugas',
      value: regionDisplay,
    },
  ];

  return createPortal(
    <div
      className="
        fixed
        inset-0
        bg-black/60
        backdrop-blur-sm
        z-50
        flex
        items-center
        justify-center
        p-4
        overflow-y-auto
      "
    >

      <div
        className="
          bg-white
          rounded-2xl
          max-w-sm
          w-full
          shadow-2xl
          text-gray-900
          font-['Inter']
          overflow-hidden
          my-8
          max-h-[90vh]
          flex
          flex-col
        "
      >

        {/* HEADER */}
        <div
          className="
            bg-[#10367D]
            p-6
            text-white
            relative
            shrink-0
          "
        >

          {/* CLOSE */}
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="
              absolute
              top-3
              right-3
              w-7
              h-7
              rounded-full
              bg-white/10
              hover:bg-white/20
              flex
              items-center
              justify-center
              transition
              cursor-pointer
            "
          >
            <X
              className="w-3.5 h-3.5"
            />
          </button>

          {/* USER INFO */}
          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            {/* AVATAR */}
            <div
              className="
                w-14
                h-14
                rounded-2xl
                bg-white/15
                border
                border-white/20
                flex
                items-center
                justify-center
                font-bold
                text-[21px]
                shrink-0
                overflow-hidden
              "
            >
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt="Foto Profil"
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />
              ) : (
                initials
              )}
            </div>

            {/* NAME & ROLE */}
            <div className="min-w-0">

              <h3
                className="
                  text-[17px]
                  font-bold
                  truncate
                "
              >
                {displayName}
              </h3>

              <div
                className="
                  flex
                  items-center
                  gap-1
                  mt-1
                "
              >
                <ShieldCheck
                  className="
                    w-3
                    h-3
                    text-[#74B4D9]
                    shrink-0
                  "
                />

                <span
                  className="
                    text-[12px]
                    font-semibold
                    text-[#74B4D9]
                    uppercase
                    tracking-wide
                    truncate
                  "
                >
                  {userRole}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* BODY */}
        <div
          className="
            p-5
            space-y-2.5
            overflow-y-auto
          "
        >

          {isLoading ? (
            <div className="py-6 text-center text-neutral-400 text-[13px]">
              Memuat data profil...
            </div>
          ) : (
            fields.map(
              ({
                icon: Icon,
                label,
                value,
              }) => (
                <div
                  key={label}
                  className="
                    flex
                    items-start
                    gap-3
                    bg-neutral-50
                    border
                    border-neutral-100
                    rounded-xl
                    px-3.5
                    py-2.5
                  "
                >

                  <Icon
                    className="
                      w-3.5
                      h-3.5
                      text-[#10367D]
                      mt-0.5
                      shrink-0
                    "
                  />

                  <div className="min-w-0">

                    <p
                      className="
                        text-[11px]
                        font-bold
                        text-neutral-400
                        uppercase
                        tracking-wide
                      "
                    >
                      {label}
                    </p>

                    <p
                      className="
                        text-[13px]
                        font-semibold
                        text-neutral-800
                        wrap-break-words
                      "
                    >
                      {value}
                    </p>

                  </div>
                </div>
              )
            )
          )}

          {/* ACTIONS */}
          <div
            className="
              pt-2
              flex
              items-center
              justify-end
              gap-2
            "
          >

            {/* CLOSE */}
            <button
              onClick={onClose}
              className="
                px-4
                py-2
                text-[13px]
                font-bold
                text-neutral-500
                hover:bg-neutral-100
                rounded-full
                cursor-pointer
                transition
              "
            >
              Tutup
            </button>

            {/* SETTINGS */}
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                }

                if (onSettingsClick) {
                  onSettingsClick();
                }
              }}
              className="
                px-4
                py-2
                text-[13px]
                font-bold
                text-white
                bg-[#10367D]
                hover:bg-[#0C2C66]
                rounded-full
                cursor-pointer
                shadow-sm
                transition
                flex
                items-center
                gap-1.5
              "
            >
              <Settings
                className="w-3.5 h-3.5"
              />

              Pengaturan Akun
            </button>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}