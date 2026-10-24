import { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Bell, Calendar, RefreshCw, Loader2, ChevronRight } from 'lucide-react';

export default function NotificationHistory() {
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
      const data = JSON.parse(notification.data || '{}');
      
      const { type, orderId, tripId, conversationId } = data;
      
      switch (type) {
        case 'order_created':
        case 'order_paid':
        case 'order_cancelled':
          if (orderId) {
            window.location.href = `/orders/${orderId}`;
          }
          break;
        case 'trip_started':
        case 'trip_arrived':
        case 'trip_completed':
        case 'checkpoint_scanned':
          if (tripId) {
            window.location.href = `/tracking/${tripId}`;
          }
          break;
        case 'chat_message':
          if (conversationId) {
            window.location.href = `/chat/${conversationId}`;
          }
          break;
        case 'payment_success':
        case 'payment_failed':
        case 'escrow_released':
          window.location.href = '/wallet';
          break;
        case 'reward_earned':
        case 'reward_redeemed':
          window.location.href = '/rewards';
          break;
        case 'verification_approved':
        case 'verification_rejected':
          window.location.href = '/profile';
          break;
        case 'trip_booking_request':
          window.location.href = '/orders';
          break;
        default:
          window.location.href = '/notifications';
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

  const getNotificationIcon = (type) => {
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
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {notification.title}
                      </h3>
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
                      {notification.status === 'sent' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Terkirim
                        </span>
                      )}
                      {notification.status === 'failed' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Gagal
                        </span>
                      )}
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
