import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Eye,
  AlertTriangle,
  Globe,
  Loader2,
  X
} from 'lucide-react';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { getAllRegions, createRegion, updateRegion } from '../../../services/regionService';

// Fix untuk default icon Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center, zoom = 11 }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

export default function RegionsManagement() {
  const [regions, setRegions] = useState([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [regionToToggle, setRegionToToggle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    radiusKm: 20,
    latitude: -7.5666,
    longitude: 110.8316
  });

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Fungsi fetchRegions tanpa pemicu setState sinkron yang mengganggu Effect
  const fetchRegions = useCallback(async (page, isInitial = false) => {
    try {
      if (!isInitial) {
        setIsFetchingPage(true);
      }

      const res = await getAllRegions(page, 10);
      const regionList = res?.data || res;
      setRegions(Array.isArray(regionList) ? regionList : []);

      if (res?.pagination) {
        setPaginationMeta(res.pagination);
      }
    } catch (err) {
      console.error('Gagal memuat data wilayah:', err);
      showNotification('Gagal memuat data wilayah dari server.', 'error');
    } finally {
      setIsLoadingRegions(false);
      setIsFetchingPage(false);
    }
  }, []);

  // Fetch data saat pertama kali muat atau saat currentPage berubah
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!ignore) {
        await fetchRegions(currentPage, true);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [currentPage, fetchRegions]);

  const filteredRegions = regions.filter(region => 
    region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    region.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: '',
      code: '',
      radiusKm: 20,
      latitude: -7.5666,
      longitude: 110.8316
    });
    setLocationSearchQuery('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (region) => {
    setIsEditing(true);
    setCurrentId(region.id);
    setFormData({
      name: region.name,
      code: region.code,
      isActive: region.isActive,
      radiusKm: region.radiusKm || 20,
      latitude: region.latitude || -7.5666,
      longitude: region.longitude || 110.8316
    });
    setLocationSearchQuery(region.name);
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (region) => {
    setSelectedRegion(region);
    setIsDetailModalOpen(true);
  };

  const handleAutoDetectCoordinate = async () => {
    if (!locationSearchQuery) return;
    setIsSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          name: prev.name || display_name.split(',')[0]
        }));
        showNotification('Koordinat wilayah berhasil ditemukan!', 'success');
      } else {
        showNotification('Lokasi tidak ditemukan di peta. Coba kata kunci lain.', 'error');
      }
    } catch (err) {
      console.error('Gagal mendeteksi koordinat:', err);
      showNotification('Gagal menghubungkan ke layanan peta.', 'error');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        radiusKm: Number(formData.radiusKm),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude)
      };

      if (isEditing) {
        await updateRegion(currentId, payload);
        showNotification('Wilayah operasional berhasil diperbarui!', 'success');
        await fetchRegions(currentPage); // Update data langsung
      } else {
        await createRegion(payload);
        showNotification('Wilayah operasional baru berhasil ditambahkan!', 'success');
        if (currentPage === 1) {
          await fetchRegions(1);
        } else {
          setCurrentPage(1);
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Gagal menyimpan wilayah:', err);
      showNotification(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan wilayah.', 'error');
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!regionToToggle) return;

    try {
      await updateRegion(regionToToggle.id, {
        isActive: !regionToToggle.isActive
      });
      showNotification(`Status wilayah ${regionToToggle.name} berhasil diubah!`, 'success');
      setRegionToToggle(null);
      await fetchRegions(currentPage); // Update data langsung
    } catch (err) {
      console.error('Gagal mengubah status wilayah:', err);
      showNotification('Gagal mengubah status wilayah.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10367D] animate-pulse"></span>
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#10367D]">
              MANAJEMEN WILAYAH & SPASIAL PETA
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Kelola Wilayah & Cakupan Operasional
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Tambah wilayah operasional lengkap dengan titik pusat koordinat dan radius peta otomatis.
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white rounded-full text-[13px] sm:text-[14px] font-bold transition cursor-pointer shadow-sm shrink-0"
        >
          <Plus size={14} />
          <span>Tambah Wilayah Baru</span>
        </button>
      </div>

      {notification.show && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-[14px] font-bold shadow-sm transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
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

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Cari nama wilayah atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-8 py-2 text-[13px] sm:text-[14px] font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] transition"
          />
        </div>

        <div className="text-[13px] font-semibold text-neutral-400 px-2">
          Total: <span className="font-bold text-neutral-800">{paginationMeta?.totalData || 0} Wilayah</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className={`hidden sm:block overflow-x-auto transition-opacity duration-200 ${isFetchingPage ? 'opacity-40' : 'opacity-100'}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                <th className="py-3 px-5">Kode & Wilayah</th>
                <th className="py-3 px-5">Radius Cakupan</th>
                <th className="py-3 px-5">Titik Pusat Koordinat</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px]">
              {isLoadingRegions ? (
                <SkeletonTableRows rows={4} columns={5} />
              ) : filteredRegions.length > 0 ? (
                filteredRegions.map((region) => (
                  <tr key={region.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-[#10367D]/10 text-[#10367D] rounded-xl font-bold">
                          <MapPin size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-neutral-800 text-[13px]">{region.name}</div>
                          <div className="text-[11px] font-bold text-neutral-400 font-mono">{region.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-neutral-700">{region.radiusKm || 20} KM</td>
                    <td className="py-3.5 px-5 font-mono text-neutral-500">
                      {region.latitude && region.longitude 
                        ? `${Number(region.latitude).toFixed(4)}, ${Number(region.longitude).toFixed(4)}`
                        : 'Belum diset'}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge variant={region.isActive ? 'emerald' : 'rose'}>
                        {region.isActive ? 'Aktif' : 'Nonaktif'}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleOpenDetailModal(region)} className="p-1.5 bg-[#10367D]/10 text-[#10367D] rounded-lg cursor-pointer">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleOpenEditModal(region)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg cursor-pointer">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => setRegionToToggle(region)} className={`p-1.5 rounded-lg cursor-pointer ${region.isActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {region.isActive ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState icon={MapPin} title="Wilayah Tidak Ditemukan" description="Belum ada data wilayah operasional." />
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
              <strong>{paginationMeta.totalPages}</strong> (Total: {paginationMeta.totalData} Wilayah)
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
        title={selectedRegion?.name}
        subtitle={`Kode: ${selectedRegion?.code} • Radius: ${selectedRegion?.radiusKm || 20} KM`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3 text-[13px]">
          <div className="rounded-xl overflow-hidden border border-neutral-200 h-60 relative">
            {selectedRegion?.latitude && selectedRegion?.longitude ? (
              <div className="absolute inset-0 z-0">
                <MapContainer center={[selectedRegion.latitude, selectedRegion.longitude]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedRegion.latitude, selectedRegion.longitude]} />
                  <Circle 
                    center={[selectedRegion.latitude, selectedRegion.longitude]} 
                    radius={(selectedRegion.radiusKm || 20) * 1000} 
                    pathOptions={{ color: '#10367D', fillColor: '#10367D', fillOpacity: 0.15 }}
                  />
                  <ChangeView center={[selectedRegion.latitude, selectedRegion.longitude]} />
                </MapContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">Koordinat peta belum tersedia</div>
            )}
          </div>
          <button onClick={() => setIsDetailModalOpen(false)} className="w-full py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white text-[13px] font-bold rounded-full cursor-pointer transition">
            Tutup
          </button>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Ubah Wilayah Operasional' : 'Tambah Wilayah Baru'}
        subtitle="Cari nama lokasi untuk mendeteksi koordinat dan atur radius cakupan."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-3 text-[13px]">

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[#10367D] uppercase flex items-center gap-1">
              <Globe size={12} /> Cari Nama Kota / Wilayah (Otomatis Deteksi Koordinat)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Misal: Surakarta, Yogyakarta, Semarang..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium"
              />
              <button
                type="button"
                onClick={handleAutoDetectCoordinate}
                disabled={isSearchingLocation}
                className="px-3 py-2 bg-[#10367D] hover:bg-[#0C2C66] text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isSearchingLocation ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                <span>Cari</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase">Nama Wilayah</label>
              <input
                type="text"
                required
                placeholder="Contoh: Region Surakarta"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase">Kode Unik</label>
              <input
                type="text"
                required
                placeholder="Contoh: REG-SKT"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium font-mono uppercase"
              />
            </div>
          </div>

          <div className="space-y-1 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[12px] font-bold text-neutral-600 uppercase">
                Radius Cakupan Operasional
              </label>
              <span className="font-bold text-[#10367D] text-[14px] font-mono">
                {formData.radiusKm} KM
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={formData.radiusKm}
              onChange={(e) => setFormData({...formData, radiusKm: Number(e.target.value)})}
              className="w-full accent-[#10367D] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Preview Titik Pusat di Peta</label>
            <div className="rounded-xl overflow-hidden border border-neutral-200 h-40 relative z-0">
              <div className="absolute inset-0 z-0">
                <MapContainer center={[formData.latitude, formData.longitude]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[formData.latitude, formData.longitude]} />
                  <Circle 
                    center={[formData.latitude, formData.longitude]} 
                    radius={(formData.radiusKm || 20) * 1000} 
                    pathOptions={{ color: '#10367D', fillColor: '#10367D', fillOpacity: 0.15 }}
                  />
                  <ChangeView center={[formData.latitude, formData.longitude]} />
                </MapContainer>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-[13px] font-bold text-neutral-500 hover:bg-neutral-100 rounded-full cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-[13px] font-bold text-white bg-[#10367D] hover:bg-[#0C2C66] rounded-full flex items-center gap-1 cursor-pointer shadow-sm transition"
            >
              <Save size={13}/>
              Simpan Wilayah
            </button>
          </div>

        </form>
      </BaseModal>

      <BaseModal
        isOpen={Boolean(regionToToggle)}
        onClose={() => setRegionToToggle(null)}
        title="Konfirmasi Status Wilayah"
        subtitle="Sistem Manajemen Operasional"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 text-[13px] text-center">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={20} />
          </div>
          <p className="text-neutral-600">
            Apakah Anda yakin ingin {regionToToggle?.isActive ? 'menonaktifkan' : 'mengaktifkan'} wilayah <strong>{regionToToggle?.name}</strong>?
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setRegionToToggle(null)} className="flex-1 py-2 bg-neutral-100 text-neutral-700 rounded-full font-bold cursor-pointer">
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