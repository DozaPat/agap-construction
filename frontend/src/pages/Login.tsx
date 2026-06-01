import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', { username, password });
      
      // Save user info
      localStorage.setItem('user', JSON.stringify(data));
      
      // Redirect based on role
      if (data.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl">
            <img src="/logo.png" alt="AGAP" className="w-14 h-14" /> {/* replace with your logo if you have one */}
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white text-center mb-2">Welcome Back</h1>
        <p className="text-gray-400 text-center mb-10">Sign in to manage Agap Construction</p>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 py-3 rounded-2xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F59E0B] hover:bg-orange-600 py-4 rounded-3xl text-white font-semibold text-lg transition-colors disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center mt-8 text-gray-400 text-sm">
          Default Admin Credentials:<br />
          <span className="font-mono bg-gray-800 text-white px-3 py-1 rounded-2xl">admin / admin123</span>
        </div>
      </div>
    </div>
  );
};

export default Login;