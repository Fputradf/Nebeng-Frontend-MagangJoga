import { ArrowUpDown, MoreVertical } from 'lucide-react';

export default function EnterpriseTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'Data Tidak Ditemukan',
  emptyDescription = 'Belum ada rekaman data untuk parameter ini.',
}) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-border shadow-enterprise overflow-hidden font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-canvas border-b border-slate-border text-[12px] font-bold text-gray-400 uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <button className="p-0.5 hover:bg-gray-200 rounded transition cursor-pointer">
                        <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-border text-[13px] font-medium text-gray-700">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      <div className="h-3.5 bg-slate-subtle rounded w-2/3" />
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-3.5 bg-slate-subtle rounded w-6 ml-auto" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center">
                  <p className="text-[14px] font-bold text-gray-700">{emptyTitle}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-brand-50/20 transition-colors">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3 px-4 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button 
                      aria-label="Opsi Baris Data"
                      className="p-1 rounded-lg hover:bg-slate-subtle text-gray-500 hover:text-brand-600 transition cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}