import { useState, cloneElement, isValidElement } from 'react';
import { Outlet } from 'react-router-dom';
import AppBottomNav from './AppBottomNav';

/**
 * Kerangka halaman bersama untuk semua role.
 * Sidebar tetap milik masing-masing role (prop `sidebar`).
 * Latar memakai token `canvas` plus dua pendar warna brand yang tetap di layar.
 * Ruang bawah disisakan untuk bottom-nav mobile (pb-20 lg:pb-0).
 */
export default function AppShell({ sidebar, topbar, banner = null, children = null, role = null }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Suntikkan handler buka-tutup mobile drawer ke sidebar jika berupa React element
  const enhancedSidebar = isValidElement(sidebar)
    ? cloneElement(sidebar, {
        isOpen: isMobileSidebarOpen,
        onClose: () => setIsMobileSidebarOpen(false),
      })
    : sidebar;

  // Suntikkan toggle handler ke topbar jika berupa React element
  const enhancedTopbar = isValidElement(topbar)
    ? cloneElement(topbar, {
        onToggleSidebar: () => setIsMobileSidebarOpen((prev) => !prev),
      })
    : topbar;

  return (
    <div className="relative isolate flex min-h-screen overflow-x-hidden bg-canvas font-sans text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 print:hidden"
        style={{
          backgroundImage:
            'radial-gradient(50rem 28rem at 85% -8%, rgba(116,180,217,0.35), transparent), radial-gradient(42rem 30rem at 5% 105%, rgba(16,54,125,0.10), transparent)',
        }}
      />

      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent print:hidden"
      >
        Lewati ke konten
      </a>

      {enhancedSidebar}

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col pb-20 lg:ml-64 lg:pb-0 print:m-0 print:p-0 print:ml-0">
        {enhancedTopbar}
        {banner}
        <div id="konten" className="flex-1">
          <Outlet />
        </div>
      </div>

      <AppBottomNav
        role={role}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {children}
    </div>
  );
}