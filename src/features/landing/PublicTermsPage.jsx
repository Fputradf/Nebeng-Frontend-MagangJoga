import { useNavigate } from 'react-router-dom';
import { FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import LandingNavbar from './components/LandingNavbar';

const TERMS_SECTIONS = [
  {
    number: '1',
    title: 'Ketentuan Akun & Pendaftaran',
    body: 'Pengguna wajib mendaftarkan data identitas asli yang valid (nama lengkap, nomor telepon aktif, dan email resmi). Penyalahgunaan identitas orang lain dapat mengakibatkan pemblokiran akun permanen.',
  },
  {
    number: '2',
    title: 'Sistem Pembayaran Aman & Transaksi Terlindungi',
    body: 'Semua transaksi ongkos perjalanan dan kargo wajib melalui dompet digital SatuRute yang dilindungi sistem pembayaran aman. Dana pengemudi dicairkan hanya setelah perjalanan dikonfirmasi tiba dengan sukses.',
  },
  {
    number: '3',
    title: 'Peraturan Penjemputan di Pos Mitra',
    body: 'Seluruh perjalanan wajib diawali dan diakhiri pada Pos Mitra resmi yang telah terdaftar dalam sistem SatuRute. Penumpang wajib tiba minimal 15 menit sebelum waktu keberangkatan untuk proses validasi QR code oleh Mitra Pos.',
  },
  {
    number: '4',
    title: 'Larangan Bawaan & Keamanan',
    body: 'Dilarang keras membawa narkotika, barang terlarang, senjata tajam/api, atau benda berbahaya lainnya. Muatan kargo tidak boleh melebihi batas bobot/dimensi yang dipesan.',
  },
  {
    number: '5',
    title: 'Kebijakan Pembatalan & Pengembalian Dana',
    body: 'Pembatalan yang diajukan lebih dari 6 jam sebelum keberangkatan berhak mendapatkan refund 100% ke saldo Dompet SatuRute. Pembatalan 2–6 jam dikenakan potongan 15% untuk kompensasi persiapan mitra.',
  },
];

export default function PublicTermsPage() {
  const navigate = useNavigate();
  const { appName } = useAppConfig();
  const brandName = appName || 'SatuRute';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <LandingNavbar isLight={true} />

      {/* Main Card */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
          <div className="px-6 py-6 bg-gradient-to-r from-[#0b3ba8] via-[#1356d6] to-[#2684ff] text-white flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Syarat &amp; Ketentuan Layanan
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Aturan operasional dan etika penggunaan platform {brandName}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-sm text-slate-600 leading-relaxed">
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900 flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Harap baca dengan cermat ketentuan berikut sebelum menggunakan platform {brandName}.</span>
            </div>

            {TERMS_SECTIONS.map((sec) => (
              <div key={sec.number} className="space-y-1.5">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  <span className="w-6 h-6 rounded-full bg-brand-50 text-xs text-brand-700 flex items-center justify-center font-bold shrink-0">
                    {sec.number}
                  </span>
                  <span>{sec.title}</span>
                </h2>
                <p className="pl-8 text-slate-600">{sec.body}</p>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Kembali ke Beranda
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Daftar Akun {brandName}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
