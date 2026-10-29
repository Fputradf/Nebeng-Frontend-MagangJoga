import { useState, useEffect } from 'react';
import AuthInput from '../../components/ui/AuthInput';
import AuthLayout from '../../components/layout/AuthLayout';
import SocialIcon from '../../components/ui/SocialIcon';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { loginRequest } from '../../services/authService';
import { socialLinkService } from '../../services/socialLinkService';
import logoImage from '../../assets/logo.png';

export default function Login({ onSwitchToRegister, onSwitchToForgotPassword, onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);

  const { login } = useAuth();
  const { registerToken } = useNotification();

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

  /* =========================================
     EMAIL CHANGE
  ========================================= */
  const handleEmailChange = (e) => {
    setEmail(e.target.value);

    if (errors.email || errors.general) {
      setErrors((prev) => ({
        ...prev,
        email: undefined,
        general: undefined,
      }));
    }
  };

  /* =========================================
     PASSWORD CHANGE
  ========================================= */
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);

    if (errors.password || errors.general) {
      setErrors((prev) => ({
        ...prev,
        password: undefined,
        general: undefined,
      }));
    }
  };

  /* =========================================
     VALIDATION
  ========================================= */
  const validate = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email wajib diisi';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      nextErrors.email = 'Format email tidak valid';
    }

    if (!password) {
      nextErrors.password = 'Kata sandi wajib diisi';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  /* =========================================
     SUBMIT LOGIN
  ========================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    const cleanEmail = email.trim();

    try {
      const {
        role,
        token,
        refreshToken,
        user,
      } = await loginRequest({
        email: cleanEmail,
        password,
      });

      login(
        role,
        {
          token,
          refreshToken,
          email: cleanEmail,
          user,
        },
        rememberMe
      );

      // Register FCM token after successful login
      registerToken().catch(err => {
        console.log('FCM token registration will be handled by notification context');
      });

      if (onLogin) {
        onLogin(role);
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        'Email atau kata sandi salah. Silakan coba lagi.';

      setErrors({
        password: errorMessage,
      });

      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      logo={logoImage}
      brandName="Nebeng"
      title="Selamat Datang Kembali!"
      subtitle="Masuk ke akun Anda untuk melanjutkan perjalanan atau kelola kiriman."
      authMode="login"
      onSwitchMode={onSwitchToRegister}
      socialLinks={socialLinks}
    >
      {/* =====================================
          LOGIN FORM
      ====================================== */}
      <form
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* EMAIL */}
        <AuthInput
          label="Email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          error={errors.email}
        />

        {/* PASSWORD */}
        <AuthInput
          label="Kata sandi"
          type="password"
          placeholder="Masukkan kata sandimu"
          autoComplete="current-password"
          value={password}
          onChange={handlePasswordChange}
          showPassword={showPassword}
          togglePassword={() =>
            setShowPassword((prev) => !prev)
          }
          error={errors.password}
        />

        {/* =================================
            REMEMBER ME + FORGOT PASSWORD
        ================================== */}
        <div
          className="
            flex
            items-center
            justify-between
            pt-1
          "
        >
          {/* Remember Me */}
          <label
            htmlFor="remember-me"
            className="
              flex
              items-center
              gap-2
              cursor-pointer
              text-sm
              text-slate-600
              hover:text-slate-700
            "
          >
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
              className="
                w-4
                h-4
                shrink-0
                rounded
                border-slate-300
                text-brand-600
                focus:ring-2
                focus:ring-brand-500
                focus:ring-offset-0
                cursor-pointer
              "
            />
            <span>
              Ingat saya
            </span>
          </label>

          {/* Forgot Password */}
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="
              text-sm
              font-semibold
              text-brand-600
              hover:text-brand-700
              hover:underline
              cursor-pointer
              transition-colors
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-brand-500
              focus-visible:ring-offset-1
              rounded
            "
          >
            Lupa password?
          </button>
        </div>

        {/* =================================
            LOGIN BUTTON (CONFIDENT & PURPOSEFUL)
        ================================== */}
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="
            w-full
            min-h-[44px]
            py-3
            px-5
            rounded-xl
            bg-brand-600
            hover:bg-brand-700
            active:bg-brand-800
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-brand-500
            focus-visible:ring-offset-2
            text-white
            text-sm
            font-bold
            tracking-wide
            flex
            items-center
            justify-center
            shadow-sm
            hover:shadow
            active:scale-[0.99]
            transition-all
            duration-150
            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:active:scale-100
            cursor-pointer
          "
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span
                className="
                  w-4
                  h-4
                  border-2
                  border-white/30
                  border-t-white
                  rounded-full
                  animate-spin
                "
              />
              <span>Memproses...</span>
            </span>
          ) : (
            <span>Masuk</span>
          )}
        </button>
      </form>

      {/* =====================================
          REGISTER LINK
      ====================================== */}
      <p className="text-center mt-6 text-sm text-slate-600">
        Belum punya akun?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded"
        >
          Gabung sekarang
        </button>
      </p>
    </AuthLayout>
  );
}