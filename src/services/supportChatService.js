/**
 * Layanan Sinkronisasi Bantuan Chat (Customer/Mitra <-> Admin Wilayah)
 * Menggunakan localStorage dan CustomEvent agar sinkron real-time antar tab dan antar role.
 */

const STORAGE_KEY = 'nebeng_support_tickets_v1';
const UPDATE_EVENT = 'nebeng_support_ticket_updated';

const INITIAL_TICKETS = [
  {
    id: 'TKT-2026-001',
    userId: 'cust-demo-1',
    userName: 'Ahmad Fadillah',
    userRole: 'customer',
    userEmail: 'ahmad.fadillah@gmail.com',
    userPhone: '081234567890',
    region: 'Jawa Barat (Bandung)',
    subject: 'Konfirmasi Lokasi Titik Pos Buah Batu',
    status: 'open',
    unreadAdmin: 1,
    unreadUser: 0,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        senderName: 'Ahmad Fadillah',
        senderRole: 'customer',
        text: 'Halo Admin Wilayah Bandung, apakah Pos Buah Batu buka 24 jam untuk keberangkatan malam ini?',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'admin',
        senderName: 'Admin Wilayah Bandung',
        senderRole: 'regional_admin',
        text: 'Halo Mas Ahmad! Ya, Pos Buah Batu buka 24 jam dengan Operator Pos standby. Pastikan hadir 15 menit sebelum armada berangkat ya.',
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'msg-3',
        sender: 'user',
        senderName: 'Ahmad Fadillah',
        senderRole: 'customer',
        text: 'Baik min terima kasih banyak infonya! Apakah tiket digital cukup ditunjukkan lewat aplikasi?',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'TKT-2026-002',
    userId: 'mitra-demo-2',
    userName: 'Budi Santoso (Driver Avanza D 1234 ABC)',
    userRole: 'mitra',
    userEmail: 'budi.santoso@gmail.com',
    userPhone: '085712345678',
    region: 'DKI Jakarta',
    subject: 'Pembaruan Dokumen STNK Tahunan',
    status: 'in_progress',
    unreadAdmin: 0,
    unreadUser: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    messages: [
      {
        id: 'msg-201',
        sender: 'user',
        senderName: 'Budi Santoso',
        senderRole: 'mitra',
        text: 'Selamat siang Admin Wilayah. Saya baru saja mengunggah perpanjangan STNK tahunan di menu verifikasi, mohon dibantu approval-nya agar jadwal besok tetap aktif.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'msg-202',
        sender: 'admin',
        senderName: 'Admin Wilayah Jakarta',
        senderRole: 'regional_admin',
        text: 'Siang Pak Budi. Berkas STNK baru Anda sudah kami verifikasi dan status armada Anda sudah diperbarui aktif. Selamat bertugas kembali!',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
];

function readTicketsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TICKETS));
      return INITIAL_TICKETS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading support tickets:', e);
    return INITIAL_TICKETS;
  }
}

function saveTicketsToStorage(tickets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: tickets }));
  } catch (e) {
    console.error('Error saving support tickets:', e);
  }
}

export const supportChatService = {
  getTickets() {
    return readTicketsFromStorage();
  },

  getTicketById(ticketId) {
    const tickets = readTicketsFromStorage();
    return tickets.find((t) => t.id === ticketId) || null;
  },

  getOrCreateActiveTicketForUser({ userId, userName, userRole, userEmail, userPhone, region, subject }) {
    const tickets = readTicketsFromStorage();
    
    // Cari tiket aktif (open atau in_progress) milik user ini
    let activeTicket = tickets.find(
      (t) => String(t.userId) === String(userId) && (t.status === 'open' || t.status === 'in_progress')
    );

    if (!activeTicket) {
      const newId = `TKT-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, '0')}`;
      activeTicket = {
        id: newId,
        userId: String(userId || 'guest'),
        userName: userName || (userRole === 'mitra' ? 'Mitra Pengemudi' : 'Customer Nebeng'),
        userRole: userRole || 'customer',
        userEmail: userEmail || '',
        userPhone: userPhone || '',
        region: region || 'Wilayah Terdaftar',
        subject: subject || 'Bantuan Layanan & Informasi',
        status: 'open',
        unreadAdmin: 1,
        unreadUser: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: 'admin',
            senderName: `Admin Wilayah ${region ? region.replace(/Admin\s*Wilayah/i, '').trim() : 'Pusat'}`,
            senderRole: 'regional_admin',
            text: `Halo ${userName || 'Pengguna'}! Selamat datang di Layanan Bantuan Admin Wilayah Nebeng. Ada kendala perjalanan, verifikasi, atau tiket yang bisa kami bantu?`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      tickets.unshift(activeTicket);
      saveTicketsToStorage(tickets);
    }

    return activeTicket;
  },

  sendMessage(ticketId, { sender, senderName, senderRole, text }) {
    if (!text || !text.trim()) return null;
    const tickets = readTicketsFromStorage();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = { ...tickets[index] };
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: sender || 'user',
      senderName: senderName || 'Pengguna',
      senderRole: senderRole || 'customer',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    ticket.messages = [...ticket.messages, newMessage];
    ticket.updatedAt = new Date().toISOString();

    if (sender === 'user') {
      ticket.unreadAdmin = (ticket.unreadAdmin || 0) + 1;
      if (ticket.status === 'resolved') {
        ticket.status = 'open'; // Re-open jika user membalas
      }
    } else {
      ticket.unreadUser = (ticket.unreadUser || 0) + 1;
      ticket.unreadAdmin = 0;
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
      }
    }

    tickets[index] = ticket;
    // Urutkan tiket berdasarkan updatedAt terbaru
    tickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    saveTicketsToStorage(tickets);
    return newMessage;
  },

  markAsReadByAdmin(ticketId) {
    const tickets = readTicketsFromStorage();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return;

    tickets[index].unreadAdmin = 0;
    saveTicketsToStorage(tickets);
  },

  markAsReadByUser(ticketId) {
    const tickets = readTicketsFromStorage();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return;

    tickets[index].unreadUser = 0;
    saveTicketsToStorage(tickets);
  },

  updateTicketStatus(ticketId, status) {
    const tickets = readTicketsFromStorage();
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return;

    tickets[index].status = status;
    tickets[index].updatedAt = new Date().toISOString();
    saveTicketsToStorage(tickets);
  },

  subscribe(callback) {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        callback(readTicketsFromStorage());
      }
    };
    const handleCustom = (e) => {
      callback(e.detail || readTicketsFromStorage());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(UPDATE_EVENT, handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(UPDATE_EVENT, handleCustom);
    };
  },
};

