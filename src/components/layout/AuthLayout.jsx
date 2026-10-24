import defaultIllustration from '../../assets/auth-illustration.png';

export default function AuthLayout({
  children,
  logo,
  brandName = 'Nebeng',
  title,
  subtitle,
  illustration = defaultIllustration,
  illustrationAlt = 'Ilustrasi layanan Nebeng',
}) {
  return (
    <main
      className="
        min-h-screen
        w-full
        flex
        items-center
        justify-center
        bg-[#EBEBEB]
        px-4
        py-8
        sm:px-6
        md:px-8
        font-sans
      "
    >
      {/* AUTH CARD */}
      <section
        className="
          w-full
          max-w-5xl
          bg-white
          rounded-2xl
          shadow-card
          overflow-hidden
          flex
          flex-col
          md:flex-row
        "
      >
        {/* =========================
            ILLUSTRATION
        ========================== */}
        <div
          className="
            relative
            w-full
            md:w-5/12
            shrink-0
            min-h-[280px]
            sm:min-h-[340px]
            md:min-h-auto
          "
        >
          {/* ILLUSTRATION PANEL */}
          <div
            className="
              absolute
              inset-0
              overflow-hidden
              bg-gradient-to-br
              from-slate-100
              to-slate-200
            "
          >
            <img
              src={illustration}
              alt={illustrationAlt}
              className="
                absolute
                inset-0
                w-full
                h-full
                object-cover
                opacity-90
              "
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
          </div>
        </div>

        {/* =========================
            FORM PANEL
        ========================== */}
        <div
          className="
            flex-1
            flex
            items-center
            justify-center
            px-6
            py-10
            sm:px-12
            sm:py-12
            md:px-16
            lg:px-20
          "
        >
          <div className="w-full max-w-sm">

            {/* HEADER */}
            <header
              className="
                flex
                flex-col
                items-center
                text-center
                mb-8
              "
            >
              {/* TITLE */}
              {title && (
                <div
                  className="
                    flex
                    items-center
                    justify-center
                    gap-3
                    mb-3
                  "
                >
                  {logo && (
                    <img
                      src={logo}
                      alt={brandName}
                      className="
                        w-10
                        h-10
                        object-contain
                        shrink-0
                      "
                    />
                  )}

                  <h1
                    className="
                      text-2xl
                      font-semibold
                      tracking-tight
                      text-slate-900
                    "
                  >
                    {title}
                  </h1>
                </div>
              )}

              {/* SUBTITLE */}
              {subtitle && (
                <p
                  className="
                    text-sm
                    leading-relaxed
                    text-slate-500
                  "
                >
                  {subtitle}
                </p>
              )}
            </header>

            {children}

          </div>
        </div>
      </section>
    </main>
  );
}