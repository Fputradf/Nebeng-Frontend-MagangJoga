import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  UserX,
  UserCheck,
  Lock,
  Unlock,
  Search,
  AlertTriangle,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Filter,
  X,
  UserPlus,
  Eye,
  EyeOff,
  History,
  Car,
  MapPin,
  Settings2,
  KeyRound,
  ChevronDown,
  CheckCircle2,
  Check
} from 'lucide-react';

import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';
import {
  getAllUsers,
  createUser,
  updateUserStatus,
  getUserStats,
} from '../../../services/userService';

const ROLE_CONFIG = {
  customer: {
    label: 'Customer (Penumpang)',
    shortLabel: 'Customer',
    icon: User,
    variant: 'default',
  },
  mitra: {
    label: 'Mitra (Driver)',
    shortLabel: 'Mitra',
    icon: Car,
    variant: 'emerald',
  },
  regional: {
    label: 'Admin Wilayah (Regional)',
    shortLabel: 'Regional',
    icon: MapPin,
    variant: 'blue',
  },
  operator: {
    label: 'Operator',
    shortLabel: 'Operator',
    icon: Settings2,
    variant: 'amber',
  },
  admin: {
    label: 'Superadmin (Admin)',
    shortLabel: 'Superadmin',
    icon: ShieldCheck,
    variant: 'rose',
  },
};

function RoleBadge({ role }) {
  const config = ROLE_CONFIG[role] || {
    shortLabel: role || 'N/A',
    icon: User,
    variant: 'default',
  };

  const Icon = config.icon;

  return (
    <StatusBadge variant={config.variant} icon={Icon}>
      {config.shortLabel}
    </StatusBadge>
  );
}

export default function UserGovernance() {
  const { session: currentAdminSession, role: currentAdminRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState('');
  const [unmaskedUsers, setUnmaskedUsers] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  // State Notifikasi Banner User-Friendly
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // State Searchable Region Autocomplete Select
  const [regions, setRegions] = useState([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [regionSearchQuery, setRegionSearchQuery] = useState('');
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const regionDropdownRef = useRef(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'customer',
    regionId: '',
    phone: '',
    password: '',
  });

  const [userStats, setUserStats] = useState({
    active: 0,
    suspended: 0,
    blocked: 0,
    total: 0,
  });

  // Helper Notifikasi Toast
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Close region dropdown saat klik di luar area
  useEffect(() => {
    function handleClickOutside(event) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target)) {
        setIsRegionDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchRegions() {
      try {
        setIsLoadingRegions(true);
        const response = await apiClient.get('/regions?onlyActive=true');
        const regionData = response.data?.data || response.data || [];
        setRegions(Array.isArray(regionData) ? regionData : []);
      } catch (err) {
        console.error('Gagal memuat daftar region', err);
        showNotification('Gagal memuat daftar wilayah operasional.', 'error');
      } finally {
        setIsLoadingRegions(false);
      }
    }
    if (showAddModal) {
      fetchRegions();
    }
  }, [showAddModal]);

  const fetchUsersData = useCallback(async (pageToFetch, searchVal, statusVal) => {
    try {
      setIsLoadingUsers(true);
      const res = await getAllUsers(pageToFetch, 15, searchVal, statusVal);
      
      const listData = res?.data || res;
      setUsers(Array.isArray(listData) ? listData : []);

      if (res?.meta) {
        setPaginationMeta(res.meta);
      }
    } catch (err) {
      console.error('Gagal memuat data pengguna:', err);
      showNotification('Gagal memuat data pengguna dari server.', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const stats = await getUserStats();
      if (stats) {
        setUserStats(stats);
      }
    } catch (err) {
      console.error('Gagal memuat statistik user:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsersData(currentPage, searchTerm, statusFilter);
      fetchUserStats();
    }, searchTerm ? 400 : 0);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, statusFilter, fetchUsersData, fetchUserStats]);

  const toggleMaskPII = (userId) => {
    setUnmaskedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  const maskPhone = (phone) => {
    if (!phone || phone.length < 8) {
      return phone || '-';
    }
    return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.id && String(user.id).toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && user.status === 'active') ||
      (statusFilter === 'Suspended' && user.status === 'suspended') ||
      (statusFilter === 'Blocked' && user.status === 'blocked');

    return matchesSearch && matchesStatus;
  });

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email || !newUser.password || !newUser.regionId) {
      showNotification('Mohon lengkapi semua field wajib termasuk Wilayah (Region)!', 'error');
      return;
    }

    try {
      const payload = {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        password: newUser.password,
        role: newUser.role,
        regionId: String(newUser.regionId),
        status: 'active',
      };

      await createUser(payload);

      showNotification(`Pengguna baru "${newUser.name}" berhasil ditambahkan!`, 'success');
      setShowAddModal(false);
      setShowAddPassword(false);
      setRegionSearchQuery('');
      setIsRegionDropdownOpen(false);

      setNewUser({
        name: '',
        email: '',
        role: 'customer',
        regionId: '',
        phone: '',
        password: '',
      });

      await fetchUsersData(currentPage, searchTerm, statusFilter);
      await fetchUserStats();
    } catch (err) {
      console.error('Gagal membuat user:', err);
      showNotification(err.response?.data?.message || 'Terjadi kesalahan saat membuat pengguna baru.', 'error');
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedUser || !reason.trim()) {
      showNotification('Alasan override wajib diisi!', 'error');
      return;
    }

    try {
      let newStatus = 'active';

      if (actionModal === 'Block') newStatus = 'blocked';
      if (actionModal === 'Suspend') newStatus = 'suspended';
      if (actionModal === 'Unblock') newStatus = 'active';

      await updateUserStatus(selectedUser.id, newStatus);

      const logEntry = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString('id-ID'),
        admin: `${currentAdminSession?.name || currentAdminSession?.fullName || 'Superadmin'} (${currentAdminRole || 'admin'})`,
        targetId: selectedUser.id,
        targetName: selectedUser.name,
        action: `${actionModal.toUpperCase()} ACCOUNT`,
        reason: reason.trim(),
      };

      setAuditLogs([logEntry, ...auditLogs]);

      const statusActionText = 
        actionModal === 'Block' ? 'diblokir' : 
        actionModal === 'Suspend' ? 'ditangguhkan (suspend)' : 'dipulihkan kembali';

      showNotification(`Akun ${selectedUser.name} berhasil ${statusActionText}!`, 'success');

      setActionModal(null);
      setSelectedUser(null);
      setReason('');

      await fetchUsersData(currentPage, searchTerm, statusFilter);
      await fetchUserStats();
    } catch (err) {
      console.error('Gagal memperbarui status user:', err);
      showNotification(err.response?.data?.message || 'Gagal mengubah status akun pengguna.', 'error');
    }
  };

  const getStatusVariant = (status) => {
    if (status === 'active') return 'emerald';
    if (status === 'suspended') return 'amber';
    return 'rose';
  };

  // Filter rekomendasi wilayah berdasarkan input pengguna
  const filteredRegions = regions.filter((reg) => {
    const q = regionSearchQuery.toLowerCase();
    return (
      (reg.name && reg.name.toLowerCase().includes(q)) ||
      (reg.code && reg.code.toLowerCase().includes(q))
    );
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
                SUPERADMIN GOVERNANCE & CONTROL
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              User Governance (Super-Override)
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola akses akun secara sistemik dengan proteksi PII dan pencatatan audit log otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap sm:flex-nowrap">
            <div className="hidden md:flex px-3.5 py-2 bg-white/15 border border-white/25 rounded-2xl backdrop-blur text-xs font-bold text-white items-center gap-2 shadow-sm">
              <ShieldCheck size={14} className="text-accent" />
              <span>Level Akses: Super-Override (Enkripsi PII)</span>
            </div>

            <button
              onClick={() => {
                setRegionSearchQuery('');
                setIsRegionDropdownOpen(false);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
            >
              <UserPlus size={16} />
              <span>Tambah User</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Akun Aktif</p>
            <h3 className="text-[21px] font-bold text-neutral-800 mt-0.5">{userStats.active} Pengguna</h3>
            <span className="text-[13px] font-semibold text-emerald-600">Beroperasi normal</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Akun Disuspend</p>
            <h3 className="text-[21px] font-bold text-neutral-800 mt-0.5">{userStats.suspended} Pengguna</h3>
            <span className="text-[13px] font-semibold text-amber-600">Ditangguhkan sementara</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <UserX size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Akun Diblokir</p>
            <h3 className="text-[21px] font-bold text-neutral-800 mt-0.5">{userStats.blocked} Pengguna</h3>
            <span className="text-[13px] font-semibold text-rose-600">Akses dicabut sistemik</span>
          </div>
        </div>
      </div>

       {/* Banner Notifikasi Toast User-Friendly */}
        {notification.show && (
          <div className={`p-4 rounded-2xl flex items-center justify-between text-[14px] font-bold shadow-sm transition-all ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification({ ...notification, show: false })} 
              className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama, email, atau ID pengguna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] transition"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[13px] font-semibold text-neutral-500 flex items-center gap-1">
            <Filter size={12} />
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-full px-3 py-1.5 text-[13px] font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] cursor-pointer"
          >
            <option value="All">Semua Status</option>
            <option value="Active">Active (Aktif)</option>
            <option value="Suspended">Suspended (Ditangguhkan)</option>
            <option value="Blocked">Blocked (Diblokir)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">ID & Nama Pengguna</th>
                <th className="py-3 px-5">Peran (Role)</th>
                <th className="py-3 px-5">Kontak PII (Protected)</th>
                <th className="py-3 px-5">Status Akun</th>
                <th className="py-3 px-5 text-right">Aksi Super-Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingUsers ? (
                <SkeletonTableRows rows={4} columns={5} />
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isUnmasked = unmaskedUsers[user.id];
                  return (
                    <tr key={user.id} className="hover:bg-[#74B4D9]/10 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 text-[13px]">{user.name}</div>
                        <div className="text-[11px] font-bold text-[#10367D] font-mono">ID: {String(user.id)}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-neutral-700 flex items-center gap-1.5">
                              <Mail size={11} className="text-neutral-400" />
                              {isUnmasked ? user.email : maskEmail(user.email)}
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                              <Phone size={11} className="text-neutral-400" />
                              {isUnmasked ? user.phone : maskPhone(user.phone)}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleMaskPII(user.id)}
                            title={isUnmasked ? 'Sembunyikan PII' : 'Tampilkan PII'}
                            className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition cursor-pointer"
                          >
                            {isUnmasked ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <StatusBadge variant={getStatusVariant(user.status)}>
                          {user.status === 'active' ? 'Aktif' : user.status === 'suspended' ? 'Disuspend' : 'Diblokir'}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.status !== 'blocked' && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionModal('Block');
                              }}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[12px] font-bold rounded-full transition cursor-pointer flex items-center gap-1"
                            >
                              <Lock size={12} />
                              Blokir
                            </button>
                          )}
                          {user.status !== 'suspended' && user.status !== 'blocked' && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionModal('Suspend');
                              }}
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 text-[12px] font-bold rounded-full transition cursor-pointer flex items-center gap-1"
                            >
                              <ShieldAlert size={12} />
                              Suspend
                            </button>
                          )}
                          {(user.status === 'blocked' || user.status === 'suspended') && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionModal('Unblock');
                              }}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[12px] font-bold rounded-full transition cursor-pointer flex items-center gap-1"
                            >
                              <Unlock size={12} />
                              Pulihkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={User}
                      title="Pengguna Tidak Ditemukan"
                      description="Tidak ada pengguna yang cocok dengan pencarian atau filter status."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginationMeta && paginationMeta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-neutral-50/50 border-t border-neutral-200 text-[13px]">
            <span className="text-neutral-500">
              Halaman <strong>{paginationMeta.currentPage}</strong> dari <strong>{paginationMeta.totalPages}</strong> (Total: {paginationMeta.totalData} Pengguna)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage >= paginationMeta.totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {auditLogs.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-200 space-y-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#10367D]" />
            <h3 className="text-[15px] font-bold text-neutral-800">Catatan Audit Log Override Sistem Sesi Ini</h3>
          </div>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-800 font-mono">{log.id}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-[#10367D]/10 text-[#10367D] rounded-full">{log.action}</span>
                    <span className="text-neutral-500">Target: <strong>{log.targetName}</strong> ({log.targetId})</span>
                  </div>
                  <p className="text-neutral-500 mt-0.5">Alasan: <em>"{log.reason}"</em></p>
                </div>
                <div className="text-right text-[11px] text-neutral-400 shrink-0">
                  {log.timestamp} • Admin: {log.admin}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tambah Pengguna Baru */}
      <BaseModal
        isOpen={Boolean(showAddModal)}
        onClose={() => {
          setShowAddModal(false);
          setShowAddPassword(false);
        }}
        title="Tambah Pengguna Baru"
        subtitle="Formulir Pendaftaran Manual Admin"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddUser} className="space-y-4 text-[13px]">
          <div>
            <label className="font-bold text-neutral-600 block mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                required
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] focus:bg-white transition"
                placeholder="Masukkan nama pengguna..."
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-600 block mb-1.5">Email</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] focus:bg-white transition"
                placeholder="nama@email.com"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-600 block mb-1.5">Password Akun</label>
            <div className="relative">
              <KeyRound size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type={showAddPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-9 py-2.5 font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] focus:bg-white transition"
                placeholder="Minimal 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowAddPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                {showAddPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-600 block mb-1.5">Nomor Telepon</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] focus:bg-white transition"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          {/* Searchable Autocomplete Region Select */}
          <div className="space-y-1 relative" ref={regionDropdownRef}>
            <label className="font-bold text-neutral-600 block mb-1.5">
              Wilayah Operasional (Region) <span className="text-rose-600">*Wajib Diisi</span>
            </label>

            <div className="relative">
              <MapPin size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder={isLoadingRegions ? "Memuat wilayah..." : "Cari atau pilih wilayah operasional..."}
                disabled={isLoadingRegions}
                value={regionSearchQuery}
                onFocus={() => setIsRegionDropdownOpen(true)}
                onChange={(e) => {
                  setRegionSearchQuery(e.target.value);
                  setNewUser({ ...newUser, regionId: '' }); // Reset pilihan jika user mengetik ulang
                  setIsRegionDropdownOpen(true);
                }}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-8 py-2.5 font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] focus:bg-white transition"
              />
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            {/* Rekomendasi Popup List Dropdown */}
            {isRegionDropdownOpen && !isLoadingRegions && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-neutral-100">
                {filteredRegions.length > 0 ? (
                  filteredRegions.map((reg) => {
                    const isSelected = String(newUser.regionId) === String(reg.id);
                    return (
                      <div
                        key={reg.id}
                        onClick={() => {
                          setNewUser({ ...newUser, regionId: String(reg.id) });
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

          <div>
            <label className="font-bold text-neutral-600 block mb-1.5">Peran Pengguna (Role)</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
                const Icon = config.icon;
                const isSelected = newUser.role === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setNewUser({ ...newUser, role: roleKey })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#10367D]/10 border-[#10367D] text-[#10367D] ring-1 ring-[#10367D]'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <Icon size={13} className="shrink-0" />
                    <span className="leading-tight">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 mt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setShowAddPassword(false);
              }}
              className="px-4 py-2 font-bold text-neutral-500 hover:text-neutral-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white font-bold rounded-full transition cursor-pointer shadow-sm"
            >
              Simpan User
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Modal Confirm Super-Override Status Action */}
      <BaseModal
        isOpen={Boolean(actionModal && selectedUser)}
        onClose={() => {
          setActionModal(null);
          setSelectedUser(null);
          setReason('');
        }}
        title={`Konfirmasi ${actionModal} Akun`}
        subtitle="Otentikasi Tindakan Super-Override & Log Audit"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-neutral-800 text-[13px]">
          <p className="text-neutral-500">
            Anda akan melakukan tindakan <strong className="text-neutral-800">{actionModal}</strong> secara sistemik pada akun <strong className="text-neutral-800">{selectedUser?.name}</strong> (ID: {selectedUser ? String(selectedUser.id) : ''}).
          </p>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
              Alasan Override Sistem <span className="text-rose-600">*Wajib Diisi untuk Audit Log</span>
            </label>
            <textarea
              rows="3"
              required
              placeholder="Sebutkan alasan administratif atau kendala keamanan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setActionModal(null);
                setSelectedUser(null);
                setReason('');
              }}
              className="px-4 py-2 rounded-full text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleExecuteAction}
              disabled={!reason.trim()}
              className={`px-4 py-2 rounded-full text-[13px] font-bold text-white transition cursor-pointer shadow-sm ${
                !reason.trim()
                  ? 'bg-neutral-300 cursor-not-allowed'
                  : actionModal === 'Block'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : actionModal === 'Suspend'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Ya, Konfirmasi {actionModal}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}