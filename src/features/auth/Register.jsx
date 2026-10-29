import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Lock, ChevronDown, MapPin, Search, Car } from 'lucide-react';
import AuthInput from '../../components/ui/AuthInput';
import AuthLayout from '../../components/layout/AuthLayout';
import TermsOfServiceModal from '../../components/layout/TermsOfServiceModal';
import { useToast } from '../../context/ToastContext';
import { registerRequest } from '../../services/authService';
import { socialLinkService } from '../../services/socialLinkService';
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

  // State untuk Syarat & Ketentuan
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSocialLinks = async () => {
      try {
        const data = await socialLinkService.getPublicSocialLinks();
        if (isMounted && Array.isArray(data)) {
          setSocialLinks(data.slice(0, 5));
        }
      } catch (err) {
        console.warn('Gagal memuat link sosial media:', err);
      }
    };
    fetchSocialLinks();
    return () => {
      isMounted = false;
    };
  }, []);

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
    if (!acceptTerms) nextErrors.terms = 'Wajib menyetujui Syarat dan Ketentuan';

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
      title="Bergabung dengan Kami"
      subtitle="Mulai pengalaman perjalanan hemat, cepat, dan aman."
      illustration={registerIllustration}
      illustrationAlt="Ilustrasi pendaftaran akun Nebeng"
      authMode="register"
      onSwitchMode={onSwitchToLogin}
      maxWidth="max-w-2xl"
      socialLinks={socialLinks}
    >
      <form className="space-y-2.5" onSubmit={handleSubmit} noValidate>
        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-3.5 sm:gap-y-2.5">
          {/* Kolom 1: Nama Pengguna */}
          <AuthInput
            label="Nama pengguna"
            icon={User}
            compact={true}
            placeholder="Nama lengkap"
            value={form.name}
            onChange={handleChange('name')}
            error={errors.name}
          />

          {/* Kolom 2: Email */}
          <AuthInput
            label="Email"
            icon={Mail}
            compact={true}
            type="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
          />

          {/* Kolom 3: Nomor Telepon */}
          <AuthInput
            label="Nomor telepon"
            icon={Phone}
            compact={true}
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={form.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
          />

          {/* Kolom 4: Wilayah Operasional (Region) */}
          <div className="w-full relative" ref={regionDropdownRef}>
            <label id="region-label" className="block mb-1 text-xs font-semibold text-slate-600">
              Wilayah Operasional <span className="text-rose-600 font-bold">*Wajib</span>
            </label>

            <div className="relative">
              <button
                type="button"
                id="region-select-button"
                aria-haspopup="listbox"
                aria-expanded={isRegionDropdownOpen}
                aria-controls="region-listbox"
                aria-labelledby="region-label region-select-button"
                disabled={isLoadingRegions || regions.length === 0}
                onClick={() => {
                  if (!isLoadingRegions && regions.length > 0) {
                    setIsRegionDropdownOpen((prev) => !prev);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isLoadingRegions && regions.length > 0) {
                      setIsRegionDropdownOpen(true);
                    }
                  }
                }}
                className={`w-full h-9 px-3 bg-white border ${
                  errors.regionId ? 'border-rose-500' : 'border-slate-300'
                } rounded-lg flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-all duration-200 ${
                  isLoadingRegions || regions.length === 0 ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              >
                <span className="flex items-center gap-1.5 overflow-hidden pr-2 text-left">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className={`text-xs sm:text-sm truncate ${selectedRegionName ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                    {isLoadingRegions
                      ? 'Memuat...'
                      : regions.length === 0
                      ? 'Tidak ada wilayah'
                      : selectedRegionName || 'Pilih wilayah...'}
                  </span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu List dengan Fitur Filter Search & Aksesibilitas Keyboard */}
              {isRegionDropdownOpen && (
                <div
                  id="region-listbox"
                  role="listbox"
                  aria-label="Daftar wilayah operasional"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsRegionDropdownOpen(false);
                      document.getElementById('region-select-button')?.focus();
                    }
                  }}
                  className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden transition-all duration-200"
                >
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                    <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                    <input
                      type="text"
                      placeholder="Cari wilayah..."
                      value={regionSearch}
                      onChange={(e) => setRegionSearch(e.target.value)}
                      className="w-full py-0.5 pr-2 bg-transparent text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {filteredRegions.length === 0 ? (
                      <div className="p-2.5 text-center text-xs text-slate-500">
                        Wilayah tidak ditemukan
                      </div>
                    ) : (
                      filteredRegions.map((reg) => (
                        <button
                          key={reg.id}
                          type="button"
                          role="option"
                          aria-selected={String(form.regionId) === String(reg.id)}
                          onClick={() => handleSelectRegion(reg)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectRegion(reg);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none transition-colors flex items-center justify-between ${
                            String(form.regionId) === String(reg.id) ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                          }`}
                        >
                          <span>{reg.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({reg.code})</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {errors.regionId && (
              <p className="mt-0.5 ml-1 text-[11px] font-medium text-rose-600">{errors.regionId}</p>
            )}
          </div>

          {/* Kolom 5: Daftar Sebagai (Spans 2 Kolom, Target Sentuh Minimum 44px) */}
          <div className="w-full col-span-1 sm:col-span-2">
            <label className="block mb-1 text-xs font-semibold text-slate-600">
              Daftar Sebagai
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, role: 'customer' }));
                  if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                className={`min-h-[44px] py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  form.role === 'customer'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, role: 'mitra' }));
                  if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                className={`min-h-[44px] py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  form.role === 'mitra'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Mitra (Driver)</span>
              </button>
            </div>
          </div>

          {/* Kolom 6: Password */}
          <div>
            <AuthInput
              label="Password"
              icon={Lock}
              compact={true}
              type="password"
              placeholder="Min. 6 karakter"
              value={form.password}
              onChange={handleChange('password')}
              showPassword={showPassword}
              togglePassword={() => setShowPassword((prev) => !prev)}
              error={errors.password}
            />

            {/* Password Strength Meter Ringkas */}
            {form.password && (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Kekuatan:</span>
                  <span
                    className={`font-bold ${
                      form.password.length < 6
                        ? 'text-rose-500'
                        : form.password.length < 8 || !/\d/.test(form.password)
                        ? 'text-amber-500'
                        : 'text-emerald-600'
                    }`}
                  >
                    {form.password.length < 6
                      ? 'Lemah'
                      : form.password.length < 8 || !/\d/.test(form.password)
                      ? 'Sedang'
                      : 'Kuat'}
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full rounded-full flex-1 transition-all duration-300 ${
                      form.password.length > 0 ? (form.password.length < 6 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-full rounded-full flex-1 transition-all duration-300 ${
                      form.password.length >= 6 ? (form.password.length < 8 || !/\d/.test(form.password) ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-full rounded-full flex-1 transition-all duration-300 ${
                      form.password.length >= 8 && /\d/.test(form.password) ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Kolom 7: Konfirmasi Password */}
          <div>
            <AuthInput
              label="Konfirmasi password"
              icon={Lock}
              compact={true}
              type="password"
              placeholder="Ulangi kata sandi"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              showPassword={showConfirmPassword}
              togglePassword={() => setShowConfirmPassword((prev) => !prev)}
              error={errors.confirmPassword}
            />
          </div>
        </div>

        {/* Syarat dan Ketentuan Checkbox */}
        <div className="pt-1">
          <div className="flex items-start gap-2">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (errors.terms) {
                  setErrors((prev) => ({ ...prev, terms: undefined }));
                }
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer accent-blue-600 shrink-0"
            />
            <label htmlFor="terms-checkbox" className="text-xs text-slate-600 leading-tight select-none">
              Saya setuju dengan{' '}
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
                className="text-brand-600 font-semibold hover:text-brand-700 hover:underline cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
              >
                Syarat dan Ketentuan
              </button>{' '}
              yang berlaku di Nebeng.
            </label>
          </div>
          {errors.terms && (
            <p className="mt-0.5 ml-6 text-[11px] font-medium text-rose-600">{errors.terms}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoadingRegions || regions.length === 0}
          className="
            w-full
            min-h-[44px]
            py-3
            px-4
            bg-brand-600
            hover:bg-brand-700
            active:bg-brand-800
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-brand-500
            focus-visible:ring-offset-2
            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:hover:shadow-none
            text-white
            text-xs sm:text-sm
            font-bold
            tracking-wide
            rounded-xl
            flex
            items-center
            justify-center
            gap-2
            shadow-sm
            hover:shadow
            active:scale-[0.99]
            transition-all
            duration-150
            mt-1
            cursor-pointer
          "
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memproses...</span>
            </span>
          ) : (
            <span>Daftar Sekarang</span>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-600 mt-3">
        Sudah punya akun?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
        >
          Masuk di sini
        </button>
      </p>

      {/* Syarat & Ketentuan Modal Component */}
      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => {
          setAcceptTerms(true);
          if (errors.terms) {
            setErrors((prev) => ({ ...prev, terms: undefined }));
          }
        }}
      />
    </AuthLayout>
  );
}
