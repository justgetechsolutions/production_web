import axios from 'axios';
import { getCookie, removeCookie } from './cookies';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://demo-product-m47a.onrender.com';

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
    if (error.response?.status === 401) {
      // Clear invalid token and redirect to login
      removeCookie('token');
      removeCookie('restaurantId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient; 