import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../lib/api';

export interface User {
  _id: string;
  username: string;
  name: string;
  email?: string;
  role: 'admin' | 'manager';
  status?: 'active' | 'inactive' | 'locked';
  assignedProjects?: Array<string | { _id: string; name?: string }>;
  mustChangePassword?: boolean;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isCheckingSession: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'user';

const clearStoredAuth = () => {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  // Remove sessions created by older versions of the application.
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const readStoredAuth = (): User | null => {
  // Authentication is intentionally scoped to this browser tab.
  localStorage.removeItem(AUTH_STORAGE_KEY);
  try {
    const savedUser = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    clearStoredAuth();
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(readStoredAuth);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(user));

  useEffect(() => {
    if (!user) return;
    let active = true;
    api.get<User>('/auth/me')
      .then(({ data }) => {
        if (!active) return;
        const verified = { ...data, token: user.token };
        setUser(verified);
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(verified));
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        clearStoredAuth();
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => { active = false; };
    // Validate only when the provider is mounted; login updates are already trusted API responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    const authorization = user?.token ? { Authorization: `Bearer ${user.token}` } : undefined;
    void api.post('/auth/logout', {}, { headers: authorization }).catch(() => undefined);
    setUser(null);
    clearStoredAuth();
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isManager, isCheckingSession }}>
      {children}
    </AuthContext.Provider>
  );
};

// This hook intentionally shares the provider module with AuthProvider.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
