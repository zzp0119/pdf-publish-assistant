import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    // 避免重复检查
    if (hasChecked && isLoading) {
      return;
    }

    try {
      const response: any = await authAPI.verify();
      if (response.success) {
        setUser({ id: response.data.id, isAdmin: response.data.isAdmin });
        setIsLoggedIn(true);
      }
    } catch (error) {
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [hasChecked, isLoading]);

  // 登录
  const login = useCallback(async (username: string, password: string) => {
    const response: any = await authAPI.login(username, password);
    if (response.success) {
      setIsLoggedIn(true);
      setIsLoading(false);
    }
  }, []);

  // 退出登录
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      setHasChecked(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      isLoading,
      login,
      logout,
      checkAuth,
    }),
    [user, isLoggedIn, isLoading, login, logout, checkAuth]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
