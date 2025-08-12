/// <reference types="vite/client" />

import axios from 'axios';
import { getCookie, removeCookie } from './cookies';

// Determine API base URL based on environment
const API_BASE_URL = (() => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  
  // Check if environment variable is set
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Default to production URL
  return 'https://production-web-l3pb.onrender.com';
})();

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
      // If this was the session probe (/api/auth/me), let caller decide; avoid loops
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

export const getComments = async (menuItemId, sort = 'newest') => {
  const res = await apiClient.get(`/api/comments/${menuItemId}?sort=${sort}`);
  return res.data;
};

export const getCommentCount = async (menuItemId) => {
  const res = await apiClient.get(`/api/comments/count/${menuItemId}`);
  return res.data.count;
};

export const postComment = async (menuItemId, text, nickname, restaurantId, rating) => {
  const res = await apiClient.post('/api/comments', { menuItemId, text, nickname, restaurantId, rating });
  return res.data;
};

export const checkCommentEligibility = async (menuItemId) => {
  const res = await apiClient.get(`/api/comments/eligibility/${menuItemId}`);
  return res.data.eligible;
};

export default apiClient; 