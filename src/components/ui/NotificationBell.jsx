import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  MessageCircle,
  ShoppingCart,
  Wallet,
  Clock,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export default function NotificationBell({ basePath }) {
  const { user } = useAuth();
  const resolvedBasePath =
    basePath || (user?.role === 'mitra' ? '/mitra' : '/customer');

  const {
    unreadCount,
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    loading,
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'chat'
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(filter === 'chat' ? 'chat_message' : null);
    }
  }, [isOpen, filter, fetchNotifications]);

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    setIsOpen(false);

    const isMitra = user?.role === 'mitra';
    const dataType = notification.data?.type;

    // 1. If explicit actionUrl provided
    if (notification.data?.actionUrl) {
      let targetUrl = notification.data.actionUrl;
      if (targetUrl === '/wallet') {
        targetUrl = isMitra ? '/mitra/saldo' : '/customer/wallet';
      }
      window.location.href = targetUrl;
      return;
    }

    // 2. Chat messages
    if (notification.type === 'chat_message' && notification.conversationId) {
      window.location.href = `${resolvedBasePath}/chat?conversation=${notification.conversationId}`;
      return;
    }

    // 3. Wallet / Financial (topup, withdrawal, escrow)
    if (
      notification.type === 'payment_success' ||
      notification.type === 'payment_failed' ||
      notification.type === 'escrow_released' ||
      dataType === 'wallet_topup' ||
      dataType === 'wallet_withdrawal'
    ) {
      window.location.href = isMitra ? '/mitra/saldo' : '/customer/wallet';
      return;
    }

    // 4. Trip alerts (H-30, H-0, late sanction)
    if (
      dataType === 'trip_departure_reminder_h30' ||
      dataType === 'trip_departure_urgency_h0' ||
      dataType === 'mitra_late_sanction'
    ) {
      window.location.href = isMitra ? '/mitra/trip' : '/customer/tickets';
      return;
    }

    // 5. Trip arrival
    if (
      notification.type === 'trip_arrived' ||
      dataType === 'mitra_arrived_origin' ||
      dataType === 'trip_arrived_destination'
    ) {
      window.location.href = isMitra ? '/mitra/trip' : '/customer/tickets';
      return;
    }

    // 6. Generic order / trip fallback
    if (notification.data?.orderId) {
      window.location.href = isMitra ? '/mitra/trip' : '/customer/tickets';
    } else if (notification.data?.tripId) {
      window.location.href = isMitra ? '/mitra/trip' : '/customer/tickets';
    } else {
      window.location.href = `${resolvedBasePath}/notifications`;
    }
  };

  const getNotificationIcon = (type, data) => {
    const dataType = data?.type;
    if (type === 'chat_message') {
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    }
    if (
      type === 'payment_success' ||
      type === 'payment_failed' ||
      type === 'escrow_released' ||
      dataType === 'wallet_topup' ||
      dataType === 'wallet_withdrawal'
    ) {
      return <Wallet className="w-4 h-4 text-emerald-600" />;
    }
    if (
      dataType === 'trip_departure_urgency_h0' ||
      dataType === 'mitra_late_sanction' ||
      data?.priority === 'high'
    ) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (dataType === 'trip_departure_reminder_h30') {
      return <Clock className="w-4 h-4 text-amber-500" />;
    }
    if (
      type === 'trip_arrived' ||
      dataType === 'mitra_arrived_origin' ||
      dataType === 'trip_arrived_destination'
    ) {
      return <MapPin className="w-4 h-4 text-indigo-500" />;
    }
    if (type === 'order_created' || type === 'order_paid') {
      return <ShoppingCart className="w-4 h-4 text-green-500" />;
    }
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID');
  };

  const filteredNotifications = notifications.filter((notif) =>
    filter === 'chat' ? notif.type === 'chat_message' : true
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifikasi ${unreadCount > 0 ? `(${unreadCount} belum dibaca)` : ''}`}
        className="relative grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft transition hover:border-brand-500/30 hover:text-brand-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Notifikasi</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilter('chat')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'chat'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Pesan
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Belum ada notifikasi</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type, notification.data)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {notification.data?.priority === 'high' && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">
                              URGENT
                            </span>
                          )}
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = `${resolvedBasePath}/notifications`;
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Lihat semua notifikasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}