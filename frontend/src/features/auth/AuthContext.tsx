import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { AuthResponse, Role, User } from '../../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string, role: Role) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const currentUser = await api.me();
        if (isMounted) {
          setUser(currentUser);
          setToken(`active-session-${currentUser.id}`);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const register = async (name: string, email: string, password: string, role: Role): Promise<AuthResponse> => {
    const res = await api.register({ name, email, password, role });
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const logout = async (): Promise<void> => {
    if (api.logout) {
      await api.logout();
    }
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
