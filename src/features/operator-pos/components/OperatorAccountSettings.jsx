import { BASE_URL } from '../../../config/env';
import { useState, useRef, useEffect } from 'react';
import {
  Settings,
  User,
  KeyRound,
  Bell,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import BaseModal from '../../../components/ui/BaseModal';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

const DEFAULT_NOTIF_PREFS = {
  emailNotif: true,
  pushNotif: true,
};

const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

export default function OperatorAccountSettings() {
  const toast = useToast();
  const { adminProfile, updateAdminProfile } = useAuth();

  const [profileDraft, setProfileDraft] = useState({
    fullName: adminProfile?.fullName || adminProfile?.name || '',
    email: adminProfile?.email || '',
    phone: adminProfile?.phone || '',
  });

  const [avatarPreview, setAvatarPreview] = useState(
    adminProfile?.photoDataUrl || ''
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    ...DEFAULT_NOTIF_PREFS,
    ...adminProfile?.notifPrefs,
  });

  const [is2FAEnabled, setIs2FAEnabled] = useState(
    Boolean(adminProfile?.is2FAEnabled)
  );

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchOperatorProfile() {
      try {
        const res = await apiClient.get('/auth/me');

        if (isMounted && res?.data) {
          const dbUser = res.data;

          const freshName = dbUser.name || dbUser.fullName || '';
          const freshEmail = dbUser.email || '';
          const freshPhone = dbUser.phone || '';
          const rawAvatar =
            dbUser.avatar || dbUser.photoDataUrl || '';

          setProfileDraft({
            fullName: freshName,
            email: freshEmail,
            phone: freshPhone,
          });

          if (rawAvatar) {
            const baseURL = apiClient.defaults.baseURL
              ? apiClient.defaults.baseURL.replace('/api', '')
              : BASE_URL;

            const fullAvatarUrl =
              rawAvatar.startsWith('http') ||
              rawAvatar.startsWith('data:')
                ? rawAvatar
                : `${baseURL}${rawAvatar}`;

            setAvatarPreview(fullAvatarUrl);

            if (updateAdminProfile) {
              updateAdminProfile({
                fullName: freshName,
                name: freshName,
                email: freshEmail,
                phone: freshPhone,
                photoDataUrl: fullAvatarUrl,
              });
            }
          }
        }
      } catch (err) {
        console.error(
          'Gagal mengambil profil operator dari database:',
          err
        );
      }
    }

    fetchOperatorProfile();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileFieldChange = (field, value) => {
    setProfileDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileDraft.fullName.trim()) {
      toast.warning('Nama lengkap wajib diisi.', {
        title: 'Data Tidak Lengkap',
      });
      return;
    }

    if (
      profileDraft.phone.trim() !== '' &&
      !PHONE_REGEX.test(profileDraft.phone.trim())
    ) {
      toast.warning('Format nomor telepon tidak valid.', {
        title: 'Nomor Tidak Valid',
      });
      return;
    }

    if (
      profileDraft.email.trim() !== '' &&
      !EMAIL_REGEX.test(profileDraft.email.trim())
    ) {
      toast.warning('Format email tidak valid.', {
        title: 'Email Tidak Valid',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await apiClient
        .patch('/users/me', {
          name: profileDraft.fullName.trim(),
          email: profileDraft.email.trim(),
          phone: profileDraft.phone.trim(),
        })
        .catch(() => {
          return apiClient.patch('/auth/profile', {
            name: profileDraft.fullName.trim(),
            email: profileDraft.email.trim(),
            phone: profileDraft.phone.trim(),
          });
        });

      let finalAvatarUrl = avatarPreview;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadRes = await apiClient.post(
          '/users/me/avatar',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        const relativePath = uploadRes?.data?.avatar;

        if (relativePath) {
          const baseURL = apiClient.defaults.baseURL
            ? apiClient.defaults.baseURL.replace('/api', '')
            : BASE_URL;

          finalAvatarUrl = relativePath.startsWith('http')
            ? relativePath
            : `${baseURL}${relativePath}`;

          setAvatarPreview(finalAvatarUrl);
          setAvatarFile(null);
        }
      }

      if (updateAdminProfile) {
        updateAdminProfile({
          fullName: profileDraft.fullName.trim(),
          name: profileDraft.fullName.trim(),
          email: profileDraft.email.trim(),
          phone: profileDraft.phone.trim(),
          photoDataUrl: finalAvatarUrl,
        });
      }

      toast.success(
        'Profil berhasil diperbarui ke database.',
        {
          title: 'Profil Diperbarui',
        }
      );
    } catch (error) {
      console.error(
        'Gagal menyimpan profil operator:',
        error
      );

      toast.error(
        error.response?.data?.message ||
          'Gagal menyimpan perubahan ke server.',
        {
          title: 'Error',
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];

    if (!file) return;

    if (
      !['image/jpeg', 'image/jpg', 'image/png'].includes(
        file.type
      )
    ) {
      setAvatarError('Format foto harus JPG atau PNG.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setAvatarError('Ukuran foto maksimal 2MB.');
      e.target.value = '';
      return;
    }

    setAvatarError('');
    setAvatarFile(file);

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (
      !passwordForm.current ||
      !passwordForm.next ||
      !passwordForm.confirm
    ) {
      toast.warning(
        'Semua field kata sandi wajib diisi.',
        {
          title: 'Data Tidak Lengkap',
        }
      );
      return;
    }

    if (passwordForm.next.length < 8) {
      toast.warning(
        'Kata sandi baru minimal 8 karakter.',
        {
          title: 'Kata Sandi Terlalu Pendek',
        }
      );
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      toast.warning(
        'Konfirmasi kata sandi baru tidak cocok.',
        {
          title: 'Konfirmasi Tidak Cocok',
        }
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await apiClient.patch('/auth/change-password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });

      setPasswordForm({
        current: '',
        next: '',
        confirm: '',
      });

      toast.success(
        'Kata sandi berhasil diperbarui di database.',
        {
          title: 'Kata Sandi Diperbarui',
        }
      );
    } catch (error) {
      console.error('Gagal mengubah password:', error);

      toast.error(
        error.response?.data?.message ||
          'Gagal mengubah kata sandi.',
        {
          title: 'Error',
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle2FA = (nextValue) => {
    if (nextValue) {
      setShow2FAModal(true);
      return;
    }

    setIs2FAEnabled(false);

    if (updateAdminProfile) {
      updateAdminProfile({
        is2FAEnabled: false,
      });
    }

    toast.warning(
      'Autentikasi Dua Faktor dinonaktifkan.',
      {
        title: '2FA Nonaktif',
      }
    );
  };

  const handleConfirm2FA = () => {
    setIs2FAEnabled(true);

    if (updateAdminProfile) {
      updateAdminProfile({
        is2FAEnabled: true,
      });
    }

    setShow2FAModal(false);

    toast.success(
      'Autentikasi Dua Faktor berhasil diaktifkan.',
      {
        title: '2FA Aktif',
      }
    );
  };

  const handleToggleNotif = (key) => {
    setNotifPrefs((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      if (updateAdminProfile) {
        updateAdminProfile({
          notifPrefs: next,
        });
      }

      return next;
    });
  };

  const handleDeactivateAccount = () => {
    setShowDeactivateModal(false);

    toast.error(
      'Permintaan nonaktifasi akun telah dikirim ke Admin Regional.',
      {
        title: 'Permintaan Terkirim',
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> AKUN & KEAMANAN
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pengaturan Akun
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Ubah data profil, foto profil, keamanan login, dan preferensi notifikasi akun operator Anda.
            </p>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <User
              className="w-4 h-4"
              style={{ color: PRIMARY_COLOR }}
            />
            Edit Profil
          </h3>

          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Foto Profil"
                  className="w-16 h-16 rounded-full object-cover border-4 border-[#74B4D9]/20 shadow-sm"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full text-white flex items-center justify-center text-[23px] font-extrabold shadow-sm"
                  style={{
                    backgroundColor: PRIMARY_COLOR,
                  }}
                >
                  {(profileDraft.fullName || 'O')
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm hover:bg-neutral-50 transition cursor-pointer"
                style={{
                  color: PRIMARY_COLOR,
                }}
                title="Ubah Foto Profil"
              >
                <Camera className="w-3 h-3" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              <p className="text-[13px] font-bold text-neutral-700">
                Foto Profil
              </p>

              <p className="text-[11px] text-neutral-400">
                JPG atau PNG, maksimal 2MB.
              </p>

              {avatarError && (
                <p className="text-[11px] text-rose-600 font-bold mt-0.5">
                  {avatarError}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSaveProfile}
            className="space-y-3.5 text-[13px] pt-1 border-t border-neutral-100"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>

                <input
                  type="text"
                  value={profileDraft.fullName}
                  onChange={(e) =>
                    handleProfileFieldChange(
                      'fullName',
                      e.target.value
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Nomor Telepon
                </label>

                <input
                  type="text"
                  placeholder="0812xxxxxxxx"
                  value={profileDraft.phone}
                  onChange={(e) =>
                    handleProfileFieldChange(
                      'phone',
                      e.target.value.replace(
                        /[^\d+]/g,
                        ''
                      )
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 font-mono focus:outline-none focus:border-[#10367D]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Email
                </label>

                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={profileDraft.email}
                  onChange={(e) =>
                    handleProfileFieldChange(
                      'email',
                      e.target.value
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 text-white rounded-xl font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: PRIMARY_COLOR,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor =
                      PRIMARY_HOVER;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    PRIMARY_COLOR;
                }}
              >
                {isSubmitting
                  ? 'Menyimpan...'
                  : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-5">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <KeyRound
              className="w-4 h-4"
              style={{ color: PRIMARY_COLOR }}
            />
            Keamanan Akun
          </h3>

          <form
            onSubmit={handleChangePassword}
            className="space-y-3 text-[13px]"
          >
            <p className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
              Ubah Kata Sandi
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Kata Sandi Saat Ini
                </label>

                <input
                  type={
                    showPassword.current
                      ? 'text'
                      : 'password'
                  }
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      current: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 pr-9 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({
                      ...prev,
                      current: !prev.current,
                    }))
                  }
                  className="absolute right-2.5 bottom-2.5 text-neutral-400 cursor-pointer"
                >
                  {showPassword.current ? (
                    <EyeOff size={13} />
                  ) : (
                    <Eye size={13} />
                  )}
                </button>
              </div>

              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Kata Sandi Baru
                </label>

                <input
                  type={
                    showPassword.next
                      ? 'text'
                      : 'password'
                  }
                  value={passwordForm.next}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      next: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 pr-9 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({
                      ...prev,
                      next: !prev.next,
                    }))
                  }
                  className="absolute right-2.5 bottom-2.5 text-neutral-400 cursor-pointer"
                >
                  {showPassword.next ? (
                    <EyeOff size={13} />
                  ) : (
                    <Eye size={13} />
                  )}
                </button>
              </div>

              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Konfirmasi Kata Sandi
                </label>

                <input
                  type={
                    showPassword.confirm
                      ? 'text'
                      : 'password'
                  }
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirm: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 pr-9 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                  className="absolute right-2.5 bottom-2.5 text-neutral-400 cursor-pointer"
                >
                  {showPassword.confirm ? (
                    <EyeOff size={13} />
                  ) : (
                    <Eye size={13} />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              Minimal 8 karakter, kombinasi huruf dan angka
              disarankan.
            </p>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white rounded-xl font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: PRIMARY_COLOR,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor =
                      PRIMARY_HOVER;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    PRIMARY_COLOR;
                }}
              >
                {isSubmitting
                  ? 'Memproses...'
                  : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="p-2 rounded-xl shrink-0"
                style={{
                  backgroundColor: `${PRIMARY_ACCENT}1A`,
                  color: PRIMARY_COLOR,
                }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[13px] font-bold text-neutral-800">
                  Autentikasi Dua Faktor (2FA)
                </p>

                <p className="text-[11px] text-neutral-400 max-w-xs">
                  Tambahan lapisan keamanan berupa kode OTP
                  setiap kali login dari perangkat baru.
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={is2FAEnabled}
              onChange={handleToggle2FA}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <Bell
              className="w-4 h-4"
              style={{ color: PRIMARY_COLOR }}
            />
            Preferensi Notifikasi
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 p-3 bg-neutral-50/70 border border-neutral-100 rounded-xl">
              <div>
                <p className="text-[13px] font-bold text-neutral-800">
                  Notifikasi Email
                </p>

                <p className="text-[11px] text-neutral-400">
                  Terima ringkasan aktivitas lewat email.
                </p>
              </div>

              <ToggleSwitch
                checked={notifPrefs.emailNotif}
                onChange={() =>
                  handleToggleNotif('emailNotif')
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-neutral-50/70 border border-neutral-100 rounded-xl">
              <div>
                <p className="text-[13px] font-bold text-neutral-800">
                  Notifikasi Push
                </p>

                <p className="text-[11px] text-neutral-400">
                  Notifikasi langsung di perangkat saat ada
                  aktivitas baru.
                </p>
              </div>

              <ToggleSwitch
                checked={notifPrefs.pushNotif}
                onChange={() =>
                  handleToggleNotif('pushNotif')
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-5 sm:p-6 space-y-3">
          <h3 className="text-[17px] font-bold text-rose-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Zona Berbahaya
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl">
            <div>
              <p className="text-[13px] font-bold text-neutral-800">
                Nonaktifkan Akun Operator
              </p>

              <p className="text-[11px] text-neutral-400 max-w-md">
                Akun Anda akan disembunyikan dari sistem
                operasional pos sampai diaktifkan kembali oleh
                Admin Regional.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowDeactivateModal(true)
              }
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[12px] font-bold transition shadow-sm cursor-pointer shrink-0"
            >
              Ajukan Nonaktifasi
            </button>
          </div>
        </div>
      </div>

      <BaseModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        title="Aktifkan Autentikasi Dua Faktor"
        subtitle="Keamanan Tambahan Akun"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-neutral-600">
            Kode OTP akan dikirim ke nomor telepon terdaftar
            Anda saat login dari perangkat baru.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShow2FAModal(false)}
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition cursor-pointer"
            >
              Batal
            </button>

            <button
              onClick={handleConfirm2FA}
              className="flex-1 py-2.5 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
              style={{
                backgroundColor: PRIMARY_COLOR,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  PRIMARY_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  PRIMARY_COLOR;
              }}
            >
              Aktifkan
            </button>
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Ajukan Nonaktifasi Akun?"
        subtitle="Tindakan Ini Memerlukan Persetujuan Admin"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-neutral-600">
            Pengajuan nonaktifasi akun akan dikirim dan ditinjau
            oleh Admin Regional.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() =>
                setShowDeactivateModal(false)
              }
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition cursor-pointer"
            >
              Batal
            </button>

            <button
              onClick={handleDeactivateAccount}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
            >
              Ya, Ajukan
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}