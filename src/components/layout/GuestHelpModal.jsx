import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogIn,
  UserPlus,
  Phone,
  Mail,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { PROJECT_FAQS, FAQ_CATEGORIES } from '../../data/projectFaqData';

export default function GuestHelpModal({ isOpen, onClose, onNavigateLogin, onNavigateRegister }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaqId, setExpandedFaqId] = useState(PROJECT_FAQS[0]?.id || null);
  const [showChatNotice, setShowChatNotice] = useState(false);
  const [isWrapMode, setIsWrapMode] = useState(false);

  // Slider & Drag-to-scroll state & refs
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftPosRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isWrapMode) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, [isWrapMode]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(checkScroll, 100);
    }
  }, [isOpen, checkScroll, isWrapMode]);

  useEffect(() => {
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const scrollByAmount = (amount) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const handleMouseDown = (e) => {
    if (isWrapMode || !scrollRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftPosRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      scrollRef.current.scrollLeft = scrollLeftPosRef.current - walk;
      checkScroll();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    if (isWrapMode || !scrollRef.current) return;
    if (e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const handleCategorySelect = (catId) => {
    if (hasMovedRef.current) return;
    setSelectedCategory(catId);
  };

  if (!isOpen) return null;

  const filteredFaqs = PROJECT_FAQS.filter((faq) => {
    if (selectedCategory !== 'all' && faq.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0c2353] via-[#10367D] to-[#18458f] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Pusat Bantuan & FAQ Nebeng
              </h2>
              <p className="text-xs text-blue-200">
                Panduan resmi perjalanan antar kota, tiket, dan pos mitra
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kendala, cara booking, pos mitra, refund..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsWrapMode(!isWrapMode)}
              className={`p-2.5 rounded-xl border transition cursor-pointer text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                isWrapMode
                  ? 'bg-blue-50 border-blue-300 text-[#10367D]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={isWrapMode ? 'Beralih ke mode geser horizontal' : 'Tampilkan semua kategori sekaligus'}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{isWrapMode ? 'Mode Geser' : 'Lihat Semua'}</span>
            </button>
          </div>

          <div className="relative">
            {/* Tombol Geser Kiri */}
            {!isWrapMode && canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-2 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent">
                <button
                  type="button"
                  onClick={() => scrollByAmount(-200)}
                  aria-label="Geser ke kiri"
                  className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Container Kategori */}
            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onScroll={checkScroll}
              className={`text-xs select-none ${
                isWrapMode
                  ? 'flex flex-wrap items-center gap-1.5'
                  : 'flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent cursor-grab active:cursor-grabbing px-1 scroll-smooth'
              }`}
            >
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-[#10367D] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tombol Geser Kanan */}
            {!isWrapMode && canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-2 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent">
                <button
                  type="button"
                  onClick={() => scrollByAmount(200)}
                  aria-label="Geser ke kanan"
                  className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body / FAQ Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/30">
          {showChatNotice ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 bg-blue-100 text-[#10367D] rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-extrabold text-slate-900">
                  Ingin Chat dengan Admin Wilayah?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Untuk dapat terhubung secara langsung dengan Admin Wilayah yang bertugas di kota Anda serta menyimpan riwayat percakapan tiket Anda, silakan <strong>Masuk</strong> atau <strong>Daftar Akun</strong> terlebih dahulu.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigateLogin && onNavigateLogin();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#10367D] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Akun Sekarang</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateRegister && onNavigateRegister();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Daftar Akun Baru</span>
                </button>
              </div>

              <div className="pt-3 border-t border-blue-100 text-[11px] text-slate-500">
                Punya kendala darurat seputar akun? Hubungi hotline darurat WhatsApp kami di{' '}
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 font-bold hover:underline"
                >
                  0812-3456-7890
                </a>
              </div>

              <button
                onClick={() => setShowChatNotice(false)}
                className="text-xs text-blue-700 font-bold hover:underline"
              >
                &larr; Kembali Membaca FAQ
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/60"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {faq.question}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 whitespace-pre-line leading-relaxed bg-slate-50/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">
            Pertanyaan Anda belum terjawab di atas?
          </span>
          <button
            onClick={() => setShowChatNotice(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#10367D] hover:bg-blue-900 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat dengan Admin Wilayah</span>
          </button>
        </div>
      </div>
    </div>
  );
}

