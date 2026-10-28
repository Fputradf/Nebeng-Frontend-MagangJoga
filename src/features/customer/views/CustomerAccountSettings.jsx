import { BASE_URL } from '../../../config/env';
import { useEffect, useRef, useState } from 'react';

import {
  Settings,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Pencil,
  Save,
  X,
  Phone,
  IdCard,
  Award,
  Ticket as TicketIcon,
  Camera,
  KeyRound,
  RotateCw,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import StatCard from '../../../components/ui/StatCard';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

const maskNik = (nik) => {
  if (!nik || nik === '-') return '-';
  if (nik.length <= 8) return 'x'.repeat(nik.length);
  return `${nik.slice(0, 4)}${'x'.repeat(nik.length - 8)}${nik.slice(-4)}`;
};

const getFullFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const baseURL = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;

  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function CustomerAccountSettings() {
  const { customerProfile, updateCustomerProfile } = useAuth();
  const toast = useToast();

  const [liveUser, setLiveUser] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showNik, setShowNik] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [draft, setDraft] = useState({
    fullName: '',
    phone: '',
    nik: '',
  });

  const [pinForm, setPinForm] = useState({
    pin: '',
    confirmPin: '',
  });

  const [showPin, setShowPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fileInputRef = useRef(null);

  const refreshAccountData = async () => {
    setIsRefreshing(true);
    try {
      const [resUser, resOrders] = await Promise.all([
        apiClient.get('/auth/me'),
        apiClient.get('/orders/me'),
      ]);

      if (resUser.data) {
        setLiveUser(resUser.data);
        const userNik =
          resUser.data.nik ||
          resUser.data.profile?.ktpNumber ||
          resUser.data.ktpNumber ||
          '';

        setDraft({
          fullName: resUser.data.name || '',
          phone: resUser.data.phone || '',
          nik: userNik,
        });

        if (resUser.data.avatar) {
          setAvatarPreview(getFullFileUrl(resUser.data.avatar));
        } else if (customerProfile?.photoDataUrl) {
          setAvatarPreview(customerProfile.photoDataUrl);
        }
      }

      if (resOrders.data) {
        const ordersData = Array.isArray(resOrders.data)
          ? resOrders.data
          : resOrders.data.data || [];
        setCustomerOrders(ordersData);
      }
      toast.success('Data akun dan status verifikasi berhasil diperbarui.', { title: 'Data Terkini' });
    } catch (err) {
      console.error('Gagal menyegarkan data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUserDataAndOrders = async () => {
      try {
        const resUser = await apiClient.get('/auth/me');
        const resOrders = await apiClient.get('/orders/me');

        if (isMounted) {
          if (resUser.data) {
            setLiveUser(resUser.data);
            const userNik =
              resUser.data.nik ||
              resUser.data.profile?.ktpNumber ||
              resUser.data.ktpNumber ||
              '';

            setDraft({
              fullName: resUser.data.name || '',
              phone: resUser.data.phone || '',
              nik: userNik,
            });

            if (resUser.data.avatar) {
              setAvatarPreview(getFullFileUrl(resUser.data.avatar));
            } else if (customerProfile?.photoDataUrl) {
              setAvatarPreview(customerProfile.photoDataUrl);
            }
          }

          if (resOrders.data) {
            const ordersData = Array.isArray(resOrders.data) 
              ? resOrders.data 
              : resOrders.data.data || [];
            setCustomerOrders(ordersData);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil data akun atau pesanan:', err);
      }
    };

    fetchUserDataAndOrders();

    return () => {
      isMounted = false;
    };
  }, [customerProfile?.photoDataUrl]);

  const isVerified = liveUser?.statusVerification === 'approved';
  const displayName = liveUser?.name || customerProfile?.fullName || 'Pelanggan Nebeng';
  const displayPhone = liveUser?.phone || customerProfile?.phone || '-';
  const displayNik = liveUser?.nik || liveUser?.profile?.ktpNumber || customerProfile?.nik || '-';
  const memberSince = liveUser?.createdAt
    ? new Date(liveUser.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const isPhoneValid = PHONE_REGEX.test(draft.phone.trim());
  const isNameValid = draft.fullName.trim().length > 0;
  const canSave = isPhoneValid && isNameValid;

  const completedTrips = customerOrders.filter(
    (order) => order.status === 'completed' || order.trip?.status === 'completed'
  ).length;

  const activeTrips = customerOrders.filter(
    (order) => 
      ['paid', 'checked_in_origin', 'in_transit', 'arrived_destination'].includes(order.status) ||
      ['scheduled', 'in_origin_pos', 'in_transit', 'arrived_dest_pos'].includes(order.trip?.status)
  ).length;

  const rewardPoints = liveUser?.rewardPoints ?? 0;

  const startEditing = () => {
    setDraft({
      fullName: displayName,
      phone: displayPhone,
      nik: displayNik !== '-' ? displayNik : '',
    });
    setIsEditing(true);
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
    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!canSave) return;

    try {
      let uploadedAvatarUrl = liveUser?.avatar;

      if (selectedAvatarFile) {
        const formDataObj = new FormData();
        formDataObj.append('file', selectedAvatarFile);
        formDataObj.append('destination', 'uploads/avatars');

        const uploadRes = await apiClient.post('/users/me/avatar', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        uploadedAvatarUrl = uploadRes.data.avatar || uploadRes.data.filePath;
      }

      await apiClient.patch('/users/me', {
        name: draft.fullName.trim(),
        phone: draft.phone.trim(),
      });

      const fullAvatarUrl = getFullFileUrl(uploadedAvatarUrl);

      updateCustomerProfile({
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
        photoDataUrl: fullAvatarUrl,
        nik: draft.nik,
      });

      setLiveUser((prev) =>
        prev ? { ...prev, name: draft.fullName.trim(), phone: draft.phone.trim(), avatar: uploadedAvatarUrl } : prev
      );

      setAvatarPreview(fullAvatarUrl);
      setIsEditing(false);
      setSelectedAvatarFile(null);

      toast.success('Profil dan foto berhasil diperbarui.', { title: 'Tersimpan' });
    } catch (error) {
      console.error('Gagal menyimpan profil:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan perubahan ke server.', { title: 'Error' });
    }
  };

  const handleSavePin = async (e) => {
    e.preventDefault();

    if (pinForm.pin.length !== 6 || !/^\d+$/.test(pinForm.pin)) {
      toast.warning('PIN keamanan harus tepat 6 digit angka.', { title: 'PIN Tidak Valid' });
      return;
    }

    if (pinForm.pin !== pinForm.confirmPin) {
      toast.warning('Konfirmasi PIN baru tidak cocok.', { title: 'PIN Tidak Cocok' });
      return;
    }

    setIsSubmittingPin(true);

    try {
      await apiClient.post('/users/me/pin', { pin: pinForm.pin });
      setPinForm({ pin: '', confirmPin: '' });
      toast.success('PIN transaksi berhasil diperbarui.', { title: 'PIN Disimpan' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui PIN.', { title: 'Error' });
    } finally {
      setIsSubmittingPin(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> AKUN & IDENTITAS
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pengaturan Akun
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola data diri, PIN keamanan transaksi, dan lihat status verifikasi akun Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Status Verifikasi Pill */}
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-accent text-brand-900 flex items-center justify-center font-black shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-brand-900" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider block">
                  Status Akun
                </span>
                <span className="text-xs font-bold text-white">
                  {isVerified ? 'Terverifikasi' : 'Terdaftar'}
                </span>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refreshAccountData}
              disabled={isRefreshing}
              className="p-3 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl backdrop-blur text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              title="Segarkan data akun"
            >
              <RotateCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="POIN REWARD"
          value={`${rewardPoints} Poin`}
          subtitle="Kumpulkan dari setiap trip"
          icon={Award}
        />

        <StatCard
          title="TRIP SELESAI"
          value={String(completedTrips)}
          subtitle="Perjalanan berhasil"
          icon={TicketIcon}
        />

        <StatCard
          title="TRIP AKTIF"
          value={String(activeTrips)}
          subtitle="Sedang berlangsung"
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Foto Profil"
                    className="w-12 h-12 rounded-2xl object-cover border-2 shadow-sm"
                    style={{ borderColor: `${PRIMARY_ACCENT}55` }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${PRIMARY_ACCENT}22`, color: PRIMARY_COLOR }}
                  >
                    {displayName.trim() ? (
                      <span className="text-[19px] font-extrabold">
                        {displayName.trim().charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm hover:bg-neutral-50 transition cursor-pointer"
                  style={{ color: PRIMARY_COLOR }}
                  title="Ubah Foto Profil"
                >
                  <Camera className="w-2.5 h-2.5" />
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
                <h2 className="text-[17px] font-bold text-neutral-800">{displayName}</h2>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                    isVerified ? 'text-emerald-600' : 'text-neutral-400'
                  }`}
                >
                  <ShieldCheck size={11} className={isVerified ? 'text-emerald-600' : 'text-[#74B4D9]'} />
                  {isVerified ? 'Akun Terverifikasi' : 'Belum Terverifikasi'}
                </span>

                {avatarError && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">{avatarError}</p>
                )}
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={startEditing}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-[12px] font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profil</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-[12px] font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition flex items-center gap-1.5 ${
                    canSave ? 'text-white cursor-pointer shadow-sm' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                  style={canSave ? { backgroundColor: PRIMARY_COLOR } : undefined}
                  onMouseEnter={(e) => {
                    if (canSave) e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    if (canSave) e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-100 pt-4 space-y-3.5 text-[13px]">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Nama Lengkap
              </label>

              {isEditing ? (
                <input
                  type="text"
                  value={draft.fullName}
                  onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none"
                  onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY_COLOR)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              ) : (
                <p className="px-3.5 py-2.5 bg-neutral-50 rounded-xl font-bold text-neutral-800 border border-transparent">
                  {displayName}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Nomor Induk Kependudukan (NIK)
                </label>

                <button
                  type="button"
                  onClick={() => setShowNik(!showNik)}
                  className="text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  style={{ color: PRIMARY_COLOR }}
                >
                  {showNik ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{showNik ? 'Sembunyikan' : 'Tampilkan'}</span>
                </button>
              </div>

              <p className="px-3.5 py-2.5 bg-neutral-50 rounded-xl font-mono font-bold text-neutral-800 flex items-center gap-2">
                <IdCard className="w-3.5 h-3.5 text-neutral-400" />
                {showNik ? displayNik : maskNik(displayNik)}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Nomor WhatsApp/HP
              </label>

              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/[^\d+]/g, '') })}
                    className={`w-full px-3.5 py-2.5 bg-neutral-50 border rounded-xl font-bold text-neutral-800 focus:outline-none ${
                      draft.phone.trim() && !isPhoneValid ? 'border-rose-300 focus:border-rose-400' : 'border-neutral-200'
                    }`}
                    onFocus={(e) => {
                      if (!(draft.phone.trim() && !isPhoneValid)) e.currentTarget.style.borderColor = PRIMARY_COLOR;
                    }}
                    onBlur={(e) => {
                      if (!(draft.phone.trim() && !isPhoneValid)) e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  />
                  {draft.phone.trim() && !isPhoneValid && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">Format nomor tidak valid. Contoh: 081234567890</p>
                  )}
                </>
              ) : (
                <p className="px-3.5 py-2.5 bg-neutral-50 rounded-xl font-bold text-neutral-800 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {displayPhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Anggota Sejak
              </label>
              <p className="px-3.5 py-2.5 bg-neutral-50 rounded-xl font-bold text-neutral-600">
                {memberSince}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl shrink-0"
              style={{ backgroundColor: `${PRIMARY_ACCENT}22`, color: PRIMARY_COLOR }}
            >
              <KeyRound className="w-4 h-4" />
            </div>

            <div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                PIN Keamanan Transaksi
              </h2>
              <p className="text-[13px] text-neutral-400">
                Digunakan untuk otorisasi pembayaran dan pencairan dana Escrow.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePin} className="space-y-3.5 text-[13px] border-t border-neutral-100 pt-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                PIN Baru (6 Digit Angka)
              </label>

              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={pinForm.pin}
                  onChange={(e) =>
                    setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })
                  }
                  className="w-full px-3.5 py-2.5 pr-9 bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold text-neutral-800 focus:outline-none"
                  onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY_COLOR)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-neutral-400 cursor-pointer"
                >
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Konfirmasi PIN Baru
              </label>

              <input
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                inputMode="numeric"
                placeholder="••••••"
                value={pinForm.confirmPin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) })
                }
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold text-neutral-800 focus:outline-none"
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY_COLOR)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>

            <p className="text-[11px] text-neutral-400">
              Pastikan Anda mengingat PIN ini karena diperlukan setiap kali melakukan pemesanan trip atau konfirmasi transaksi.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={pinForm.pin.length !== 6 || pinForm.pin !== pinForm.confirmPin || isSubmittingPin}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition shadow-sm ${
                  pinForm.pin.length === 6 && pinForm.pin === pinForm.confirmPin && !isSubmittingPin
                    ? 'text-white cursor-pointer'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
                style={
                  pinForm.pin.length === 6 && pinForm.pin === pinForm.confirmPin && !isSubmittingPin
                    ? { backgroundColor: PRIMARY_COLOR }
                    : undefined
                }
                onMouseEnter={(e) => {
                  if (pinForm.pin.length === 6 && pinForm.pin === pinForm.confirmPin && !isSubmittingPin) {
                    e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
                  }
                }}
                onMouseLeave={(e) => {
                  if (pinForm.pin.length === 6 && pinForm.pin === pinForm.confirmPin && !isSubmittingPin) {
                    e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
                  }
                }}
              >
                {isSubmittingPin ? 'Menyimpan PIN...' : 'Simpan PIN Transaksi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

