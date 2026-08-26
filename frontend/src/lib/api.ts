import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const baseURL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api')
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://agap-construction-backend.onrender.com/api';

const api = axios.create({
  baseURL,
  // Authentication is carried by the per-tab bearer token, not a persistent cookie.
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to every request if it exists
api.interceptors.request.use((config) => {
  const user = sessionStorage.getItem('user');
  if (user) {
    try {
      const token = JSON.parse(user).token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = String(error.response?.data?.message || '').toLowerCase();
    const sessionEnded = status === 401 || status === 423 ||
      (status === 403 && (message.includes('account is inactive') || message.includes('account no longer exists')));
    if (sessionEnded && sessionStorage.getItem('user')) {
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
