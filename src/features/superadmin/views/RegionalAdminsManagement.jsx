import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Save, 
  X, 
  Eye,
  AlertTriangle,
  ChevronDown,
  Check
} from 'lucide-react';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { getAllUsers, createUser, updateUser, updateUserStatus } from '../../../services/userService';
import { getAllRegions } from '../../../services/regionService';

export default function AdminWilayahManagement() {
  const [admins, setAdmins] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [adminToToggle, setAdminToToggle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // State tambahan untuk Searchable Region Select (Google-like Autocomplete)
  const [regionSearchQuery, setRegionSearchQuery] = useState('');
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const regionDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    regionId: '',
    role: 'regional',
    status: 'active'
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Close region dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target)) {
        setIsRegionDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAdminData = useCallback(async (pageToFetch = 1, searchVal = '') => {
    try {
      if (pageToFetch === 1 && admins.length === 0) {
        setIsLoadingAdmins(true);
      } else {
        setIsFetchingPage(true);
      }

      const [usersRes, regionsRes] = await Promise.all([
        getAllUsers(pageToFetch, 10, searchVal, 'All', 'regional'),
        getAllRegions().catch(() => [])
      ]);

      const listData = usersRes?.data || usersRes;
      setAdmins(Array.isArray(listData) ? listData : []);

      if (usersRes?.meta) {
        setPaginationMeta(usersRes.meta);
      }

      const regionList = Array.isArray(regionsRes) ? regionsRes : (regionsRes?.data || []);
      setAvailableRegions(regionList);

    } catch (err) {
      console.error('Gagal memuat data admin wilayah:', err);
      showNotification('Gagal memuat data dari server.', 'error');
    } finally {
      setIsLoadingAdmins(false);
      setIsFetchingPage(false);
    }
  }, [admins.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAdminData(currentPage, searchTerm);
    }, searchTerm ? 400 : 0);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, loadAdminData]);

  const getRegionName = (admin) => {
    const targetRegionId = admin.regionId || admin.region?.id;
    if (admin.region?.name) return admin.region.name;
    if (targetRegionId) {
      const matched = availableRegions.find(r => String(r.id) === String(targetRegionId));
      if (matched) return matched.name;
    }
    return 'Belum Ditugaskan';
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setRegionSearchQuery('');
    setIsRegionDropdownOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      regionId: '',
      role: 'regional',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (admin) => {
    setIsEditing(true);
    setCurrentId(admin.id);
    const matchedRegionId = admin.regionId ? String(admin.regionId) : (admin.region?.id ? String(admin.region.id) : '');
    
    // Set teks pencarian ke nama wilayah yang terpilih
    const matchedRegion = availableRegions.find(r => String(r.id) === matchedRegionId);
    setRegionSearchQuery(matchedRegion ? `${matchedRegion.name} (${matchedRegion.code})` : '');
    setIsRegionDropdownOpen(false);

    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
      regionId: matchedRegionId,
      role: 'regional',
      status: admin.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.regionId) {
      showNotification('Nama, email, dan penempatan wilayah wajib diisi!', 'error');
      return;
    }

    try {
      if (isEditing) {
        const payload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          regionId: String(formData.regionId),
          status: formData.status
        };
        if (formData.password) payload.password = formData.password;

        await updateUser(currentId, payload);
        showNotification('Data admin wilayah berhasil diperbarui!', 'success');
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          password: formData.password || 'Password123!',
          regionId: String(formData.regionId),
          role: 'regional',
          status: 'active'
        };
        await createUser(payload);
        showNotification('Akun admin wilayah baru berhasil dibuat!', 'success');
      }

      setIsModalOpen(false);
      loadAdminData(currentPage, searchTerm);
    } catch (err) {
      console.error('Gagal menyimpan admin wilayah:', err);
      showNotification(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!adminToToggle) return;
    try {
      const newStatus = adminToToggle.status === 'active' ? 'suspended' : 'active';
      await updateUserStatus(adminToToggle.id, newStatus);
      showNotification(`Status akun ${adminToToggle.name} berhasil diubah!`, 'success');
      setAdminToToggle(null);
      loadAdminData(currentPage, searchTerm);
    } catch (err) {
      console.error('Gagal mengubah status admin:', err);
      showNotification('Gagal mengubah status akun.', 'error');
    }
  };

  // Filter rekomendasi wilayah berdasarkan input pengguna
  const filteredAvailableRegions = availableRegions.filter(reg => {
    const q = regionSearchQuery.toLowerCase();
    return reg.name.toLowerCase().includes(q) || (reg.code && reg.code.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                MANAJEMEN AKUN ADMIN WILAYAH
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Kelola Admin Wilayah
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Buat akun admin operasional baru dan tentukan penugasan kerjanya.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Buat Admin Baru</span>
          </button>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama admin, email, atau wilayah..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] transition"
          />
        </div>
        <div className="text-[13px] font-semibold text-neutral-400 px-2">
          Total: <span className="font-bold text-neutral-800">{paginationMeta?.totalData || 0} Admin</span>
        </div>
      </div>

      {notification.show && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-[14px] font-bold shadow-sm transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification({ ...notification, show: false })} className="text-neutral-400 hover:text-neutral-600">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className={`hidden sm:block overflow-x-auto transition-opacity duration-200 ${isFetchingPage ? 'opacity-40' : 'opacity-100'}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">ID & Nama Admin</th>
                <th className="py-3 px-5">Email Akun</th>
                <th className="py-3 px-5">Wilayah Penempatan</th>
                <th className="py-3 px-5">Status Akun</th>
                <th className="py-3 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingAdmins ? (
                <SkeletonTableRows rows={4} columns={5} />
              ) : admins.length > 0 ? (
                admins.map((admin) => {
                  const isActive = admin.status === 'active';
                  const regionName = getRegionName(admin);
                  return (
                    <tr key={admin.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 text-[13px]">{admin.name}</div>
                        <div className="text-[11px] font-bold text-[#10367D] font-mono">ID: {String(admin.id)}</div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-700">{admin.email}</td>
                      <td className="py-3.5 px-5 font-bold text-neutral-800">{regionName}</td>
                      <td className="py-3.5 px-5">
                        <StatusBadge variant={isActive ? 'emerald' : 'rose'}>
                          {isActive ? 'Aktif' : 'Disuspend'}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => { setSelectedAdmin(admin); setIsDetailModalOpen(true); }} className="p-1.5 bg-[#10367D]/10 text-[#10367D] rounded-lg cursor-pointer">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => handleOpenEditModal(admin)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg cursor-pointer">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => setAdminToToggle(admin)} className={`p-1.5 rounded-lg cursor-pointer ${isActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isActive ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState icon={Users} title="Admin Tidak Ditemukan" description="Tidak ada admin wilayah yang cocok." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginationMeta && paginationMeta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-neutral-50/50 border-t border-neutral-200 text-[13px]">
            <span className="text-neutral-500">
              Halaman <strong>{paginationMeta.currentPage}</strong> dari{' '}
              <strong>{paginationMeta.totalPages}</strong> (Total: {paginationMeta.totalData} Admin Wilayah)
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1 || isFetchingPage}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= paginationMeta.totalPages || isFetchingPage}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      <BaseModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedAdmin?.name || 'Detail Admin'}
        subtitle={`ID: ${selectedAdmin ? String(selectedAdmin.id) : ''}`}
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px]">
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400 font-bold uppercase">Email:</span>
              <span className="font-semibold text-neutral-800">{selectedAdmin?.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 font-bold uppercase">Telepon:</span>
              <span className="font-semibold text-neutral-800">{selectedAdmin?.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 font-bold uppercase">Wilayah Penempatan:</span>
              <span className="font-bold text-[#10367D]">{selectedAdmin ? getRegionName(selectedAdmin) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 font-bold uppercase">Status Akun:</span>
              <span className={`font-bold ${selectedAdmin?.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {selectedAdmin?.status === 'active' ? 'Aktif' : 'Disuspend'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsDetailModalOpen(false)}
            className="w-full py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[13px] font-bold rounded-full cursor-pointer transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Ubah Akun Admin' : 'Buat Admin Baru'}
        subtitle="Sistem Manajemen Admin Wilayah"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitForm} className="space-y-3 text-[13px]">
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Nama Lengkap</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Email Akses</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Nomor Telepon</label>
            <input
              type="text"
              placeholder="08123456789"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">
              Password Akun {isEditing && '(Kosongkan jika tidak diubah)'}
            </label>
            <input
              type="password"
              {...(!isEditing ? { required: true } : {})}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
            />
          </div>

          {/* Searchable Autocomplete Select for Region */}
          <div className="space-y-1 relative" ref={regionDropdownRef}>
            <label className="text-[12px] font-bold text-neutral-500 uppercase">
              Penempatan Wilayah <span className="text-rose-600">*Wajib Diisi</span>
            </label>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Cari atau pilih wilayah operasional..."
                value={regionSearchQuery}
                onFocus={() => setIsRegionDropdownOpen(true)}
                onChange={(e) => {
                  setRegionSearchQuery(e.target.value);
                  setFormData({ ...formData, regionId: '' }); // Reset regionId jika ketik ulang
                  setIsRegionDropdownOpen(true);
                }}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3 pr-8 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
              />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            {/* Recommendations Popup List */}
            {isRegionDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-neutral-100">
                {filteredAvailableRegions.length > 0 ? (
                  filteredAvailableRegions.map((reg) => {
                    const isSelected = String(formData.regionId) === String(reg.id);
                    return (
                      <div
                        key={reg.id}
                        onClick={() => {
                          setFormData({ ...formData, regionId: String(reg.id) });
                          setRegionSearchQuery(`${reg.name} (${reg.code})`);
                          setIsRegionDropdownOpen(false);
                        }}
                        className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition ${
                          isSelected ? 'bg-blue-50/80 text-[#10367D] font-bold' : 'text-neutral-700'
                        }`}
                      >
                        <div>
                          <span className="font-semibold">{reg.name}</span>
                          <span className="text-[11px] text-neutral-400 ml-1.5 font-mono">({reg.code})</span>
                        </div>
                        {isSelected && <Check size={13} className="text-[#10367D]" />}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2.5 text-[12px] text-neutral-400 text-center font-medium">
                    Wilayah tidak ditemukan
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-full cursor-pointer">
              Batal
            </button>
            <button type="submit" className="px-4 py-2 text-[13px] font-bold text-white bg-[#10367D] hover:bg-[#0C2C66] rounded-full flex items-center gap-1 cursor-pointer shadow-sm transition">
              <Save size={13} /> Simpan
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={Boolean(adminToToggle)}
        onClose={() => setAdminToToggle(null)}
        title="Konfirmasi Perubahan Status"
        subtitle="Manajemen Status Akses Admin"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px] text-center">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={20} />
          </div>
          <p className="text-neutral-600">
            Apakah Anda yakin ingin {adminToToggle?.status === 'active' ? 'menonaktifkan (suspend)' : 'mengaktifkan'} akun admin <strong>{adminToToggle?.name}</strong>?
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setAdminToToggle(null)} className="flex-1 py-2 bg-neutral-100 text-neutral-700 rounded-full font-bold cursor-pointer">
              Batal
            </button>
            <button onClick={handleConfirmToggleStatus} className="flex-1 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-full font-bold cursor-pointer shadow-sm transition">
              Ya, Konfirmasi
            </button>
          </div>
        </div>
      </BaseModal>

    </div>
  );
}