import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('finpulse_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('finpulse_access_token');
      const refreshToken = localStorage.getItem('finpulse_refresh_token');
      if (token || refreshToken) {
        try {
          const res = await api.get('/api/auth/me');
          if (res?.data) {
            setUser(res.data);
            localStorage.setItem('finpulse_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('Session check warning:', err.message);
          if (!localStorage.getItem('finpulse_access_token')) {
            localStorage.removeItem('finpulse_user');
            setUser(null);
          }
        }
      } else {
        localStorage.removeItem('finpulse_user');
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const requestLogin = async (email) => {
    return await api.post('/api/auth/login-request', { email });
  };

  const requestRegister = async (email, fullName) => {
    return await api.post('/api/auth/register-request', { email, full_name: fullName });
  };

  const verifyOtp = async (email, otpCode) => {
    const res = await api.post('/api/auth/verify-otp', {
      email,
      otp_code: otpCode,
      device_info: navigator.userAgent.slice(0, 100),
    });
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem('finpulse_access_token', access_token);
    localStorage.setItem('finpulse_refresh_token', refresh_token);
    localStorage.setItem('finpulse_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const demoLogin = async () => {
    const res = await api.post('/api/auth/demo-login');
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem('finpulse_access_token', access_token);
    localStorage.setItem('finpulse_refresh_token', refresh_token);
    localStorage.setItem('finpulse_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('finpulse_access_token');
    localStorage.removeItem('finpulse_refresh_token');
    localStorage.removeItem('finpulse_user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateProfile = async (payload) => {
    const res = await api.put('/api/auth/me', payload);
    const updated = res.data;
    setUser(updated);
    localStorage.setItem('finpulse_user', JSON.stringify(updated));
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        requestLogin,
        requestRegister,
        verifyOtp,
        demoLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
