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
  ShieldAlert,
  CheckCircle2,
  MonitorSmartphone,
  Camera,
  Car,
  Bike,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import BaseModal from '../../../components/ui/BaseModal';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import apiClient from '../../../services/apiClient';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

const getFullFileUrl = (path) => {
  if (!path) return null;

  if (path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseURL = apiClient.defaults.baseURL
    ? apiClient.defaults.baseURL.replace('/api', '')
    : BASE_URL;

  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function MitraAccountSettings() {
  const toast = useToast();
  const { sessionPersisted, updateMitraProfile } = useAuth();

  const [liveUser, setLiveUser] = useState(null);

  const [profileDraft, setProfileDraft] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    vehicleType: 'motor',
    plateNumber: '',
    vehicleModel: '',
    vehicleColor: '',
  });

  const [existingVehicle, setExistingVehicle] = useState(null);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    type: 'motor',
    model: '',
    plateNumber: '',
    color: '',
    capacitySeats: 1,
    maxWeightCapacityKg: 15,
  });

  // Fase 10: Riwayat Sanksi & Banding
  const [sanctionSummary, setSanctionSummary] = useState({ currentScore: 100, baseScore: 100, isSuspended: false, suspendedUntil: null, sanctions: [] });
  const [appealModalTarget, setAppealModalTarget] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidenceUrl, setAppealEvidenceUrl] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
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
    tripUpdates: true,
    walletActivity: true,
    customerChat: true,
    promoNews: false,
  });

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showLogoutSessionsModal, setShowLogoutSessionsModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        const [res, resSanctions] = await Promise.all([
          apiClient.get('/auth/me').catch(() => ({ data: null })),
          apiClient.get('/users/me/sanctions').catch(() => ({ data: null })),
        ]);

        if (isMounted && resSanctions?.data) {
          setSanctionSummary(resSanctions.data);
        }

        if (isMounted && res?.data) {
          setLiveUser(res.data);

          setProfileDraft((prev) => ({
            ...prev,
            fullName: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            address: res.data.profile?.addressKtp || '',
          }));

          if (res.data.avatar) {
            setAvatarPreview(getFullFileUrl(res.data.avatar));
          }
        }
      } catch (err) {
        console.error('Gagal mengambil data akun mitra live:', err);
      }
    };

    const fetchVehicleData = async () => {
      try {
        const res = await apiClient.get('/vehicles/me');
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        if (isMounted) {
          setVehiclesList(list);

          if (list.length > 0) {
            const v = list[0];
            setExistingVehicle(v);

            setProfileDraft((prev) => ({
              ...prev,
              vehicleType: v.type || 'motor',
              plateNumber: v.plateNumber || '',
              vehicleModel: v.model || '',
              vehicleColor: v.color || '',
            }));
          }
        }
      } catch (err) {
        console.error('Gagal mengambil data kendaraan mitra:', err);
      }
    };

    fetchUserData();
    fetchVehicleData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAddVehicle = () => {
    setEditingVehicleId(null);
    setNewVehicleForm({
      type: 'motor',
      model: '',
      plateNumber: '',
      color: '',
      capacitySeats: 1,
      maxWeightCapacityKg: 15,
    });
    setShowAddVehicleModal(true);
  };

  const handleOpenEditVehicle = (veh) => {
    setEditingVehicleId(veh.id);
    const isMotor = (veh.type || '').toLowerCase() === 'motor';
    setNewVehicleForm({
      type: isMotor ? 'motor' : 'mobil',
      model: veh.model || '',
      plateNumber: veh.plateNumber || '',
      color: veh.color || '',
      capacitySeats: veh.capacitySeats || (isMotor ? 1 : 4),
      maxWeightCapacityKg: veh.maxWeightCapacityKg || (isMotor ? 15 : 50),
    });
    setShowAddVehicleModal(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicleForm.model.trim() || !newVehicleForm.plateNumber.trim() || !newVehicleForm.color.trim()) {
      toast.warning('Model, plat nomor, dan warna kendaraan wajib diisi.', { title: 'Data Belum Lengkap' });
      return;
    }

    setIsSubmittingVehicle(true);
    try {
      const payload = {
        type: newVehicleForm.type,
        model: newVehicleForm.model.trim(),
        plateNumber: newVehicleForm.plateNumber.trim().toUpperCase(),
        color: newVehicleForm.color.trim(),
        capacitySeats: Number(newVehicleForm.capacitySeats) || (newVehicleForm.type === 'mobil' ? 4 : 1),
        maxWeightCapacityKg: Number(newVehicleForm.maxWeightCapacityKg) || (newVehicleForm.type === 'mobil' ? 50 : 15),
      };

      if (editingVehicleId) {
        await apiClient.patch(`/vehicles/${editingVehicleId}`, payload);
        toast.success('Data kendaraan berhasil diperbarui!', { title: 'Sukses' });
      } else {
        await apiClient.post('/vehicles', payload);
        toast.success('Kendaraan baru berhasil didaftarkan!', { title: 'Sukses' });
      }

      setShowAddVehicleModal(false);
      setEditingVehicleId(null);
      setNewVehicleForm({
        type: 'motor',
        model: '',
        plateNumber: '',
        color: '',
        capacitySeats: 1,
        maxWeightCapacityKg: 15,
      });

      // Refresh list kendaraan
      const freshRes = await apiClient.get('/vehicles/me');
      const updatedList = Array.isArray(freshRes.data) ? freshRes.data : (Array.isArray(freshRes.data?.data) ? freshRes.data.data : []);
      setVehiclesList(updatedList);
      if (updatedList.length > 0) {
        setExistingVehicle(updatedList[0]);
      }
      if (updatedList.length > 0) {
        setExistingVehicle(updatedList[0]);
      }
    } catch (err) {
      console.error('Gagal menyimpan kendaraan:', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan kendaraan.', { title: 'Gagal' });
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kendaraan ini?')) return;
    try {
      await apiClient.delete(`/vehicles/${vehicleId}`);
      toast.success('Kendaraan berhasil dihapus.', { title: 'Sukses' });
      const freshRes = await apiClient.get('/vehicles/me');
      const updatedList = Array.isArray(freshRes.data) ? freshRes.data : (freshRes.data?.data || []);
      setVehiclesList(updatedList);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kendaraan. Pastikan kendaraan tidak sedang terikat perjalanan aktif.', { title: 'Gagal' });
    }
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileDraft.fullName.trim() || !profileDraft.phone.trim()) {
      toast.warning('Nama lengkap dan nomor telepon wajib diisi.', {
        title: 'Data Tidak Lengkap',
      });
      return;
    }

    if (!PHONE_REGEX.test(profileDraft.phone.trim())) {
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

    if (
      !profileDraft.vehicleModel.trim() ||
      !profileDraft.vehicleColor.trim()
    ) {
      toast.warning('Model dan warna kendaraan wajib diisi.', {
        title: 'Data Kendaraan Tidak Lengkap',
      });
      return;
    }

    if (!profileDraft.plateNumber.trim()) {
      toast.warning('Nomor plat kendaraan wajib diisi.', {
        title: 'Data Kendaraan Tidak Lengkap',
      });
      return;
    }

    try {
      let uploadedAvatarUrl = liveUser?.avatar;

      if (selectedAvatarFile) {
        const formDataObj = new FormData();

        formDataObj.append('file', selectedAvatarFile);
        formDataObj.append('destination', 'uploads/avatars');

        const uploadRes = await apiClient.post(
          '/users/me/avatar',
          formDataObj,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        uploadedAvatarUrl =
          uploadRes.data.avatar || uploadRes.data.filePath;
      }

      await apiClient.patch('/users/me', {
        name: profileDraft.fullName.trim(),
        phone: profileDraft.phone.trim(),
        email: profileDraft.email.trim(),
      });

      await apiClient.patch('/users/me/profile', {
        addressKtp: profileDraft.address.trim(),
      });

      const vehiclePayload = {
        type: profileDraft.vehicleType,
        model: profileDraft.vehicleModel.trim(),
        plateNumber: profileDraft.plateNumber.trim(),
        color: profileDraft.vehicleColor.trim(),

        capacitySeats:
          existingVehicle?.capacitySeats ??
          (profileDraft.vehicleType === 'mobil' ? 4 : 1),

        maxWeightCapacityKg:
          existingVehicle?.maxWeightCapacityKg ??
          (profileDraft.vehicleType === 'mobil' ? 50 : 15),
      };

      let savedVehicle;

      if (existingVehicle?.id) {
        const vehicleRes = await apiClient.patch(
          `/vehicles/${existingVehicle.id}`,
          vehiclePayload
        );

        savedVehicle = vehicleRes.data;
      } else {
        const vehicleRes = await apiClient.post(
          '/vehicles',
          vehiclePayload
        );

        savedVehicle = vehicleRes.data;
      }

      setExistingVehicle(savedVehicle);

      const fullAvatarUrl = getFullFileUrl(uploadedAvatarUrl);

      setLiveUser((prev) =>
        prev
          ? {
              ...prev,
              name: profileDraft.fullName.trim(),
              phone: profileDraft.phone.trim(),
              email: profileDraft.email.trim(),
              avatar: uploadedAvatarUrl,
              profile: {
                ...prev.profile,
                addressKtp: profileDraft.address.trim(),
              },
            }
          : prev
      );

      setAvatarPreview(fullAvatarUrl);
      setSelectedAvatarFile(null);

      updateMitraProfile({
        fullName: profileDraft.fullName.trim(),
        email: profileDraft.email.trim(),
        phone: profileDraft.phone.trim(),
        address: profileDraft.address.trim(),
        vehicleType: profileDraft.vehicleType,
        plateNumber: profileDraft.plateNumber.trim(),
        photoDataUrl: fullAvatarUrl,
      });

      toast.success('Profil berhasil diperbarui.', {
        title: 'Profil Diperbarui',
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Gagal memperbarui profil.',
        {
          title: 'Error',
        }
      );
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];

    if (!file) return;

    if (
      !['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
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
    setSelectedAvatarFile(file);

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleOpenAppeal = (sanction) => {
    setAppealModalTarget(sanction);
    setAppealReason('');
    setAppealEvidenceUrl('');
  };

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealModalTarget || !appealReason.trim()) {
      toast.warning('Alasan banding wajib diisi.', { title: 'Peringatan' });
      return;
    }

    setIsSubmittingAppeal(true);
    try {
      const res = await apiClient.post('/users/me/sanctions/' + appealModalTarget.id + '/appeal', {
        reason: appealReason.trim(),
        ...(appealEvidenceUrl.trim() ? { evidenceUrl: appealEvidenceUrl.trim() } : {})
      });
      toast.success(res.data?.message || 'Banding berhasil diajukan.', { title: 'Sukses' });
      setAppealModalTarget(null);

      // Refresh sanctions
      const freshSanctions = await apiClient.get('/users/me/sanctions').catch(() => ({ data: null }));
      if (freshSanctions?.data) {
        setSanctionSummary(freshSanctions.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengajukan banding.', { title: 'Gagal' });
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (
      !passwordForm.current ||
      !passwordForm.next ||
      !passwordForm.confirm
    ) {
      toast.warning('Semua field kata sandi wajib diisi.', {
        title: 'Data Tidak Lengkap',
      });
      return;
    }

    if (passwordForm.next.length < 8) {
      toast.warning('Kata sandi baru minimal 8 karakter.', {
        title: 'Kata Sandi Terlalu Pendek',
      });
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      toast.warning('Konfirmasi kata sandi baru tidak cocok.', {
        title: 'Konfirmasi Tidak Cocok',
      });
      return;
    }

    try {
      await apiClient.patch('/users/me', {
        currentPassword: passwordForm.current,
        password: passwordForm.next,
      });

      setPasswordForm({
        current: '',
        next: '',
        confirm: '',
      });

      toast.success('Kata sandi berhasil diperbarui.', {
        title: 'Kata Sandi Diperbarui',
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Gagal memperbarui kata sandi.',
        {
          title: 'Error',
        }
      );
    }
  };

  const handleToggle2FA = (nextValue) => {
    if (nextValue) {
      setShow2FAModal(true);
      return;
    }

    setIs2FAEnabled(false);

    toast.warning(
      'Autentikasi Dua Faktor dinonaktifkan.',
      {
        title: '2FA Nonaktif',
      }
    );
  };

  const handleConfirm2FA = () => {
    setIs2FAEnabled(true);
    setShow2FAModal(false);

    toast.success(
      'Autentikasi Dua Faktor berhasil diaktifkan.',
      {
        title: '2FA Aktif',
      }
    );
  };

  const handleToggleNotif = (key) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogoutOtherSessions = () => {
    setShowLogoutSessionsModal(false);

    toast.success(
      'Semua sesi lain berhasil dikeluarkan dari akun Anda.',
      {
        title: 'Sesi Dikeluarkan',
      }
    );
  };

  const handleDeactivateAccount = () => {
    setShowDeactivateModal(false);

    toast.error(
      'Permintaan nonaktifasi akun telah dikirim ke tim Admin.',
      {
        title: 'Permintaan Terkirim',
      }
    );
  };

  const displayName =
    liveUser?.name ||
    profileDraft.fullName ||
    'Mitra Nebeng';

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />

            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: PRIMARY_COLOR }}
            >
              <Settings className="w-3 h-3" />
              AKUN & KEAMANAN
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Pengaturan Akun
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Ubah data profil & kendaraan, keamanan login, preferensi
            notifikasi, dan sesi aktif akun mitra Anda.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <User
              className="w-4 h-4"
              style={{ color: PRIMARY_COLOR }}
            />
            Edit Profil Pribadi
          </h3>

          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Foto Profil"
                  className="w-16 h-16 rounded-full object-cover border-4 shadow-sm"
                  style={{ borderColor: `${PRIMARY_ACCENT}55` }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full text-white flex items-center justify-center text-[23px] font-extrabold shadow-sm"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  {displayName.trim().charAt(0).toUpperCase() || 'M'}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm hover:bg-neutral-50 transition cursor-pointer"
                style={{ color: PRIMARY_COLOR }}
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
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none"
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor =
                      PRIMARY_COLOR)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = '')
                  }
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
                      e.target.value.replace(/[^\d+]/g, '')
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none"
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor =
                      PRIMARY_COLOR)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = '')
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Email Akun (Tidak Dapat Diubah)
                </label>

                <input
                  type="email"
                  disabled
                  value={profileDraft.email}
                  className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl font-bold text-neutral-400 cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Alamat Domisili (KTP)
                </label>

                <textarea
                  rows="2"
                  value={profileDraft.address}
                  onChange={(e) =>
                    handleProfileFieldChange(
                      'address',
                      e.target.value
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-800 focus:outline-none resize-none"
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor =
                      PRIMARY_COLOR)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = '')
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
                style={{
                  backgroundColor: PRIMARY_COLOR,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    PRIMARY_HOVER)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    PRIMARY_COLOR)
                }
              >
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>

                {/* KENDARAAN MITRA TERDAFTAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#10367D]/10 text-[#10367D] rounded-xl shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-neutral-800">
                  Kendaraan Mitra Terdaftar
                </h3>
                <p className="text-[12px] text-neutral-400">
                  Daftar armada kendaraan yang Anda gunakan untuk mengangkut penumpang atau barang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddVehicle}
              className="px-4 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[12px] font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Tambah Kendaraan Baru
            </button>
          </div>

          {vehiclesList.length === 0 ? (
            <div className="p-6 bg-neutral-50 rounded-xl text-center border border-dashed border-neutral-200">
              <Car className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-[13px] font-bold text-neutral-700">Belum Ada Kendaraan Terdaftar</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Daftarkan kendaraan pertama Anda untuk mulai menjadwalkan perjalanan.</p>
              <button
                type="button"
                onClick={handleOpenAddVehicle}
                className="mt-3 px-4 py-1.5 bg-[#10367D] text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                + Daftarkan Kendaraan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {vehiclesList.map((veh) => {
                const isMotor = (veh.type || '').toLowerCase() === 'motor';
                return (
                  <div
                    key={veh.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 hover:bg-neutral-50 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          isMotor ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isMotor ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[14px] text-neutral-800">{veh.model}</h4>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isMotor ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {isMotor ? 'Motor' : 'Mobil'}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            Plat: <span className="font-bold text-neutral-700">{veh.plateNumber}</span> · Warna: {veh.color}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(veh)}
                          className="p-1.5 text-neutral-400 hover:text-[#10367D] hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                          title="Edit informasi kendaraan ini"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {vehiclesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(veh.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus kendaraan ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Kapasitas Kursi: <strong className="text-neutral-700">{veh.capacitySeats || (isMotor ? 1 : 4)} Kursi</strong></span>
                      <span>Maks. Bagasi: <strong className="text-neutral-700">{veh.maxWeightCapacityKg || (isMotor ? 15 : 50)} kg</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* REPUTASI & SANKSI POIN MITRA */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-neutral-800 flex items-center gap-1.5">
            <Bell
              className="w-4 h-4"
              style={{ color: PRIMARY_COLOR }}
            />
            Preferensi Notifikasi
          </h3>

          <div className="space-y-2.5">
            {[
              {
                key: 'tripUpdates',
                label: 'Update Status Trip',
                desc: 'Notifikasi saat trip dimulai, in transit, atau selesai.',
              },
              {
                key: 'walletActivity',
                label: 'Aktivitas Dompet & Escrow',
                desc: 'Notifikasi saat dana escrow cair atau penarikan diproses.',
              },
              {
                key: 'customerChat',
                label: 'Pesan Pelanggan',
                desc: 'Notifikasi saat ada pesan baru dari pelanggan.',
              },
              {
                key: 'promoNews',
                label: 'Promo & Info Program Mitra',
                desc: 'Info promo, insentif, dan pengumuman dari Nebeng.',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 p-3 bg-neutral-50/70 border border-neutral-100 rounded-xl"
              >
                <div>
                  <p className="text-[13px] font-bold text-neutral-800">
                    {item.label}
                  </p>

                  <p className="text-[11px] text-neutral-400">
                    {item.desc}
                  </p>
                </div>

                <ToggleSwitch
                  checked={notifPrefs[item.key]}
                  onChange={() =>
                    handleToggleNotif(item.key)
                  }
                />
              </div>
            ))}
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
                Nonaktifkan Akun Mitra
              </p>

              <p className="text-[11px] text-neutral-400 max-w-md">
                Akun Anda akan disembunyikan dari sistem
                pemesanan dan trip baru tidak dapat dibuat
                sampai diaktifkan kembali oleh Admin Regional.
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
            setiap kali login dari perangkat baru.
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
              style={{ backgroundColor: PRIMARY_COLOR }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  PRIMARY_HOVER)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  PRIMARY_COLOR)
              }
            >
              Aktifkan
            </button>
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={showLogoutSessionsModal}
        onClose={() =>
          setShowLogoutSessionsModal(false)
        }
        title="Keluar dari Semua Perangkat Lain?"
        subtitle="Keamanan Sesi"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-neutral-600">
            Semua sesi aktif selain perangkat ini akan dipaksa
            logout.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() =>
                setShowLogoutSessionsModal(false)
              }
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

      <BaseModal
        isOpen={showDeactivateModal}
        onClose={() =>
          setShowDeactivateModal(false)
        }
        title="Ajukan Nonaktifasi Akun?"
        subtitle="Tindakan Ini Memerlukan Persetujuan Admin"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <p className="text-neutral-600">
            Trip aktif yang sedang berjalan tetap harus
            diselesaikan terlebih dahulu.
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
        {/* Modal Tambah Kendaraan Baru */}
        <BaseModal
          isOpen={showAddVehicleModal}
          onClose={() => { if (!isSubmittingVehicle) setShowAddVehicleModal(false); }}
          title={editingVehicleId ? "Edit Informasi Kendaraan" : "Tambah Kendaraan Baru"}
          subtitle={editingVehicleId ? "Perbarui informasi kendaraan yang terdaftar" : "Daftarkan jenis armada kendaraan baru Anda"}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveVehicle} className="space-y-3.5 text-[13px]">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Jenis Kendaraan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewVehicleForm(prev => ({
                    ...prev,
                    type: 'motor',
                    capacitySeats: 1,
                    maxWeightCapacityKg: 15
                  }))}
                  className={`py-2.5 px-3 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                    newVehicleForm.type === 'motor'
                      ? 'border-[#10367D] bg-blue-50/50 text-[#10367D]'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Sepeda Motor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewVehicleForm(prev => ({
                    ...prev,
                    type: 'mobil',
                    capacitySeats: 4,
                    maxWeightCapacityKg: 50
                  }))}
                  className={`py-2.5 px-3 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                    newVehicleForm.type === 'mobil'
                      ? 'border-[#10367D] bg-blue-50/50 text-[#10367D]'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Mobil / Minibus</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Model Kendaraan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. Honda Beat, Avanza"
                  value={newVehicleForm.model}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Nomor Plat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. AD 1234 XY"
                  value={newVehicleForm.plateNumber}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, plateNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Warna <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. Hitam"
                  value={newVehicleForm.color}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, color: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Kursi
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={newVehicleForm.capacitySeats}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, capacitySeats: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Bagasi (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={newVehicleForm.maxWeightCapacityKg}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, maxWeightCapacityKg: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingVehicle}
                onClick={() => setShowAddVehicleModal(false)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingVehicle}
                className="flex-1 py-2.5 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-xl font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSubmittingVehicle ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  editingVehicleId ? 'Simpan Perubahan' : 'Daftarkan Kendaraan'
                )}
              </button>
            </div>
          </form>
        </BaseModal>
        {/* Modal Ajukan Banding Sanksi Mitra */}
        <BaseModal
          isOpen={Boolean(appealModalTarget)}
          onClose={() => { if (!isSubmittingAppeal) setAppealModalTarget(null); }}
          title="Ajukan Banding Sanksi"
          subtitle={'Sanksi #' + (appealModalTarget ? appealModalTarget.id : '')}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmitAppeal} className="space-y-3.5 text-[13px]">
            <p className="text-neutral-600 text-[12px] leading-relaxed">
              Jika pembatalan trip terjadi karena kendala darurat / force majeure dengan bukti sah, Admin dapat menyetujui banding untuk mencabut sanksi dan memulihkan skor reputasi Anda. Refund dan poin yang telah diterima penumpang tidak akan ditarik kembali.
            </p>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Alasan & Kronologi Banding <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Tuliskan alasan lengkap dan kronologi kendala darurat Anda..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-neutral-700 mb-1">
                Tautan Bukti Dokumen / Foto (Opsional)
              </label>
              <input
                type="url"
                value={appealEvidenceUrl}
                onChange={(e) => setAppealEvidenceUrl(e.target.value)}
                placeholder="https://contoh.com/bukti-bengkel.jpg"
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingAppeal}
                onClick={() => setAppealModalTarget(null)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAppeal}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSubmittingAppeal ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Kirim Banding'
                )}
              </button>
            </div>
          </form>
        </BaseModal>
    </div>
  );
}