import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, jsonBody } from '../lib/api';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: 'Citizen' | 'Facilitator' | 'Municipality Staff' | 'Researcher' | 'Admin';
  pilotSite: string;
  phone: string;
  locale: 'EN' | 'EL' | 'FI' | 'PL' | 'PT';
  preferences: {
    profileVisibility: 'private' | 'public';
    usageAnalytics: boolean;
    personalizedRecommendations: boolean;
  };
  createdAt: string;
  updatedAt: string;
  avatarData: string | null;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  pilotSite: string;
  role: string;
  locale: string;
  acceptedTerms: boolean;
  returnTo?: string;
}
export interface RegistrationResult { message: string; email: string; delivery: 'sent' | 'preview'; verificationPreviewUrl?: string }

interface NotificationCounts {
  total: number;
  unread: number;
  archived: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  notificationCounts: NotificationCounts;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<RegistrationResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<AuthUser>;
  refreshSession: () => Promise<AuthUser | null>;
  refreshNotificationCounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const EMPTY_COUNTS: NotificationCounts = { total: 0, unread: 0, archived: 0 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [notificationCounts, setNotificationCounts] = useState(EMPTY_COUNTS);

  const refreshNotificationCounts = useCallback(async () => {
    try {
      const result = await apiRequest<{ counts: NotificationCounts }>('/api/notifications?filter=all');
      setNotificationCounts(result.counts);
    } catch {
      setNotificationCounts(EMPTY_COUNTS);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const result = await apiRequest<{ user: AuthUser | null }>('/api/auth/session');
      setUser(result.user);
      setStatus(result.user ? 'authenticated' : 'anonymous');
      if (result.user) await refreshNotificationCounts();
      else setNotificationCounts(EMPTY_COUNTS);
      return result.user;
    } catch {
      setUser(null);
      setStatus('anonymous');
      setNotificationCounts(EMPTY_COUNTS);
      return null;
    }
  }, [refreshNotificationCounts]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const result = await apiRequest<{ user: AuthUser }>('/api/auth/signin', {
      method: 'POST', body: jsonBody({ email, password, rememberMe }),
    });
    setUser(result.user);
    setStatus('authenticated');
    await refreshNotificationCounts();
    return result.user;
  }, [refreshNotificationCounts]);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await apiRequest<RegistrationResult>('/api/auth/register', {
      method: 'POST', body: jsonBody(input),
    });
    return result;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/api/auth/signout', { method: 'POST' });
    } finally {
      setUser(null);
      setStatus('anonymous');
      setNotificationCounts(EMPTY_COUNTS);
    }
  }, []);

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    const result = await apiRequest<{ user: AuthUser }>('/api/profile', {
      method: 'PATCH', body: jsonBody(patch),
    });
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, status, notificationCounts, signIn, register, signOut, updateProfile,
    refreshSession, refreshNotificationCounts,
  }), [notificationCounts, refreshNotificationCounts, refreshSession, register, signIn, signOut, status, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
