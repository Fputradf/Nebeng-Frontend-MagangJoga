import heroCarWave from '../../assets/hero-car-wave.jpg';
import MitraLeadLandingTemplate from './components/MitraLeadLandingTemplate';
import {
  IconIncomeGrowth,
  IconQrManifest,
  IconPosHub,
  IconVerifiedShield,
  IconStepForm,
  IconStepCheck,
} from './components/MitraDuotoneIcons';

const POS_HIGHLIGHTS = [
  {
    icon: IconIncomeGrowth,
    title: 'Tambahan Omzet Usaha',
    desc: 'Dapatkan komisi dari setiap penumpang maupun paket yang check-in dan serah terima di pos Anda.',
  },
  {
    icon: IconQrManifest,
    title: 'Sistem Scan QR & Manifest Digital',
    desc: 'Kelola kedatangan driver, validasi tiket, dan serah terima barang cukup dari dashboard operator.',
  },
  {
    icon: IconPosHub,
    title: 'Maksimalkan Lokasi Strategis',
    desc: 'Cocok untuk ruko, warung, agen ekspedisi, atau titik kumpul strategis di jalur antarkota.',
  },
  {
    icon: IconVerifiedShield,
    title: 'Pendampingan Tim Regional',
    desc: 'Pelatihan penggunaan aplikasi operator pos dan dukungan operasional penuh dari tim wilayah.',
  },
];

const POS_STEPS = [
  {
    icon: IconStepForm,
    title: 'Masuk ke Portal Operator Pos',
    desc: 'Login ke akun operator pos Anda untuk mengakses dashboard manajemen titik drop-off.',
    checklist: [
      'Masuk melalui halaman Login dengan akun Operator Pos terdaftar',
      'Buka dashboard pos untuk melihat jadwal armada masuk dan keluar',
    ],
  },
  {
    icon: IconVerifiedShield,
    title: 'Validasi Titik & Regional',
    desc: 'Tim regional memastikan titik pos Anda terhubung dengan rute dan jadwal armada aktif.',
    checklist: [
      'Pastikan alamat titik pos dan jam operasional sudah sesuai',
      'Aktivasi fitur scan QR dan manifest digital bersama tim regional',
    ],
  },
  {
    icon: IconStepCheck,
    title: 'Mulai Layanan Pos',
    desc: 'Lokasi Anda siap melayani check-in penumpang, scan QR, dan serah terima paket.',
    checklist: [
      'Lakukan scan QR tiket penumpang dan paket saat serah terima',
      'Pantau laporan transaksi dan komisi pos secara real-time',
    ],
  },
];

export default function MitraPosLandingPage() {
  return (
    <MitraLeadLandingTemplate
      heroImage={heroCarWave}
      heroImageAlt="Armada dan rute layanan Mitra Pos SatuRute"
      badgeText="Kemitraan Pos & Agen Resmi"
      title="Jadikan Lokasi Anda Titik Resmi Mitra Pos Antarkota"
      subtitle="Ubah tempat usaha strategis Anda menjadi titik kumpul penumpang dan drop-off paket resmi dengan sistem digital terintegrasi."
      highlights={POS_HIGHLIGHTS}
      steps={POS_STEPS}
      ctaSectionTitle="Punya Lokasi Usaha untuk Titik Drop-off?"
      ctaButtonLabel="Masuk ke Portal Pos"
      otherLandingLink={{
        label: 'Lihat Kemitraan Mitra Driver',
        to: '/mitra-driver',
      }}
    />
  );
}
