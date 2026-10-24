/**
 * Indikator memuat: titik bergerak dari asal ke tujuan di sepanjang garis rute.
 * Gerakan ini fungsional (menandakan proses berjalan) dan mati bila perangkat
 * meminta gerakan dikurangi.
 */
export default function FullPageLoader({ label = 'Memuat...' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-canvas font-sans"
    >
      <div aria-hidden="true" className="relative h-4 w-48">
        <span className="absolute inset-x-2 top-1/2 border-t border-dashed border-slate-400" />
        <span className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-white" />
        <span className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-accent" />
        <span className="absolute top-1/2 h-2 w-2 -translate-y-1/2 animate-rute rounded-full bg-brand-500 motion-reduce:animate-none" />
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}