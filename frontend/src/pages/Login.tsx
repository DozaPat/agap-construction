import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      }, { 
        withCredentials: true 
      });

      console.log('Login successful:', res.data);
      navigate('/dashboard');   // Redirect to dashboard
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-gray-900 rounded-3xl shadow-2xl p-10 border border-gray-800">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-gray-950" />
            </div>
            <h1 className="text-3xl font-bold text-white">Agap Construction</h1>
            <p className="text-gray-400 mt-1">Construction Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl py-4 pl-11 pr-4 text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl py-4 pl-11 pr-4 text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-950/30 p-3 rounded-2xl">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 transition-colors text-gray-950 font-semibold py-4 rounded-2xl text-lg disabled:opacity-70"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center mt-8 text-sm text-gray-500">
            Demo Credentials<br />
            <span className="font-mono">admin / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;