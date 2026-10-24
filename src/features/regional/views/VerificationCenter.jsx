import { BASE_URL } from '../../../config/env';
import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Clock,
  Eye,
  EyeOff,
  Truck,
  Camera,
  ZoomIn,
  FileText
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';
import { regionalService } from '../../../services/regionalService';

export default function VerificationCenterPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [verificationList, setVerificationList] = useState([]);
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(
    'Foto KTP buram / tidak terbaca'
  );
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [unmaskedPhones, setUnmaskedPhones] = useState({});
  const [activePreviewImage, setActivePreviewImage] = useState(null);

  const rejectionReasons = [
    'Foto KTP buram / tidak terbaca',
    'Foto wajah Face ID tidak sesuai dengan foto KTP',
    'Masa berlaku SIM / STNK telah kedaluwarsa',
    'Dokumen SKCK tidak valid atau sudah lewat batas waktu',
    'Skor Liveness Scan Face ID di bawah ambang batas minimum'
  ];

  const getFullFileUrl = (path) => {
    if (!path || typeof path !== 'string') return null;

    if (
      path.startsWith('blob:') ||
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      return path;
    }

    const baseURL = apiClient.defaults.baseURL
      ? apiClient.defaults.baseURL.replace(/\/api\/?$/, '')
      : BASE_URL;

    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseURL}${cleanPath}`;
  };

  useEffect(() => {
    let isMounted = true;

    const loadVerificationData = async () => {
      try {
        if (isMounted) setIsLoadingVerification(true);

        const currentRegionId = user?.regionId
          ? String(user.regionId)
          : null;

        const responseData = await regionalService.getVerifications(
          undefined,
          currentRegionId
        );

        const formatted = responseData.map((item) => {
          const profile = item.user?.profile || {};
          const vehicle = item.user?.vehicles?.[0] || {};
          const rawFiles = item.files || [];

          const allFiles = rawFiles.map((f) => ({
            ...f,
            filePath: getFullFileUrl(f.filePath)
          }));

          const faceFile = rawFiles.find((f) =>
            ['face_id', 'liveness', 'face', 'avatar'].includes(
              f.type?.toLowerCase()
            )
          );

          const faceUrl = profile.faceImageUrl || faceFile?.filePath;

          return {
            id: String(item.id),
            userId: String(item.userId || item.user?.id),
            name: item.user?.name || 'Pengguna Tanpa Nama',
            phone: item.user?.phone || '-',
            role: item.user?.role
              ? item.user.role.toUpperCase()
              : item.user?.vehicles?.length > 0
                ? 'MITRA'
                : 'CUSTOMER',
            regionId: item.user?.regionId
              ? String(item.user.regionId)
              : null,
            submissionDate: item.createdAt
              ? new Date(item.createdAt).toLocaleString('id-ID')
              : 'Baru saja',
            status:
              item.status === 'approved'
                ? 'Disetujui'
                : item.status === 'rejected'
                  ? 'Ditolak'
                  : 'Menunggu Review',
            rejectionReason: item.rejectionReason || '',
            type: item.type,
            files: allFiles,

            identity: {
              ktpNumber: profile.ktpNumber || '-',
              fullNameKtp:
                profile.fullNameKtp || item.user?.name || '-',
              addressKtp: profile.addressKtp || '-',
              faceImageUrl: getFullFileUrl(faceUrl),
              bankName: profile.bankName || '-',
              bankAccountNumber:
                profile.bankAccountNumber || '-',
              bankAccountHolder:
                profile.bankAccountHolder || '-'
            },

            vehicle: {
              type: vehicle.type || '-',
              model: vehicle.model || '-',
              plateNumber: vehicle.plateNumber || '-'
            }
          };
        });

        if (isMounted) {
          setVerificationList(formatted);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Gagal mengambil data verifikasi:', error);
          toast.error('Gagal mengambil antrean verifikasi dari server.', { title: 'Koneksi Gagal' });
        }
      } finally {
        if (isMounted) {
          setIsLoadingVerification(false);
        }
      }
    };

    loadVerificationData();

    return () => {
      isMounted = false;
    };
  }, [user?.regionId, toast]);

  const handleApprove = async (id) => {
    const target = verificationList.find((item) => item.id === id);

    if (isDecided(target)) {
      toast.warning('Pengajuan ini sudah diputuskan sebelumnya.', { title: 'Sudah Diputuskan' });
      return;
    }

    try {
      await regionalService.reviewVerification(id, 'approved');

      setVerificationList((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'Disetujui', rejectionReason: '' }
            : item
        )
      );

      toast.success(`Verifikasi ID ${id} berhasil disetujui dan akun diaktifkan.`, { title: 'Disetujui' });
    } catch (error) {
      console.error('Gagal menyetujui verifikasi:', error);
      toast.error(error.response?.data?.message || 'Gagal menyetujui dokumen di server.', { title: 'Error' });
    }
  };

  const groupedByUser = useMemo(() => {
    const map = new Map();

    verificationList.forEach((item) => {
      if (!map.has(item.userId)) {
        map.set(item.userId, {
          userId: item.userId,
          name: item.name,
          phone: item.phone,
          role: item.role,
          regionId: item.regionId,
          identity: item.identity,
          vehicle: item.vehicle,
          documents: []
        });
      }

      map.get(item.userId).documents.push(item);
    });

    return Array.from(map.values());
  }, [verificationList]);

  const filteredData = useMemo(() => {
    return groupedByUser.filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.userId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groupedByUser, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const selectedUserGroup = useMemo(
    () => groupedByUser.find((g) => g.userId === selectedUserId) || null,
    [groupedByUser, selectedUserId]
  );

  const getGroupStatus = (group) => {
    const statuses = group.documents.map((d) => d.status);
    if (statuses.some((s) => s === 'Menunggu Review')) return 'Menunggu Review';
    if (statuses.every((s) => s === 'Disetujui')) return 'Disetujui';
    return 'Ditolak';
  };

  const getGroupPendingCount = (group) =>
    group.documents.filter((d) => d.status === 'Menunggu Review').length;

  const maskPhone = (phone) => {
    if (!phone || phone.length < 8) return phone;
    return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
  };

  const toggleMaskPhone = (id) => {
    setUnmaskedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenDetail = (group) => {
    setSelectedUserId(group.userId);
    const firstDocWithFile = group.documents.find(d => d.files && d.files.length > 0);
    if (firstDocWithFile && firstDocWithFile.files[0]?.filePath) {
      setActivePreviewImage(firstDocWithFile.files[0].filePath);
    } else if (group.identity?.faceImageUrl) {
      setActivePreviewImage(group.identity.faceImageUrl);
    } else {
      setActivePreviewImage(null);
    }
    setIsDetailModalOpen(true);
  };

  const isDecided = (item) => !!item && item.status !== 'Menunggu Review';

  const handleOpenRejectModal = (item) => {
    if (isDecided(item)) {
      toast.warning('Pengajuan ini sudah diputuskan sebelumnya.', { title: 'Sudah Diputuskan' });
      return;
    }
    setSelectedVerification(item);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedVerification || isDecided(selectedVerification)) return;

    if (!selectedReason) {
      toast.warning('Alasan penolakan wajib dipilih.', { title: 'Peringatan' });
      return;
    }

    try {
      await apiClient.patch(`/verifications/${selectedVerification.id}/review`, {
        status: 'rejected',
        rejectionReason: selectedReason
      });

      setVerificationList((prev) =>
        prev.map((item) =>
          item.id === selectedVerification.id
            ? { ...item, status: 'Ditolak', rejectionReason: selectedReason }
            : item
        )
      );

      setIsRejectModalOpen(false);
      toast.error(`Verifikasi ID ${selectedVerification.id} ditolak.`, { title: 'Ditolak' });
    } catch (error) {
      console.error('Gagal menolak verifikasi:', error);
      toast.error(error.response?.data?.message || 'Gagal menolak dokumen di server.', { title: 'Error' });
    }
  };

  const getStatusVariant = (status) => {
    if (status === 'Menunggu Review') return 'amber';
    if (status === 'Disetujui') return 'emerald';
    return 'rose';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">

      {/* HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10367D] animate-pulse"></span>
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#10367D]">
              PUSAT VERIFIKASI & KEAMANAN REGIONAL
            </span>
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Verification Center & Face ID
          </h1>
          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Tinjau antrean berkas identitas, rekening, dan kendaraan wilayah Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#74B4D9]/15 rounded-full shrink-0">
          <Clock className="w-3.5 h-3.5 text-[#10367D]" />
          <span className="text-[13px] font-bold text-[#10367D]">
            {verificationList.filter((v) => v.status === 'Menunggu Review').length} Antrean Pending
          </span>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor HP, atau ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
          />
        </div>
        <div className="text-[13px] font-semibold text-neutral-400 px-2">
          Total: <span className="font-bold text-neutral-800">{filteredData.length} Pengguna</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">ID & Nama Pengguna</th>
                <th className="py-3 px-5">Kontak (PII Protected)</th>
                <th className="py-3 px-5">Peran Akun</th>
                <th className="py-3 px-5">Dokumen</th>
                <th className="py-3 px-5">Status Review</th>
                <th className="py-3 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingVerification ? (
                <SkeletonTableRows rows={4} columns={6} />
              ) : paginatedData.length > 0 ? (
                paginatedData.map((group) => {
                  const isUnmasked = unmaskedPhones[group.userId];
                  const groupStatus = getGroupStatus(group);
                  const pendingCount = getGroupPendingCount(group);

                  return (
                    <tr key={group.userId} className="hover:bg-[#74B4D9]/10 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-800 text-[13px]">{group.name}</div>
                        <div className="text-[11px] font-bold text-[#10367D] font-mono">ID: {group.userId}</div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-neutral-700">
                        <div className="flex items-center gap-1.5">
                          <span>{isUnmasked ? group.phone : maskPhone(group.phone)}</span>
                          <button
                            onClick={() => toggleMaskPhone(group.userId)}
                            className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition cursor-pointer"
                            title={isUnmasked ? 'Sembunyikan Telepon' : 'Buka Masking Telepon'}
                          >
                            {isUnmasked ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-700">{group.role}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-wrap gap-1">
                          {group.documents.map((doc) => (
                            <span
                              key={doc.id}
                              title={doc.status}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                doc.status === 'Disetujui'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : doc.status === 'Ditolak'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {doc.type?.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <StatusBadge variant={getStatusVariant(groupStatus)}>{groupStatus}</StatusBadge>
                        {pendingCount > 0 && groupStatus === 'Menunggu Review' && (
                          <div className="text-[11px] text-neutral-400 mt-0.5">{pendingCount} dokumen menunggu</div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => handleOpenDetail(group)}
                          className="px-3 py-1 bg-[#74B4D9]/15 hover:bg-[#74B4D9]/25 text-[#10367D] font-bold rounded-full transition cursor-pointer shadow-xs"
                        >
                          Review Berkas
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={ShieldCheck}
                      title="Antrean Kosong"
                      description="Tidak ada antrean verifikasi di wilayah ini."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-neutral-50/50 border-t border-neutral-200 text-[13px]">
            <span className="text-neutral-500">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total: {filteredData.length} Pengguna)
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
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 bg-white border border-neutral-200 rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REVIEW BERKAS */}
      <BaseModal
        isOpen={Boolean(isDetailModalOpen && selectedUserGroup)}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Review Berkas: ${selectedUserGroup?.name}`}
        subtitle={`ID Pengguna: ${selectedUserGroup?.userId} • ${selectedUserGroup?.documents.length || 0} Jenis Dokumen`}
        maxWidth="max-w-5xl"
      >
        {selectedUserGroup && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-[14px] max-h-[72vh] overflow-y-auto overscroll-contain pr-1 -mr-1">
            
            <div className="lg:col-span-6 space-y-3">
              
              <div className="flex items-center justify-between gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="px-2.5 py-1 bg-[#74B4D9]/15 text-[#10367D] text-[12px] font-bold rounded-full uppercase tracking-wide">
                  {selectedUserGroup.role}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-400 font-medium">Status:</span>
                  <StatusBadge variant={getStatusVariant(getGroupStatus(selectedUserGroup))}>
                    {getGroupStatus(selectedUserGroup)}
                  </StatusBadge>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-neutral-200 space-y-2 shadow-2xs">
                <span className="text-[12px] font-bold text-[#10367D] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Data Identitas (KTP)
                </span>
                <div className="space-y-1 text-neutral-700 text-[13px]">
                  <div><strong className="text-neutral-400">NIK:</strong> <span className="font-mono font-bold">{selectedUserGroup.identity.ktpNumber}</span></div>
                  <div><strong className="text-neutral-400">Nama KTP:</strong> <span className="font-bold">{selectedUserGroup.identity.fullNameKtp}</span></div>
                  <div><strong className="text-neutral-400">Alamat KTP:</strong> {selectedUserGroup.identity.addressKtp}</div>
                </div>
              </div>

              {selectedUserGroup.role === 'MITRA' && (
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200 space-y-2 shadow-2xs">
                  <span className="text-[12px] font-bold text-[#10367D] uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Kendaraan & Rekening Bank
                  </span>
                  <div className="space-y-1 text-neutral-700 text-[13px]">
                    <div><strong className="text-neutral-400">Kendaraan:</strong> {selectedUserGroup.vehicle.type} - {selectedUserGroup.vehicle.model} ({selectedUserGroup.vehicle.plateNumber})</div>
                    <div><strong className="text-neutral-400">Bank:</strong> {selectedUserGroup.identity.bankName} ({selectedUserGroup.identity.bankAccountNumber})</div>
                    <div><strong className="text-neutral-400">Pemilik Rek:</strong> {selectedUserGroup.identity.bankAccountHolder}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <h4 className="text-[13px] font-bold text-neutral-700 uppercase tracking-wide">Dokumen Lampiran Upload</h4>
                
                {selectedUserGroup.documents.map((doc) => (
                  <div key={doc.id} className="border border-neutral-200 rounded-xl p-3 space-y-2 bg-neutral-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#10367D]" />
                        <span className="text-[13px] font-bold text-neutral-800 uppercase">{doc.type}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">#{doc.id}</span>
                      </div>
                      <StatusBadge variant={getStatusVariant(doc.status)}>{doc.status}</StatusBadge>
                    </div>

                    {doc.status === 'Ditolak' && doc.rejectionReason && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium text-[11px]">
                        <strong>Alasan Penolakan:</strong> {doc.rejectionReason}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {doc.files.length > 0 ? (
                        doc.files.map((file, idx) => {
                          const isSelected = activePreviewImage === file.filePath;
                          return (
                            <div
                              key={idx}
                              onClick={() => setActivePreviewImage(file.filePath)}
                              className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition shadow-xs relative group ${
                                isSelected ? 'border-[#10367D] ring-2 ring-[#74B4D9]/30' : 'border-neutral-200 hover:border-neutral-300'
                              }`}
                            >
                              <img
                                src={file.filePath}
                                alt={`Lampiran ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa'><rect width='18' height='18' x='3' y='3' rx='2'/></svg>";
                                }}
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[13px] text-center font-bold py-0.5">
                                #{idx + 1}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[12px] text-neutral-400 italic">Tidak ada file terlampir.</p>
                      )}

                      {selectedUserGroup.identity.faceImageUrl && doc.type === 'ktp' && (
                        <div
                          onClick={() => setActivePreviewImage(selectedUserGroup.identity.faceImageUrl)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition shadow-xs relative group ${
                            activePreviewImage === selectedUserGroup.identity.faceImageUrl ? 'border-[#10367D] ring-2 ring-[#74B4D9]/30' : 'border-neutral-200'
                          }`}
                          title="Face ID Scan"
                        >
                          <img
                            src={selectedUserGroup.identity.faceImageUrl}
                            alt="Face ID"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-[#10367D] text-white text-[13px] text-center font-bold py-0.5">
                            Face ID
                          </span>
                        </div>
                      )}
                    </div>

                    {!isDecided(doc) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/60">
                        <button
                          onClick={() => handleOpenRejectModal(doc)}
                          className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleApprove(doc.id)}
                          className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition shadow-xs"
                        >
                          Setujui
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>

            <div className="lg:col-span-6 bg-neutral-900 rounded-2xl p-4 flex flex-col items-center justify-between relative min-h-87.5 lg:min-h-112.5">
              <div className="absolute top-3 left-3 bg-white/10 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                Pratinjau Dokumen Berkas Aktif
              </div>

              <div className="flex-1 w-full flex items-center justify-center p-2 my-auto">
                {activePreviewImage ? (
                  <div className="relative group max-h-95 w-full flex items-center justify-center">
                    <img
                      src={activePreviewImage}
                      alt="Pratinjau Besar"
                      className="max-h-90 max-w-full object-contain rounded-lg shadow-lg cursor-zoom-in"
                      onClick={() => window.open(activePreviewImage, '_blank')}
                    />
                    <a
                      href={activePreviewImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-neutral-800 p-2 rounded-xl shadow-md text-[12px] font-bold flex items-center gap-1 transition"
                    >
                      <ZoomIn size={12} /> Buka Tab Baru
                    </a>
                  </div>
                ) : (
                  <div className="text-center text-neutral-400 space-y-2">
                    <Camera size={32} className="mx-auto opacity-40" />
                    <p className="text-[13px]">Pilih salah satu thumbnail berkas di sebelah kiri untuk melihat pratinjau ukuran penuh.</p>
                  </div>
                )}
              </div>

              <div className="w-full text-center pt-2 border-t border-white/10 text-[12px] text-neutral-400">
                Tips: Klik ikon perbesar untuk melihat detail teks KTP / wajah dengan jelas.
              </div>
            </div>

          </div>
        )}
      </BaseModal>

      {/* MODAL PENOLAKAN BERKAS */}
      <BaseModal
        isOpen={Boolean(isRejectModalOpen && selectedVerification)}
        onClose={() => setIsRejectModalOpen(false)}
        title="Alasan Penolakan Berkas"
        subtitle="Pilih alasan spesifik untuk tercatat dalam audit log"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleConfirmReject} className="space-y-3">
          <div className="space-y-1.5">
            {rejectionReasons.map((reason, idx) => (
              <label key={idx} className="flex items-center gap-2 text-[12px] text-neutral-700 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-full cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-[13px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-full cursor-pointer shadow-sm"
            >
              Konfirmasi Penolakan
            </button>
          </div>
        </form>
      </BaseModal>

    </div>
  );
}