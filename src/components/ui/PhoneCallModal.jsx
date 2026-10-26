import { useState } from 'react';
import { Phone, MessageCircle, Copy, Check, ExternalLink, X, ShieldAlert } from 'lucide-react';
import BaseModal from './BaseModal';
import { useToast } from '../../context/ToastContext';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';

export default function PhoneCallModal({
  isOpen,
  onClose,
  targetName = 'Pengguna',
  phoneNumber = '',
  role = 'mitra', // 'mitra' atau 'pelanggan'
  tripId = '',
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Normalisasi nomor telepon
  const cleanPhone = (phoneNumber || '').replace(/[^0-9+]/g, '');
  
  // Format untuk WhatsApp: 08xx -> 628xx
  let waNumber = cleanPhone;
  if (waNumber.startsWith('0')) {
    waNumber = '62' + waNumber.substring(1);
  } else if (waNumber.startsWith('+62')) {
    waNumber = waNumber.substring(1);
  }

  const handleCopy = () => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    toast.success('Nomor telepon disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeCall = () => {
    if (!cleanPhone) {
      toast.error('Nomor telepon tidak valid');
      return;
    }
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleOpenWhatsApp = () => {
    if (!waNumber) {
      toast.error('Nomor telepon tidak valid');
      return;
    }
    const textMsg = encodeURIComponent(
      `Halo ${targetName}, saya menghubungi terkait perjalanan Nebeng TRIP #${tripId || '-'}.`
    );
    window.open(`https://wa.me/${waNumber}?text=${textMsg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Hubungi Kontak"
      subtitle={`Panggilan langsung ke ${role === 'mitra' ? 'Mitra Supir' : 'Pelanggan'}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1 font-['Inter']">
        {/* Info Pengguna */}
        <div className="flex items-center gap-3.5 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-[16px] shrink-0 shadow-sm"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            {(targetName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-bold text-neutral-800 truncate">
              {targetName}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[13px] font-semibold text-neutral-600">
                {phoneNumber || 'Nomor tidak tersedia'}
              </span>
              {phoneNumber && (
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Salin nomor"
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
            {tripId && (
              <span className="inline-block text-[11px] font-bold text-blue-600 mt-0.5">
                TRIP #{tripId}
              </span>
            )}
          </div>
        </div>

        {/* Opsi Kontak */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Pilih Metode Panggilan
          </p>

          {/* Opsi 1: Panggilan Seluler / Dialer */}
          <button
            type="button"
            onClick={handleNativeCall}
            className="w-full p-3.5 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[13px] font-bold text-neutral-800">
                  Panggilan Seluler (Dialer)
                </div>
                <div className="text-[11px] text-neutral-400">
                  Buka aplikasi Telepon / Phone di HP atau Laptop
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition" />
          </button>

          {/* Opsi 2: WhatsApp Call / Chat */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full p-3.5 bg-white hover:bg-emerald-50/40 border border-emerald-100 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center group-hover:scale-105 transition shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[13px] font-bold text-emerald-800">
                  WhatsApp Call / Chat
                </div>
                <div className="text-[11px] text-emerald-600/80">
                  Hubungi via WhatsApp Web atau Aplikasi WhatsApp
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-500 group-hover:text-emerald-700 transition" />
          </button>
        </div>

        {/* Catatan Privasi & Etika */}
        <div className="flex items-start gap-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Harap gunakan kontak hanya untuk keperluan koordinasi titik penjemputan atau keamanan perjalanan Nebeng.
          </span>
        </div>

        {/* Tombol Tutup */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[13px] font-bold rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

