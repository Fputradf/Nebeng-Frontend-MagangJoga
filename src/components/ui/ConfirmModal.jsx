import { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, Info, X } from 'lucide-react';

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    badgeBg: 'bg-rose-50 text-rose-600 ring-8 ring-rose-50/70',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-200',
    defaultConfirmText: 'Hapus',
  },
  warning: {
    icon: AlertTriangle,
    badgeBg: 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/70',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm shadow-amber-200',
    defaultConfirmText: 'Lanjutkan',
  },
  info: {
    icon: Info,
    badgeBg: 'bg-blue-50 text-[#10367D] ring-8 ring-blue-50/70',
    buttonBg: 'bg-[#10367D] hover:bg-[#0C2C66] active:bg-[#081e46] text-white shadow-sm shadow-blue-200',
    defaultConfirmText: 'Konfirmasi',
  },
  primary: {
    icon: HelpCircle,
    badgeBg: 'bg-blue-50 text-[#10367D] ring-8 ring-blue-50/70',
    buttonBg: 'bg-[#10367D] hover:bg-[#0C2C66] active:bg-[#081e46] text-white shadow-sm shadow-blue-200',
    defaultConfirmText: 'Ya, Lanjutkan',
  },
  default: {
    icon: HelpCircle,
    badgeBg: 'bg-slate-50 text-slate-700 ring-8 ring-slate-100/70',
    buttonBg: 'bg-[#10367D] hover:bg-[#0C2C66] active:bg-[#081e46] text-white shadow-sm shadow-blue-200',
    defaultConfirmText: 'Ya, Lanjutkan',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText,
  cancelText = 'Batal',
  variant = 'danger',
  icon: CustomIcon,
  isLoading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const currentVariant = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;
  const IconComponent = CustomIcon || currentVariant.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-['Inter']"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-neutral-100 flex flex-col items-center text-center transform transition-all animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup X di pojok kanan atas */}
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Header Berpusat */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform ${currentVariant.badgeBg}`}
        >
          <IconComponent className="w-7 h-7" />
        </div>

        {/* Judul Modal */}
        <h3
          id="confirm-modal-title"
          className="text-lg font-bold text-neutral-900 leading-snug px-4"
        >
          {title}
        </h3>

        {/* Deskripsi Pesan */}
        <div
          id="confirm-modal-desc"
          className="text-sm text-neutral-500 mt-2 leading-relaxed whitespace-pre-line px-2"
        >
          {message}
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3 pt-5 mt-3 border-t border-neutral-100 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 sm:py-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-700 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${currentVariant.buttonBg}`}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmText || currentVariant.defaultConfirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
