/**
 * Layanan Sinkronisasi Pemantauan Trip Disrupted (Insiden & Kendala Lapangan)
 * Tersinkronisasi secara real-time antar menu Admin Wilayah (Dashboard & Pusat Bantuan Chat).
 */

const STORAGE_KEY = 'nebeng_disrupted_trips_v1';
const UPDATE_EVENT = 'nebeng_disrupted_trips_updated';

const INITIAL_DISRUPTED_TRIPS = [
  {
    id: 'TRP-1042',
    mitra: 'Budi Santoso',
    vehicle: 'Toyota Avanza (D 1234 ABC)',
    phone: '081234567890',
    origin: 'Bandung (Pos Buah Batu)',
    destination: 'Jakarta (Pos Cawang)',
    issue: 'Mogok Radiator Overheat di KM 72',
    location: 'Tol Cipularang KM 72 Jalur A',
    time: '14:20 WIB',
    regionId: '1',
    assistanceStatus: 'Pending',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'TRP-1088',
    mitra: 'Agus Setiawan',
    vehicle: 'Daihatsu Xenia (B 5678 XYZ)',
    phone: '085712345678',
    origin: 'Bekasi (Pos Barat)',
    destination: 'Bandung (Pos Pasteur)',
    issue: 'Pecah Ban Kanan Belakang',
    location: 'Tol Jakarta-Cikampek KM 38',
    time: '15:10 WIB',
    regionId: '1',
    assistanceStatus: 'Tim Darurat Menuju Lokasi',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
];

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DISRUPTED_TRIPS));
      return INITIAL_DISRUPTED_TRIPS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading disrupted trips:', e);
    return INITIAL_DISRUPTED_TRIPS;
  }
}

function saveToStorage(trips) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: trips }));
  } catch (e) {
    console.error('Error saving disrupted trips:', e);
  }
}

export const disruptedTripsService = {
  getDisruptedTrips(regionId) {
    const all = readFromStorage();
    if (!regionId) return all;
    return all.filter((t) => !t.regionId || String(t.regionId) === String(regionId));
  },

  addDisruptedTrip(data) {
    const all = readFromStorage();
    const newTrip = {
      id: data.id || `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      mitra: data.mitra || 'Mitra Nebeng',
      vehicle: data.vehicle || 'Armada Operasional',
      phone: data.phone || '-',
      origin: data.origin || 'Pos Asal',
      destination: data.destination || 'Pos Tujuan',
      issue: data.issue || 'Kendala Lapangan',
      location: data.location || 'Wilayah Operasional',
      time: data.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      regionId: data.regionId || '1',
      assistanceStatus: data.assistanceStatus || 'Pending',
      ticketId: data.ticketId || null,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTrip, ...all];
    saveToStorage(updated);
    return newTrip;
  },

  updateDisruptedTrip(id, partial) {
    const all = readFromStorage();
    const updated = all.map((t) => (t.id === id ? { ...t, ...partial } : t));
    saveToStorage(updated);
    return updated;
  },

  resolveDisruptedTrip(id) {
    const all = readFromStorage();
    const updated = all.filter((t) => t.id !== id);
    saveToStorage(updated);
    return updated;
  },

  subscribe(callback) {
    const handler = (e) => {
      callback(e.detail || readFromStorage());
    };
    window.addEventListener(UPDATE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_EVENT, handler);
  },
};
