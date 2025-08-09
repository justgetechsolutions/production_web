import axios from 'axios';
import { getCookie, removeCookie } from './cookies';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://production-web-qmj1.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies cross-origin
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token from cookie as fallback
apiClient.interceptors.request.use((config) => {
  // Try to get token from cookie as fallback if httpOnly cookie isn't used
  const token = getCookie('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = (error.config?.url as string) || '';
    if (status === 401) {
      // Clear any fallback token/ids
      removeCookie('token');
      removeCookie('restaurantId');
      // Do not force-redirect on the session probe; let caller decide
      const isSessionProbe = url.includes('/api/auth/me');
      if (isSessionProbe) return Promise.reject(error);
      // Avoid redirect loops; don't hard-reload if already on auth pages
      const path = window.location.pathname;
      const onAuthPage = path === '/login' || path === '/register';
      const w = window as any;
      if (!onAuthPage && !w.__redirectingToLogin) {
        w.__redirectingToLogin = true;
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient; 