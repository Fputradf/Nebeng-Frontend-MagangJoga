import { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
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
      aria-labelledby="privacy-modal-title"
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-base sm:text-lg font-bold text-white">
                Kebijakan Privasi Nebeng
              </h2>
              <p className="text-xs text-blue-100">
                Kepatuhan Standar UU Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal kebijakan privasi"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#10367D] flex items-center justify-center text-xs">
                1
              </div>
              <h3>Prinsip Utama Privasi di Platform Nebeng</h3>
            </div>
            <p className="text-slate-600 pl-8">
              Platform Nebeng beroperasi dengan prinsip keamanan, transparansi, dan perlindungan data pribadi penuh. Kami hanya mengumpulkan informasi yang benar-benar esensial untuk memverifikasi keamanan perjalanan antarkota dan mencegah kejahatan atau penipuan tiket.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#10367D] flex items-center justify-center text-xs">
                2
              </div>
              <h3>Data yang Dikumpulkan & Tujuannya</h3>
            </div>
            <div className="pl-8 space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800">A. Data Biometrik & Identitas (KTP, Wajah):</span>
                <p className="text-slate-600 mt-0.5">
                  Digunakan eksklusif untuk verifikasi <em>anti-fraud</em> oleh Admin Wilayah. Foto KTP tidak pernah ditampilkan kepada sesama penumpang atau publik.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800">B. Data Lokasi & GPS:</span>
                <p className="text-slate-600 mt-0.5">
                  Pelacakan GPS hanya aktif ketika armada berada dalam trip perjalanan untuk pemantauan rute dan keselamatan penumpang di Pos Mitra.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800">C. Data Keuangan & Transaksi Dompet:</span>
                <p className="text-slate-600 mt-0.5">
                  Dana transaksi disimpan aman dalam rekening bersama (Escrow). Detail nomor rekening penarikan mitra dilindungi enkripsi perbankan.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#10367D] flex items-center justify-center text-xs">
                3
              </div>
              <h3>Akses Terbatas oleh Admin Wilayah</h3>
            </div>
            <p className="text-slate-600 pl-8">
              Data pendaftaran dan verifikasi akun hanya dapat diakses oleh Admin Wilayah resmi yang bertugas di yurisdiksi daerah Anda. Setiap akses pemeriksaan dicatat dalam <em>Audit Log</em> yang diawasi oleh Superadmin Pusat.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#10367D] flex items-center justify-center text-xs">
                4
              </div>
              <h3>Hak Pengguna atas Data Pribadi</h3>
            </div>
            <ul className="pl-8 space-y-1.5 list-disc list-inside text-slate-600">
              <li>Hak memperbarui atau mengubah informasi kontak dan kata sandi di Pengaturan Akun.</li>
              <li>Hak meminta penutupan atau penghapusan data akun (Right to be Forgotten).</li>
              <li>Hak melaporkan penyalahgunaan data kepada Admin Wilayah melalui Pusat Bantuan Chat.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#10367D] hover:bg-blue-900 text-white text-xs font-bold transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
          >
            Saya Memahami & Menyetujui
          </button>
        </div>
      </div>
    </div>
  );
}

