import heroCarWave from '../../assets/hero-car-wave.jpg';
import MitraLeadLandingTemplate from './components/MitraLeadLandingTemplate';
import {
  IconIncomeGrowth,
  IconVerifiedShield,
  IconFlexibleSchedule,
  IconFleetVehicle,
  IconStepForm,
  IconStepCheck,
} from './components/MitraDuotoneIcons';

const DRIVER_HIGHLIGHTS = [
  {
    icon: IconIncomeGrowth,
    title: 'Pendapatan Transparan',
    desc: 'Tarif rute jelas sejak awal dengan pencairan dana saldo yang cepat ke rekening terdaftar.',
  },
  {
    icon: IconVerifiedShield,
    title: 'Penumpang & Paket Terverifikasi',
    desc: 'Semua order melewati sistem pos resmi dan verifikasi QR untuk keamanan perjalanan.',
  },
  {
    icon: IconFlexibleSchedule,
    title: 'Jadwal Keberangkatan Fleksibel',
    desc: 'Atur jadwal trip motor atau mobil sesuai rute dan ketersediaan waktu Anda sendiri.',
  },
  {
    icon: IconFleetVehicle,
    title: 'Dukungan Motor & Mobil',
    desc: 'Tersedia kategori SatuRute Motor, Mobil Penumpang, hingga pengiriman barang antarkota.',
  },
];

const DRIVER_STEPS = [
  {
    icon: IconStepForm,
    title: 'Masuk ke Akun Mitra',
    desc: 'Login menggunakan akun Anda atau lengkapi pendaftaran akun mitra melalui halaman masuk.',
    duration: 'Estimasi ~2 menit',
    checklist: [
      'Akses halaman Login menggunakan nomor HP atau email terdaftar',
      'Pilih peran Mitra Driver untuk masuk ke portal pengemudi',
    ],
  },
  {
    icon: IconVerifiedShield,
    title: 'Verifikasi Dokumen & KYC',
    desc: 'Lengkapi verifikasi KTP, SIM, dan data kendaraan Anda untuk aktivasi status pengemudi.',
    duration: 'Proses verifikasi cepat',
    checklist: [
      'Unggah foto KTP dan SIM aktif sesuai jenis kendaraan',
      'Lengkapi detail kendaraan (Motor atau Mobil) & plat nomor',
    ],
  },
  {
    icon: IconStepCheck,
    title: 'Mulai Terima Order',
    desc: 'Setelah akun aktif, Anda bisa langsung membuat jadwal trip dan menerima penumpang atau paket.',
    duration: 'Siap beroperasi',
    checklist: [
      'Atur rute pos asal dan pos tujuan sesuai jadwal Anda',
      'Terima order penumpang maupun pengiriman barang dengan sistem escrow',
    ],
  },
];

export default function MitraDriverLandingPage() {
  return (
    <MitraLeadLandingTemplate
      heroImage={heroCarWave}
      heroImageAlt="Armada kendaraan Mitra Driver SatuRute"
      badgeText="Kemitraan Pengemudi Resmi"
      title="Gabung Jadi Mitra Driver & Raih Penghasilan Antarkota"
      subtitle="Jadwal fleksibel, penumpang dan paket terverifikasi dari pos resmi, serta sistem pembayaran aman tanpa ribet."
      highlights={DRIVER_HIGHLIGHTS}
      steps={DRIVER_STEPS}
      ctaSectionTitle="Siap Mulai Perjalanan Bersama SatuRute?"
      ctaSectionSubtitle="Masuk ke portal Mitra Driver sekarang untuk mengatur jadwal trip dan menerima order antarkota."
      ctaButtonLabel="Masuk ke Portal Mitra"
      otherLandingLink={{
        label: 'Lihat Kemitraan Mitra Pos',
        to: '/mitra-pos',
      }}
    />
  );
}
