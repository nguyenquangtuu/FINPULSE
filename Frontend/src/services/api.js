import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('finpulse_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('finpulse_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
            refresh_token: refreshToken,
          });
          const newToken = res.data?.data?.access_token;
          if (newToken) {
            localStorage.setItem('finpulse_access_token', newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('finpulse_access_token');
          localStorage.removeItem('finpulse_refresh_token');
          localStorage.removeItem('finpulse_user');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('finpulse_access_token');
        localStorage.removeItem('finpulse_refresh_token');
        localStorage.removeItem('finpulse_user');
      }
    }
    const errMessage = error.response?.data?.error?.message || error.message || 'Lỗi kết nối máy chủ';
    return Promise.reject(new Error(errMessage));
  }
);

export default api;
