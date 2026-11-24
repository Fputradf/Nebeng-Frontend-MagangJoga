import { createContext, useCallback, useContext, useState } from 'react';

const TicketsContext = createContext(null);

/**
 * Data dummy awal (seed) supaya halaman "My Tickets" tetap punya contoh
 * tiket aktif, riwayat, dan ulasan saat pertama kali dibuka — sebelum user
 * benar-benar melakukan booking baru dari halaman "Cari & Booking Trip".
 *
 * CATATAN LOGIKA: sebelumnya data ini didefinisikan secara lokal di dalam
 * MyTickets.jsx, terpisah dari SearchTrip.jsx. Akibatnya tiket hasil booking
 * baru tidak pernah muncul di "My Tickets" karena masing-masing halaman
 * punya state sendiri-sendiri. Dengan dipindah ke context ini, kedua
 * halaman berbagi satu sumber data yang sama.
 */
const seedTickets = [
  {
    id: 'TKT-2026-001',
    type: 'penumpang',
    title: 'SatuRute Penumpang',
    from: 'Pos Solo Kota',
    to: 'Pos Semarang Indah',
    mitra: 'Budi Santoso',
    vehicle: 'Toyota Avanza (H 1234 AB)',
    schedule: '2026-08-25 • 08:00 WIB',
    detail: '2 Kursi (Nomor 1A, 1B)',
    status: 'Aktif',
    currentStatusText: 'In Transit (Menuju Semarang)',
    otp: null,
    trackingLogs: [
      { status: 'Checked-in at Pos', location: 'Pos Solo Kota', time: '07:45 WIB', completed: true, active: false },
      { status: 'In Transit', location: 'Perjalanan Tol Batang-Semarang', time: '08:30 WIB', completed: true, active: true },
      { status: 'Arrived at Pos Destination', location: 'Pos Semarang Indah', time: 'Estimasi 10:00 WIB', completed: false, active: false }
    ]
  },
  {
    id: 'TKT-2026-002',
    type: 'barang',
    title: 'SatuRute Barang (Paket Elektronik)',
    from: 'Pos Solo Kota',
    to: 'Pos Yogyakarta Pusat',
    mitra: 'Siti Aminah',
    vehicle: 'Yamaha NMAX (AD 5678 CD)',
    schedule: '2026-08-25 • 10:30 WIB',
    detail: '1 Item - 5 Kg (Elektronik)',
    otp: '482910',
    status: 'Aktif',
    currentStatusText: 'Checked-in at Pos Asal',
    trackingLogs: [
      { status: 'Checked-in at Pos', location: 'Pos Solo Kota', time: '10:15 WIB', completed: true, active: true },
      { status: 'In Transit', location: 'Menunggu Driver Berangkat', time: '-', completed: false, active: false },
      { status: 'Arrived at Pos Destination', location: 'Pos Yogyakarta Pusat', time: '-', completed: false, active: false }
    ]
  },
  {
    id: 'TKT-2026-003',
    type: 'penumpang',
    title: 'SatuRute Penumpang',
    from: 'Pos Yogyakarta Pusat',
    to: 'Pos Solo Kota',
    mitra: 'Joko Widodo',
    vehicle: 'Honda Mobilio (AB 1234 XY)',
    schedule: '2026-08-20 • 14:00 WIB',
    detail: '1 Kursi (Nomor 2C)',
    status: 'Selesai',
    currentStatusText: 'Perjalanan Selesai',
    otp: null,
    rating: 5,
    review: 'Driver sangat ramah dan tepat waktu! Pos pengantaran aman.',
    trackingLogs: [
      { status: 'Checked-in at Pos', location: 'Pos Yogyakarta Pusat', time: '13:45 WIB', completed: true, active: false },
      { status: 'In Transit', location: 'Jalur Jogja-Solo', time: '14:15 WIB', completed: true, active: false },
      { status: 'Arrived at Pos Destination', location: 'Pos Solo Kota', time: '16:00 WIB', completed: true, active: false }
    ]
  }
];

export function TicketsProvider({ children }) {
  const [tickets, setTickets] = useState(seedTickets);

  // Menambahkan tiket baru hasil booking (dipanggil dari SearchTrip.jsx
  // setelah PIN transaksi berhasil diverifikasi).
  const addTicket = useCallback((ticket) => {
    setTickets((prev) => [ticket, ...prev]);
  }, []);

  // Memperbarui sebagian field tiket berdasarkan id (mis. saat user
  // mengirim rating & ulasan di MyTickets.jsx).
  const updateTicket = useCallback((id, patch) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const value = { tickets, addTicket, updateTicket };

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- pola context umum (Provider + hook satu file), konsisten dengan AuthContext & ToastContext
export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) {
    throw new Error('useTickets harus dipakai di dalam <TicketsProvider>');
  }
  return ctx;
}
