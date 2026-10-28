import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Car,
  Headset,
  Send,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { supportChatService } from '../../../services/supportChatService';
import { useAuth } from '../../../context/AuthContext';

const CANNED_RESPONSES = [
  'Halo! Berkas Anda telah kami terima dan saat ini sedang kami verifikasi secara manual. Mohon ditunggu ya.',
  'Tiket digital Anda sah dan terdata di sistem. Silakan tiba di Pos Mitra 15 menit sebelum waktu keberangkatan.',
  'Dana pembatalan tiket telah diproses kembali ke saldo Dompet Digital Nebeng Anda. Silakan cek menu Dompet.',
  'Pos Mitra di wilayah kami beroperasi 24 jam dengan Operator Pos yang siap membantu validasi QR tiket.',
  'Mohon pastikan foto KTP dan foto selfie wajah Anda jelas tanpa masker/kacamata hitam agar verifikasi dapat disetujui.',
];

export default function RegionalSupportChat() {
  const { session, adminProfile } = useAuth();
  const currentAdminName = adminProfile?.name || session?.name || 'Admin Wilayah';
  const currentRegion = adminProfile?.region || session?.region || 'Wilayah';

  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'customer' | 'mitra'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);

  // Load tickets and subscribe to real-time changes
  useEffect(() => {
    const load = () => {
      const all = supportChatService.getTickets();
      setTickets(all);
      if (all.length > 0 && !selectedTicketId) {
        setSelectedTicketId(all[0].id);
      }
    };

    load();
    const unsub = supportChatService.subscribe((updatedTickets) => {
      setTickets(updatedTickets);
    });

    return () => unsub();
  }, [selectedTicketId]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  // Mark as read when ticket is selected
  useEffect(() => {
    if (selectedTicket?.id) {
      supportChatService.markAsReadByAdmin(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (roleFilter !== 'all' && t.userRole !== roleFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.userName?.toLowerCase().includes(q);
      const matchId = t.id?.toLowerCase().includes(q);
      const matchSubject = t.subject?.toLowerCase().includes(q);
      return matchName || matchId || matchSubject;
    }
    return true;
  });

  const handleSendReply = (textToSend = replyText) => {
    if (!textToSend || !textToSend.trim() || !selectedTicket) return;

    supportChatService.sendMessage(selectedTicket.id, {
      sender: 'admin',
      senderName: `${currentAdminName} (${currentRegion})`,
      senderRole: 'regional_admin',
      text: textToSend.trim(),
    });

    setReplyText('');
  };

  const handleStatusChange = (newStatus) => {
    if (!selectedTicket) return;
    supportChatService.updateTicketStatus(selectedTicket.id, newStatus);
  };

  // Metrics
  const totalTickets = tickets.length;
  const pendingTickets = tickets.filter((t) => t.status !== 'resolved').length;
  const customerTickets = tickets.filter((t) => t.userRole === 'customer').length;
  const mitraTickets = tickets.filter((t) => t.userRole === 'mitra').length;

  return (
    <div className="space-y-6 font-sans">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-[#10367D]">
              <Headset className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Pusat Bantuan Chat Wilayah
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Layanan respon cepat dan penanganan kendala Customer & Mitra di {currentRegion}.
          </p>
        </div>

        {/* Quick Refresh */}
        <button
          onClick={() => setTickets(supportChatService.getTickets())}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Muat Ulang Pesan</span>
        </button>
      </div>

      {/* ================= STATS SUMMARY ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500">Total Tiket Masuk</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalTickets}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <p className="text-xs font-bold text-amber-700">Menunggu Respon</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingTickets}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <p className="text-xs font-bold text-blue-700">Tiket Customer</p>
          <p className="text-2xl font-black text-[#10367D] mt-1">{customerTickets}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <p className="text-xs font-bold text-emerald-700">Tiket Mitra</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{mitraTickets}</p>
        </div>
      </div>

      {/* ================= MAIN CHAT WORKSPACE ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* ================= LEFT COLUMN: TICKET LIST ================= */}
        <div className="lg:col-span-5 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tiket, nama, atau topik..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'customer', label: 'Customer' },
                { id: 'mitra', label: 'Mitra' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => setRoleFilter(rf.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    roleFilter === rf.id
                      ? 'bg-[#10367D] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rf.label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              {/* Status Filter */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === 'open'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Belum Selesai
              </button>
            </div>
          </div>

          {/* Ticket Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const lastMsg = ticket.messages[ticket.messages.length - 1];
                const isCustomer = ticket.userRole === 'customer';

                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full p-4 text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-[#10367D]'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold ${
                            isCustomer
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isCustomer ? <User className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {ticket.userName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-600 truncate">
                        {ticket.subject}
                      </span>
                      {ticket.unreadAdmin > 0 && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {ticket.unreadAdmin}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {lastMsg ? `${lastMsg.sender === 'admin' ? 'Anda: ' : ''}${lastMsg.text}` : 'Belum ada pesan'}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          ticket.status === 'resolved'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ticket.status === 'resolved' ? 'Selesai' : 'Aktif'}
                      </span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-slate-500 truncate">{ticket.region}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada tiket bantuan yang cocok dengan filter.
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CHAT CONVERSATION ================= */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white">
          {selectedTicket ? (
            <>
              {/* Ticket Topbar */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shrink-0 ${
                      selectedTicket.userRole === 'customer'
                        ? 'bg-[#10367D]'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {selectedTicket.userRole === 'customer' ? <User className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {selectedTicket.userName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedTicket.userRole === 'customer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {selectedTicket.userRole === 'customer' ? 'Customer' : 'Mitra'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span>{selectedTicket.region}</span>
                      <span>&bull;</span>
                      <span>{selectedTicket.id}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Status Changer */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500">Status:</label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="open">Aktif (Open)</option>
                    <option value="in_progress">Diproses (In Progress)</option>
                    <option value="resolved">Selesai (Resolved)</option>
                  </select>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
                {selectedTicket.messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          {isAdmin ? `Anda (${currentAdminName})` : msg.senderName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs ${
                          isAdmin
                            ? 'bg-[#10367D] text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Responses */}
              <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Balas Cepat:
                </span>
                {CANNED_RESPONSES.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendReply(res)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-[11px] text-slate-600 whitespace-nowrap transition cursor-pointer shadow-2xs font-medium"
                  >
                    {res.substring(0, 38)}...
                  </button>
                ))}
              </div>

              {/* Reply Input Box */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendReply();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tulis balasan resmi sebagai Admin Wilayah..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-5 py-3 bg-[#10367D] hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-sm shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Balasan</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 space-y-2">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Pilih Tiket Bantuan</p>
              <p className="text-xs text-slate-400">Pilih percakapan dari daftar di sebelah kiri untuk melihat pesan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

