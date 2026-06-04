import axios from 'axios';

const api = axios.create({
  baseURL: 'https://agap-construction-backend.onrender.com/api',
  withCredentials: true,        // Important for cookies
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