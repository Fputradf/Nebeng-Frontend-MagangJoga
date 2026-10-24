import { BASE_URL } from '../config/env';
// src/services/apiClient.js
import axios from 'axios';

const AUTH_STORAGE_KEY = 'nebeng_auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper untuk mengambil auth state saat ini
const getStoredAuth = () => {
  try {
    let raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Helper untuk menyimpan token baru hasil refresh
const updateStoredToken = (newToken) => {
  try {
    const storage = sessionStorage.getItem(AUTH_STORAGE_KEY) ? sessionStorage : localStorage;
    let raw = storage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        parsed.token = newToken;
        parsed.accessToken = newToken;
      } else {
        parsed = newToken;
      }
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (err) {
    console.error('Gagal memperbarui token tersimpan:', err);
  }
};

// Request Interceptor: Menyisipkan token & mencegah duplikasi prefix '/api'
apiClient.interceptors.request.use((config) => {
  // Jika URL mengandung '/api/api/', bersihkan agar tidak duplikasi
  if (config.url && config.url.startsWith('/api/')) {
    config.url = config.url.replace('/api/', '/');
  }

  const parsed = getStoredAuth();
  if (parsed) {
    const token = 
      parsed.token || 
      parsed.accessToken || 
      parsed.access_token || 
      parsed.data?.token || 
      parsed.data?.accessToken ||
      (typeof parsed === 'string' ? parsed : null);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Menangani 401 & Auto-Refresh Token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika error 401 dan bukan sedang mencoba endpoint login/refresh itu sendiri
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
      // Jangan coba refresh token jika sudah di halaman login
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/forgot-password') {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const parsed = getStoredAuth();
        const refreshToken = parsed?.refreshToken || parsed?.data?.refreshToken;

        if (!refreshToken) {
          throw new Error('Refresh token tidak ditemukan');
        }

        // Panggil endpoint refresh token backend
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = response.data?.accessToken || response.data?.token;
        
        if (newAccessToken) {
          updateStoredToken(newAccessToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Hapus sesi lokal jika refresh token gagal/kadaluwarsa
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        
        // Cek apakah sudah di halaman login untuk mencegah infinite loop
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/forgot-password') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;