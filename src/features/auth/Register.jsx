import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Lock, ArrowRight, ChevronDown, MapPin, Search, Car, ShieldCheck, X, FileText, CheckCircle2 } from 'lucide-react';
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

  // State untuk Syarat & Ketentuan
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

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
            <label className="block mb-1 text-xs font-semibold text-slate-600">
              Wilayah Operasional <span className="text-rose-600 font-bold">*Wajib</span>
            </label>

            <div className="relative">
              <div
                onClick={() => {
                  if (!isLoadingRegions && regions.length > 0) {
                    setIsRegionDropdownOpen((prev) => !prev);
                  }
                }}
                className={`w-full h-9 px-3 bg-white border ${
                  errors.regionId ? 'border-rose-500' : 'border-slate-300'
                } rounded-lg flex items-center justify-between cursor-pointer focus-within:border-brand-500 transition-all duration-200 ${
                  isLoadingRegions || regions.length === 0 ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className={`text-xs sm:text-sm truncate ${selectedRegionName ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {isLoadingRegions
                      ? 'Memuat...'
                      : regions.length === 0
                      ? 'Tidak ada wilayah'
                      : selectedRegionName || 'Pilih wilayah...'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu List dengan Fitur Filter Search */}
              {isRegionDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated overflow-hidden transition-all duration-200">
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

                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {filteredRegions.length === 0 ? (
                      <div className="p-2.5 text-center text-xs text-slate-500">
                        Wilayah tidak ditemukan
                      </div>
                    ) : (
                      filteredRegions.map((reg) => (
                        <div
                          key={reg.id}
                          onClick={() => handleSelectRegion(reg)}
                          className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${
                            String(form.regionId) === String(reg.id) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'
                          }`}
                        >
                          <span>{reg.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({reg.code})</span>
                        </div>
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

          {/* Kolom 5: Daftar Sebagai (Spans 2 Kolom) */}
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
                className={`py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  form.role === 'customer'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, role: 'mitra' }));
                  if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                className={`py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  form.role === 'mitra'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
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
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline cursor-pointer transition-colors"
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
            py-2.5
            px-4
            bg-gradient-to-r
            from-blue-600
            via-[#1D4ED8]
            to-blue-500
            hover:from-blue-500
            hover:to-blue-600
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500/50
            focus:ring-offset-2
            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:hover:translate-y-0
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
            shadow-md
            shadow-blue-500/25
            hover:shadow-lg
            hover:shadow-blue-500/35
            hover:-translate-y-0.5
            active:translate-y-0
            active:scale-[0.99]
            transition-all
            duration-200
            mt-1
            cursor-pointer
          "
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>MEMPROSES...</span>
            </>
          ) : (
            <>
              <span>Daftar Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-2.5">
        Sudah punya akun?{' '}
        <button
          onClick={onSwitchToLogin}
          className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
        >
          Masuk di sini
        </button>
      </p>

      {/* MODAL POP-UP SYARAT DAN KETENTUAN */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Syarat & Ketentuan Layanan</h3>
                  <p className="text-[11px] text-slate-500">Kebijakan penggunaan platform Nebeng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - List Syarat & Ketentuan */}
            <div className="px-5 py-4 overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100/80 text-blue-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Harap baca dengan cermat ketentuan sebelum menggunakan platform Nebeng.</span>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] text-slate-600 flex items-center justify-center font-bold">1</span>
                  Ketentuan Akun & Pendaftaran
                </h4>
                <p className="pl-5 text-slate-600">
                  Pengguna wajib mendaftarkan data identitas asli yang valid (nama lengkap, nomor telepon aktif, dan email resmi). Penyalahgunaan identitas orang lain dapat mengakibatkan pemblokiran akun permanen.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] text-slate-600 flex items-center justify-center font-bold">2</span>
                  Sistem Escrow & Transaksi Aman
                </h4>
                <p className="pl-5 text-slate-600">
                  Semua transaksi ongkos perjalanan dan kargo wajib melalui dompet digital Nebeng yang dilindungi proteksi escrow. Dana pengemudi dicairkan hanya setelah perjalanan dikonfirmasi tiba dengan sukses.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] text-slate-600 flex items-center justify-center font-bold">3</span>
                  Peraturan Mitra Pengemudi
                </h4>
                <p className="pl-5 text-slate-600">
                  Mitra pengemudi wajib memiliki SIM aktif, kondisi kendaraan laik jalan, tiba di pos penjemputan tepat waktu, dan tidak mengubah tarif sepihak di luar kesepakatan tiket aplikasi.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] text-slate-600 flex items-center justify-center font-bold">4</span>
                  Peraturan Penumpang & Kargo Barang
                </h4>
                <p className="pl-5 text-slate-600">
                  Dilarang keras membawa narkotika, barang terlarang, senjata tajam/api, atau benda berbahaya lainnya. Muatan kargo tidak boleh melebihi batas bobot/dimensi yang dipesan.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] text-slate-600 flex items-center justify-center font-bold">5</span>
                  Kebijakan Pembatalan & Pengembalian Dana
                </h4>
                <p className="pl-5 text-slate-600">
                  Pembatalan trip oleh customer atau mitra wajib mematuhi batas waktu toleransi sistem untuk kelayakan pengembalian dana (refund) otomatis ke saldo dompet.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptTerms(true);
                  if (errors.terms) {
                    setErrors((prev) => ({ ...prev, terms: undefined }));
                  }
                  setIsTermsModalOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saya Mengerti & Setujui</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
