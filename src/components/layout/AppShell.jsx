import { Outlet } from 'react-router-dom';

/**
 * Kerangka halaman bersama untuk semua role.
 * Sidebar tetap milik masing-masing role (prop `sidebar`).
 * Latar memakai token `canvas` plus dua pendar warna brand yang tetap di layar.
 * Ruang bawah disisakan untuk bottom-nav mobile.
 */
export default function AppShell({ sidebar, topbar, banner = null, children = null }) {
  return (
    <div className="relative isolate flex min-h-screen overflow-x-hidden bg-canvas font-sans text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(50rem 28rem at 85% -8%, rgba(116,180,217,0.35), transparent), radial-gradient(42rem 30rem at 5% 105%, rgba(16,54,125,0.10), transparent)',
        }}
      />

      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Lewati ke konten
      </a>

      {sidebar}

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col pb-20 lg:ml-64 lg:pb-0">
        {topbar}
        {banner}
        <div id="konten" className="flex-1">
          <Outlet />
        </div>
      </div>

      {children}
    </div>
  );
}