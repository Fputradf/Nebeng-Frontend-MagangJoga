import { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertTriangle,
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supportChatService } from '../../../services/supportChatService';
import { disruptedTripsService } from '../../../services/disruptedTripsService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import BaseModal from '../../../components/ui/BaseModal';

const CANNED_RESPONSES = [
  'Halo! Berkas Anda telah kami terima dan saat ini sedang kami verifikasi secara manual. Mohon ditunggu ya.',
  'Tiket digital Anda sah dan terdata di sistem. Silakan tiba di Pos Mitra 15 menit sebelum waktu keberangkatan.',
  'Dana pembatalan tiket telah diproses kembali ke saldo Dompet Digital Nebeng Anda. Silakan cek menu Dompet.',
  'Pos Mitra di wilayah kami beroperasi 24 jam dengan Operator Pos yang siap membantu validasi QR tiket.',
  'Mohon pastikan foto KTP dan foto selfie wajah Anda jelas tanpa masker/kacamata hitam agar verifikasi dapat disetujui.',
];

export default function RegionalSupportChat() {
  const toast = useToast();
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

  // Modal Eskalasi ke Trip Disrupted
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateForm, setEscalateForm] = useState({
    id: '',
    mitra: '',
    vehicle: '',
    phone: '',
    origin: '',
    destination: '',
    issue: '',
    location: '',
  });

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

  // Scroll and Drag handlers for Balas Cepat
  const quickScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isQuickDraggingRef = useRef(false);
  const quickStartXRef = useRef(0);
  const quickScrollLeftRef = useRef(0);
  const hasQuickMovedRef = useRef(false);

  const checkQuickScroll = useCallback(() => {
    const el = quickScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkQuickScroll();
    window.addEventListener('resize', checkQuickScroll);
    return () => window.removeEventListener('resize', checkQuickScroll);
  }, [checkQuickScroll]);

  useEffect(() => {
    const timer = setTimeout(checkQuickScroll, 150);
    return () => clearTimeout(timer);
  }, [selectedTicketId, checkQuickScroll]);

  const scrollQuickBy = (amount) => {
    if (quickScrollRef.current) {
      quickScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkQuickScroll, 300);
    }
  };

  const handleQuickMouseDown = (e) => {
    if (!quickScrollRef.current) return;
    isQuickDraggingRef.current = true;
    hasQuickMovedRef.current = false;
    quickStartXRef.current = e.pageX - quickScrollRef.current.offsetLeft;
    quickScrollLeftRef.current = quickScrollRef.current.scrollLeft;
  };

  const handleQuickMouseMove = (e) => {
    if (!isQuickDraggingRef.current || !quickScrollRef.current) return;
    const x = e.pageX - quickScrollRef.current.offsetLeft;
    const walk = x - quickStartXRef.current;
    if (Math.abs(walk) > 4) {
      hasQuickMovedRef.current = true;
      quickScrollRef.current.scrollLeft = quickScrollLeftRef.current - walk;
      checkQuickScroll();
    }
  };

  const handleQuickMouseUp = () => {
    isQuickDraggingRef.current = false;
  };

  const handleQuickWheel = (e) => {
    if (!quickScrollRef.current) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      quickScrollRef.current.scrollLeft += e.deltaY;
      checkQuickScroll();
    }
  };

  const handleQuickClick = (res) => {
    if (hasQuickMovedRef.current) return;
    handleSendReply(res);
  };

  const handleStatusChange = (newStatus) => {
    if (!selectedTicket) return;
    supportChatService.updateTicketStatus(selectedTicket.id, newStatus);
  };

  const handleOpenEscalate = (ticket) => {
    if (!ticket) return;
    const lastUserMsg = [...(ticket.messages || [])].reverse().find(m => m.sender === 'user');
    setEscalateForm({
      id: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      mitra: ticket.userName,
      vehicle: ticket.userRole === 'mitra' ? 'Armada Mitra Terdaftar' : 'Armada Penumpang',
      phone: ticket.userPhone || '-',
      origin: 'Pos Asal Wilayah',
      destination: 'Pos Tujuan Wilayah',
      issue: lastUserMsg ? lastUserMsg.text.slice(0, 80) : ticket.subject,
      location: ticket.region || 'Wilayah Terkait',
    });
    setIsEscalateModalOpen(true);
  };

  const handleConfirmEscalate = (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const created = disruptedTripsService.addDisruptedTrip({
      id: escalateForm.id || `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      mitra: escalateForm.mitra,
      vehicle: escalateForm.vehicle || 'Armada Operasional',
      phone: escalateForm.phone || '-',
      origin: escalateForm.origin || 'Pos Asal Wilayah',
      destination: escalateForm.destination || 'Pos Tujuan Wilayah',
      issue: escalateForm.issue,
      location: escalateForm.location,
      ticketId: selectedTicket.id,
      regionId: adminProfile?.regionId || session?.regionId || '1',
      assistanceStatus: 'Pending',
    });

    // Otomatis kirim pesan konfirmasi eskalasi di chat
    supportChatService.sendMessage(selectedTicket.id, {
      sender: 'admin',
      senderName: `${currentAdminName} (${currentRegion})`,
      senderRole: 'regional_admin',
      text: `🚨 Laporan kendala Anda telah kami eskalasikan ke Pemantauan Trip Disrupted (ID: ${created.id}). Tim Pos Operasional terdekat sedang dikoordinasikan untuk bantuan penanganan di lokasi.`,
    });

    // Tandai status tiket menjadi in_progress
    supportChatService.updateTicketStatus(selectedTicket.id, 'in_progress');

    toast.success(`Laporan berhasil dieskalasikan ke Pemantauan Trip Disrupted (${created.id})!`, {
      title: 'Eskalasi Insiden Berhasil',
    });

    setIsEscalateModalOpen(false);
  };

  // Metrics
  const totalTickets = tickets.length;
  const pendingTickets = tickets.filter((t) => t.status !== 'resolved').length;
  const customerTickets = tickets.filter((t) => t.userRole === 'customer').length;
  const mitraTickets = tickets.filter((t) => t.userRole === 'mitra').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-sans">
      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Headset className="w-3.5 h-3.5" /> BANTUAN OPERASIONAL WILAYAH
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pusat Bantuan Chat Wilayah
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Layanan respon cepat dan penanganan kendala Customer & Mitra di {currentRegion}.
            </p>
          </div>

          <button
            onClick={() => setTickets(supportChatService.getTickets())}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-2xl backdrop-blur text-white text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4 text-accent" />
            <span>Muat Ulang Pesan</span>
          </button>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ================= STATS SUMMARY ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tiket Masuk</p>
          <p className="text-2xl font-black text-slate-900">{totalTickets}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Menunggu Respon</p>
          <p className="text-2xl font-black text-amber-600">{pendingTickets}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Tiket Customer</p>
          <p className="text-2xl font-black text-[#10367D]">{customerTickets}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Tiket Mitra</p>
          <p className="text-2xl font-black text-emerald-700">{mitraTickets}</p>
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

                {/* Actions & Status Changer */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenEscalate(selectedTicket)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                    title="Eskalasikan laporan chat ini ke Pemantauan Trip Disrupted di Dashboard Wilayah"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Eskalasi ke Trip Disrupted</span>
                    <span className="sm:hidden">Eskalasi</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <label className="text-[11px] font-bold text-slate-500">Status:</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="open">Aktif (Open)</option>
                      <option value="in_progress">Diproses (In Progress)</option>
                      <option value="resolved">Selesai (Resolved)</option>
                    </select>
                  </div>
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
              <div className="relative px-3 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1 pr-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Balas Cepat:
                </span>

                {/* Tombol Scroll Kiri */}
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => scrollQuickBy(-200)}
                    aria-label="Geser ke kiri"
                    className="w-6 h-6 rounded-full bg-white shadow-xs border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer shrink-0 z-10"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Scrollable Container */}
                <div
                  ref={quickScrollRef}
                  onMouseDown={handleQuickMouseDown}
                  onMouseMove={handleQuickMouseMove}
                  onMouseUp={handleQuickMouseUp}
                  onMouseLeave={handleQuickMouseUp}
                  onWheel={handleQuickWheel}
                  onScroll={checkQuickScroll}
                  className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs select-none cursor-grab active:cursor-grabbing scroll-smooth py-0.5 px-0.5"
                >
                  {CANNED_RESPONSES.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickClick(res)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-[11px] text-slate-600 whitespace-nowrap transition cursor-pointer shadow-2xs font-medium shrink-0"
                    >
                      {res.substring(0, 38)}...
                    </button>
                  ))}
                </div>

                {/* Tombol Scroll Kanan */}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => scrollQuickBy(200)}
                    aria-label="Geser ke kanan"
                    className="w-6 h-6 rounded-full bg-white shadow-xs border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer shrink-0 z-10"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
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

      {/* Modal Eskalasi ke Trip Disrupted */}
      <BaseModal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        title="Eskalasi Laporan ke Trip Disrupted"
        subtitle={`Tiket ${selectedTicket?.id} · ${selectedTicket?.userName}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConfirmEscalate} className="space-y-4 text-xs font-medium text-slate-700">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Laporan ini akan langsung dicatat ke panel <strong>Pemantauan Trip Disrupted</strong> pada Dashboard Wilayah agar tim pos dapat mengoordinasikan bantuan darurat.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">ID Perjalanan (Trip ID)</label>
              <input
                type="text"
                value={escalateForm.id}
                onChange={(e) => setEscalateForm({ ...escalateForm, id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Nama Pelapor / Mitra</label>
              <input
                type="text"
                value={escalateForm.mitra}
                onChange={(e) => setEscalateForm({ ...escalateForm, mitra: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Armada / Kendaraan</label>
              <input
                type="text"
                value={escalateForm.vehicle}
                onChange={(e) => setEscalateForm({ ...escalateForm, vehicle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Contoh: Avanza (D 1234 ABC)"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Nomor Telepon Kontak</label>
              <input
                type="text"
                value={escalateForm.phone}
                onChange={(e) => setEscalateForm({ ...escalateForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-700">Pos Asal</label>
              <input
                type="text"
                value={escalateForm.origin}
                onChange={(e) => setEscalateForm({ ...escalateForm, origin: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold text-slate-700">Pos Tujuan</label>
              <input
                type="text"
                value={escalateForm.destination}
                onChange={(e) => setEscalateForm({ ...escalateForm, destination: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Ringkasan Kendala / Hambatan</label>
            <input
              type="text"
              value={escalateForm.issue}
              onChange={(e) => setEscalateForm({ ...escalateForm, issue: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Jelaskan masalah, misal: Mogok, ban bocor, kecelakaan"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-bold text-slate-700">Titik / Lokasi Kejadian</label>
            <input
              type="text"
              value={escalateForm.location}
              onChange={(e) => setEscalateForm({ ...escalateForm, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Contoh: Tol KM 72 / Jl. Soekarno Hatta No. 12"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEscalateModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold cursor-pointer transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold cursor-pointer shadow-sm transition flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" /> Konfirmasi & Eskalasi
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}

