import { useState, useEffect } from 'react';
import { Clock, Mail, Phone } from 'lucide-react';
import SocialIcon from '../../../components/ui/SocialIcon';
import { useAppConfig } from '../../../context/AppConfigContext';
import { socialLinkService } from '../../../services/socialLinkService';
import logoAsset from '../../../assets/LOGO.png';

const DEFAULT_SOCIAL_LINKS = [
  { id: 'ig', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com' },
  { id: 'tt', platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com' },
  { id: 'fb', platform: 'facebook', label: 'Facebook', url: 'https://facebook.com' },
];

export default function LandingFooter() {
  const { appName, appLogo } = useAppConfig();
  const brandName = appName || 'SatuRute';
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSocialLinks = async () => {
      try {
        const data = await socialLinkService.getPublicSocialLinks();
        if (isMounted && Array.isArray(data)) {
          setSocialLinks(data.slice(0, 5));
        }
      } catch (err) {
        console.warn('Gagal memuat link sosial media:', err);
      }
    };
    fetchSocialLinks();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="border-t border-slate-200 bg-white pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-200/80">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={appLogo || logoAsset}
                alt={brandName}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = logoAsset;
                }}
              />
              <span className="font-display text-lg font-extrabold text-brand-700">
                {brandName}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              Platform transportasi dan pengiriman barang antarkota berbasis pos resmi terverifikasi dengan perlindungan pembayaran escrow.
            </p>
          </div>

          {/* Kontak Kami */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Kontak Kami
            </h3>
            <div className="space-y-2.5 text-sm text-slate-600">
              <a
                href="mailto:cs@saturute.id"
                className="flex items-center gap-2.5 hover:text-brand-600 transition w-fit"
              >
                <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                <span>cs@saturute.id</span>
              </a>
              <a
                href="tel:+6281122334455"
                className="flex items-center gap-2.5 hover:text-brand-600 transition w-fit"
              >
                <Phone className="w-4 h-4 text-brand-600 shrink-0" />
                <span>0811-2233-4455</span>
              </a>
              <div className="flex items-center gap-2.5 text-slate-500">
                <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Senin – Minggu, 06.00 – 22.00 WIB</span>
              </div>
            </div>
          </div>

          {/* Sosial Media */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Ikuti Kami
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dapatkan info promo dan rute terbaru melalui kanal resmi kami.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {(socialLinks.length > 0 ? socialLinks : DEFAULT_SOCIAL_LINKS).map((item) => (
                <a
                  key={item.id || item.platform}
                  href={item.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label || item.platform || 'Sosial Media'}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-600 hover:text-brand-600 flex items-center justify-center transition"
                >
                  <SocialIcon
                    platform={item.platform}
                    logoUrl={item.logoUrl || item.platform}
                    iconType={item.iconType}
                    className="w-4 h-4"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            &copy; {new Date().getFullYear()} <strong className="font-bold text-slate-700">{brandName}</strong>. Hak Cipta Dilindungi.
          </span>
          <span>Layanan Tumpangan &amp; Logistik Antarkota Resmi</span>
        </div>
      </div>
    </footer>
  );
}
