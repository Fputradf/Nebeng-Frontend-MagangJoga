import { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  HelpCircle,
  Layers,
  Sparkles,
  Ticket,
  Wallet,
  MapPin,
  Car,
  ShieldCheck,
} from 'lucide-react';
import { PROJECT_FAQS, FAQ_CATEGORIES } from '../../data/projectFaqData';
import LandingNavbar from './components/LandingNavbar';

const CATEGORY_ICONS = {
  all: Layers,
  about: Sparkles,
  booking: Ticket,
  payment: Wallet,
  pos: MapPin,
  mitra: Car,
  security: ShieldCheck,
};

export default function PublicFaqPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openFaqId, setOpenFaqId] = useState(PROJECT_FAQS[0]?.id || null);

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PROJECT_FAQS.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <LandingNavbar isLight={true} />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white py-10 sm:py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Pusat Bantuan &amp; FAQ</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h1>
          <div className="pt-2 max-w-xl mx-auto relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pertanyaan seputar tiket, pos resmi, escrow, atau mitra..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || Layers;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
              Tidak ada pertanyaan yang cocok dengan pencarian Anda.
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm sm:text-base font-bold text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-brand-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
