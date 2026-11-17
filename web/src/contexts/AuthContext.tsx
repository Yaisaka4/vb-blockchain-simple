import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appAlert } from '@/lib/notify';
import {
  getMeApi,
  getStoredTokens,
  loginApi,
  logoutApi,
  performTokenRefresh,
  subscribeTokens,
  type AuthTokens,
  type UserProfile,
  type UserRole,
} from '@/lib/api';
import { decodeJwtPayload } from '@/lib/utils';

export function getDashboardPathForRole(role?: UserRole): string {
  if (role === 'ministry') return '/ministry';
  if (role === 'university') return '/university';
  if (role === 'student') return '/student';
  return '/';
}

interface AuthContextValue {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  secondsUntilAccessExpiry: number | null;
  refreshCount: number;
  login: (username: string, password: string, shortLived?: boolean) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => getStoredTokens());
  const [user, setUser] = useState<UserProfile | null>(() => {
    const initial = getStoredTokens();
    return decodeJwtPayload(initial?.accessToken)?.user ?? null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!getStoredTokens());
  const [secondsUntilAccessExpiry, setSecondsUntilAccessExpiry] = useState<number | null>(null);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  useEffect(() => {
    let prevAccess = getStoredTokens()?.accessToken;
    return subscribeTokens((next) => {
      setTokens(next);
      if (!next) {
        setUser(null);
        setSecondsUntilAccessExpiry(null);
        prevAccess = undefined;
        return;
      }
      const decoded = decodeJwtPayload(next.accessToken);
      if (decoded?.user) setUser(decoded.user);
      if (prevAccess && prevAccess !== next.accessToken) {
        setRefreshCount((c) => c + 1);
      }
      prevAccess = next.accessToken;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const current = getStoredTokens();
    if (!current) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await getMeApi();
        if (!cancelled) setUser(res.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tokens?.accessToken) {
      setSecondsUntilAccessExpiry(null);
      return;
    }

    const updateTimer = () => {
      const payload = decodeJwtPayload(tokens.accessToken);
      if (!payload?.exp) {
        setSecondsUntilAccessExpiry(null);
        return;
      }
      const left = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
      setSecondsUntilAccessExpiry(left);
      if (left <= 2) {
        performTokenRefresh()
          .then(() => {
            if (tokens.shortLived) {
              appAlert.info('Đã tự động xoay vòng Refresh Token', {
                id: 'jwt-auto-refresh',
                description: 'Cấp Access Token & Refresh Token mới thành công.',
              });
            }
          })
          .catch(() => {
            appAlert.error('Phiên đăng nhập đã hết hạn', {
              id: 'jwt-expired',
              description: 'Vui lòng đăng nhập lại để tiếp tục.',
            });
          });
      }
    };

    updateTimer();
    const id = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(id);
  }, [tokens]);

  const login = useCallback(async (username: string, password: string, shortLived = false) => {
    const res = await loginApi(username, password, shortLived);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    appAlert.success('Đã đăng xuất', {
      description: 'Refresh Token của phiên làm việc đã được thu hồi.',
    });
  }, []);

  const refreshSession = useCallback(async () => {
    await performTokenRefresh();
    appAlert.success('Đã làm mới phiên JWT', {
      description: 'Xoay vòng Access Token & Refresh Token thành công.',
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tokens,
      isLoading,
      isAuthenticated: !!user && !!tokens?.accessToken,
      secondsUntilAccessExpiry,
      refreshCount,
      login,
      logout,
      refreshSession,
    }),
    [user, tokens, isLoading, secondsUntilAccessExpiry, refreshCount, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  return ctx;
}
