import apiClient from './apiClient';

export async function registerDeviceToken(token, platform = 'web') {
  try {
    const response = await apiClient.post('/notifications/register-device', {
      token,
      platform,
      userAgent: navigator.userAgent
    });
    return response.data;
  } catch (error) {
    console.error('Failed to register device token:', error);
    throw error;
  }
}

export async function unregisterDeviceToken(token) {
  try {
    const response = await apiClient.post('/notifications/unregister-device', {
      token
    });
    return response.data;
  } catch (error) {
    console.error('Failed to unregister device token:', error);
    throw error;
  }
}

export async function getNotificationPreferences() {
  try {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    throw error;
  }
}

export async function updateNotificationPreferences(preferences) {
  try {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
}

export async function getNotificationHistory(limit = 50, offset = 0) {
  try {
    const response = await apiClient.get('/notifications/history', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get notification history:', error);
    throw error;
  }
}

export async function getNotifications(type = null, page = 1, limit = 20) {
  try {
    const params = { page, limit };
    if (type) params.type = type;

    const response = await apiClient.get('/notifications', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get notifications:', error);
    throw error;
  }
}

export async function getUnreadCount() {
  try {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    throw error;
  }
}

export async function markAsRead(notificationId) {
  try {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

export async function markAllAsRead() {
  try {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

export async function markConversationAsRead(conversationId) {
  try {
    const response = await apiClient.patch(`/notifications/read-by-conversation/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to mark conversation notifications as read:', error);
    throw error;
  }
}
