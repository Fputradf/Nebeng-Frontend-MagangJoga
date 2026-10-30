/**
 * Komponen Lembar Pengesahan & Tanda Tangan Cetak PDF.
 * Hanya tampil saat print (hidden print:block) dan dicegah agar tidak terpotong di tengah halaman (break-inside-avoid).
 */
export default function PrintReportFooter({
  leftSigner = {
    role: 'Disiapkan Oleh,',
    title: 'Penanggung Jawab Teknis',
    name: 'Petugas Pelaksana',
    idLabel: 'ID / NIP',
    idValue: '-',
  },
  rightSigner = {
    role: 'Mengetahui & Mengesahkan,',
    title: 'Direktur / Manajer Terkait',
    name: 'Pejabat Berwenang',
    idLabel: 'ID / NIP',
    idValue: '-',
    locationDate: 'Surakarta, ' + new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  },
  notes = 'Laporan ini sah dan diterbitkan secara digital oleh Nebeng Core Financial Engine. Tidak memerlukan tanda tangan basah untuk keperluan pembuktian internal.',
}) {
  return (
    <div className="hidden print:block pt-8 mt-8 border-t border-slate-300 break-inside-avoid page-break-inside-avoid text-slate-800">
      {/* ── LEMBAR TANDA TANGAN (2 KOLOM) ── */}
      <div className="grid grid-cols-2 gap-12 text-[11px] mb-8">
        {/* Kolom Kiri */}
        <div className="text-center flex flex-col justify-between h-36">
          <div>
            <p className="font-semibold text-slate-600">{leftSigner.role || 'Disiapkan Oleh,'}</p>
            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wide mt-0.5">
              {leftSigner.title}
            </p>
          </div>
          <div>
            <div className="w-44 mx-auto border-b border-slate-800 pb-1 mb-1 font-bold text-slate-900 underline uppercase">
              {leftSigner.name || '( ........................................ )'}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {leftSigner.idLabel ? `${leftSigner.idLabel}: ${leftSigner.idValue || '-'}` : ''}
            </p>
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="text-center flex flex-col justify-between h-36">
          <div>
            <p className="text-slate-600 font-medium">
              {rightSigner.locationDate ||
                `Surakarta, ${new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`}
            </p>
            <p className="font-semibold text-slate-700">{rightSigner.role || 'Mengetahui & Menyetujui,'}</p>
            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wide mt-0.5">
              {rightSigner.title}
            </p>
          </div>
          <div>
            <div className="w-44 mx-auto border-b border-slate-800 pb-1 mb-1 font-bold text-slate-900 underline uppercase">
              {rightSigner.name || '( ........................................ )'}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {rightSigner.idLabel ? `${rightSigner.idLabel}: ${rightSigner.idValue || '-'}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── FOOTER RESMI & WATERMARK KETERCATATAN SISTEM ── */}
      <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
        <p className="max-w-xl">
          {notes}
        </p>
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-slate-700">NEBENG-CORE-SECURE // LIVE-AUDIT-TRAIL</p>
          <p>Halaman Dokumen Resmi</p>
        </div>
      </div>
    </div>
  );
}

