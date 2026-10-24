export default function StatCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'emerald',
  icon: Icon,
  variant = 'light', // 'light' | 'primary'
}) {
  const badgeVariants = {
    blue: 'text-[#10367D] bg-[#74B4D9]/20',
    emerald: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
    rose: 'text-rose-700 bg-rose-50',
    neutral: 'text-neutral-600 bg-neutral-100',
  };

  const activeBadgeClass =
    badgeVariants[badgeVariant] || badgeVariants.emerald;

  // PRIMARY CARD (Royal Blue Theme)
  if (variant === 'primary') {
    return (
      <div className="bg-[#10367D] text-white p-5 rounded-2xl shadow-sm flex items-center justify-between font-['Inter']">
        <div>
          <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
            {title}
          </p>

          <p className="text-[21px] sm:text-[23px] font-bold text-white mt-0.5">
            {value}
          </p>

          {badgeText && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${activeBadgeClass}`}
            >
              {badgeText}
            </span>
          )}

          {subtitle && (
            <p className="text-[11px] text-white/80 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="p-2.5 bg-white/10 text-white rounded-xl shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  }

  // LIGHT CARD
  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between font-['Inter']">
      <div>
        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          {title}
        </p>

        <p className="text-[21px] sm:text-[23px] font-bold text-neutral-800 mt-0.5">
          {value}
        </p>

        {badgeText && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${activeBadgeClass}`}
          >
            {badgeText}
          </span>
        )}

        {subtitle && (
          <p className="text-[11px] text-neutral-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {Icon && (
        <div className="p-2.5 bg-[#74B4D9]/15 text-[#10367D] rounded-xl shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}