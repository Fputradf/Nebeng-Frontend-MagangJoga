import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Calendar,
  RefreshCw,
  Loader2,
  ChevronRight,
  Wallet,
  Clock,
  AlertTriangle,
  MapPin,
  ShoppingCart,
  MessageCircle,
} from 'lucide-react';

const ROLE_BASE_PATHS = {
  admin: '/admin',
  superadmin: '/admin',
  regional: '/regional',
  operator: '/operator-pos',
  'operator-pos': '/operator-pos',
  mitra: '/mitra',
  driver: '/mitra',
  customer: '/customer',
};

export default function NotificationHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user } = useAuth();
  const currentRole = role || user?.role;

  const resolvedBasePath =
    (location.pathname.startsWith('/admin') ? '/admin' : null) ||
    (location.pathname.startsWith('/regional') ? '/regional' : null) ||
    (location.pathname.startsWith('/operator-pos') ? '/operator-pos' : null) ||
    (location.pathname.startsWith('/mitra') ? '/mitra' : null) ||
    (location.pathname.startsWith('/customer') ? '/customer' : null) ||
    ROLE_BASE_PATHS[currentRole] ||
    '/customer';

  const { history, fetchHistory, loading, setUnreadCount } = useNotification();
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (newOffset = 0) => {
    try {
      if (newOffset === 0) {
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }
      
      const data = await fetchHistory(50, newOffset);
      
      if (data.length < 50) {
        setHasMore(false);
      }
      
      setOffset(newOffset);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadNotifications(offset + 50);
    }
  };

  const handleRefresh = () => {
    setOffset(0);
    setHasMore(true);
    loadNotifications(0);
  };

  const handleNotificationClick = (notification) => {
    try {
      const data = typeof notification.data === 'string'
        ? JSON.parse(notification.data || '{}')
        : (notification.data || {});
      
      const isMitra = currentRole === 'mitra' || location.pathname.startsWith('/mitra');
      const isRegional = currentRole === 'regional' || location.pathname.startsWith('/regional');
      const isAdmin = currentRole === 'admin' || location.pathname.startsWith('/admin');
      const isOperator = currentRole === 'operator' || location.pathname.startsWith('/operator-pos');
      const { type, orderId, tripId, conversationId, actionUrl } = data;

      const navigateTo = (target) => {
        if (!target) return;
        if (target.startsWith('http://') || target.startsWith('https://')) {
          window.location.href = target;
        } else {
          navigate(target);
        }
      };

      if (actionUrl) {
        let target = actionUrl;
        if (target === '/wallet') {
          target = isMitra ? '/mitra/saldo' : '/customer/wallet';
        }
        navigateTo(target);
        return;
      }
      
      switch (type || notification.type) {
        case 'order_created':
        case 'order_paid':
        case 'order_cancelled':
          if (isMitra) navigateTo('/mitra/trip');
          else if (isOperator) navigateTo('/operator-pos/manifest');
          else if (isRegional) navigateTo('/regional/trip-order');
          else navigateTo('/customer/tickets');
          break;
        case 'trip_started':
        case 'trip_arrived':
        case 'trip_completed':
        case 'checkpoint_scanned':
        case 'mitra_arrived_origin':
        case 'trip_arrived_destination':
        case 'trip_departure_reminder_h30':
        case 'trip_departure_urgency_h0':
          if (isMitra) navigateTo('/mitra/trip');
          else if (isOperator) navigateTo('/operator-pos/manifest');
          else if (isRegional) navigateTo('/regional/trip-order');
          else navigateTo('/customer/tickets');
          break;
        case 'chat_message':
          if (isMitra) {
            navigateTo(conversationId ? `/mitra/chat?conversation=${conversationId}` : '/mitra/chat');
          } else if (isRegional) {
            navigateTo('/regional/bantuan-chat');
          } else if (isAdmin || isOperator) {
            navigateTo(`${resolvedBasePath}/notifications`);
          } else {
            navigateTo(conversationId ? `/customer/chat?conversation=${conversationId}` : '/customer/chat');
          }
          break;
        case 'payment_success':
        case 'payment_failed':
        case 'escrow_released':
        case 'wallet_topup':
        case 'wallet_withdrawal':
          if (isOperator) navigateTo('/operator-pos/financial');
          else if (isRegional) navigateTo('/regional/laporan');
          else if (isAdmin) navigateTo('/admin/bank');
          else navigateTo(isMitra ? '/mitra/saldo' : '/customer/wallet');
          break;
        case 'reward_earned':
        case 'reward_redeemed':
          navigateTo('/customer/rewards');
          break;
        case 'verification_approved':
        case 'verification_rejected':
          if (isMitra) navigateTo('/mitra/onboarding');
          else if (isAdmin) navigateTo('/admin/pengaturan');
          else if (isRegional) navigateTo('/regional/pengaturan');
          else if (isOperator) navigateTo('/operator-pos/pengaturan');
          else navigateTo('/customer/profile/pengaturan');
          break;
        case 'trip_booking_request':
          navigateTo('/mitra/trip');
          break;
        default:
          navigateTo(`${resolvedBasePath}/notifications`);
      }
    } catch (error) {
      console.error('Failed to parse notification data:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getNotificationIcon = (type, dataString) => {
    let data = {};
    try {
      data = typeof dataString === 'string' ? JSON.parse(dataString || '{}') : (dataString || {});
    } catch {}

    const dataType = data?.type;
    if (type === 'chat_message') {
      return <MessageCircle className="w-5 h-5 text-blue-600" />;
    }
    if (
      type === 'payment_success' ||
      type === 'payment_failed' ||
      type === 'escrow_released' ||
      dataType === 'wallet_topup' ||
      dataType === 'wallet_withdrawal'
    ) {
      return <Wallet className="w-5 h-5 text-emerald-600" />;
    }
    if (
      dataType === 'trip_departure_urgency_h0' ||
      dataType === 'mitra_late_sanction' ||
      data?.priority === 'high'
    ) {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    if (dataType === 'trip_departure_reminder_h30') {
      return <Clock className="w-5 h-5 text-amber-600" />;
    }
    if (
      type === 'trip_arrived' ||
      dataType === 'mitra_arrived_origin' ||
      dataType === 'trip_arrived_destination'
    ) {
      return <MapPin className="w-5 h-5 text-indigo-600" />;
    }
    if (type === 'order_created' || type === 'order_paid') {
      return <ShoppingCart className="w-5 h-5 text-green-600" />;
    }
    return <Bell className="w-5 h-5 text-blue-600" />;
  };

  if (loading && history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Riwayat Notifikasi</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada notifikasi</p>
            </div>
          ) : (
            history.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.data)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {(() => {
                          try {
                            const parsed = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
                            return parsed?.priority === 'high' ? (
                              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">
                                URGENT
                              </span>
                            ) : null;
                          } catch {
                            return null;
                          }
                        })()}
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {notification.body}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {notification.type}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && history.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat...
                </div>
              ) : (
                'Muat Lebih Banyak'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
