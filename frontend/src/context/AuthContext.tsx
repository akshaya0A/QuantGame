import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, User, UserState } from '../api/client';

interface AuthValue {
  user: User | null;
  state: UserState | null;
  loading: boolean;
  setState: (s: UserState) => void;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

interface Session {
  user: User;
  state: UserState;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<Session>('/auth/me');
      setUser(data.user);
      setState(data.state);
    } catch {
      setUser(null);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (identifier: string, password: string) => {
    const data = await api.post<Session>('/auth/login', { identifier, password });
    setUser(data.user);
    setState(data.state);
  };

  const register = async (email: string, username: string, password: string) => {
    const data = await api.post<Session>('/auth/register', { email, username, password });
    setUser(data.user);
    setState(data.state);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setState(null);
  };

  return (
    <AuthContext.Provider value={{ user, state, loading, setState, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
