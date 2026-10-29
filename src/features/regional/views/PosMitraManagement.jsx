import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Plus, QrCode, Trash2, Pencil, AlertTriangle, UserCheck, Globe, Loader2, Save, Layers } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import BaseModal from '../../../components/ui/BaseModal';
import { regionalService } from '../../../services/regionalService';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/apiClient';
import { parseGeoJSON } from '../../../utils/geoJsonUtil';

// Fix icon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeMapView({ center, zoom = 12 }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

export default function PosMitraManagement() {
  const toast = useToast();
  const confirm = useConfirm();
  const { session, adminProfile } = useAuth();
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [posList, setPosList] = useState([]);
  const [operatorList, setOperatorList] = useState([]); 
  const [currentRegionInfo, setCurrentRegionInfo] = useState(null);
  const [isLoadingPos, setIsLoadingPos] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', latitude: -7.5666, longitude: 110.8316, operatorId: '', regionId: ''
  });
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        if (isMounted) setIsLoadingPos(true);
        const regId = adminProfile?.regionId || session?.regionId ? String(adminProfile?.regionId || session?.regionId) : null;
        
        const [posData, userRes, regionRes] = await Promise.all([
          regionalService.getPickupPoints(regId).catch(() => []),
          apiClient.get('/users', { params: { role: 'operator' } }).catch(() => ({ data: [] })),
          regId ? apiClient.get(`/regions/${regId}`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
        ]);

        const rawPos = Array.isArray(posData) ? posData : (posData?.data || []);
        const formattedPos = rawPos.map(p => ({
          id: String(p.id),
          name: p.name,
          address: p.address,
          lat: Number(p.latitude) || -7.5666,
          long: Number(p.longitude) || 110.8316,
          regionName: p.region?.name || regionRes?.data?.name || 'Wilayah Terdaftar',
          operatorId: p.operatorId ? String(p.operatorId) : '',
          operatorName: p.operator ? p.operator.name : 'Belum Ditugaskan',
          status: p.isActive !== false ? 'Aktif' : 'Nonaktif',
          qrCodePos: p.qrCodePos
        }));

        const rawUsers = Array.isArray(userRes.data) ? userRes.data : (userRes.data?.data || userRes.data?.users || []);

        const validOperators = rawUsers.filter(op => {
          const opRegion = op.regionId ? String(op.regionId) : null;
          if (!regId) return op.status === 'active';
          return (opRegion === String(regId) || !opRegion) && op.status === 'active';
        });

        if (isMounted) {
          setPosList(formattedPos);
          setOperatorList(validOperators);
          setActiveRegionId(regId);
          if (regionRes?.data) {
            setCurrentRegionInfo(regionRes.data);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('[DEBUG POS] Gagal memuat data pos:', error);
          toast.error('Gagal mengambil data dari server.', { title: 'Koneksi Gagal' });
        }
      } finally {
        if (isMounted) {
          setIsLoadingPos(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.regionId, adminProfile?.regionId]);

  const handleAutoDetectCoordinate = async () => {
    if (!locationSearchQuery && !formData.address && !formData.name) {
      toast.warning('Masukkan nama lokasi, alamat, atau kata kunci pencarian terlebih dahulu.', { title: 'Pencarian Kosong' });
      return;
    }

    const query = locationSearchQuery || formData.address || formData.name;
    setIsSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          address: prev.address || display_name
        }));
        toast.success('Koordinat lokasi pos berhasil dideteksi!', { title: 'Berhasil' });
      } else {
        toast.error('Lokasi tidak ditemukan di peta. Coba perjelas nama tempat atau alamat.', { title: 'Tidak Ditemukan' });
      }
    } catch (err) {
      console.error('Gagal mendeteksi koordinat:', err);
      toast.error('Gagal menghubungkan ke layanan peta.', { title: 'Error' });
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    const regId = activeRegionId || adminProfile?.regionId || session?.regionId || '1';
    
    setFormData({ 
      name: '', 
      address: '', 
      latitude: currentRegionInfo?.latitude ? Number(currentRegionInfo.latitude) : -7.5666, 
      longitude: currentRegionInfo?.longitude ? Number(currentRegionInfo.longitude) : 110.8316, 
      operatorId: '',
      regionId: String(regId)
    });
    setLocationSearchQuery('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos) => {
    setIsEditing(true);
    setCurrentPos(pos);
    const regId = activeRegionId || adminProfile?.regionId || session?.regionId || '1';

    setFormData({ 
      name: pos.name, 
      address: pos.address, 
      latitude: pos.lat, 
      longitude: pos.long,
      operatorId: pos.operatorId || '',
      regionId: String(regId)
    });
    setLocationSearchQuery(pos.name);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.warning('Nama Pos dan Alamat Lengkap wajib diisi!', { title: 'Form Belum Lengkap' });
      return;
    }

    try {
      const regId = activeRegionId || adminProfile?.regionId || session?.regionId || '1';

      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        regionId: String(regId),
        operatorId: formData.operatorId ? String(formData.operatorId) : null
      };

      if (isEditing && currentPos) {
        await regionalService.updatePickupPoint(currentPos.id, payload);
        toast.success(`Pos berhasil diperbarui.`, { title: 'Berhasil' });
      } else {
        await regionalService.createPickupPoint(payload);
        toast.success('Pos resmi baru berhasil ditambahkan.', { title: 'Berhasil' });
      }
      setIsModalOpen(false);
      
      const posData = await regionalService.getPickupPoints(regId);
      const rawPos = Array.isArray(posData) ? posData : (posData?.data || []);
      const formattedPos = rawPos.map(p => ({
        id: String(p.id),
        name: p.name,
        address: p.address,
        lat: Number(p.latitude) || -7.5666,
        long: Number(p.longitude) || 110.8316,
        regionName: p.region?.name || currentRegionInfo?.name || 'Wilayah Terdaftar',
        operatorId: p.operatorId ? String(p.operatorId) : '',
        operatorName: p.operator ? p.operator.name : 'Belum Ditugaskan',
        status: p.isActive !== false ? 'Aktif' : 'Nonaktif',
        qrCodePos: p.qrCodePos
      }));
      setPosList(formattedPos);
    } catch (error) {
      console.error('Gagal menyimpan pos:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan data pos.', { title: 'Error' });
    }
  };

  const handleDeletePos = async (pos) => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Hapus Pos',
      message: `Apakah Anda yakin ingin menonaktifkan pos "${pos.name}"?`,
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await regionalService.deletePickupPoint(pos.id);
      toast.success('Pos berhasil dinonaktifkan.', { title: 'Berhasil' });
      
      const regId = activeRegionId || adminProfile?.regionId || session?.regionId;
      const posData = await regionalService.getPickupPoints(regId);
      const rawPos = Array.isArray(posData) ? posData : (posData?.data || []);
      const formattedPos = rawPos.map(p => ({
        id: String(p.id),
        name: p.name,
        address: p.address,
        lat: Number(p.latitude) || -7.5666,
        long: Number(p.longitude) || 110.8316,
        cityId: p.cityId ? String(p.cityId) : '',
        cityName: p.city?.name || '-',
        operatorId: p.operatorId ? String(p.operatorId) : '',
        operatorName: p.operator ? p.operator.name : 'Belum Ditugaskan',
        status: p.isActive !== false ? 'Aktif' : 'Nonaktif',
        qrCodePos: p.qrCodePos
      }));
      setPosList(formattedPos);
    } catch (error) {
      toast.error('Gagal menghapus pos.', { title: error });
    }
  };

  const handleShowQr = (pos) => {
    setCurrentPos(pos);
    setIsQrModalOpen(true);
  };

  const filteredPos = posList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.operatorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> MANAJEMEN POS CHECKPOINT & TERMINAL
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manajemen Pos Mitra & Terminal
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola lokasi pos, koordinat lat/long, penugasan operator wilayah, serta cetak QR Code.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Tambah Pos Baru</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Cari pos, alamat, operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition"
          />
        </div>
        <div className="text-[13px] font-semibold text-neutral-400 px-2">
          Total: <span className="font-bold text-neutral-800">{filteredPos.length} Pos</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">Nama & Kode Pos</th>
                <th className="py-3 px-5">Alamat Lokasi</th>
                <th className="py-3 px-5">Wilayah Operasional</th>
                <th className="py-3 px-5">Operator Pos</th>
                <th className="py-3 px-5 text-center">Aksi & QR Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingPos ? (
                <SkeletonTableRows rows={4} columns={5} />
              ) : filteredPos.length > 0 ? (
                filteredPos.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-neutral-800 text-[13px]">{pos.name}</div>
                      <div className="text-[11px] font-bold text-[#10367D] font-mono">{pos.id}</div>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-neutral-600">{pos.address}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#10367D]/10 text-[#10367D]">
                        {currentRegionInfo?.name || pos.regionName || 'Wilayah Terdaftar'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold ${pos.operatorName !== 'Belum Ditugaskan' ? 'bg-[#74B4D9]/15 text-[#10367D] border border-[#74B4D9]/30' : 'bg-neutral-100 text-neutral-500'}`}>
                        <UserCheck size={11} /> {pos.operatorName}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleShowQr(pos)} className="p-1.5 bg-[#74B4D9]/15 hover:bg-[#74B4D9]/25 text-[#10367D] rounded-lg transition cursor-pointer" title="Lihat QR Code">
                          <QrCode size={13} />
                        </button>
                        <button onClick={() => handleOpenEdit(pos)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer" title="Edit Pos">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeletePos(pos)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer" title="Hapus Pos">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState icon={MapPin} title="Pos Tidak Ditemukan" description="Tidak ada pos yang terdaftar di database untuk wilayah ini." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pos */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Ubah Data Pos' : 'Tambah Pos Checkpoint Baru'}
        subtitle="Sistem Manajemen Wilayah & Terminal"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-3 text-[13px]">

          <div className="space-y-1 bg-[#74B4D9]/10 p-3 rounded-xl border border-[#74B4D9]/30">
            <label className="text-[12px] font-bold text-[#10367D] uppercase flex items-center gap-1">
              <Globe size={12} /> Cari Nama Tempat / Alamat (Otomatis Deteksi Koordinat)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: Terminal Tirtonadi, Stasiun Balapan Surakarta..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]"
              />
              <button
                type="button"
                onClick={handleAutoDetectCoordinate}
                disabled={isSearchingLocation}
                className="px-3 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSearchingLocation ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                <span>Cari Peta</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Nama Pos / Terminal</label>
            <input type="text" required placeholder="Contoh: Pos Terminal Tirtonadi" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Alamat Lengkap</label>
            <textarea rows="2" required placeholder="Jl. Menteri Supeno No. 1..." value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D] resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase">Wilayah Operasional</label>
              <div className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-bold text-[#10367D] flex items-center justify-between">
                <span>{currentRegionInfo?.name || 'Wilayah Terdaftar'}</span>
                <span className="text-[10px] bg-[#10367D]/10 text-[#10367D] px-2 py-0.5 rounded-full font-semibold">Terkunci Akun</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-neutral-500 uppercase">Tugaskan Operator Pos</label>
                {operatorList.length === 0 && (
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">Belum Ada Operator</span>
                )}
              </div>
              <select 
                value={formData.operatorId} 
                onChange={(e) => setFormData({...formData, operatorId: e.target.value})} 
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D] cursor-pointer"
              >
                <option value="">-- Belum Ditugaskan --</option>
                {operatorList.map((op) => (
                  <option key={op.id} value={op.id}>{op.name} ({op.email})</option>
                ))}
              </select>
              {operatorList.length === 0 && (
                <p className="text-[11px] text-neutral-400">
                  Belum ada operator terdaftar. Buat akun di menu <strong>Armada & Kurir &rarr; Data Operator</strong>.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase">Latitude</label>
              <input type="number" step="any" required placeholder="Contoh: -7.5666" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-mono font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase">Longitude</label>
              <input type="number" step="any" required placeholder="Contoh: 110.8283" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-mono font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                <Layers size={12} className="text-[#10367D]" />
                Preview Pos & Batas Wilayah di Peta
              </label>
              {currentRegionInfo?.boundaryPolygon && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Batas Poligon Aktif
                </span>
              )}
            </div>
            <div className="rounded-xl overflow-hidden border border-neutral-200 h-44 relative z-0">
              <div className="absolute inset-0 z-0">
                <MapContainer 
                  center={[Number(formData.latitude) || -7.5666, Number(formData.longitude) || 110.8316]} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[Number(formData.latitude) || -7.5666, Number(formData.longitude) || 110.8316]} />
                  
                  {currentRegionInfo?.boundaryPolygon && parseGeoJSON(currentRegionInfo.boundaryPolygon) ? (
                    <GeoJSON 
                      key={JSON.stringify(currentRegionInfo.boundaryPolygon)}
                      data={parseGeoJSON(currentRegionInfo.boundaryPolygon)}
                      pathOptions={{ color: '#10367D', fillColor: '#10367D', fillOpacity: 0.15, weight: 2 }}
                    />
                  ) : currentRegionInfo?.latitude && currentRegionInfo?.longitude ? (
                    <Circle 
                      center={[Number(currentRegionInfo.latitude), Number(currentRegionInfo.longitude)]} 
                      radius={(currentRegionInfo.radiusKm || 20) * 1000} 
                      pathOptions={{ color: '#10367D', fillColor: '#10367D', fillOpacity: 0.12 }}
                    />
                  ) : null}
                  <ChangeMapView center={[Number(formData.latitude) || -7.5666, Number(formData.longitude) || 110.8316]} />
                </MapContainer>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-full cursor-pointer">Batal</button>
            <button type="submit" className="px-4 py-2 text-[13px] font-bold text-white bg-[#10367D] hover:bg-[#0C2C66] rounded-full flex items-center gap-1 cursor-pointer shadow-sm transition">
              <Save size={13} /> Simpan Pos
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Modal QR Code */}
      <BaseModal
        isOpen={Boolean(isQrModalOpen && currentPos)}
        onClose={() => setIsQrModalOpen(false)}
        title={`QR Code ${currentPos?.id}`}
        subtitle={currentPos?.name}
        maxWidth="max-w-xs"
      >
        {currentPos && (
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-3">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentPos.qrCodePos || currentPos.id)}`} 
                alt="QR Code"
                className="w-32 h-32 mx-auto object-contain"
              />
              <span className="text-[13px] font-mono font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full inline-block">
                {currentPos.qrCodePos || currentPos.id}
              </span>
              <div>
                <h4 className="text-[14px] font-bold text-neutral-800">{currentPos.name}</h4>
                <p className="text-[12px] text-neutral-500">{currentPos.address}</p>
              </div>
            </div>
            <button onClick={() => setIsQrModalOpen(false)} className="w-full py-2 bg-neutral-100 text-neutral-600 text-[13px] font-bold rounded-full cursor-pointer">Tutup</button>
          </div>
        )}
      </BaseModal>


    </div>
  );
}