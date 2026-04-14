'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { startSSOLogin, getSSOState, type SSOUser } from '@nera/common';

export interface User {
  sub: string;
  name: string;
  email: string;
  orgId?: string;
  role?: string;
  roles?: string[];
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  exchangeCodeForTokens: (code: string, state: string) => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'auth_user';

const IAM_PORTAL_URL = process.env.NEXT_PUBLIC_IAM_PORTAL_URL || 'http://localhost:3006';
const CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || 'ai-dashboard';

function clearAuthStorage() {
  if (typeof globalThis.window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

/**
 * Get the access token. With httpOnly cookies, the token is sent automatically
 * by the browser. This function returns null — API calls should rely on
 * withCredentials: true instead.
 */
export function getToken(): string | null {
  // Tokens are now stored in httpOnly cookies and sent automatically.
  // This function is kept for backward compatibility with http.ts interceptor.
  return null;
}

function readPersistedUser(): User | null {
  if (typeof globalThis.window === 'undefined') return null;

  try {
    const storedUser = localStorage.getItem(USER_KEY);
    if (!storedUser) return null;
    return JSON.parse(storedUser) as User;
  } catch {
    clearAuthStorage();
    return null;
  }
}

function ssoUserToUser(ssoUser: SSOUser): User {
  return {
    sub: ssoUser.id,
    name: ssoUser.name,
    email: ssoUser.email,
    orgId: ssoUser.organizationId,
    role: ssoUser.role,
    roles: ssoUser.roles,
  };
}

type AuthProviderProps = Readonly<React.PropsWithChildren>;

export function AuthProvider(props: AuthProviderProps) {
  const { children } = props;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const persistedUser = readPersistedUser();
    if (persistedUser) {
      setUser(persistedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async () => {
    await startSSOLogin({
      config: {
        clientId: CLIENT_ID,
        iamPortalUrl: IAM_PORTAL_URL,
        redirectUri: `${globalThis.window.location.origin}/auth/callback`,
        scope: 'openid profile email roles organization offline_access',
      },
      finalRedirect: '/chat',
    });
  }, []);

  const exchangeCodeForTokens = useCallback(async (code: string, state: string) => {
    // Verify state matches the stored PKCE state
    const storedState = getSSOState();
    if (state !== storedState.state) {
      throw new Error('Invalid state parameter');
    }

    if (!storedState.codeVerifier) {
      throw new Error('PKCE verifier not found');
    }

    // Exchange via server-side API route (sets httpOnly cookies)
    const response = await fetch('/api/auth/sso/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier: storedState.codeVerifier,
        redirectUri: storedState.redirectUri || `${globalThis.window.location.origin}/auth/callback`,
        clientId: CLIENT_ID,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Token exchange failed');
    }

    const data = await response.json() as { user: SSOUser };
    const resolvedUser = ssoUserToUser(data.user);

    localStorage.setItem(USER_KEY, JSON.stringify(resolvedUser));
    setUser(resolvedUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);

    // Call server-side logout to clear httpOnly cookies, then redirect to IAM logout
    void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        post_logout_redirect_uri: `${globalThis.window.location.origin}/login`,
      });
      globalThis.window.location.href = `${IAM_PORTAL_URL}/connect/logout?${params.toString()}`;
    });
  }, []);

  const getTokenValue = useCallback(() => {
    return getToken();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    exchangeCodeForTokens,
    getToken: getTokenValue,
  }), [user, isLoading, login, logout, exchangeCodeForTokens, getTokenValue]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
