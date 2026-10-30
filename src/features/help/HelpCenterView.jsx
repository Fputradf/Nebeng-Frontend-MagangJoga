import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Ticket,
  Wallet,
  MapPin,
  Car,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Send,
  Headset,
  CheckCheck,
  Clock,
  ArrowRight,
  Layers,
  Building2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { PROJECT_FAQS, FAQ_CATEGORIES } from '../../data/projectFaqData';
import { supportChatService } from '../../services/supportChatService';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/ui/StatCard';

const CATEGORY_ICONS = {
  all: Layers,
  about: Sparkles,
  booking: Ticket,
  payment: Wallet,
  pos: MapPin,
  mitra: Car,
  security: ShieldCheck,
};

export default function HelpCenterView({ userRole = 'customer' }) {
  const { user, customerProfile, mitraProfile } = useAuth();

  const profile = userRole === 'mitra' ? (mitraProfile || user) : (customerProfile || user);
  const userName = profile?.fullName || profile?.name || (userRole === 'mitra' ? 'Mitra Nebeng' : 'Pelanggan Nebeng');
  const userRegion = profile?.region || profile?.city || 'Jawa Barat (Bandung)';
  const userId = profile?.id || `${userRole}-${profile?.email || 'user'}`;

  // Tab State: 'faq' | 'chat'
  const [activeTab, setActiveTab] = useState('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaqId, setExpandedFaqId] = useState(PROJECT_FAQS[0]?.id || null);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // Chat State
  const [activeTicket, setActiveTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Filter FAQ items
  const filteredFaqs = PROJECT_FAQS.filter((faq) => {
    // Role match
    const roleMatches =
      faq.targetRoles.includes('all') ||
      faq.targetRoles.includes(userRole);
    if (!roleMatches) return false;

    // Category match
    if (selectedCategory !== 'all' && faq.category !== selectedCategory) {
      return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const questionMatch = faq.question.toLowerCase().includes(q);
      const answerMatch = faq.answer.toLowerCase().includes(q);
      return questionMatch || answerMatch;
    }

    return true;
  });

  // Load / Sync Support Chat Ticket
  useEffect(() => {
    const loadTicket = () => {
      const ticket = supportChatService.getOrCreateActiveTicketForUser({
        userId,
        userName,
        userRole,
        userEmail: profile?.email || '',
        userPhone: profile?.phone || '',
        region: userRegion,
        subject: `Pusat Bantuan ${userRole === 'mitra' ? 'Mitra' : 'Customer'}`,
      });
      setActiveTicket(ticket);
      setChatMessages(ticket?.messages || []);

      if (activeTab === 'chat' && ticket) {
        supportChatService.markAsReadByUser(ticket.id);
      }
    };

    loadTicket();

    const unsubscribe = supportChatService.subscribe(() => {
      loadTicket();
    });

    return () => unsubscribe();
  }, [userId, userName, userRole, userRegion, profile, activeTab]);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendMessage = (textToSend = inputText) => {
    if (!textToSend || !textToSend.trim() || !activeTicket) return;

    setIsSending(true);
    const sent = supportChatService.sendMessage(activeTicket.id, {
      sender: 'user',
      senderName: userName,
      senderRole: userRole,
      text: textToSend.trim(),
    });

    if (sent) {
      setInputText('');
      setChatMessages((prev) => [...prev, sent]);
    }
    setIsSending(false);
  };

  const handleQuickQuestion = (quickText) => {
    handleSendMessage(quickText);
  };

  const handleFaqFeedback = (faqId, type) => {
    setFeedbackGiven((prev) => ({
      ...prev,
      [faqId]: type,
    }));
  };

  const QUICK_QUESTIONS = userRole === 'mitra'
    ? [
        'Kapan akun dan dokumen armada saya disetujui?',
        'Bagaimana cara mengajukan pergantian kendaraan?',
        'Ada kendala saat konfirmasi QR tiket di Pos Mitra.',
        'Kapan pencairan saldo dompet saya diproses?',
      ]
    : [
        'Bagaimana cara membatalkan tiket dan klaim refund?',
        'Berapa jam sebelum keberangkatan saya harus tiba di Pos?',
        'Saldo dompet saya belum masuk setelah top-up.',
        'Apakah bisa reschedule tanggal keberangkatan?',
      ];

  // Scroll and Drag handlers for Tanya Cepat
  const quickScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isQuickDraggingRef = useRef(false);
  const quickStartXRef = useRef(0);
  const quickScrollLeftRef = useRef(0);
  const hasQuickMovedRef = useRef(false);

  // Scroll and Drag handlers for FAQ Categories (Pencarian & Filter Pertanyaan)
  const categoryScrollRef = useRef(null);
  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(false);

  const isCatDraggingRef = useRef(false);
  const catStartXRef = useRef(0);
  const catScrollLeftRef = useRef(0);
  const hasCatMovedRef = useRef(false);

  const checkCategoryScroll = useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollCatLeft(el.scrollLeft > 2);
    setCanScrollCatRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener('resize', checkCategoryScroll);
    return () => window.removeEventListener('resize', checkCategoryScroll);
  }, [checkCategoryScroll]);

  useEffect(() => {
    const timer = setTimeout(checkCategoryScroll, 150);
    return () => clearTimeout(timer);
  }, [activeTab, checkCategoryScroll]);

  const scrollCategoryBy = (amount) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkCategoryScroll, 300);
    }
  };

  const handleCatMouseDown = (e) => {
    if (!categoryScrollRef.current) return;
    isCatDraggingRef.current = true;
    hasCatMovedRef.current = false;
    catStartXRef.current = e.pageX - categoryScrollRef.current.offsetLeft;
    catScrollLeftRef.current = categoryScrollRef.current.scrollLeft;
  };

  const handleCatMouseMove = (e) => {
    if (!isCatDraggingRef.current || !categoryScrollRef.current) return;
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = x - catStartXRef.current;
    if (Math.abs(walk) > 4) {
      hasCatMovedRef.current = true;
      categoryScrollRef.current.scrollLeft = catScrollLeftRef.current - walk;
      checkCategoryScroll();
    }
  };

  const handleCatMouseUp = () => {
    isCatDraggingRef.current = false;
  };

  const handleCatWheel = (e) => {
    if (!categoryScrollRef.current) return;
    if (e.deltaY !== 0) {
      categoryScrollRef.current.scrollLeft += e.deltaY;
      checkCategoryScroll();
    }
  };

  const handleCatClick = (catId) => {
    if (hasCatMovedRef.current) return;
    setSelectedCategory(catId);
  };

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
  }, [activeTab, checkQuickScroll]);

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

  const handleQuickClick = (q) => {
    if (hasQuickMovedRef.current) return;
    handleQuickQuestion(q);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-sans">
      {/* ── BANNER GRADIENT (MATCHING PAGES LAIN) ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> PUSAT BANTUAN & PANDUAN RESMI
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pusat Bantuan & FAQ
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Temukan solusi cepat seputar pemesanan tiket, dompet escrow, pos mitra, atau hubungi langsung Admin Wilayah {userRegion}.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Stat Pill Admin Wilayah */}
            <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-accent text-brand-900 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Headset className="w-4 h-4 text-brand-900" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">
                  Admin Wilayah
                </div>
                <div className="text-sm font-black text-white">
                  {userRegion.replace(/Jawa Barat\s*/i, '').replace(/[\(\)]/g, '') || 'Online'} &bull; Standby
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-white/25 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[11px] right-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* ── STAT CARDS ROW (MATCHING CUSTOMER/MITRA VIEWS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="TOTAL PANDUAN FAQ"
          value={`${PROJECT_FAQS.length} Topik`}
          subtitle="Informasi resmi terverifikasi"
          icon={Sparkles}
        />
        <StatCard
          title="ADMIN WILAYAH"
          value={userRegion.replace(/Jawa Barat\s*/i, '').replace(/[\(\)]/g, '') || 'Regional'}
          subtitle="Siap melayani chat & kendala"
          icon={Building2}
        />
        <StatCard
          title="JAM OPERASIONAL"
          value="07.00 - 22.00 WIB"
          subtitle="Respon cepat setiap hari"
          icon={Clock}
        />
      </div>

      {/* ── TAB NAVIGASI UTAMA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Pusat FAQ & Bantuan ({filteredFaqs.length})
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-[#10367D] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Admin Wilayah
            {activeTicket?.unreadUser > 0 && (
              <span className="w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {activeTicket.unreadUser}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================= TAB 1: PUSAT FAQ ================= */}
      {activeTab === 'faq' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* ── CARD FORM PENCARIAN & FILTER FAQ (TATA LETAK PERSIS SEPERTI CARD FORM LAIN) ── */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-card border border-neutral-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#10367D] shrink-0 shadow-2xs">
                  <Search className="w-5 h-5 text-[#10367D]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-800">
                    Pencarian & Filter Pertanyaan
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Ketik kata kunci atau pilih kategori topik yang ingin Anda ketahui seputar Nebeng.
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-[#10367D] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 self-start sm:self-auto">
                {filteredFaqs.length} Topik Ditemukan
              </span>
            </div>

            {/* Input Search Form */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci pertanyaan... (contoh: tiket, refund, saldo dompet, pos mitra, verifikasi)"
                className="w-full pl-11 pr-20 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10367D] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Category Pills Form dengan Arrow Kesamping */}
            <div className="relative flex items-center gap-1.5 pt-1">
              {/* Tombol Arrow Kiri */}
              <button
                type="button"
                onClick={() => scrollCategoryBy(-220)}
                disabled={!canScrollCatLeft}
                aria-label="Geser kategori ke kiri"
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  canScrollCatLeft
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:border-slate-300 active:scale-95'
                    : 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable Category Container */}
              <div
                ref={categoryScrollRef}
                onMouseDown={handleCatMouseDown}
                onMouseMove={handleCatMouseMove}
                onMouseUp={handleCatMouseUp}
                onMouseLeave={handleCatMouseUp}
                onWheel={handleCatWheel}
                onScroll={checkCategoryScroll}
                className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5 scroll-smooth select-none cursor-grab active:cursor-grabbing"
              >
                {FAQ_CATEGORIES.map((cat) => {
                  const IconComponent = CATEGORY_ICONS[cat.id] || HelpCircle;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCatClick(cat.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#10367D] text-white shadow-xs ring-1 ring-[#10367D]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tombol Arrow Kanan */}
              <button
                type="button"
                onClick={() => scrollCategoryBy(220)}
                disabled={!canScrollCatRight}
                aria-label="Geser kategori ke kanan"
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  canScrollCatRight
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:border-slate-300 active:scale-95'
                    : 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── CARD LIST ACCORDION FAQ (TATA LETAK KONSISTEN) ── */}
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                const userFeedback = feedbackGiven[faq.id];

                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-3xl shadow-card border border-neutral-200 hover:border-blue-300 transition-all overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#10367D] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                          <HelpCircle className="w-5 h-5 text-[#10367D]" />
                        </div>
                        <div>
                          <span className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                            {faq.question}
                          </span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] font-bold text-[#10367D] bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {FAQ_CATEGORIES.find((c) => c.id === faq.category)?.label || 'Informasi'}
                            </span>
                            <span className="text-[11px] text-neutral-400">&bull;</span>
                            <span className="text-[11px] text-neutral-500">
                              {faq.helpfulCount + (userFeedback === 'yes' ? 1 : 0)} pengguna terbantu
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-sm text-neutral-600 border-t border-neutral-100 leading-relaxed space-y-4">
                        <div className="whitespace-pre-line font-normal text-neutral-700 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-100">
                          {faq.answer}
                        </div>

                        {/* Interactive Feedback */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                          <span className="text-neutral-500 font-medium">
                            Apakah jawaban ini menyelesaikan pertanyaan Anda?
                          </span>
                          <div className="flex items-center gap-2">
                            {userFeedback ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Terima kasih atas tanggapan Anda!
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleFaqFeedback(faq.id, 'yes')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition cursor-pointer font-bold text-neutral-700"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>Ya, Membantu</span>
                                </button>
                                <button
                                  onClick={() => handleFaqFeedback(faq.id, 'no')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-slate-100 transition cursor-pointer font-bold text-neutral-600"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  <span>Belum</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-3xl border border-neutral-200 p-8 text-center space-y-3 shadow-card">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Pertanyaan Tidak Ditemukan
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Tidak ada FAQ yang cocok dengan kata kunci &quot;{searchQuery}&quot;. Anda dapat langsung mengobrol dengan Admin Wilayah Anda!
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#10367D] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat dengan Admin Wilayah Sekarang</span>
                </button>
              </div>
            )}
          </div>

          {/* ── BOTTOM CTA CARD (MATCHING STYLE CARD PROMO/KLAIM VOUCHER) ── */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-card border border-neutral-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl border border-blue-200 bg-blue-50 flex items-center justify-center text-[#10367D] shrink-0 shadow-xs">
                  <Headset className="w-6 h-6 text-[#10367D]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-800">
                    Belum Menemukan Jawaban atas Kendala Anda?
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
                    Hubungi Admin Wilayah {userRegion} langsung melalui live chat bantuan untuk penanganan tiket, pembatalan, atau verifikasi akun Anda.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('chat')}
                className="px-5 py-3 rounded-xl bg-[#10367D] hover:bg-[#0c2353] text-white text-xs sm:text-sm font-bold transition shadow-card flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat dengan Admin Wilayah</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE CHAT DENGAN ADMIN WILAYAH ================= */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl shadow-card border border-neutral-200 flex flex-col h-[680px] overflow-hidden animate-in fade-in duration-200">
          {/* Chat Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-neutral-200 bg-slate-50/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-[#10367D] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <Building2 className="w-5 h-5 text-cyan-300" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">
                    Admin Wilayah ({userRegion})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Resmi
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                  <span>Online & Standby &bull; Tiket #{activeTicket?.id || 'TKT-LIVE'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('faq')}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-bold transition cursor-pointer"
              >
                Kembali ke FAQ
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips with Scroll Arrows */}
          <div className="relative px-3 py-2 bg-slate-100/70 border-b border-neutral-200/60 flex items-center gap-1.5">
            <span className="text-neutral-400 font-bold text-[11px] shrink-0 uppercase tracking-wider pl-1 pr-1">
              Tanya Cepat:
            </span>

            {/* Tombol Scroll Kiri */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollQuickBy(-200)}
                aria-label="Geser ke kiri"
                className="w-6 h-6 rounded-full bg-white shadow-xs border border-neutral-200 text-neutral-600 hover:text-blue-700 hover:bg-neutral-50 flex items-center justify-center transition cursor-pointer shrink-0 z-10"
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
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickClick(q)}
                  className="px-3 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:border-blue-400 hover:text-blue-700 text-xs whitespace-nowrap transition cursor-pointer shadow-2xs font-medium shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Tombol Scroll Kanan */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollQuickBy(200)}
                aria-label="Geser ke kanan"
                className="w-6 h-6 rounded-full bg-white shadow-xs border border-neutral-200 text-neutral-600 hover:text-blue-700 hover:bg-neutral-50 flex items-center justify-center transition cursor-pointer shrink-0 z-10"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-neutral-400">
                <MessageSquare className="w-10 h-10 mx-auto text-neutral-300" />
                <p className="text-xs">Belum ada pesan. Mulai obrolan dengan Admin Wilayah Anda.</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-neutral-600">
                        {isMe ? 'Anda' : msg.senderName}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-md p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs whitespace-pre-line ${
                        isMe
                          ? 'bg-[#10367D] text-white rounded-tr-none'
                          : 'bg-white text-neutral-800 border border-neutral-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-neutral-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Tulis pesan atau pertanyaan Anda ke Admin Wilayah..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#10367D] focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-5 py-3 bg-[#10367D] hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-sm shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </form>
            <p className="text-[10px] text-neutral-400 mt-2 text-center">
              Pesan Anda dikirimkan langsung ke dashboard Admin Wilayah ({userRegion}). Respon cepat 07.00 - 22.00 WIB.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
