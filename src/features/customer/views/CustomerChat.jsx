import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, CheckCheck, Search, Phone, ArrowLeft } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { useToast } from '../../../context/ToastContext';
import { useNotification } from '../../../context/NotificationContext';

const PRIMARY_COLOR = '#10367D';
const PRIMARY_HOVER = '#0C2C66';
const PRIMARY_ACCENT = '#74B4D9';

export default function CustomerChat() {
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

  // 1. Ambil daftar percakapan customer
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
      (chat.mitra?.name || '').toLowerCase().includes(term) ||
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

      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />

            <span
              className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: PRIMARY_COLOR }}
            >
              <MessageSquare className="w-3 h-3" />
              KOMUNIKASI LANGSUNG
            </span>
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-800">
            Chat dengan Mitra
          </h1>

          <p className="text-[13px] sm:text-[14px] text-neutral-400 mt-0.5">
            Berkomunikasi secara langsung dengan mitra untuk trip Anda.
          </p>
        </div>
      </div>

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
                placeholder="Cari mitra atau trip..."
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
                  Percakapan akan muncul setelah Anda melakukan pembayaran pada trip.
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const mitraName =
                  chat.mitra?.name || 'Mitra';

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
                      {mitraName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[13px] text-neutral-800 truncate">
                          {mitraName}
                        </span>

                        <span className="text-[11px] text-neutral-400 font-medium">
                          Aktif
                        </span>
                      </div>

                      <p
                        className="text-[11px] font-bold mb-0.5"
                        style={{ color: PRIMARY_COLOR }}
                      >
                        TRIP-{chat.trip?.id} •{' '}
                        {chat.trip?.originPoint?.name} &rarr;{' '}
                        {chat.trip?.destinationPoint?.name}
                      </p>

                      <p className="text-[12px] text-neutral-400 truncate">
                        Ketuk untuk melihat pesan
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
                {(activeChat?.mitra?.name || 'M').charAt(0)}
              </div>

              <div>
                <h2 className="text-[14px] font-bold text-neutral-800">
                  {activeChat?.mitra?.name || 'Pilih Percakapan'}
                </h2>

                <p
                  className="text-[11px] font-bold"
                  style={{ color: PRIMARY_COLOR }}
                >
                  TRIP-{activeChat?.trip?.id}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const phone = activeChat?.mitra?.phone;
                if (!phone) {
                  toast.error('Nomor telepon mitra tidak tersedia.', { title: 'Panggilan' });
                  return;
                }
                window.location.href = `tel:${phone}`;
              }}
              title="Hubungi Mitra via Telepon"
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
                  msg.sender?.role === 'customer' ||
                  msg.senderRole === 'customer' ||
                  msg.senderId === activeChat?.customerId;

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

          {/* Input Chat */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 border-t border-neutral-100 bg-white flex items-center gap-2.5 shrink-0"
          >
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={cooldownSeconds > 0 ? `Tunggu ${cooldownSeconds} detik sebelum mengirim lagi...` : "Ketik pesan ke mitra..."}
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
        </div>
      </div>
    </div>
  );
}
