import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : 'https://agap-construction-backend.onrender.com/api'),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to every request if it exists
api.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  if (user) {
    const token = JSON.parse(user).token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
