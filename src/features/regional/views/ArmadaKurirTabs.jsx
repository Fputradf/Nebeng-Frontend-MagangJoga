import { useState } from 'react';
import FleetCourierPage from './ArmadaPage';
import KurirPage from './KurirPage';

export default function ArmadaKurirTabs() {
  const [subTab, setSubTab] = useState('armada');

  return (
    <div className="font-['Inter']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center gap-2">

        <button
          onClick={() => setSubTab('armada')}
          className={`px-4 py-1.5 rounded-full text-[13px] sm:text-[14px] font-bold transition cursor-pointer ${
            subTab === 'armada'
              ? 'bg-[#10367D] hover:bg-[#0C2C66] text-white shadow-sm'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-[#74B4D9]/15'
          }`}
        >
          Data Kendaraan Mitra
        </button>

        <button
          onClick={() => setSubTab('kurir')}
          className={`px-4 py-1.5 rounded-full text-[13px] sm:text-[14px] font-bold transition cursor-pointer ${
            subTab === 'kurir'
              ? 'bg-[#10367D] hover:bg-[#0C2C66] text-white shadow-sm'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-[#74B4D9]/15'
          }`}
        >
          Data Operator
        </button>

      </div>

      {subTab === 'armada' ? <FleetCourierPage /> : <KurirPage />}
    </div>
  );
}