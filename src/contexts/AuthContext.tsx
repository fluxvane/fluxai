"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface ConfigSummary {
  endpoint: string;
  defaultModel: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  hasConfig?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  hasConfig: boolean;
  config: ConfigSummary | null;
  isLoaded: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  saveConfig: (
    endpoint: string,
    apiKey: string,
    defaultModel: string,
  ) => Promise<AuthResult>;
  updateConfig: (patch: {
    endpoint?: string;
    apiKey?: string;
    defaultModel?: string;
  }) => Promise<AuthResult>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasConfig, setHasConfig] = useState(false);
  const [config, setConfig] = useState<ConfigSummary | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await readJson(res);
        setUser((data.user as AuthUser) ?? null);
        setHasConfig(Boolean(data.hasConfig));
        setConfig((data.config as ConfigSummary) ?? null);
      } else {
        setUser(null);
        setHasConfig(false);
        setConfig(null);
      }
    } catch {
      setUser(null);
      setHasConfig(false);
      setConfig(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback<AuthContextValue["login"]>(
    async (email, password) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await readJson(res);
      if (!res.ok)
        return {
          ok: false,
          error: (data.error as string) ?? "Sign in failed.",
        };
      setUser(data.user as AuthUser);
      setHasConfig(Boolean(data.hasConfig));
      return { ok: true, hasConfig: Boolean(data.hasConfig) };
    },
    [],
  );

  const register = useCallback<AuthContextValue["register"]>(
    async (email, password, name) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await readJson(res);
      if (!res.ok)
        return {
          ok: false,
          error: (data.error as string) ?? "Registration failed.",
        };
      setUser(data.user as AuthUser);
      setHasConfig(false);
      return { ok: true, hasConfig: false };
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setHasConfig(false);
    setConfig(null);
  }, []);

  const saveConfig = useCallback<AuthContextValue["saveConfig"]>(
    async (endpoint, apiKey, defaultModel) => {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, apiKey, defaultModel }),
      });
      const data = await readJson(res);
      if (!res.ok)
        return {
          ok: false,
          error: (data.error as string) ?? "Could not save configuration.",
        };
      setHasConfig(true);
      setConfig({ endpoint, defaultModel });
      return { ok: true };
    },
    [],
  );

  const updateConfig = useCallback<AuthContextValue["updateConfig"]>(
    async (patch) => {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await readJson(res);
      if (!res.ok)
        return {
          ok: false,
          error: (data.error as string) ?? "Could not update configuration.",
        };
      const updated = data.config as
        | { endpoint: string; defaultModel: string }
        | undefined;
      if (updated)
        setConfig({
          endpoint: updated.endpoint,
          defaultModel: updated.defaultModel,
        });
      setHasConfig(true);
      return { ok: true };
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      hasConfig,
      config,
      isLoaded,
      login,
      register,
      logout,
      saveConfig,
      updateConfig,
      refresh,
    }),
    [
      user,
      hasConfig,
      config,
      isLoaded,
      login,
      register,
      logout,
      saveConfig,
      updateConfig,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
