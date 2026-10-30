/**
 * FAQ komprehensif seputar Project Nebeng
 * Ditujukan untuk Customer, Mitra Pengemudi, Admin Wilayah, dan Calon Pengguna (Guest).
 */

export const FAQ_CATEGORIES = [
  { id: 'all', label: 'Semua Kategori', icon: 'Layers' },
  { id: 'about', label: 'Tentang Nebeng', icon: 'Sparkles' },
  { id: 'booking', label: 'Pemesanan & Tiket', icon: 'Ticket' },
  { id: 'payment', label: 'Tarif & Dompet', icon: 'Wallet' },
  { id: 'pos', label: 'Pos & Titik Jemput', icon: 'MapPin' },
  { id: 'mitra', label: 'Mitra & Pengemudi', icon: 'Car' },
  { id: 'security', label: 'Keamanan & Verifikasi', icon: 'ShieldCheck' },
];

export const PROJECT_FAQS = [
  // --- TENTANG NEBENG ---
  {
    id: 'faq-about-1',
    category: 'about',
    targetRoles: ['all', 'customer', 'mitra', 'guest'],
    question: 'Apa itu platform Nebeng dan apa bedanya dengan travel biasa?',
    answer: `Nebeng adalah platform ride-sharing perjalanan antar kota dan antar wilayah berbasis pos komunitas terintegrasi.
    
Perbedaan utama Nebeng dengan travel konvensional:
1. **Verifikasi Biometrik & Identitas Ketat**: Seluruh pengguna (Customer & Mitra) diverifikasi oleh Admin Wilayah dan sistem biometrik wajah untuk menjamin keamanan bersama.
2. **Titik Jemput Pos Mitra Resmi**: Penumpang berkumpul di Pos Mitra resmi terdaftar, bukan sembarang pinggir jalan, sehingga waktu keberangkatan tepat waktu dan terpantau operator pos.
3. **Sistem Tiket Digital & QR Code**: Tiket diterbitkan secara digital dengan QR validasi ganda saat check-in di pos asal dan tiba di pos tujuan.
4. **Keamanan Dana (Escrow)**: Pembayaran disimpan aman di dompet digital/escrow dan baru dicairkan ke mitra setelah perjalanan dikonfirmasi selesai dengan selamat.`,
    helpfulCount: 142,
  },
  {
    id: 'faq-about-2',
    category: 'about',
    targetRoles: ['all', 'customer', 'mitra', 'guest'],
    question: 'Siapa itu Admin Wilayah dan apa perannya bagi pengguna?',
    answer: `Admin Wilayah adalah perwakilan operasional resmi Nebeng di tingkat regional (kota/kabupaten). Admin Wilayah bertugas:
- Memverifikasi berkas KTP, SIM, STNK, dan biometrik wajah Mitra & Pengguna di wilayahnya.
- Mengawasi operasional Pos Mitra dan Operator Pos di wilayahnya.
- Menangani kendala langsung (bantuan chat, pelaporan trip darurat, kendala tiket, dan sengketa perjalanan) secara cepat dan tanggap.`,
    helpfulCount: 98,
  },

  // --- PEMESANAN & TIKET ---
  {
    id: 'faq-booking-1',
    category: 'booking',
    targetRoles: ['all', 'customer', 'guest'],
    question: 'Bagaimana cara mencari dan memesan tiket perjalanan di Nebeng?',
    answer: `1. Masuk ke menu **Cari & Booking Trip** di dashboard Customer.
2. Pilih kota keberangkatan, kota tujuan, dan tanggal keberangkatan yang diinginkan.
3. Pilih armada/mitra yang tersedia sesuai jam keberangkatan dan ketersediaan kursi.
4. Tentukan pos keberangkatan dan pos penurunan yang paling dekat dengan lokasi Anda.
5. Selesaikan pembayaran menggunakan Saldo Dompet Nebeng atau metode pembayaran instan.
6. Tiket digital berserta QR Code otomatis muncul di menu **Tickets & Digital QR**.`,
    helpfulCount: 185,
  },
  {
    id: 'faq-booking-2',
    category: 'booking',
    targetRoles: ['all', 'customer'],
    question: 'Berapa menit sebelum keberangkatan saya harus tiba di Pos Mitra?',
    answer: `Penumpang disarankan tiba di Pos Mitra resmi minimal **15–20 menit sebelum jadwal keberangkatan**.
    
Waktu ini diperlukan oleh Operator Pos untuk:
- Melakukan verifikasi identitas dan scan QR tiket digital Anda.
- Pemeriksaan bawaan/bagasi penumpang demi keamanan bersama.
- Penataan tempat duduk sebelum armada diberangkatkan tepat waktu.`,
    helpfulCount: 76,
  },
  {
    id: 'faq-booking-3',
    category: 'booking',
    targetRoles: ['all', 'customer'],
    question: 'Apakah saya bisa membatalkan tiket dan mendapatkan pengembalian dana (refund)?',
    answer: `Ya, pembatalan tiket dapat dilakukan melalui menu **Tickets & Digital QR**:
- **Pembatalan > 6 jam sebelum keberangkatan**: Pengembalian dana 100% ke saldo Dompet Anda tanpa potongan.
- **Pembatalan 2 - 6 jam sebelum keberangkatan**: Pengembalian dana 85% (15% kompensasi mitra).
- **Pembatalan < 2 jam sebelum keberangkatan**: Tiket hangus tidak dapat dikembalikan karena kursi telah dipersiapkan.
- Jika perjalanan dibatalkan sepihak oleh Mitra atau Admin Wilayah, dana Anda akan dikembalikan 100% secara instan.`,
    helpfulCount: 114,
  },

  // --- TARIF & DOMPET ---
  {
    id: 'faq-payment-1',
    category: 'payment',
    targetRoles: ['all', 'customer', 'mitra'],
    question: 'Bagaimana cara kerja Saldo Dompet dan Rekening Bersama (Escrow)?',
    answer: `Nebeng menerapkan sistem **Escrow Terproteksi**:
- Ketika penumpang memesan tiket, dana dipotong dari dompet penumpang dan disimpan aman di rekening penampung (Escrow).
- Dana TIDAK langsung ditransfer ke mitra agar keamanan penumpang terjamin.
- Setelah penumpang tiba di pos tujuan dan scan QR selesai divalidasi oleh Operator Pos, dana secara otomatis dicairkan ke saldo Mitra.
- Sistem ini melindungi penumpang dari penipuan dan menjamin mitra mendapatkan bayaran pasti.`,
    helpfulCount: 153,
  },
  {
    id: 'faq-payment-2',
    category: 'payment',
    targetRoles: ['all', 'customer', 'mitra'],
    question: 'Bagaimana cara Top Up dan Tarik Saldo (Withdraw)?',
    answer: `**Top Up (Customer & Mitra):**
Masuk ke menu Dompet / Saldo, pilih nominal top-up, dan bayar melalui Virtual Account bank atau QRIS. Saldo akan otomatis bertambah dalam hitungan detik.

**Tarik Saldo (Withdraw untuk Mitra):**
Masuk ke menu Saldo & Komisi, pilih Tarik Saldo ke rekening bank terdaftar Anda. Penarikan diproses pada hari kerja dalam waktu 1x24 jam setelah verifikasi otomatis.`,
    helpfulCount: 88,
  },

  // --- POS & TITIK JEMPUT ---
  {
    id: 'faq-pos-1',
    category: 'pos',
    targetRoles: ['all', 'customer', 'mitra'],
    question: 'Kenapa penjemputan harus dilakukan di Pos Mitra dan bukan di sembarang jalan?',
    answer: `Penjemputan di Pos Mitra resmi bertujuan untuk:
1. **Keamanan & Kenyamanan**: Penumpang menunggu di tempat yang aman, terang, beratap, dan memiliki fasilitas ruang tunggu.
2. **Inspeksi Armada**: Operator Pos memeriksa kondisi fisik kendaraan mitra dan kelengkapan keselamatan sebelum perjalanan jauh.
3. **Verifikasi Ganda**: Memastikan nama penumpang di tiket sesuai dengan orang fisik yang naik kendaraan.`,
    helpfulCount: 95,
  },

  // --- MITRA & PENGEMUDI ---
  {
    id: 'faq-mitra-1',
    category: 'mitra',
    targetRoles: ['all', 'mitra', 'guest'],
    question: 'Bagaimana syarat dan cara mendaftar menjadi Mitra Pengemudi Nebeng?',
    answer: `Syarat menjadi Mitra:
- Memiliki KTP & SIM yang masih aktif (SIM A untuk mobil / SIM C untuk motor).
- Memiliki kendaraan pribadi layak jalan dengan STNK aktif dan pajak hidup.
- Foto kendaraan tampak depan, samping, dan pelat nomor jelas.
- Menyelesaikan scan biometrik wajah melalui onboarding di aplikasi.
- Disetujui (Approved) oleh Admin Wilayah setempat setelah verifikasi berkas.`,
    helpfulCount: 167,
  },
  {
    id: 'faq-mitra-2',
    category: 'mitra',
    targetRoles: ['all', 'mitra'],
    question: 'Berapa lama proses verifikasi akun Mitra oleh Admin Wilayah?',
    answer: `Proses verifikasi berkas dan biometrik mitra oleh Admin Wilayah membutuhkan waktu **1x24 jam pada hari kerja**.
    
Jika dalam 24 jam akun Anda belum diverifikasi atau ada berkas yang perlu diperbaiki, Anda dapat langsung mengklik tombol **"Chat dengan Admin"** di menu Pusat Bantuan untuk menanyakan status verifikasi Anda ke Admin Wilayah.`,
    helpfulCount: 130,
  },

  // --- KEAMANAN & PRIVASI ---
  {
    id: 'faq-security-1',
    category: 'security',
    targetRoles: ['all', 'customer', 'mitra', 'guest'],
    question: 'Mengapa Nebeng mewajibkan verifikasi KTP dan Biometrik Wajah?',
    answer: `Perjalanan nebeng antarkota mempertemukan pengemudi dan penumpang dalam satu ruang kendaraan selama beberapa jam. Untuk mencegah kejahatan, akun palsu, atau penipuan:
- Kami memastikan identitas asli setiap orang terdata dengan benar.
- Verifikasi wajah memastikan akun tidak disalahgunakan atau dipinjamkan ke orang lain.
- Data KTP dan biometrik disimpan dengan enkripsi tingkat tinggi (AES-256) dan diawasi ketat oleh Admin Wilayah sesuai standar perlindungan data pribadi (UU PDP).`,
    helpfulCount: 210,
  },
  {
    id: 'faq-security-2',
    category: 'security',
    targetRoles: ['all', 'customer', 'mitra', 'guest'],
    question: 'Apakah data pribadi saya aman dan tidak disebarluaskan?',
    answer: `Sangat aman. Nebeng berkomitmen menjaga privasi pengguna:
- Data KTP dan biometrik Anda HANYA digunakan oleh Admin Wilayah untuk verifikasi keamanan awal.
- Penumpang dan mitra lain HANYA dapat melihat nama depan, foto profil terverifikasi, dan rating Anda.
- Nomor telepon pribadi, nomor KTP, dan alamat rumah tidak pernah dipublikasikan secara terbuka.`,
    helpfulCount: 178,
  },
];

