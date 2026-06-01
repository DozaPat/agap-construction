import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { LogIn } from 'lucide-react';

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
      localStorage.setItem('user', JSON.stringify(data));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE - Full Construction Image with Blur & Shadow */}
      <div className="hidden lg:flex w-1/2 relative">
        {/* Your construction site image */}
        <img
          src="./public/loginbg1.png"
          alt="Construction Site"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Strong dark overlay + blur */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>

        {/* Content on top of image */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          {/* Logo at top left */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-2xl shadow-2xl">
              <img src="/logo.png" alt="AGAP" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tighter">AGAP - Architect Gacad and Partners</h1>
              <p className="text-[#F59E0B] text-2xl -mt-1">Construction Company</p>
            </div>
          </div>

          {/* Tagline at bottom left with shadow */}
          <div className="max-w-xs">
            <p className="text-3xl font-light leading-tight drop-shadow-xl">
              Professional construction management system.
            </p>
            <p className="text-white/90 mt-3 text-lg drop-shadow-xl">
              Built for efficiency and growth.
            </p>
          </div>

          {/* Decorative dots at bottom */}
          <div className="flex gap-2">
            <div className="w-3 h-1 bg-white rounded-full"></div>
            <div className="w-3 h-1 bg-white/40 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-[#1E293B]">Sign In</h2>
            <p className="text-gray-600 mt-2">Access your AGAP Construction dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-5 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B] text-lg"
                placeholder="admin or manager"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-5 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B] text-lg"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#F59E0B]" />
                <span className="text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-[#F59E0B] hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F59E0B] hover:bg-orange-600 py-5 rounded-3xl text-white font-semibold text-xl transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
            >
              <LogIn className="w-6 h-6" />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;