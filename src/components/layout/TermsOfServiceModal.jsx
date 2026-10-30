import { useEffect } from 'react';
import { X, FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function TermsOfServiceModal({ isOpen, onClose, onAccept }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tos-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tos-modal-title" className="text-base sm:text-lg font-bold text-white">
                Syarat & Ketentuan Layanan
              </h2>
              <p className="text-xs text-blue-100">
                Aturan operasional dan etika penggunaan platform Nebeng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal syarat dan ketentuan"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/80 text-blue-900 flex items-center gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Harap baca dengan cermat ketentuan sebelum menggunakan platform Nebeng.</span>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 flex items-center justify-center font-bold">1</span>
              Ketentuan Akun & Pendaftaran
            </h3>
            <p className="pl-6 text-slate-600">
              Pengguna wajib mendaftarkan data identitas asli yang valid (nama lengkap, nomor telepon aktif, dan email resmi). Penyalahgunaan identitas orang lain dapat mengakibatkan pemblokiran akun permanen.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 flex items-center justify-center font-bold">2</span>
              Sistem Escrow & Transaksi Aman
            </h3>
            <p className="pl-6 text-slate-600">
              Semua transaksi ongkos perjalanan dan kargo wajib melalui dompet digital Nebeng yang dilindungi proteksi escrow. Dana pengemudi dicairkan hanya setelah perjalanan dikonfirmasi tiba dengan sukses.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 flex items-center justify-center font-bold">3</span>
              Peraturan Penjemputan di Pos Mitra
            </h3>
            <p className="pl-6 text-slate-600">
              Seluruh perjalanan wajib diawali dan diakhiri pada Pos Mitra resmi yang telah terdaftar dalam sistem Nebeng. Penumpang wajib tiba minimal 15 menit sebelum waktu keberangkatan untuk proses validasi QR code oleh Operator Pos.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 flex items-center justify-center font-bold">4</span>
              Larangan Bawaan & Keamanan
            </h3>
            <p className="pl-6 text-slate-600">
              Dilarang keras membawa narkotika, barang terlarang, senjata tajam/api, atau benda berbahaya lainnya. Muatan kargo tidak boleh melebihi batas bobot/dimensi yang dipesan.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 flex items-center justify-center font-bold">5</span>
              Kebijakan Pembatalan & Pengembalian Dana
            </h3>
            <p className="pl-6 text-slate-600">
              Pembatalan yang diajukan lebih dari 6 jam sebelum keberangkatan berhak mendapatkan refund 100% ke saldo Dompet Nebeng. Pembatalan 2-6 jam dikenakan potongan 15% untuk kompensasi persiapan mitra.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              if (onAccept) onAccept();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saya Mengerti & Setujui</span>
          </button>
        </div>
      </div>
    </div>
  );
}

