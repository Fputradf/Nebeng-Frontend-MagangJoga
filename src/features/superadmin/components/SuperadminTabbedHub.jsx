import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Wrapper tab reusable untuk menggabungkan beberapa halaman Superadmin
 * yang memiliki domain serupa agar sidebar tetap ringkas.
 */
export default function SuperadminTabbedHub({ tabs, defaultTab }) {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState(defaultTab || tabs[0]?.key);

  useEffect(() => {
    if (defaultTab && tabs.some((t) => t.key === defaultTab)) {
      setActiveKey(defaultTab);
    }
  }, [defaultTab, tabs]);

  const currentTab = tabs.find((t) => t.key === activeKey) || tabs[0];
  const ActiveComponent = currentTab?.component;

  const handleSelectTab = (tab) => {
    setActiveKey(tab.key);
    if (tab.path) {
      navigate(tab.path, { replace: true });
    }
  };

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 pt-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === currentTab?.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectTab(tab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#10367D] text-[#10367D] bg-white/70 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/40 rounded-t-xl'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
