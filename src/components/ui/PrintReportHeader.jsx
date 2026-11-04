import logoImage from '../../assets/LOGO.png';

/**
 * Komponen Kop Surat & Header Dokumen Resmi untuk Cetak PDF.
 * Hanya tampil saat print (hidden print:block).
 */
export default function PrintReportHeader({
  title = 'LAPORAN RESMI',
  subtitle = 'NEBENG SMART MOBILITY SYSTEM',
  documentNumber,
  printedAt,
  printedBy,
  extraMeta = [],
}) {
  const defaultDate = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayDate = printedAt || defaultDate;

  return (
    <div className="hidden print:block pb-5 mb-6 border-b border-slate-300">
      {/* ── KOP SURAT ATAS ── */}
      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3.5">
          <img
            src={logoImage}
            alt="Nebeng Logo"
            className="w-12 h-12 object-contain shrink-0"
          />
          <div>
            <h1 className="text-[17px] font-black uppercase tracking-wider text-slate-900 leading-tight">
              PT NEBENG TRANSPORT INDONESIA
            </h1>
            <p className="text-[11px] font-bold text-[#10367D] uppercase tracking-wide">
              {subtitle}
            </p>
            <p className="text-[10px] text-slate-500">
              Sistem Otomasi Transportasi & Logistik Terintegrasi • www.nebeng.id
            </p>
          </div>
        </div>

        {/* Badge Klasifikasi Dokumen */}
        <div className="text-right">
          <span className="inline-block px-2.5 py-1 border border-slate-800 text-[10px] font-black tracking-widest uppercase text-slate-900 rounded">
            DOKUMEN RESMI SISTEM
          </span>
          <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
            Sifat: Rahasia & Terverifikasi
          </p>
        </div>
      </div>

      {/* ── GARIS KOP GANDA (Corporate Double Line) ── */}
      <div className="space-y-[2px] pb-4">
        <div className="h-[2.5px] bg-[#10367D] w-full" />
        <div className="h-[1px] bg-[#74B4D9] w-full" />
      </div>

      {/* ── JUDUL DOKUMEN ── */}
      <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded mb-4">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wide text-slate-900">
          {title}
        </h2>
      </div>

      {/* ── METADATA DOKUMEN DALAM GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white border border-slate-200 rounded p-2.5 text-[10.5px]">
        <div>
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Nomor Dokumen</span>
          <span className="font-bold font-mono text-slate-800">
            {documentNumber || `DOC/NBG/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Waktu Pencetakan</span>
          <span className="font-semibold text-slate-800">{displayDate}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Otoritas / Petugas</span>
          <span className="font-semibold text-slate-800 truncate block">
            {printedBy || 'Sistem Terverifikasi'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Keabsahan Data</span>
          <span className="font-bold text-emerald-700">Digital Validated (Live DB)</span>
        </div>
        {extraMeta.map((item, index) => (
          <div key={index} className="pt-1 border-t border-slate-100 col-span-1">
            <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">{item.label}</span>
            <span className="font-semibold text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

