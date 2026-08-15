import { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth, type User } from '../context/AuthContext';

const slides = [
  { src: '/login-slides/agap-project-03.jpg', alt: 'AGAP interior staircase and feature lighting' },
  { src: '/loginbg1.png', alt: 'Original AGAP construction site background' },
  { src: '/login-slides/agap-project-01.jpg', alt: 'Modern AGAP residential construction project' },
  { src: '/login-slides/agap-project-02.jpg', alt: 'Completed contemporary AGAP residence' },
  { src: '/login-slides/agap-project-04.jpg', alt: 'AGAP finished living room interior' },
  { src: '/login-slides/agap-project-05.jpg', alt: 'AGAP interior stairway and curtain installation' },
  { src: '/login-slides/agap-project-06.jpg', alt: 'Completed multi-level AGAP residence' },
];

const SLIDE_INTERVAL = 6000;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL);

    return () => window.clearInterval(timer);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post<User>('/auth/login', {
        username: username.trim(),
        password,
      });
      login(data);
      navigate(data.mustChangePassword ? '/change-password' : '/dashboard', { replace: true });
    } catch (requestError: unknown) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.message || 'Unable to sign in. Please try again.'
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const updateCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(event.getModifierState('CapsLock'));
  };

  if (user) {
    return <Navigate to={user.mustChangePassword ? '/change-password' : '/dashboard'} replace />;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <section className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:block" aria-label="AGAP project showcase">
        <div className="absolute inset-0" aria-live="off">
          {slides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              className={`absolute inset-0 h-full w-full object-cover brightness-[0.72] saturate-[0.9] transition-all duration-1000 ease-in-out motion-reduce:transition-none ${
                activeSlide === index ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0'
              }`}
            />
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/45 to-slate-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(15,23,42,0.3)_100%)]" />

        <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-8 text-white xl:p-12">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-2xl shadow-black/30">
              <img src="/logo.png" alt="AGAP company logo" className="h-12 w-12 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight drop-shadow-lg xl:text-4xl">AGAP - Architect Gacad and Partners</h1>
              <p className="mt-0.5 text-lg font-medium text-[#F59E0B] drop-shadow-lg xl:text-2xl">Construction Company</p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-3xl font-light leading-tight drop-shadow-xl xl:text-4xl">
              Professional construction management system.
            </p>
            <p className="mt-4 text-lg text-white/90 drop-shadow-xl">
              Built for efficiency, visibility, and growth.
            </p>
          </div>

          <div className="flex items-center gap-2" role="tablist" aria-label="Choose project image">
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={activeSlide === index}
                aria-label={`Show project image ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                className="relative h-1.5 w-10 overflow-hidden rounded-full bg-white/30 outline-none transition hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {activeSlide === index && (
                  <span
                    key={activeSlide}
                    className="login-slide-progress absolute inset-y-0 left-0 rounded-full bg-white"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="flex flex-1 items-center justify-center bg-white px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-9">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img src="/logo.png" alt="AGAP company logo" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <p className="font-bold text-slate-900">AGAP</p>
                <p className="text-xs text-slate-500">Construction Management System</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-[#1E293B]">Sign In</h2>
            <p className="mt-2 text-gray-600">Access your AGAP Construction dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-600">Username</label>
              <div className="group relative">
                <UserRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#F59E0B]"
                />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-3xl border border-gray-200 bg-[#F8FAFC] py-5 pl-14 pr-6 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#F59E0B] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  placeholder="admin or manager"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-600">Password</label>
              <div className="group relative">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#F59E0B]"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={updateCapsLock}
                  onKeyUp={updateCapsLock}
                  onBlur={() => setCapsLockActive(false)}
                  aria-describedby={capsLockActive ? 'caps-lock-warning' : undefined}
                  className="w-full rounded-3xl border border-gray-200 bg-[#F8FAFC] py-5 pl-14 pr-14 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#F59E0B] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 outline-none transition hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="min-h-6 pt-1.5">
                {capsLockActive && (
                  <p id="caps-lock-warning" role="status" className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <TriangleAlert className="h-4 w-4" />
                    Caps Lock is on
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center text-sm">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg outline-none focus-within:ring-2 focus-within:ring-orange-200">
                <input type="checkbox" className="h-4 w-4 accent-[#F59E0B]" />
                <span className="text-gray-600">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-3xl bg-[#F59E0B] py-5 text-xl font-semibold text-white outline-none transition-all hover:bg-orange-600 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-orange-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogIn className="h-6 w-6" />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
