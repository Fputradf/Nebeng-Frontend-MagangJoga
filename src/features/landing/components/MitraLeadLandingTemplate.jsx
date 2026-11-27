import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAppConfig } from '../../../context/AppConfigContext';
import LandingNavbar from './LandingNavbar';
import LandingFooter from './LandingFooter';

export default function MitraLeadLandingTemplate({
  heroImage,
  heroImageAlt = 'Armada SatuRute',
  badgeText,
  title,
  subtitle,
  highlights = [],
  steps = [],
  ctaSectionBadge = 'Mulai Sekarang',
  ctaSectionTitle,
  ctaButtonLabel = 'Masuk ke Portal Mitra',
  otherLandingLink,
}) {
  const navigate = useNavigate();
  const { appName } = useAppConfig();
  const brandName = appName || 'SatuRute';

  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const goToLogin = () => navigate('/login');
  const currentStep = steps[activeStepIndex] || steps[0];
  const progressPercent = steps.length > 0 ? ((activeStepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-slate-900 flex flex-col">
      {/* Hero Section with Vehicle Scene Anchored on the Right */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#05289c] via-[#0736ab] to-[#0288f9] text-white">
        {heroImage && (
          <img
            src={heroImage}
            alt={heroImageAlt}
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-full lg:w-[72%] object-cover object-center select-none"
            style={{
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, #000 22%, #000 100%)',
              maskImage:
                'linear-gradient(to right, transparent 0%, #000 22%, #000 100%)',
            }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#05289c]/95 via-[#05289c]/45 to-transparent lg:via-[#05289c]/25"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <LandingNavbar isLight={false} isScrolled={false} />
        </div>

        <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-24 sm:pt-14 sm:pb-32">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{badgeText}</span>
            </span>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[3rem] font-extrabold tracking-[-0.025em] leading-[1.1] text-white">
              {title}
            </h1>

            <p className="text-sm sm:text-base text-sky-50/95 leading-relaxed max-w-lg">
              {subtitle}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goToLogin}
                className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-sky-50 px-6 py-3.5 text-sm font-extrabold text-[#05289c] shadow-lg transition active:scale-95 cursor-pointer"
              >
                <span>{ctaButtonLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {otherLandingLink && (
                <button
                  type="button"
                  onClick={() => navigate(otherLandingLink.to)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-5 py-3.5 text-sm font-bold text-white transition cursor-pointer"
                >
                  <span>{otherLandingLink.label}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Color-Matched Layered Wave Divider */}
        <div className="relative z-10 w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 96"
            className="w-full h-12 sm:h-20"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,28 C340,88 700,6 1060,54 C1240,78 1360,48 1440,30 L1440,96 L0,96 Z"
              fill="#7CC6FF"
              fillOpacity="0.35"
            />
            <path
              d="M0,46 C310,94 670,18 1030,58 C1225,80 1360,58 1440,42 L1440,96 L0,96 Z"
              fill="#F7FAFF"
            />
          </svg>
        </div>
      </div>

      <main className="flex-1">
        {/* Section 2: Modern Feature Grid */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 space-y-2 max-w-xl">
              <span className="inline-flex items-center rounded-full bg-[#E5F0FF] px-3.5 py-1 text-xs font-bold text-[#0047D6]">
                Keunggulan
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Kenapa Bergabung dengan {brandName}?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-7 hover:border-[#0B6DFF]/40 hover:shadow-md transition duration-200 space-y-4"
                  >
                    <div className="inline-flex items-center justify-center">
                      <Icon className="w-11 h-11 transition-transform duration-200 group-hover:scale-105" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display text-base font-extrabold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3: Interactive Split Stepper */}
        {steps.length > 0 && (
          <section className="py-14 sm:py-20 bg-[#EDF4FF]">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 space-y-2 max-w-xl">
                <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#0047D6] shadow-xs">
                  Alur Pendaftaran
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Proses Bergabung Sangat Mudah
                </h2>
              </div>

              {/* Animated Progress Bar */}
              <div className="mb-6 h-1.5 w-full rounded-full bg-blue-200/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0B6DFF] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left: Interactive Step List */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  {steps.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    return (
                      <button
                        key={step.title}
                        type="button"
                        onClick={() => setActiveStepIndex(index)}
                        aria-pressed={isActive}
                        className={`w-full text-left rounded-2xl p-4 sm:p-5 border transition flex items-center justify-between gap-4 cursor-pointer ${
                          isActive
                            ? 'bg-white border-[#0B6DFF] shadow-sm'
                            : 'bg-white/60 border-transparent hover:bg-white/90'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold transition ${
                              isActive
                                ? 'bg-[#0B6DFF] text-white'
                                : 'bg-blue-100 text-[#0047D6]'
                            }`}
                          >
                            0{index + 1}
                          </span>
                          <div className="space-y-0.5">
                            <h3 className="font-display text-sm sm:text-base font-extrabold text-slate-900">
                              {step.title}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-2">{step.desc}</p>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition ${
                            isActive ? 'text-[#0B6DFF] translate-x-0.5' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Right: Active Step Detail Card */}
                {currentStep && (
                  <div className="lg:col-span-7 rounded-3xl bg-white border border-blue-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-6">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center rounded-full bg-[#E5F0FF] px-3 py-1 text-xs font-extrabold text-[#0047D6]">
                          0{activeStepIndex + 1} / 0{steps.length}
                        </span>
                        {currentStep.icon && <currentStep.icon className="w-10 h-10 shrink-0" />}
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
                          {currentStep.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {currentStep.desc}
                        </p>
                      </div>

                      {Array.isArray(currentStep.checklist) && currentStep.checklist.length > 0 && (
                        <ul className="space-y-2.5 pt-1">
                          {currentStep.checklist.map((point) => (
                            <li
                              key={point}
                              className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700"
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#0B6DFF] shrink-0 mt-0.5" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      {activeStepIndex < steps.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setActiveStepIndex((prev) => prev + 1)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0B6DFF] hover:bg-[#0047D6] px-5 py-2.5 text-sm font-bold text-white transition cursor-pointer"
                        >
                          <span>Langkah Berikutnya</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={goToLogin}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0B6DFF] hover:bg-[#0047D6] px-5 py-2.5 text-sm font-bold text-white transition cursor-pointer"
                        >
                          <span>{ctaButtonLabel}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Bottom Bright Blue CTA Banner */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-[#0047D6] via-[#0B6DFF] to-[#2B93FF] p-8 sm:p-10 text-white shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <span className="inline-flex items-center rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold text-white">
                  {ctaSectionBadge}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                  {ctaSectionTitle || title}
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-sky-50 px-6 py-3.5 text-sm font-extrabold text-[#0047D6] shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>{ctaButtonLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {otherLandingLink && (
                  <button
                    type="button"
                    onClick={() => navigate(otherLandingLink.to)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 px-5 py-3.5 text-sm font-bold text-white transition cursor-pointer"
                  >
                    <span>{otherLandingLink.label}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
