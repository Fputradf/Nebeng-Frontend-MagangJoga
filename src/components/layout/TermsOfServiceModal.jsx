import { X, FileText, CheckCircle2 } from 'lucide-react';

export default function TermsOfServiceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Syarat & Ketentuan Layanan
              </h2>
              <p className="text-xs text-blue-200">
                Aturan operasional dan etika penggunaan platform Nebeng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900">1. Ketentuan Penjemputan di Pos Mitra</h3>
            <p>
              Seluruh perjalanan wajib diawali dan diakhiri pada Pos Mitra resmi yang telah terdaftar dalam sistem Nebeng. Penumpang wajib tiba minimal 15 menit sebelum waktu keberangkatan untuk proses validasi QR code oleh Operator Pos.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900">2. Larangan Bawaan & Keamanan Perjalanan</h3>
            <p>
              Pengguna dilarang keras membawa narkotika, senjata tajam/api, zat berbahaya mudah meledak, hewan tanpa izin khusus, dan barang yang melanggar hukum RI. Operator Pos berhak menolak penumpang yang melanggar ketentuan ini.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900">3. Kebijakan Pembatalan & Pengembalian Dana</h3>
            <p>
              Pembatalan yang diajukan lebih dari 6 jam sebelum keberangkatan berhak mendapatkan refund 100% ke saldo Dompet Nebeng. Pembatalan 2-6 jam dikenakan potongan 15% untuk kompensasi persiapan mitra.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900">4. Peran Admin Wilayah & Bantuan Darurat</h3>
            <p>
              Apabila terjadi sengketa atau kendala operasional dalam perjalanan, Admin Wilayah bertindak sebagai mediator resmi yang berhak menahan atau meneruskan dana escrow sesuai bukti digital pemeriksaan.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#10367D] hover:bg-blue-900 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Saya Setuju & Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

