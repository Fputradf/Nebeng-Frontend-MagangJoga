import { useState, useEffect } from 'react';
import { Users, Search, Plus, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import BaseModal from '../../../components/ui/BaseModal';
import { regionalService } from '../../../services/regionalService';
import { useAuth } from '../../../context/AuthContext';

export default function OperatorPosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [operatorList, setOperatorList] = useState([]);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [unmaskedEmails, setUnmaskedEmails] = useState({});
  const [formData, setFormData] = useState({
    name: '', email: '', password: 'Password123!', phone: '08123456789', regionId: user?.regionId || '1'
  });

  useEffect(() => {
    let isMounted = true;

    const loadOperators = async () => {
      try {
        if (isMounted) setIsLoadingOperators(true);
        const data = typeof regionalService.getOperators === 'function' 
          ? await regionalService.getOperators('operator') 
          : [];
        
        const currentRegionId = user?.regionId ? String(user.regionId) : null;
        
        const formatted = (data || [])
          .filter(op => {
            if (!currentRegionId) return true;
            return op.regionId ? String(op.regionId) === currentRegionId : true;
          })
          .map(op => ({
            id: String(op.id),
            name: op.name,
            email: op.email,
            pos: op.posName || op.assignedPickupPoints?.[0]?.name || 'Belum Ditugaskan',
            schedule: 'Senin - Jumat (08:00 - 16:00)',
            status: op.status === 'active' ? 'Aktif' : 'Nonaktif'
          }));

        if (isMounted) {
          setOperatorList(formatted);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Gagal mengambil data operator:', error);
          toast.error('Gagal mengambil data operator dari server.', { title: 'Koneksi Gagal' });
        }
      } finally {
        if (isMounted) {
          setIsLoadingOperators(false);
        }
      }
    };

    loadOperators();

    return () => {
      isMounted = false;
    };
  }, [user?.regionId, toast]);

  const maskEmail = (email) => {
    if (!email) return email;
    const parts = email.split('@');
    if (parts.length < 2) return email;
    return `${parts[0].slice(0, 2)}***@${parts[1]}`;
  };

  const toggleMaskEmail = (id) => {
    setUnmaskedEmails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ name: '', email: '', password: 'Password123!', phone: '08123456789', regionId: user?.regionId || '1' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.warning('Nama dan Email akun operator wajib diisi!', { title: 'Form Belum Lengkap' });
      return;
    }

    try {
      if (isEditing) {
        toast.success('Data operator diperbarui.', { title: 'Berhasil' });
      } else {
        await regionalService.createOperator({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          regionId: String(user?.regionId || formData.regionId)
        });
        toast.success('Akun operator baru berhasil dibuat di database.', { title: 'Operator Dibuat' });
      }
      setIsModalOpen(false);

      const data = await regionalService.getOperators('operator');
      const currentRegionId = user?.regionId ? String(user.regionId) : null;
      const formatted = (data || [])
        .filter(op => {
          if (!currentRegionId) return true;
          return op.regionId ? String(op.regionId) === currentRegionId : true;
        })
        .map(op => ({
          id: String(op.id),
          name: op.name,
          email: op.email,
          pos: op.posName || op.assignedPickupPoints?.[0]?.name || 'Belum Ditugaskan',
          schedule: 'Senin - Jumat (08:00 - 16:00)',
          status: op.status === 'active' ? 'Aktif' : 'Nonaktif'
        }));
      setOperatorList(formatted);

    } catch (error) {
      console.error('Gagal menyimpan operator:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan akun operator ke server.', { title: 'Error' });
    }
  };

  const handleDeleteOperator = async (op) => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Nonaktifkan Akun',
      message: `Apakah Anda yakin ingin menonaktifkan akun operator "${op.name}" (${op.id})?`,
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await regionalService.updateOperatorStatus(op.id, 'inactive');
      toast.success(`Akun operator ${op.id} berhasil dinonaktifkan.`, { title: 'Berhasil' });


      const data = await regionalService.getOperators('operator');
      const currentRegionId = user?.regionId ? String(user.regionId) : null;
      const formatted = (data || [])
        .filter(op => {
          if (!currentRegionId) return true;
          return op.regionId ? String(op.regionId) === currentRegionId : true;
        })
        .map(op => ({
          id: String(op.id),
          name: op.name,
          email: op.email,
          pos: op.posName || op.assignedPickupPoints?.[0]?.name || 'Belum Ditugaskan',
          schedule: 'Senin - Jumat (08:00 - 16:00)',
          status: op.status === 'active' ? 'Aktif' : 'Nonaktif'
        }));
      setOperatorList(formatted);
    } catch (error) {
      toast.error('Gagal menonaktifkan operator.', { title: error });
    }
  };

  const filteredOperators = operatorList.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.pos.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10367D] animate-pulse"></span>
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#10367D]">
              MANAJEMEN AKUN OPERATOR POS REGIONAL
            </span>
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">Akun & Penugasan Operator Pos</h1>
          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">Buat akun operator, tentukan pos penugasan, dan atur shift operasional dengan proteksi data PII.</p>
        </div>

        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-full text-[13px] sm:text-[14px] font-bold transition cursor-pointer shadow-sm shrink-0"
        >
          <Plus size={14} />
          <span>Buat Operator Baru</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Cari nama, email, atau pos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
          />
        </div>
        <div className="text-[13px] font-semibold text-neutral-400 px-2">
          Total: <span className="font-bold text-neutral-800">{filteredOperators.length} Operator</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">ID & Nama Operator</th>
                <th className="py-3 px-5">Email Akun (PII Protected)</th>
                <th className="py-3 px-5">Pos Penugasan</th>
                <th className="py-3 px-5">Shift Operasional</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingOperators ? (
                <SkeletonTableRows rows={4} columns={6} />
              ) : filteredOperators.length > 0 ? (
                filteredOperators.map((op) => {
                  const isUnmasked = unmaskedEmails[op.id];
                  return (
                    <tr key={op.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 text-[13px]">{op.name}</div>
                        <div className="text-[11px] font-bold text-[#10367D] font-mono">{op.id}</div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-700">
                        <div className="flex items-center gap-1.5">
                          <span>{isUnmasked ? op.email : maskEmail(op.email)}</span>
                          <button
                            onClick={() => toggleMaskEmail(op.id)}
                            className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition cursor-pointer"
                            title={isUnmasked ? "Sembunyikan Email" : "Tampilkan Email"}
                          >
                            {isUnmasked ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-neutral-800">{op.pos}</td>
                      <td className="py-3.5 px-5 font-medium text-neutral-600">{op.schedule}</td>
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleDeleteOperator(op)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer" title="Nonaktifkan">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <EmptyState icon={Users} title="Operator Tidak Ditemukan" description="Tidak ada operator pos yang ditemukan dari backend untuk wilayah ini." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Operator Pos Baru"
        subtitle="Sistem Akun Operasional Regional"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Nama Lengkap</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Email Akun</label>
            <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Nomor Telepon</label>
            <input type="text" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Password Awal</label>
            <input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-full cursor-pointer">Batal</button>
            <button type="submit" className="px-4 py-2 text-[13px] font-bold text-white bg-[#10367D] rounded-full cursor-pointer shadow-sm">Simpan</button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}