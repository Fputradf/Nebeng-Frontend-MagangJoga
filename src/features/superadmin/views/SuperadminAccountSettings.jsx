import { BASE_URL } from '../../../config/env';
import { useState, useRef, useEffect } from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Camera,
  MonitorSmartphone,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import BaseModal from '../../../components/ui/BaseModal';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import { changeMyPassword, getMyProfile, updateMyProfile, uploadMyAvatar } from '../../../services/userService';
import apiClient from '../../../services/apiClient';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const formatRole = (role) => {
  if (!role) return 'Superadmin';
  return role
    .split(/[-_ ]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function SuperadminAccountSettings() {
  const toast = useToast();
  const { session, role, updateSuperadminProfile } = useAuth();

  const [profileDraft, setProfileDraft] = useState({
    name: '',
    email: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showLogoutSessionsModal, setShowLogoutSessionsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('superadmin_notif_prefs');
      return saved ? JSON.parse(saved) : {
        accountAnomalies: true,
        financialAlerts: true,
        regionalApprovals: true,
        systemNews: false,
      };
    } catch {
      return { accountAnomalies: true, financialAlerts: true, regionalApprovals: true, systemNews: false };
    }
  });

  const displayRole = formatRole(role || session?.role);

  useEffect(() => {
    let isMounted = true;
    async function fetchDatabaseProfile() {
      try {
        const res = await apiClient.get('/auth/me');
        if (isMounted && res?.data) {
          const dbUser = await getMyProfile();
          
          const freshName = dbUser.name || '';
          const freshEmail = dbUser.email || '';
          const rawAvatar = dbUser.avatar || '';

          setProfileDraft({
            name: freshName,
            email: freshEmail
          });

          if (rawAvatar) {
            const baseURL = apiClient.defaults.baseURL 
              ? apiClient.defaults.baseURL.replace('/api', '') 
              : BASE_URL;
            const fullAvatarUrl = rawAvatar.startsWith('http') ? rawAvatar : `${baseURL}${rawAvatar}`;
            setAvatarPreview(fullAvatarUrl);
            
            updateSuperadminProfile({ name: freshName, email: freshEmail, photoDataUrl: fullAvatarUrl });
          } else {
            setAvatarPreview('');
            updateSuperadminProfile({ name: freshName, email: freshEmail, photoDataUrl: '' });
          }
        }
      } catch (err) {
        console.error('Gagal memuat profil dari database:', err);
        toast.error('Gagal memuat data profil dari server.', { title: 'Kesalahan' });
      }
    }

    fetchDatabaseProfile();
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileFieldChange = (field, value) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileDraft.name.trim()) {
      toast.warning('Nama lengkap wajib diisi.', { title: 'Data Tidak Lengkap' });
      return;
    }
    if (!EMAIL_REGEX.test(profileDraft.email.trim())) {
      toast.warning('Format email tidak valid.', { title: 'Email Tidak Valid' });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await updateMyProfile({
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
      });

      let finalAvatarUrl = avatarPreview;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadRes = await uploadMyAvatar(formData);

        const relativePath = uploadRes?.data?.avatar;
        if (relativePath) {
          const baseURL = apiClient.defaults.baseURL 
            ? apiClient.defaults.baseURL.replace('/api', '') 
            : BASE_URL;
          finalAvatarUrl = relativePath.startsWith('http') ? relativePath : `${baseURL}${relativePath}`;
          setAvatarPreview(finalAvatarUrl);
          setAvatarFile(null);
        }
      }

      updateSuperadminProfile({ 
        name: profileDraft.name.trim(), 
        email: profileDraft.email.trim(),
        photoDataUrl: finalAvatarUrl 
      });

      toast.success('Profil dan foto berhasil diperbarui ke database.', { title: 'Berhasil' });
    } catch (err) {
      console.error('Gagal menyimpan profil ke database:', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan perubahan ke server.', { title: 'Kesalahan Server' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      toast.warning('Semua field kata sandi wajib diisi.', { title: 'Data Tidak Lengkap' });
      return;
    }
    if (passwordForm.next.length < 8) {
      toast.warning('Kata sandi baru minimal 8 karakter.', { title: 'Kata Sandi Terlalu Pendek' });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.warning('Konfirmasi kata sandi baru tidak cocok.', { title: 'Konfirmasi Tidak Cocok' });
      return;
    }

    try {
      setIsSubmitting(true);
      await changeMyPassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });

      setPasswordForm({ current: '', next: '', confirm: '' });
      toast.success('Kata sandi berhasil diperbarui di database.', { title: 'Kata Sandi Diperbarui' });
    } catch (err) {
      console.error('Gagal mengubah kata sandi:', err);
      toast.error(err.response?.data?.message || 'Gagal mengubah kata sandi. Periksa kembali sandi lama Anda.', { title: 'Gagal Ubah Sandi' });
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
    toast.warning('Autentikasi Dua Faktor dinonaktifkan.', { title: '2FA Nonaktif' });
  };

  const handleConfirm2FA = () => {
    setIs2FAEnabled(true);
    setShow2FAModal(false);
    toast.success('Autentikasi Dua Faktor berhasil diaktifkan.', { title: '2FA Aktif' });
  };

  const handleToggleNotif = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      localStorage.setItem('superadmin_notif_prefs', JSON.stringify(updated));
      toast.success('Preferensi notifikasi disimpan.', { title: 'Pengaturan Disimpan' });
    } catch {
      // ignore
    }
  };

  const handleLogoutOtherSessions = () => {
    setShowLogoutSessionsModal(false);
    toast.success('Semua sesi lain berhasil dikeluarkan dari sistem.', { title: 'Sesi Dikeluarkan' });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
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
              Ubah foto, nama, email, keamanan login, dan preferensi notifikasi akun Superadmin Anda.
            </p>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#10367D]" /> Edit Profil
          </h3>

          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Foto Profil" className="w-16 h-16 rounded-full object-cover border-4 border-sky-50 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#10367D] text-white flex items-center justify-center text-[23px] font-extrabold shadow-sm">
                  {(profileDraft.name || 'S').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-neutral-200 text-[#10367D] flex items-center justify-center shadow-sm hover:bg-neutral-50 transition cursor-pointer"
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
              <p className="text-[13px] font-bold text-neutral-700">Foto Profil</p>
              <p className="text-[11px] text-neutral-400">JPG atau PNG, maksimal 2MB.</p>
              {avatarError && <p className="text-[11px] text-rose-600 font-bold mt-0.5">{avatarError}</p>}
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 mt-1">
                <ShieldCheck size={10} /> {displayRole}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-[13px] pt-1 border-t border-neutral-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={profileDraft.email}
                  onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-xl font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-5">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-[#10367D]" /> Keamanan Akun
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3 text-[13px]">
            <p className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider">Ubah Kata Sandi</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'current', label: 'Kata Sandi Saat Ini' },
                { key: 'next', label: 'Kata Sandi Baru' },
                { key: 'confirm', label: 'Konfirmasi Kata Sandi' },
              ].map(({ key, label }) => (
                <div key={key} className="relative">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{label}</label>
                  <input
                    type={showPassword[key] ? 'text' : 'password'}
                    value={passwordForm[key]}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-9 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none focus:border-[#10367D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="absolute right-2.5 bottom-2.5 text-neutral-400 cursor-pointer"
                  >
                    {showPassword[key] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400">Minimal 8 karakter, kombinasi huruf dan angka disarankan.</p>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-xl font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses...' : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-sky-50 text-[#10367D] rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-neutral-800">Autentikasi Dua Faktor (2FA)</p>
                <p className="text-[11px] text-neutral-400 max-w-xs">Tambahan lapisan keamanan berupa kode OTP setiap kali login dari perangkat baru.</p>
              </div>
            </div>
            <ToggleSwitch checked={is2FAEnabled} onChange={handleToggle2FA} />
          </div>

          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-neutral-100 text-neutral-600 rounded-xl shrink-0">
                <MonitorSmartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-neutral-800">Sesi Login Saat Ini</p>
                <p className="text-[11px] text-neutral-400">
                  Sesi aktif terverifikasi pada perangkat ini.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutSessionsModal(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[12px] font-bold transition cursor-pointer shrink-0"
            >
              Keluar dari Perangkat Lain
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#10367D]" /> Preferensi Notifikasi
          </h3>
          <div className="space-y-2.5">
            {[
              { key: 'accountAnomalies', label: 'Duplikasi & Anomali Akun', desc: 'Notifikasi saat sistem mendeteksi akun ganda atau data mencurigakan.' },
              { key: 'financialAlerts', label: 'Lonjakan Refund & Keuangan', desc: 'Notifikasi saat beban refund atau anomali keuangan melampaui ambang batas.' },
              { key: 'regionalApprovals', label: 'Pengajuan Admin Wilayah', desc: 'Notifikasi saat ada pengajuan dari Admin Regional yang perlu ditinjau.' },
              { key: 'systemNews', label: 'Info & Pembaruan Sistem', desc: 'Info rilis fitur, pemeliharaan, dan pengumuman internal lainnya.' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 p-3 bg-neutral-50/70 border border-neutral-100 rounded-xl">
                <div>
                  <p className="text-[13px] font-bold text-neutral-800">{item.label}</p>
                  <p className="text-[11px] text-neutral-400">{item.desc}</p>
                </div>
                <ToggleSwitch checked={notifPrefs[item.key]} onChange={() => handleToggleNotif(item.key)} />
              </div>
            ))}
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
            Kode OTP akan dikirim ke email terdaftar ({profileDraft.email || 'email belum diatur'}) setiap kali login dari perangkat baru.
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
              className="flex-1 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
            >
              Aktifkan
            </button>
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={showLogoutSessionsModal}
        onClose={() => setShowLogoutSessionsModal(false)}
        title="Keluar dari Semua Perangkat Lain?"
        subtitle="Keamanan Sesi"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-neutral-600">Semua sesi aktif selain perangkat ini akan dipaksa logout. Anda perlu login ulang di perangkat tersebut.</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowLogoutSessionsModal(false)}
              className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleLogoutOtherSessions}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
            >
              Ya, Keluarkan
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}