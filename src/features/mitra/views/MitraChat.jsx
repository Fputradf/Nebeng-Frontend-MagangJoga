import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, CheckCheck, Search, Phone, ArrowLeft, Lock } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { useToast } from '../../../context/ToastContext';
import { useNotification } from '../../../context/NotificationContext';
import PhoneCallModal from '../../../components/ui/PhoneCallModal';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

const getTripStatusBadge = (status, isLocked) => {
  if (status === 'completed') {
    return { label: 'Selesai', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
  }
  if (status === 'cancelled' || status === 'cancelled_by_mitra') {
    return { label: 'Dibatalkan', color: 'bg-rose-50 text-rose-600 border-rose-200' };
  }
  if (status === 'in_transit') {
    return { label: 'Dalam Perjalanan', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (status === 'in_origin_pos') {
    return { label: 'Di Pos Asal', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (isLocked) {
    return { label: 'Ditutup', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
  }
  return { label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

export default function MitraChat() {
  const toast = useToast();
  const { markConversationAsRead } = useNotification();

  const [chats, setChats] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Timer cooldown anti-spam
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // 1. Ambil daftar percakapan
  useEffect(() => {
    let isMounted = true;

    const fetchConversations = async () => {
      setIsLoadingChats(true);

      try {
        const res = await apiClient.get('/chat/conversation');

        if (isMounted) {
          const list = res.data?.data || res.data || [];

          setChats(list);

          if (list.length > 0 && !selectedConversationId) {
            setSelectedConversationId(list[0].id);
            // Mark notifications as read for initial conversation
            markConversationAsRead(list[0].id);
          }
        }
      } catch (err) {
        console.error('Gagal memuat percakapan:', err);
      } finally {
        if (isMounted) {
          setIsLoadingChats(false);
        }
      }
    };

    fetchConversations();

    const interval = setInterval(fetchConversations, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedConversationId]);

  // 2. Ambil pesan & polling pesan aktif
  useEffect(() => {
    if (!selectedConversationId) return;

    let isMounted = true;

    const fetchMessages = async (convId) => {
      try {
        const res = await apiClient.get(
          `/chat/conversation/${convId}/messages`
        );

        if (isMounted) {
          setMessages(res.data?.data || res.data || []);
        }
      } catch (err) {
        console.error('Gagal memuat riwayat pesan:', err);
      }
    };

    fetchMessages(selectedConversationId);

    const interval = setInterval(
      () => fetchMessages(selectedConversationId),
      3000
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages.length]);

  const activeChat =
    chats.find(
      (c) => String(c.id) === String(selectedConversationId)
    ) || chats[0];

  const filteredChats = chats.filter((chat) => {
    const term = chatSearchTerm.toLowerCase();

    return (
      (chat.customer?.name || '').toLowerCase().includes(term) ||
      (chat.trip?.id || '').toString().toLowerCase().includes(term)
    );
  });

  const handleSelectChat = async (chat) => {
    setSelectedConversationId(chat.id);
    setShowMobileChat(true);

    // Mark conversation notifications as read
    if (chat.id) {
      markConversationAsRead(chat.id);
    }

    try {
      const resConv = await apiClient.post('/chat/conversation', {
        tripId: String(chat.trip?.id),
        customerId: String(chat.customer?.id),
      });

      const convId = resConv.data.id;

      setSelectedConversationId(convId);

      // Mark conversation notifications as read
      markConversationAsRead(convId);

      const resMsg = await apiClient.get(
        `/chat/conversation/${convId}/messages`
      );

      setMessages(resMsg.data?.data || resMsg.data || []);
    } catch (err) {
      console.error('Gagal membuka ruang chat:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() || !selectedConversationId || cooldownSeconds > 0) return;

    const textToSend = messageText.trim();

    setMessageText('');

    try {
      const res = await apiClient.post(
        `/chat/conversation/${selectedConversationId}/messages`,
        {
          messageText: textToSend,
        }
      );

      const sentMsg = res.data;

      setMessages((prev) => [...prev, sentMsg]);
      setCooldownSeconds(15);
    } catch (err) {
      console.error(
        'Gagal mengirim pesan:',
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message || 'Gagal mengirim pesan.',
        {
          title: 'Gagal',
        }
      );

      setMessageText(textToSend);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 font-['Inter'] flex flex-col h-[calc(100vh-2rem)]">

      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2d5a9e] p-5 sm:p-6 text-white shadow-card shrink-0">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-32 h-28 w-28 rounded-full bg-accent/20" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> KOMUNIKASI LANGSUNG
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
              In-App Messaging Pelanggan
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Berkomunikasi secara langsung dengan pelanggan yang memesan trip atau paket pos Anda.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur border border-white/25 flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                {chats.length} Percakapan
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-6 right-6 border-t border-dashed border-white/20 sm:left-8 sm:right-8" />
        <span className="absolute bottom-[7px] right-6 h-2 w-2 rounded-full border-2 border-white bg-accent sm:right-8" />
      </section>

      {/* Layout Utama Chat */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 grid grid-cols-1 lg:grid-cols-3 overflow-hidden flex-1 min-h-0">

        {/* Panel Daftar Chat */}
        <div
          className={`border-r border-neutral-100 flex flex-col col-span-1 bg-neutral-50/50 min-h-0 ${
            showMobileChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-neutral-100 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />

              <input
                type="text"
                placeholder="Cari pelanggan atau trip..."
                value={chatSearchTerm}
                onChange={(e) => setChatSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-[13px] font-medium focus:outline-none"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = PRIMARY_COLOR;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                }}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-neutral-100 min-h-0">
            {isLoadingChats ? (
              <div className="p-6 text-center text-[13px] text-neutral-400">
                Memuat percakapan...
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[13px] font-bold text-neutral-500">
                  Tidak ada percakapan ditemukan
                </p>

                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Coba kata kunci lain.
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const custName =
                  chat.customer?.name || 'Pelanggan';

                const isSelected =
                  String(selectedConversationId) === String(chat.id);

                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full text-left p-3.5 transition cursor-pointer flex gap-3 items-start ${
                      isSelected
                        ? 'border-l-4'
                        : 'hover:bg-white'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${PRIMARY_ACCENT}18`,
                            borderLeftColor: PRIMARY_COLOR,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-[14px] shrink-0 shadow-sm"
                      style={{
                        backgroundColor: `${PRIMARY_ACCENT}30`,
                        color: PRIMARY_COLOR,
                      }}
                    >
                      {custName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[13px] text-neutral-800 truncate">
                          {custName}
                        </span>

                        {(() => {
                          const statusInfo = getTripStatusBadge(chat.trip?.status, chat.isLocked);
                          return (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </div>

                      <p
                        className="text-[11px] font-bold mb-0.5 truncate"
                        style={{ color: PRIMARY_COLOR }}
                      >
                        TRIP-{chat.trip?.id} •{' '}
                        {chat.trip?.originPoint?.name || 'Pos Asal'} &rarr;{' '}
                        {chat.trip?.destinationPoint?.name || 'Pos Tujuan'}
                      </p>

                      <p className="text-[12px] text-neutral-400 truncate">
                        {chat.lastMessage?.messageText || 'Ketuk untuk melihat pesan'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Obrolan */}
        <div
          className={`col-span-2 flex flex-col bg-white min-h-0 ${
            !showMobileChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Chat */}
          <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowMobileChat(false)}
                className="lg:hidden p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div
                className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-[14px] shrink-0"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {(activeChat?.customer?.name || 'P').charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-bold text-neutral-800">
                    {activeChat?.customer?.name || 'Pilih Percakapan'}
                  </h2>
                  {activeChat && (() => {
                    const statusInfo = getTripStatusBadge(activeChat.trip?.status, activeChat.isLocked);
                    return (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    );
                  })()}
                </div>

                <p
                  className="text-[11px] font-bold"
                  style={{ color: PRIMARY_COLOR }}
                >
                  TRIP-{activeChat?.trip?.id} • {activeChat?.trip?.originPoint?.name || 'Pos Asal'} &rarr; {activeChat?.trip?.destinationPoint?.name || 'Pos Tujuan'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const phone = activeChat?.customer?.phone;
                if (!phone) {
                  toast.error('Nomor telepon pelanggan tidak tersedia.', { title: 'Panggilan' });
                  return;
                }
                setIsPhoneModalOpen(true);
              }}
              title="Hubungi Pelanggan via Telepon"
              className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline text-neutral-700">Telepon</span>
            </button>
          </div>

          {/* Area Pesan */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50/40 min-h-0 flex flex-col">
            {messages.length === 0 ? (
              <div className="text-center text-[13px] text-neutral-400 py-10 my-auto">
                Belum ada pesan dalam percakapan ini.
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe =
                  msg.sender?.role === 'mitra' ||
                  msg.senderRole === 'mitra' ||
                  msg.senderId === activeChat?.mitraId;

                return (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[80%] ${
                      isMe
                        ? 'ml-auto items-end'
                        : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[13px] text-neutral-400 mb-0.5">
                      {msg.sender?.name || 'Pengguna'}
                    </span>

                    <div
                      className={`p-2.5 rounded-2xl text-[13px] ${
                        isMe
                          ? 'text-white rounded-br-none'
                          : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-none shadow-sm'
                      }`}
                      style={
                        isMe
                          ? {
                              backgroundColor: PRIMARY_COLOR,
                            }
                          : undefined
                      }
                    >
                      <p>{msg.messageText || msg.text}</p>
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[11px] text-neutral-400">
                      <span>
                        {msg.createdAt
                          ? new Date(
                              msg.createdAt
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Baru saja'}
                      </span>

                      {isMe && (
                        <CheckCheck
                          className="w-3 h-3"
                          style={{ color: PRIMARY_COLOR }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Chat / Status Trip Selesai */}
          {activeChat?.trip?.status === 'completed' || activeChat?.trip?.status === 'cancelled' || activeChat?.trip?.status === 'cancelled_by_mitra' || activeChat?.isLocked ? (
            <div className="p-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-center gap-2 text-[13px] text-neutral-500 shrink-0">
              <Lock className="w-4 h-4 text-neutral-400" />
              <span>
                Percakapan ini telah dikunci karena trip telah{' '}
                <strong className="font-semibold text-neutral-700">
                  {activeChat?.trip?.status === 'completed' ? 'selesai' : 'dibatalkan'}
                </strong>
                .
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSendMessage}
              className="p-3.5 border-t border-neutral-100 bg-white flex items-center gap-2.5 shrink-0"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={cooldownSeconds > 0 ? `Tunggu ${cooldownSeconds} detik sebelum mengirim lagi...` : "Ketik pesan balasan ke pelanggan..."}
                disabled={cooldownSeconds > 0}
                className="flex-1 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-medium text-neutral-800 focus:outline-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = PRIMARY_COLOR;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                }}
              />

              <button
                type="submit"
                disabled={!messageText.trim() || cooldownSeconds > 0}
                className="p-2.5 text-white rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center disabled:opacity-50 min-w-[38px]"
                style={{
                  backgroundColor: PRIMARY_COLOR,
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = PRIMARY_HOVER;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal Kustom Panggilan Telepon / Kontak Pelanggan */}
      <PhoneCallModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        targetName={activeChat?.customer?.name || 'Pelanggan'}
        phoneNumber={activeChat?.customer?.phone || ''}
        role="pelanggan"
        tripId={activeChat?.trip?.id ? String(activeChat.trip.id) : ''}
      />
    </div>
  );
}
