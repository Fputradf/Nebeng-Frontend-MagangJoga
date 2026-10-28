import { useState, useRef, useEffect } from 'react';
import { Mail, KeyRound, Lock, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import AuthInput from '../../components/ui/AuthInput';
import AuthLayout from '../../components/layout/AuthLayout';
import {
  forgotPasswordRequest,
  verifyOtpRequest,
  resetPasswordRequest,
} from '../../services/authService';
import logoImage from '../../assets/LOGO.png';

export default function ForgotPassword({ onSwitchToLogin }) {
  // Step: 1 = Email Input, 2 = OTP Verification, 3 = New Password, 4 = Success Complete
  const [step, setStep] = useState(1);

  // Form State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpInputsRef = useRef([]);

  // Timer countdown untuk kirim ulang OTP
  useEffect(() => {
    let interval = null;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  /* =========================================
     STEP 1: SUBMIT EMAIL
  ========================================= */
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrors({ email: 'Email wajib diisi' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrors({ email: 'Format email tidak valid' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await forgotPasswordRequest(trimmedEmail);
      setStep(2);
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      const status = err?.response?.status;
      // Jika endpoint 404/501 (backend mock), izinkan lanjut ke form OTP untuk demo UI
      if (status === 404 || status === 501) {
        setStep(2);
        setResendTimer(60);
        setCanResend(false);
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Terjadi kesalahan saat memproses permintaan.';
        setErrors({ general: Array.isArray(msg) ? msg[0] : msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================
     STEP 2: OTP INPUT HANDLERS
  ========================================= */
  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (cleanValue.length > 1) {
      // Handle paste
      const pastedDigits = cleanValue.slice(0, 6).split('');
      pastedDigits.forEach((digit, i) => {
        newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
    } else {
      newOtp[index] = cleanValue;
      setOtp(newOtp);
      if (cleanValue && index < 5) {
        otpInputsRef.current[index + 1]?.focus();
      }
    }

    if (errors.otp || errors.general) {
      setErrors({});
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      setErrors({ otp: 'Harap masukkan 6 digit kode OTP secara lengkap' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await verifyOtpRequest({ email, otp: otpCode });
      setStep(3);
    } catch (err) {
      const status = err?.response?.status;
      // Jika mock/belum tersedia endpoint di backend, izinkan lanjut ke reset password
      if (status === 404 || status === 501) {
        setStep(3);
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Kode OTP tidak valid atau telah kedaluwarsa.';
        setErrors({ general: Array.isArray(msg) ? msg[0] : msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      await forgotPasswordRequest(email);
      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err) {
      // Tetap reset timer untuk simulasi jika 404
      if (err?.response?.status === 404) {
        setResendTimer(60);
        setCanResend(false);
      } else {
        const msg = err?.response?.data?.message || 'Gagal mengirim ulang OTP';
        setErrors({ general: Array.isArray(msg) ? msg[0] : msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================
     STEP 3: SUBMIT NEW PASSWORD
  ========================================= */
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Kata sandi baru wajib diisi';
    } else if (password.length < 8) {
      newErrors.password = 'Kata sandi minimal 8 karakter';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi kata sandi wajib diisi';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Kata sandi tidak cocok';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await resetPasswordRequest({
        email,
        otp: otp.join(''),
        newPassword: password,
      });
      setStep(4);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        setStep(4);
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Gagal memperbarui kata sandi. Silakan coba kembali.';
        setErrors({ general: Array.isArray(msg) ? msg[0] : msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================
     TITLES & SUBTITLES PER STEP
  ========================================= */
  const getHeaderInfo = () => {
    switch (step) {
      case 1:
        return {
          title: <>Lupa kata sandi?</>,
          subtitle: 'Masukkan alamat email akunmu untuk menerima 6 digit kode OTP verifikasi.',
        };
      case 2:
        return {
          title: <>Verifikasi Kode OTP</>,
          subtitle: `Masukkan 6 digit kode yang telah dikirim ke ${email || 'email Anda'}.`,
        };
      case 3:
        return {
          title: <>Buat Password Baru</>,
          subtitle: 'Buat kata sandi baru yang kuat dan mudah kamu ingat.',
        };
      case 4:
      default:
        return {
          title: <>Kata Sandi Berhasil Diubah</>,
          subtitle: 'Akun Anda sekarang telah diperbarui dengan kata sandi baru.',
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <AuthLayout
      logo={logoImage}
      brandName="Nebeng"
      title={headerInfo.title}
      subtitle={headerInfo.subtitle}
      authMode="forgot"
      onSwitchMode={onSwitchToLogin}
    >
      {/* =========================================
          STEP INDICATOR (Steps 1, 2, 3)
      ========================================= */}
      {step <= 3 && (
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                step >= 1 ? 'bg-[#10367D] text-white' : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              1
            </span>
            <span
              className={`text-[12px] font-bold ${
                step === 1 ? 'text-[#10367D]' : 'text-neutral-400'
              }`}
            >
              Email
            </span>
          </div>

          <div className="w-8 h-0.5 bg-neutral-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                step >= 2 ? 'bg-[#10367D] text-white' : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              2
            </span>
            <span
              className={`text-[12px] font-bold ${
                step === 2 ? 'text-[#10367D]' : 'text-neutral-400'
              }`}
            >
              OTP
            </span>
          </div>

          <div className="w-8 h-0.5 bg-neutral-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                step >= 3 ? 'bg-[#10367D] text-white' : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              3
            </span>
            <span
              className={`text-[12px] font-bold ${
                step === 3 ? 'text-[#10367D]' : 'text-neutral-400'
              }`}
            >
              Password
            </span>
          </div>
        </div>
      )}

      {/* ERROR ALERT */}
      {errors.general && (
        <div
          role="alert"
          className="
            mb-4
            p-3.5
            rounded-xl
            bg-red-50
            border
            border-red-200
            text-red-700
            text-[13px]
            leading-relaxed
            animate-in
            fade-in
          "
        >
          {errors.general}
        </div>
      )}

      {/* =========================================
          STEP 1 FORM: EMAIL
      ========================================= */}
      {step === 1 && (
        <form className="space-y-5" onSubmit={handleEmailSubmit} noValidate>
          <AuthInput
            label="Alamat Email Terdaftar"
            type="email"
            placeholder="nama@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({});
            }}
            error={errors.email}
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="
              w-full
              h-10.5
              px-4
              rounded-full
              bg-[#10367D]
              hover:bg-[#0C2C66]
              disabled:opacity-60
              disabled:cursor-not-allowed
              text-white
              text-[15px]
              font-bold
              cursor-pointer
              flex
              items-center
              justify-center
              gap-2
              transition-colors
              duration-200
              shadow-sm
            "
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </span>
            ) : (
              <>
                <span>Lanjut ke Verifikasi OTP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="
                inline-flex
                items-center
                gap-1.5
                text-[13px]
                font-semibold
                text-[#10367D]
                hover:underline
                cursor-pointer
              "
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================
          STEP 2 FORM: OTP CODE
      ========================================= */}
      {step === 2 && (
        <form className="space-y-6" onSubmit={handleOtpSubmit} noValidate>
          <div>
            <label className="block mb-2 text-[14px] font-bold text-neutral-700 text-center">
              Masukkan 6 Digit Kode OTP
            </label>
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputsRef.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={isSubmitting}
                  className="
                    w-11
                    h-13
                    sm:w-12
                    sm:h-14
                    text-center
                    text-[21px]
                    font-bold
                    text-neutral-900
                    bg-neutral-50
                    border
                    border-neutral-200
                    rounded-xl
                    focus:bg-white
                    focus:outline-none
                    focus:border-[#10367D]
                    focus:ring-2
                    focus:ring-[#10367D]/20
                    transition-all
                  "
                />
              ))}
            </div>
            {errors.otp && (
              <p className="mt-2 text-center text-[12px] font-medium text-red-600">
                {errors.otp}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-[13px] px-1">
            <span className="text-neutral-500">Tidak menerima kode?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="font-bold text-[#10367D] hover:underline cursor-pointer"
              >
                Kirim Ulang OTP
              </button>
            ) : (
              <span className="font-semibold text-neutral-400">
                Kirim ulang dalam ({resendTimer}s)
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="
              w-full
              h-10.5
              px-4
              rounded-full
              bg-[#10367D]
              hover:bg-[#0C2C66]
              disabled:opacity-60
              disabled:cursor-not-allowed
              text-white
              text-[15px]
              font-bold
              cursor-pointer
              flex
              items-center
              justify-center
              gap-2
              transition-colors
              duration-200
              shadow-sm
            "
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi...</span>
              </span>
            ) : (
              <>
                <span>Verifikasi OTP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrors({});
              }}
              className="
                inline-flex
                items-center
                gap-1.5
                text-[13px]
                font-semibold
                text-neutral-500
                hover:text-neutral-800
                cursor-pointer
              "
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ganti Alamat Email</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================
          STEP 3 FORM: NEW PASSWORD
      ========================================= */}
      {step === 3 && (
        <form className="space-y-4" onSubmit={handleResetPasswordSubmit} noValidate>
          <AuthInput
            label="Kata Sandi Baru"
            type="password"
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            showPassword={showPassword}
            togglePassword={() => setShowPassword((prev) => !prev)}
            error={errors.password}
            disabled={isSubmitting}
          />

          <AuthInput
            label="Konfirmasi Kata Sandi Baru"
            type="password"
            placeholder="Ulangi kata sandi baru"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            showPassword={showConfirmPassword}
            togglePassword={() => setShowConfirmPassword((prev) => !prev)}
            error={errors.confirmPassword}
            disabled={isSubmitting}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="
                w-full
                h-10.5
                px-4
                rounded-full
                bg-[#10367D]
                hover:bg-[#0C2C66]
                disabled:opacity-60
                disabled:cursor-not-allowed
                text-white
                text-[15px]
                font-bold
                cursor-pointer
                flex
                items-center
                justify-center
                gap-2
                transition-colors
                duration-200
                shadow-sm
              "
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan Kata Sandi...</span>
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simpan Kata Sandi Baru</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* =========================================
          STEP 4: SUCCESS CONFIRMATION
      ========================================= */}
      {step === 4 && (
        <div className="space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[19px] font-bold text-neutral-800">
              Kata Sandi Berhasil Diperbarui!
            </h3>
            <p className="text-[13px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
              Kata sandi akun <span className="font-semibold text-neutral-800">{email}</span> telah berhasil diubah. Silakan masuk kembali menggunakan kata sandi baru Anda.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="
                w-full
                h-10.5
                px-4
                rounded-full
                bg-[#10367D]
                hover:bg-[#0C2C66]
                text-white
                text-[15px]
                font-bold
                cursor-pointer
                flex
                items-center
                justify-center
                gap-2
                transition-colors
                shadow-sm
              "
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
