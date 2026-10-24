import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AuthInput from '../../components/ui/AuthInput';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { loginRequest } from '../../services/authService';
import logoImage from '../../assets/logo.png';

export default function Login({ onSwitchToRegister, onSwitchToForgotPassword, onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { registerToken } = useNotification();

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
      title={<>Halo lagi!</>}
      subtitle="Udah siap lanjut perjalanan?"
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
              font-medium
              text-brand-600
              hover:text-brand-700
              cursor-pointer
              transition-colors
            "
          >
            Lupa password?
          </button>
        </div>

        {/* =================================
            LOGIN BUTTON
        ================================== */}
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="
            w-full
            py-3
            px-4

            rounded-xl

            bg-brand-900
            hover:bg-brand-800
            focus:outline-none
            focus:ring-2
            focus:ring-brand-500
            focus:ring-offset-2

            text-white
            text-sm
            font-medium

            flex
            items-center
            justify-center
            gap-2

            transition-all
            duration-200

            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:hover:bg-brand-900

            cursor-pointer
          "
        >
          {isSubmitting ? (
            <>
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

              <span>
                Memproses...
              </span>
            </>
          ) : (
            <>
              <span>
                Masuk
              </span>

              <ArrowRight
                className="
                  w-4
                  h-4
                  shrink-0
                "
              />
            </>
          )}
        </button>
      </form>

      {/* =====================================
          REGISTER LINK
      ====================================== */}
      <p
        className="
          text-center
          mt-6

          text-sm
          text-slate-500
        "
      >
        Belum punya akun?{' '}

        <button
          type="button"
          onClick={onSwitchToRegister}
          className="
            font-medium
            text-brand-600

            hover:text-brand-700

            transition-colors
            cursor-pointer
          "
        >
          Gabung sekarang
        </button>
      </p>
    </AuthLayout>
  );
}