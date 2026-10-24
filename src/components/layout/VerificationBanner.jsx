import { Link, useLocation } from 'react-router-dom';

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

// Urutan nyata: akun dibuat, lalu diverifikasi Admin Regional, lalu disetujui.
const STOPS = ['Akun dibuat', 'Verifikasi data', 'Disetujui'];
const CURRENT = 1;

const COPY = {
  pending: {
    title: 'Akun menunggu persetujuan Admin Regional',
    body: 'Semua menu selain Onboarding & Verifikasi terbuka otomatis begitu akun Anda disetujui.',
  },
  rejected: {
    title: 'Verifikasi akun ditolak',
    body: 'Periksa data di Onboarding & Verifikasi, perbaiki, lalu kirim ulang.',
  },
};

function Dot({ state, rejected }) {
  if (state === 'done') {
    return (
      <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500">
        <svg viewBox="0 0 12 12" className="h-2 w-2 text-white" aria-hidden="true">
          <path
            d="M2.5 6.2l2.2 2.2L9.5 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span
        className={`relative z-10 h-4 w-4 rounded-full border-2 ${
          rejected ? 'border-status-danger-text bg-status-danger-bg' : 'border-brand-500 bg-accent'
        }`}
      />
    );
  }
  return <span className="relative z-10 h-4 w-4 rounded-full border-2 border-slate-300 bg-white" />;
}

/**
 * Banner status verifikasi mitra. Tahapan memakai motif garis rute.
 * `status`: 'rejected' atau nilai lain (dianggap menunggu).
 */
export default function VerificationBanner({ status, onboardingPath = '/mitra/onboarding' }) {
  const { pathname } = useLocation();
  const rejected = status === 'rejected';
  const copy = COPY[rejected ? 'rejected' : 'pending'];
  const sudahDiOnboarding = pathname.replace(/\/$/, '') === onboardingPath;
  const labels = [STOPS[0], rejected ? 'Ditolak' : STOPS[1], STOPS[2]];

  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:mx-6 sm:p-5 lg:mx-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 md:max-w-md">
          <h2
            className={`font-display text-base font-bold ${
              rejected ? 'text-status-danger-text' : 'text-brand-700'
            }`}
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{copy.body}</p>
          {!sudahDiOnboarding && (
            <Link
              to={onboardingPath}
              className={`mt-3 inline-flex h-11 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 ${FOCUS}`}
            >
              Buka Onboarding & Verifikasi
            </Link>
          )}
        </div>

        <ol
          aria-label="Tahapan verifikasi akun"
          className="relative grid w-full max-w-sm grid-cols-3 md:w-80 md:shrink-0"
        >
          <span
            aria-hidden="true"
            className="absolute left-[16.667%] right-[16.667%] top-[8px] border-t border-dashed border-slate-400"
          />
          <span
            aria-hidden="true"
            className="absolute left-[16.667%] top-[7px] w-[33.333%] border-t-2 border-brand-500"
          />
          {labels.map((label, i) => {
            const state = i < CURRENT ? 'done' : i === CURRENT ? 'current' : 'next';
            return (
              <li
                key={STOPS[i]}
                aria-current={state === 'current' ? 'step' : undefined}
                className="flex flex-col items-center gap-2 text-center"
              >
                <Dot state={state} rejected={rejected} />
                <span
                  className={`text-xs leading-tight ${
                    state === 'current'
                      ? `font-bold ${rejected ? 'text-status-danger-text' : 'text-brand-700'}`
                      : 'font-medium text-slate-600'
                  }`}
                >
                  {label}
                  {state === 'current' && <span className="sr-only"> (tahap saat ini)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}