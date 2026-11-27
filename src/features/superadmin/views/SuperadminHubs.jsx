import {
  ShieldCheck,
  UserCheck,
  MapPin,
  Car,
  FileCheck,
  ShoppingBag,
  CreditCard,
  Landmark,
  Users,
  ShieldAlert,
  AlertTriangle,
  Image as ImageIcon,
  Ticket,
  Gift,
  SlidersHorizontal,
  Share2,
  Siren,
} from 'lucide-react';
import SuperadminTabbedHub from '../components/SuperadminTabbedHub';

import RegionsManagement from './RegionsManagement';
import RegionalAdminsManagement from './RegionalAdminsManagement';
import PosMitraManagement from '../../regional/views/PosMitraManagement';

import DriverManagement from './DriverManagement';
import VerificationCenterPage from '../../regional/views/VerificationCenter';

import PricingManagement from './PricingManagement';
import PaymentGatewayManagement from './PaymentGatewayManagement';
import DisbursementBankManagement from './DisbursementBankManagement';

import UserGovernance from './UserGovernance';
import ReportManagement from '../../regional/views/ReportManagement';
import SanctionManagement from './SanctionManagement';
import SosLogsManagement from './SosLogsManagement';

import BannerManagement from './BannerManagement';
import VoucherManagement from './VoucherManagement';
import MerchandiseManagement from './MerchandiseManagement';

import AppConfigManagement from './AppConfigManagement';
import SocialLinksManagement from './SocialLinksManagement';

const WILAYAH_POS_TABS = [
  { key: 'wilayah', label: 'Manajemen Wilayah', icon: ShieldCheck, path: '/admin/wilayah', component: RegionsManagement },
  { key: 'admin-wilayah', label: 'Admin Wilayah', icon: UserCheck, path: '/admin/admin-wilayah', component: RegionalAdminsManagement },
  { key: 'pos-mitra', label: 'Pos Mitra', icon: MapPin, path: '/admin/pos-mitra', component: PosMitraManagement },
];

const DRIVER_KYC_TABS = [
  { key: 'driver', label: 'Manajemen Driver', icon: Car, path: '/admin/driver', component: DriverManagement },
  { key: 'verifikasi-kyc', label: 'Verifikasi KYC', icon: FileCheck, path: '/admin/verifikasi-kyc', component: VerificationCenterPage },
];

const TARIF_PEMBAYARAN_TABS = [
  { key: 'tarif', label: 'Konfigurasi Tarif', icon: ShoppingBag, path: '/admin/tarif', component: PricingManagement },
  { key: 'pembayaran', label: 'Gateway Pembayaran', icon: CreditCard, path: '/admin/pembayaran', component: PaymentGatewayManagement },
  { key: 'bank-pencairan', label: 'Bank Pencairan', icon: Landmark, path: '/admin/bank-pencairan', component: DisbursementBankManagement },
];

const KEPATUHAN_USER_TABS = [
  { key: 'governance', label: 'User Governance', icon: Users, path: '/admin/governance', component: UserGovernance },
  { key: 'reports', label: 'Laporan Pelanggaran', icon: ShieldAlert, path: '/admin/reports', component: ReportManagement },
  { key: 'sanksi', label: 'Konfigurasi Sanksi', icon: AlertTriangle, path: '/admin/sanksi', component: SanctionManagement },
  { key: 'sos-logs', label: 'Log Darurat SOS', icon: Siren, path: '/admin/sos-logs', component: SosLogsManagement },
];

const PROMO_KONTEN_TABS = [
  { key: 'banner', label: 'Banner', icon: ImageIcon, path: '/admin/banner', component: BannerManagement },
  { key: 'voucher', label: 'Voucher', icon: Ticket, path: '/admin/voucher', component: VoucherManagement },
  { key: 'merchandise', label: 'Merchandise', icon: Gift, path: '/admin/merchandise', component: MerchandiseManagement },
];

const BRANDING_SOSIAL_TABS = [
  { key: 'konfigurasi-aplikasi', label: 'Logo & Nama Aplikasi', icon: SlidersHorizontal, path: '/admin/konfigurasi-aplikasi', component: AppConfigManagement },
  { key: 'sosial-link', label: 'Sosial Link', icon: Share2, path: '/admin/sosial-link', component: SocialLinksManagement },
];

export function WilayahPosHub({ defaultTab = 'wilayah' }) {
  return <SuperadminTabbedHub tabs={WILAYAH_POS_TABS} defaultTab={defaultTab} />;
}

export function DriverKycHub({ defaultTab = 'driver' }) {
  return <SuperadminTabbedHub tabs={DRIVER_KYC_TABS} defaultTab={defaultTab} />;
}

export function TarifPembayaranHub({ defaultTab = 'tarif' }) {
  return <SuperadminTabbedHub tabs={TARIF_PEMBAYARAN_TABS} defaultTab={defaultTab} />;
}

export function KepatuhanUserHub({ defaultTab = 'governance' }) {
  return <SuperadminTabbedHub tabs={KEPATUHAN_USER_TABS} defaultTab={defaultTab} />;
}

export function PromoKontenHub({ defaultTab = 'banner' }) {
  return <SuperadminTabbedHub tabs={PROMO_KONTEN_TABS} defaultTab={defaultTab} />;
}

export function BrandingSosialHub({ defaultTab = 'konfigurasi-aplikasi' }) {
  return <SuperadminTabbedHub tabs={BRANDING_SOSIAL_TABS} defaultTab={defaultTab} />;
}
