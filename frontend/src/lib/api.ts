import axios from 'axios';

const api = axios.create({
  baseURL: 'https://agap-construction-backend.onrender.com/api',
  withCredentials: true,        // Important for http-only cookies (JWT)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request if it exists in cookie
api.interceptors.request.use((config) => {
  return config;
});

export default api;