import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCookie, setCookie, removeCookie } from './utils/cookies';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  restaurantSlug?: string | null; // Optional, for display/SEO only
  restaurantId: string | null;
  login: (email: string, password: string) => Promise<boolean | string>;
  logout: () => void;
  register: (email: string, password: string, restaurantSlug: string, restaurantName?: string) => Promise<boolean | string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// rely on Vite's built-in ImportMetaEnv typing; do not redeclare

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://demo-product-m47a.onrender.com';
const API_URL = API_BASE + '/api/auth';

export const AuthProvider = ({ children }: { children: any }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  // Remove restaurantSlug state, only keep restaurantId
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Try cookie-based session first
        let res = await fetch(`${API_URL}/me`, { credentials: 'include' });
        // Fallback to Authorization header if cookie is blocked and we have a non-httpOnly token
        if (res.status === 401) {
          const fallbackToken = getCookie('token');
          if (fallbackToken) {
            res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${fallbackToken}` } });
          }
        }
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          if (data?.restaurantId) {
            setRestaurantId(data.restaurantId);
            setCookie('restaurantId', data.restaurantId);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<boolean | string> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.restaurantId) {
        setIsAuthenticated(true);
        setRestaurantId(data.restaurantId);
        // Persist restaurantId via cookie
        setCookie('restaurantId', data.restaurantId);
        // Store fallback token (non-httpOnly) only if provided
        if (data.token) setCookie('token', data.token);
        return true;
      } else {
        return data.error || 'Login failed.';
      }
    } catch (err) {
      return 'Network error.';
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setRestaurantId(null);
    removeCookie('token');
    removeCookie('restaurantId');
  };

  const register = async (email: string, password: string, restaurantSlug: string, restaurantName?: string): Promise<boolean | string> => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, restaurantSlug, restaurantName }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) return true;
      return data.error || 'Registration failed.';
    } catch (err) {
      return 'Network error.';
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, restaurantId, login, logout, register }}>
      {isReady ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext) as AuthContextType | undefined;
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}; 