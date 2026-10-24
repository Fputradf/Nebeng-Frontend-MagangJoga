import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthInput({
  label,
  type = 'text',
  showPassword: externalShowPassword,
  togglePassword: externalTogglePassword,
  error,
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  const isPassword = type === 'password';

  const [internalShowPassword, setInternalShowPassword] =
    useState(false);

  const isControlled =
    externalShowPassword !== undefined;

  const isShowPassword = isControlled
    ? externalShowPassword
    : internalShowPassword;

  const handleToggle = () => {
    if (isControlled) {
      externalTogglePassword?.();
    } else {
      setInternalShowPassword((prev) => !prev);
    }
  };

  return (
    <div className="w-full">

      {/* LABEL */}
      {label && (
        <label
          htmlFor={inputId}
          className="
            block
            mb-2
            text-sm
            font-medium
            text-slate-600
          "
        >
          {label}
        </label>
      )}

      <div className="relative">

        {/* INPUT */}
        <input
          id={inputId}
          type={
            isPassword
              ? isShowPassword
                ? 'text'
                : 'password'
              : type
          }
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : undefined
          }
          className={`
            w-full
            h-10

            pl-4
            ${isPassword ? 'pr-10' : 'pr-4'}

            bg-white
            border

            ${
              error
                ? `
                  border-rose-500
                  focus:border-rose-500
                  focus:ring-rose-500/20
                `
                : `
                  border-slate-300
                  focus:border-brand-500
                  focus:ring-brand-500/20
                `
            }

            rounded-lg

            text-sm

            font-normal
            text-slate-900

            placeholder:text-slate-400
            placeholder:font-normal

            outline-none
            focus:ring-2
            focus:ring-offset-0

            transition-all
            duration-200
          `}
          {...props}
        />

        {/* PASSWORD TOGGLE */}
        {isPassword && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={
              isShowPassword
                ? 'Sembunyikan password'
                : 'Tampilkan password'
            }
            className="
              absolute
              inset-y-0
              right-0
              w-10

              flex
              items-center
              justify-center

              text-slate-400
              hover:text-slate-600

              transition-colors
              duration-150
            "
          >
            {isShowPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

      </div>

      {/* ERROR */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="
            mt-1.5
            ml-1
            text-xs
            font-medium
            text-rose-600
          "
        >
          {error}
        </p>
      )}

    </div>
  );
}