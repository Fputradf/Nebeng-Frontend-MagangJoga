import { useState } from 'react';
import {
  BookOpen,
  QrCode,
  ClipboardList,
  PackageCheck,
  UserCheck,
  ShieldAlert,
  Coins,
  Settings,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_ACCENT = '#74B4D9';

export default function OperatorGuide() {
  const [activeTab, setActiveTab] = useState('checkpoint');

  const GUIDES = [
    {
      id: 'checkpoint',
      title: 'Alur Trip & Konsep Checkpoint',
      icon: QrCode,
      shortDesc: 'Pahami siklus hidup tiket dan aturan pencairan dana escrow antar pos.',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 text-blue-900">
            <h4 className="font-bold text-base mb-1.5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Prinsip Dasar Sistem Pos Nebeng
            </h4>
            <p className="text-sm leading-relaxed text-blue-800">
              Sistem Nebeng menggunakan model <strong>Escrow Checkpoint</strong>. Dana pembayaran customer diamankan di sistem escrow dan <strong>HANYA</strong> dicairkan ke dompet Mitra ketika perjalanan/pengiriman telah diverifikasi tiba di <strong>Pos Tujuan</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-neutral-200 rounded-2xl p-4 bg-white shadow-xs">
              <div className="flex items-center gap-2 mb-2 font-bold text-neutral-800 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                Pos Asal (Origin / Pemberangkatan)
              </div>
              <ul className="text-xs space-y-2 text-neutral-600 leading-relaxed list-disc list-inside">
                <li>Operator melakukan <strong>Scan 1 Asal</strong> pada tiket.</li>
                <li>Status order berubah dari <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono">paid</code> menjadi <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-mono font-bold">in_transit</code>.</li>
                <li>Dana escrow <strong>tetap ditahan (`held`)</strong> di sistem.</li>
                <li>Penumpang naik ke armada mitra dan <strong>melanjutkan perjalanan</strong>.</li>
              </ul>
            </div>

            <div className="border border-neutral-200 rounded-2xl p-4 bg-white shadow-xs">
              <div className="flex items-center gap-2 mb-2 font-bold text-neutral-800 text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">2</span>
                Pos Tujuan (Destination / Kedatangan)
              </div>
              <ul className="text-xs space-y-2 text-neutral-600 leading-relaxed list-disc list-inside">
                <li>Operator melakukan <strong>Scan 2 Tujuan</strong> atau <strong>Handover OTP</strong>.</li>
                <li>Status order berubah dari <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-mono font-bold">in_transit</code> menjadi <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-700 font-mono">completed</code>.</li>
                <li>Dana escrow <strong>dicairkan (`released`)</strong> langsung ke saldo dompet Mitra.</li>
                <li>Perjalanan / pengiriman paket dinyatakan tuntas.</li>
              </ul>
            </div>
          </div>

        </div>
      ),
    },
    {
      id: 'scanner',
      title: 'Dual QR Scanner',
      icon: QrCode,
      shortDesc: 'Panduan memindai QR tiket dan trip untuk check-in pos asal & tujuan.',
      content: (
        <div className="space-y-5">
          <div className="space-y-3">
            <h4 className="font-bold text-neutral-800 text-sm">Langkah Melakukan Scan:</h4>
            <div className="space-y-2.5">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <strong className="text-neutral-800">Pilih Mode Scan:</strong>
                  <p className="text-neutral-600 mt-0.5">
                    Gunakan toggle di sudut kanan atas: <strong>Scan 1 Asal</strong> jika berada di pos pemberangkatan, atau <strong>Scan 2 Tujuan</strong> jika berada di pos kedatangan.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong className="text-neutral-800">Pindai QR Tiket / Paket Customer:</strong>
                  <p className="text-neutral-600 mt-0.5">
                    Klik tombol <strong>Buka Kamera</strong> pada kolom Tiket, lalu arahkan kamera ke layar HP customer. Anda juga bisa mengetik manual kode tiket (cth: <code className="font-mono bg-white px-1 border border-neutral-300 rounded">TKT-123456</code>).
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <strong className="text-neutral-800">QR Trip Mitra (Opsional):</strong>
                  <p className="text-neutral-600 mt-0.5">
                    Kolom ini <em>opsional</em>. Jika dikosongkan, sistem backend secara otomatis menghubungkan tiket ke trip mitra yang bersangkutan.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <strong className="text-neutral-800">Klik Proses Scan:</strong>
                  <p className="text-neutral-600 mt-0.5">
                    Tekan tombol proses. Hasil scan akan langsung muncul di tabel riwayat sesi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'manifest',
      title: 'Manifes & Penanganan No-Show',
      icon: ClipboardList,
      shortDesc: 'Cara mencatat penumpang atau mitra yang tidak hadir tanpa scan QR.',
      content: (
        <div className="space-y-5">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Menu <strong>Manifes & No-Show</strong> digunakan untuk melihat jadwal seluruh trip dan penumpang yang dijadwalkan melewati pos Anda pada tanggal tertentu, serta mencatat ketidakhadiran (mangkir).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-rose-200 bg-rose-50/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                Penumpang No-Show
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Gunakan tombol <strong>Penumpang No-Show</strong> pada baris nama penumpang jika penumpang tidak datang ke pos hingga batas waktu tunggu keberangkatan.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-[11px] text-rose-800">
                <strong>Konsekuensi Sistem:</strong> Tiket dinyatakan hangus (tidak ada refund) karena armada mitra telah siap berangkat di pos.
              </div>
            </div>

            <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                Mitra No-Show
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Gunakan tombol <strong>Mitra No-Show</strong> jika pengemudi/mitra tidak hadir di pos asal padahal penumpang sudah menunggu.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                <strong>Konsekuensi Sistem:</strong> Operator memasukkan alasan, trip dibatalkan, penalti diterapkan pada akun mitra, dan dana penumpang dikembalikan atau dialihkan ke trip lain.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'inspection',
      title: 'Inspeksi & Sealing Paket',
      icon: PackageCheck,
      shortDesc: 'SOP pemeriksaan fisik barang, dokumentasi foto, dan penempelan segel QR.',
      content: (
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Khusus pesanan logistik/barang, paket yang diterima di Pos Asal wajib melalui proses inspeksi fisik demi keselamatan perjalanan dan integritas barang.
          </p>

          <div className="space-y-2.5">
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
              <span className="font-bold text-neutral-800 block">1. Cek Fisik Barang</span>
              <p className="text-neutral-600">Pastikan paket tidak mengandung barang terlarang (narkoba, bahan peledak/mudah terbakar, senjata) dan kemasan aman untuk perjalanan.</p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
              <span className="font-bold text-neutral-800 block">2. Unggah Foto Kondisi Paket (Wajib)</span>
              <p className="text-neutral-600">Ambil foto paket dari kamera HP/laptop. Sistem secara otomatis mengompresi ukuran foto sehingga hemat kuota dan cepat terkirim ke server.</p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
              <span className="font-bold text-neutral-800 block">3. Pindai Segel Keamanan (Security Seal QR)</span>
              <p className="text-neutral-600">Pindai kode barcode/QR pada stiker segel pos fisik, atau tekan tombol <strong>Auto</strong> untuk menghasilkan nomor segel unik dari sistem.</p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
              <span className="font-bold text-neutral-800 block">4. Kunci & Check-in Asal</span>
              <p className="text-neutral-600">Klik tombol submit untuk mengunci segel dan mengubah status paket menjadi siap jalan (<code className="font-mono bg-white px-1 border border-neutral-300 rounded">in_transit</code>).</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'handover',
      title: 'Handover & OTP Serah Terima Paket',
      icon: UserCheck,
      shortDesc: 'Serah terima paket kepada penerima di pos tujuan menggunakan OTP klaim.',
      content: (
        <div className="space-y-4">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Ketika paket tiba di Pos Tujuan dan diambil oleh penerima, operator memverifikasi penyerahan barang pada menu <strong>Handover & OTP</strong>.
          </p>

          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs space-y-2">
            <h5 className="font-bold text-neutral-800">Data yang Diminta dari Penerima:</h5>
            <ol className="list-decimal list-inside space-y-1 text-neutral-600">
              <li><strong>Nama Lengkap Penerima:</strong> Catat nama penerima yang mengambil di pos.</li>
              <li><strong>QR Tiket / Resi:</strong> Pindai dari HP penerima menggunakan kamera atau ketik kode resi.</li>
              <li><strong>Kode OTP 6-Digit:</strong> Penerima menerima 6 angka kode OTP melalui SMS/Aplikasi Nebeng.</li>
            </ol>
          </div>

          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Pencairan Otomatis:</strong> Setelah OTP diverifikasi valid, sistem secara otomatis menandai pesanan selesai dan mencairkan dana pembayaran ke dompet mitra pengantar.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bypass',
      title: 'Penyelesaian Manual (Bypass Finansial)',
      icon: ShieldAlert,
      shortDesc: 'Bypass pencairan escrow saat perangkat penerima padam/rusak (Bukan Cancel).',
      content: (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm text-amber-800">
              <ShieldAlert className="w-4 h-4" />
              Penting: Fitur ini BUKAN Pembatalan (Bukan Cancel)!
            </div>
            <p className="leading-relaxed">
              Fitur ini digunakan untuk <strong>MENYELESAIKAN (`completed`)</strong> transaksi dan melepaskan dana escrow ke Mitra ketika penerima di pos tujuan mengalami kendala teknis (HP mati total, rusak, atau nomor hilang).
            </p>
          </div>

          <h5 className="font-bold text-neutral-800 text-sm">SOP Verifikasi Manual KTP:</h5>
          <ol className="text-xs space-y-2 text-neutral-600 list-decimal list-inside">
            <li>Minta <strong>Kartu Identitas Asli (KTP / SIM)</strong> penerima yang datang ke pos.</li>
            <li>Cocokkan nama pada KTP dengan nama penerima yang tertera pada resi paket.</li>
            <li>Klik tombol <strong>Penyelesaian Manual (Bypass Finansial)</strong> di pojok kanan atas menu Handover.</li>
            <li>Masukkan kode tiket dan tuliskan catatan audit (misal: <em>HP penerima mati, identitas KTP cocok</em>).</li>
            <li>Klik <strong>Lepas Dana Escrow</strong>. Transaksi tuntas dan mitra tetap menerima hak pembayarannya.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'settings',
      title: 'Pengaturan Akun & Keamanan',
      icon: Settings,
      shortDesc: 'Kelola informasi profil, kata sandi, dan data pos penugasan operator.',
      content: (
        <div className="space-y-4 text-xs text-neutral-600">
          <p className="leading-relaxed">
            Menu <strong>Pengaturan Akun</strong> di sidebar dapat digunakan untuk:
          </p>
          <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
            <li>Melihat identitas Pos Resmi tempat Anda ditugaskan oleh Admin Regional.</li>
            <li>Memperbarui nama lengkap, nomor telepon operasional, dan email.</li>
            <li>Mengubah kata sandi akun secara berkala demi keamanan sistem pos.</li>
          </ul>
        </div>
      ),
    },
  ];

  const currentGuide = GUIDES.find((g) => g.id === activeTab) || GUIDES[0];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Pusat Pengetahuan Pos
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Panduan Operasional Operator Pos
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Pelajari tata cara kerja, SOP verifikasi tiket, penanganan logistik, dan pengelolaan checkpoint pos.
            </p>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Navigation Sidebar / List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-2xl p-3 border border-neutral-200 shadow-sm space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-2">
              Daftar Topik Panduan
            </p>
            {GUIDES.map((guide) => {
              const IconComp = guide.icon;
              const isActive = activeTab === guide.id;
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setActiveTab(guide.id)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-[#10367D] text-white shadow-sm'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <IconComp
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isActive ? 'text-white' : 'text-neutral-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate">
                        {guide.title}
                      </span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition ${
                          isActive ? 'text-white' : 'text-neutral-400'
                        }`}
                      />
                    </div>
                    <p
                      className={`text-[11px] line-clamp-1 mt-0.5 ${
                        isActive ? 'text-blue-100' : 'text-neutral-400'
                      }`}
                    >
                      {guide.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Guide Panel */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${PRIMARY_COLOR}12`, color: PRIMARY_COLOR }}
            >
              <currentGuide.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-800">
                {currentGuide.title}
              </h2>
              <p className="text-xs text-neutral-400">
                {currentGuide.shortDesc}
              </p>
            </div>
          </div>

          <div className="pt-2">
            {currentGuide.content}
          </div>
        </div>
      </div>
    </div>
  );
}

