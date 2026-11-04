export default function StatusBadge({
  variant = 'default',
  icon: Icon,
  children,
  className = ''
}) {
  const variants = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-[#4B2172] border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    default: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition ${variants[variant] || variants.default} ${className}`}
    >
      {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}