import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMap } from 'react-leaflet';
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
  X,
  Layers,
  FileCode
} from 'lucide-react';
import { SkeletonTableRows } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import BaseModal from '../../../components/ui/BaseModal';
import { getAllRegions, createRegion, updateRegion } from '../../../services/regionService';
import { useConfirm } from '../../../context/ConfirmContext';
import { parseGeoJSON, cleanGeoJsonCoordinates } from '../../../utils/geoJsonUtil';
import { INDONESIA_CITIES } from '../../../data/indonesiaCities';

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
  const confirm = useConfirm();
  const [regions, setRegions] = useState([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    latitude: -6.2088,
    longitude: 106.8456,
    boundaryPolygon: '',
  });

  const [selectedCityIndex, setSelectedCityIndex] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const filteredCitiesList = useMemo(() => {
    if (!citySearchQuery.trim()) return INDONESIA_CITIES.map((c, i) => ({ ...c, originalIdx: i }));
    const q = citySearchQuery.toLowerCase();
    return INDONESIA_CITIES.map((c, i) => ({ ...c, originalIdx: i })).filter(
      (c) => c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)
    );
  }, [citySearchQuery]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  const handleSelectCity = async (e) => {
    const idxStr = e.target.value;
    setSelectedCityIndex(idxStr);
    if (!idxStr && idxStr !== '0') return;

    const cityItem = INDONESIA_CITIES[Number(idxStr)];
    if (!cityItem) return;

    setFormData(prev => ({
      ...prev,
      name: cityItem.name,
      code: prev.code && isEditing ? prev.code : cityItem.defaultCode,
    }));

    setIsSearchingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&countrycodes=id&limit=1&q=${encodeURIComponent(cityItem.query)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, geojson } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        const cleanedGeoJson = geojson ? cleanGeoJsonCoordinates(geojson) : null;
        const polyJsonString = cleanedGeoJson ? JSON.stringify(cleanedGeoJson, null, 2) : '';

        setFormData(prev => ({
          ...prev,
          latitude: newLat,
          longitude: newLng,
          boundaryPolygon: polyJsonString,
        }));
        showNotification(`Batas poligon resmi untuk ${cityItem.name} berhasil dimuat!`, 'success');
      } else {
        showNotification(`Data batas peta untuk ${cityItem.name} tidak ditemukan.`, 'error');
      }
    } catch (err) {
      console.error('Gagal mengambil batas GeoJSON:', err);
      showNotification('Gagal menghubungkan ke server peta.', 'error');
    } finally {
      setIsSearchingLocation(false);
    }
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
    setSelectedCityIndex('');
    setCitySearchQuery('');

    setFormData({
      name: '',
      code: '',
      latitude: -6.2088,
      longitude: 106.8456,
      boundaryPolygon: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (region) => {
    setIsEditing(true);
    setCurrentId(region.id);
    setCitySearchQuery('');
    const polyString = region.boundaryPolygon
      ? (typeof region.boundaryPolygon === 'string'
          ? region.boundaryPolygon
          : JSON.stringify(region.boundaryPolygon, null, 2))
      : '';

    const foundIdx = INDONESIA_CITIES.findIndex(
      (c) => c.name === region.name || region.name.includes(c.name)
    );
    setSelectedCityIndex(foundIdx >= 0 ? String(foundIdx) : '');

    setFormData({
      name: region.name,
      code: region.code,
      isActive: region.isActive,
      latitude: region.latitude || -6.2088,
      longitude: region.longitude || 106.8456,
      boundaryPolygon: polyString,
    });
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (region) => {
    setSelectedRegion(region);
    setIsDetailModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      showNotification('Silakan pilih kota dari dropdown terlebih dahulu.', 'error');
      return;
    }

    try {
      let parsedBoundary = null;
      if (formData.boundaryPolygon) {
        try {
          const rawParsed = typeof formData.boundaryPolygon === 'string'
            ? JSON.parse(formData.boundaryPolygon)
            : formData.boundaryPolygon;
          parsedBoundary = cleanGeoJsonCoordinates(rawParsed);
        } catch {
          parsedBoundary = null;
        }
      }

      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        boundaryPolygon: parsedBoundary,
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
      const errorMsg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message || 'Terjadi kesalahan saat menyimpan wilayah.');
      showNotification(errorMsg, 'error');
    }
  };

  const handleToggleStatus = async (region) => {
    const willDeactivate = region.isActive;
    const isConfirmed = await confirm({
      title: willDeactivate ? 'Nonaktifkan Wilayah' : 'Aktifkan Wilayah',
      message: `Apakah Anda yakin ingin ${willDeactivate ? 'menonaktifkan' : 'mengaktifkan'} wilayah "${region.name}"?`,
      confirmText: willDeactivate ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
      cancelText: 'Batal',
      variant: willDeactivate ? 'warning' : 'info',
    });
    if (!isConfirmed) return;

    try {
      await updateRegion(region.id, {
        isActive: !region.isActive
      });
      showNotification(`Status wilayah ${region.name} berhasil diubah!`, 'success');
      await fetchRegions(currentPage);
    } catch (err) {
      console.error('Gagal mengubah status wilayah:', err);
      showNotification('Gagal mengubah status wilayah.', 'error');
    }
  };

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
                MANAJEMEN WILAYAH & SPASIAL PETA
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Kelola Wilayah & Cakupan Operasional
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Kelola wilayah operasional lengkap dengan titik koordinat dan batas poligon GeoJSON resmi.
            </p>
          </div>

          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-slate-900 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Tambah Wilayah Baru</span>
          </button>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

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
                <th className="py-3 px-5">Cakupan Batas Spasial</th>
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
                    <td className="py-3.5 px-5">
                      {region.boundaryPolygon ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-full">
                          <Layers size={11} /> Poligon GeoJSON Resmi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-full">
                          Belum Diset
                        </span>
                      )}
                    </td>
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
                        <button onClick={() => handleOpenDetailModal(region)} className="p-1.5 bg-[#10367D]/10 text-[#10367D] rounded-lg cursor-pointer" title="Lihat Peta Detail">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleOpenEditModal(region)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg cursor-pointer" title="Edit Wilayah">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => handleToggleStatus(region)} className={`p-1.5 rounded-lg cursor-pointer ${region.isActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`} title="Ubah Status">
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
        subtitle={`Kode: ${selectedRegion?.code} • Batas Spasial Poligon Resmi`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span className="font-bold text-neutral-700">Tipe Batas:</span>
              <span className="text-neutral-600 font-medium">
                {selectedRegion?.boundaryPolygon ? 'Poligon Batas GeoJSON Resmi' : 'Belum Diset'}
              </span>
            </div>
            {selectedRegion?.boundaryPolygon && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                Valid Geofence
              </span>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-neutral-200 h-64 relative">
            {selectedRegion?.latitude && selectedRegion?.longitude ? (
              <div className="absolute inset-0 z-0">
                <MapContainer center={[selectedRegion.latitude, selectedRegion.longitude]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedRegion.latitude, selectedRegion.longitude]} />
                  
                  {selectedRegion.boundaryPolygon && parseGeoJSON(selectedRegion.boundaryPolygon) && (
                    <GeoJSON 
                      key={JSON.stringify(selectedRegion.boundaryPolygon)}
                      data={parseGeoJSON(selectedRegion.boundaryPolygon)}
                      pathOptions={{ color: '#10367D', fillColor: '#10367D', fillOpacity: 0.2, weight: 2 }}
                    />
                  )}
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
        subtitle="Pilih kota di Indonesia untuk otomatis memuat titik koordinat dan batas GeoJSON resmi."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-3.5 text-[13px]">

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-[#10367D] uppercase flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Globe size={12} /> Pilih Kota / Wilayah di Indonesia ({INDONESIA_CITIES.length} Daerah)
              </span>
              {isSearchingLocation && (
                <span className="flex items-center gap-1 text-[11px] text-[#10367D] font-normal lowercase">
                  <Loader2 size={11} className="animate-spin" /> Mengambil batas GeoJSON resmi...
                </span>
              )}
            </label>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Ketik untuk mencari cepat nama kota / kabupaten... (misal: Bandung, Sleman, Merauke)"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-[12px] font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#10367D]"
              />
            </div>

            <select
              value={selectedCityIndex}
              onChange={handleSelectCity}
              disabled={isSearchingLocation}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#10367D] transition cursor-pointer"
            >
              <option value="">-- Pilih Kota / Kabupaten untuk Memuat Batas Wilayah ({filteredCitiesList.length} Opsi) --</option>
              {Object.entries(
                filteredCitiesList.reduce((acc, c) => {
                  acc[c.province] = acc[c.province] || [];
                  acc[c.province].push(c);
                  return acc;
                }, {})
              ).map(([prov, cityItems]) => (
                <optgroup key={prov} label={prov}>
                  {cityItems.map((c) => (
                    <option key={`${c.name}-${c.originalIdx}`} value={c.originalIdx}>
                      {c.name} ({c.province})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase flex items-center justify-between">
                <span>Nama Wilayah</span>
                <span className="text-[10px] text-neutral-400 font-normal">(Otomatis Terisi)</span>
              </label>
              <input
                type="text"
                required
                disabled
                placeholder="Pilih kota di atas..."
                value={formData.name}
                className="w-full bg-neutral-100 border border-neutral-300 rounded-xl px-3 py-2 text-[13px] font-bold text-neutral-700 cursor-not-allowed select-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase">Kode Unik</label>
              <input
                type="text"
                required
                placeholder="Contoh: REG-JKT"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] font-medium font-mono uppercase"
              />
            </div>
          </div>

          <div className="space-y-2 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-neutral-700 uppercase flex items-center gap-1.5">
                <Layers size={13} className="text-[#10367D]" />
                Batas Wilayah Spasial GeoJSON
              </label>
              <div className="text-[11px] font-bold text-[#10367D]">
                {formData.boundaryPolygon ? '✓ Batas Poligon Dimuat' : 'Belum Ada Poligon'}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-neutral-600 flex items-center gap-1">
                  <FileCode size={11} /> Definisi Batas Poligon GeoJSON (Feature / Geometry):
                </span>
                {formData.boundaryPolygon && (
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, boundaryPolygon: ''})}
                    className="text-rose-500 hover:underline cursor-pointer font-bold"
                  >
                    Hapus Poligon
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                placeholder='Pilih kota di dropdown atas untuk mengisi batas GeoJSON resmi otomatis, atau tempel GeoJSON poligon kustom di sini.'
                value={formData.boundaryPolygon}
                onChange={(e) => setFormData({...formData, boundaryPolygon: e.target.value})}
                className="w-full bg-white border border-neutral-200 rounded-lg p-2 font-mono text-[11px] text-neutral-700 leading-tight focus:outline-none focus:ring-1 focus:ring-[#10367D]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase">Preview Batas di Peta Leaflet</label>
            <div className="rounded-xl overflow-hidden border border-neutral-200 h-44 relative z-0">
              <div className="absolute inset-0 z-0">
                <MapContainer center={[formData.latitude, formData.longitude]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[formData.latitude, formData.longitude]} />
                  
                  {formData.boundaryPolygon && parseGeoJSON(formData.boundaryPolygon) && (
                    <GeoJSON 
                      key={formData.boundaryPolygon}
                      data={parseGeoJSON(formData.boundaryPolygon)}
                      pathOptions={{ color: '#10367D', fillColor: '#10367D', fillOpacity: 0.18, weight: 2 }}
                    />
                  )}
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
              disabled={isSearchingLocation}
              className="px-4 py-2 text-[13px] font-bold text-white bg-[#10367D] hover:bg-[#0C2C66] rounded-full flex items-center gap-1 cursor-pointer shadow-sm transition disabled:opacity-50"
            >
              <Save size={13}/>
              Simpan Wilayah
            </button>
          </div>

        </form>
      </BaseModal>

    </div>
  );
}