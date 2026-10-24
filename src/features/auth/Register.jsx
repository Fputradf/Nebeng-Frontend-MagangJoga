import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Lock, ArrowRight, ChevronDown, MapPin, Search } from 'lucide-react';
import AuthInput from '../../components/ui/AuthInput';
import AuthLayout from '../../components/layout/AuthLayout';
import { useToast } from '../../context/ToastContext';
import { registerRequest } from '../../services/authService';
import apiClient from '../../services/apiClient';
import logoImage from '../../assets/logo.png';
import registerIllustration from '../../assets/Daftar.png';

export default function Register({ onSwitchToLogin }) {
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk Region
  const [regions, setRegions] = useState([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const [selectedRegionName, setSelectedRegionName] = useState('');
  const regionDropdownRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    regionId: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function fetchRegions() {
      try {
        setIsLoadingRegions(true);
        const response = await apiClient.get('/regions?onlyActive=true');
        const regionData = response.data?.data || response.data || [];
        setRegions(regionData);
      } catch (err) {
        console.error('Gagal memuat daftar region', err);
        toast.error('Gagal memuat daftar wilayah operasional. Silakan muat ulang halaman.', {
          title: 'Kesalahan Sistem',
        });
      } finally {
        setIsLoadingRegions(false);
      }
    }
    fetchRegions();
  }, [toast]);

  // Handle Klik di luar dropdown untuk menutup dropdown wilayah
  useEffect(() => {
    function handleClickOutside(event) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target)) {
        setIsRegionDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 15);
    }

    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectRegion = (region) => {
    setForm((prev) => ({ ...prev, regionId: region.id }));
    setSelectedRegionName(`${region.name} (${region.code})`);
    setIsRegionDropdownOpen(false);
    setRegionSearch('');
    if (errors.regionId) {
      setErrors((prev) => ({ ...prev, regionId: undefined }));
    }
  };

  const filteredRegions = regions.filter((reg) => {
    const term = regionSearch.toLowerCase();
    return (
      reg.name?.toLowerCase().includes(term) ||
      reg.code?.toLowerCase().includes(term)
    );
  });

  const validate = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedName) nextErrors.name = 'Nama wajib diisi';
    if (!trimmedEmail) nextErrors.email = 'Email wajib diisi';
    else if (trimmedEmail.endsWith('@gmil.com')) nextErrors.email = 'Domain @gmil.com tidak diperbolehkan, mungkin maksud Anda @gmail.com?';
    if (!form.phone) nextErrors.phone = 'Nomor telepon wajib diisi';
    if (!form.regionId) nextErrors.regionId = 'Wilayah operasional wajib dipilih';
    if (!form.password) nextErrors.password = 'Password wajib diisi';
    if (form.password && form.password.length < 6) nextErrors.password = 'Password minimal 6 karakter';
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Konfirmasi password tidak cocok';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone,
      role: form.role,
      regionId: String(form.regionId),
      password: form.password,
    };

    try {
      await registerRequest(payload);
      toast.success(`Akun untuk ${payload.name} berhasil dibuat. Silakan masuk untuk melanjutkan.`, {
        title: 'Pendaftaran Berhasil',
      });
      onSwitchToLogin();
    } catch (err) {
      const errorMessage = err?.response?.data?.message || 'Pendaftaran gagal. Silakan coba lagi.';
      toast.error(errorMessage, { title: 'Terjadi Kesalahan' });
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      logo={logoImage}
      brandName="Nebeng"
      title={<>Bergabung dengan Kami</>}
      subtitle="Mulai pengalaman perjalanan yang lebih cerdas, hemat, dan aman."
      illustration={registerIllustration}
      illustrationAlt="Ilustrasi pendaftaran akun Nebeng"
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Nama pengguna"
          icon={User}
          placeholder="Masukkan nama lengkapmu"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
        />

        <AuthInput
          label="Email"
          icon={Mail}
          type="email"
          placeholder="nama@email.com"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
        />

        <AuthInput
          label="Nomor telepon"
          icon={Phone}
          type="tel"
          placeholder="08xxxxxxxxxx"
          value={form.phone}
          onChange={handleChange('phone')}
          error={errors.phone}
        />

        <div className="w-full">
          <label htmlFor="register-role" className="block mb-2 text-sm font-medium text-slate-600">
            Daftar sebagai
          </label>
          <div className="relative">
            <select
              id="register-role"
              value={form.role}
              onChange={handleChange('role')}
              className="w-full h-10 appearance-none pl-4 pr-10 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200 cursor-pointer"
            >
              <option value="customer">Customer</option>
              <option value="mitra">Mitra (Driver)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute inset-y-0 right-3 my-auto w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Custom Searchable Select - Wilayah Operasional (Region) */}
        <div className="w-full relative" ref={regionDropdownRef}>
          <label className="block mb-2 text-sm font-medium text-slate-600">
            Wilayah Operasional (Region) <span className="text-rose-600 font-semibold">*Wajib Diisi</span>
          </label>

          <div className="relative">
            <div
              onClick={() => {
                if (!isLoadingRegions && regions.length > 0) {
                  setIsRegionDropdownOpen((prev) => !prev);
                }
              }}
              className={`w-full h-10 px-4 bg-white border ${
                errors.regionId ? 'border-rose-500' : 'border-slate-300'
              } rounded-lg flex items-center justify-between cursor-pointer focus-within:border-brand-500 transition-all duration-200 ${
                isLoadingRegions || regions.length === 0 ? 'bg-slate-100 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden pr-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className={`text-sm truncate ${selectedRegionName ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                  {isLoadingRegions
                    ? 'Memuat wilayah...'
                    : regions.length === 0
                    ? 'Tidak ada wilayah aktif'
                    : selectedRegionName || 'Cari atau pilih wilayah operasional...'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu List dengan Fitur Filter Search */}
            {isRegionDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-elevated overflow-hidden transition-all duration-200">
                <div className="p-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
                  <input
                    type="text"
                    placeholder="Cari nama atau kode wilayah..."
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                    className="w-full py-1 pr-2 bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredRegions.length === 0 ? (
                    <div className="p-3 text-center text-sm text-slate-500">
                      Wilayah tidak ditemukan
                    </div>
                  ) : (
                    filteredRegions.map((reg) => (
                      <div
                        key={reg.id}
                        onClick={() => handleSelectRegion(reg)}
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${
                          String(form.regionId) === String(reg.id) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'
                        }`}
                      >
                        <span>{reg.name}</span>
                        <span className="text-xs text-slate-400 font-mono">({reg.code})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {errors.regionId && (
            <p className="mt-1.5 ml-1 text-xs font-medium text-rose-600">{errors.regionId}</p>
          )}

          {!isLoadingRegions && regions.length === 0 && (
            <p className="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs leading-relaxed text-amber-700">
              Belum ada wilayah operasional yang aktif saat ini. Silakan hubungi admin untuk mengaktifkan region, lalu muat ulang halaman ini.
            </p>
          )}
        </div>

        <AuthInput
          label="Password"
          icon={Lock}
          type="password"
          placeholder="Buat kata sandi (min. 6 karakter)"
          value={form.password}
          onChange={handleChange('password')}
          showPassword={showPassword}
          togglePassword={() => setShowPassword((prev) => !prev)}
          error={errors.password}
        />

        <AuthInput
          label="Konfirmasi password"
          icon={Lock}
          type="password"
          placeholder="Ulangi kata sandimu"
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          showPassword={showConfirmPassword}
          togglePassword={() => setShowConfirmPassword((prev) => !prev)}
          error={errors.confirmPassword}
        />

        <button
          type="submit"
          disabled={isSubmitting || isLoadingRegions || regions.length === 0}
          className="w-full py-3 px-4 bg-brand-900 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-900 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-200 mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              MEMPROSES...
            </>
          ) : (
            <>
              Daftar sekarang
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Sudah punya akun?{' '}
        <button onClick={onSwitchToLogin} className="font-medium text-brand-600 hover:text-brand-700 cursor-pointer transition-colors">
          Masuk di sini
        </button>
      </p>
    </AuthLayout>
  );
}