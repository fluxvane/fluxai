'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface Settings {
  endpoint: string;
  apiKey: string;
  name: string;
  defaultModel: string;
}

export interface SettingsContextValue {
  settings: Settings | null;
  isLoaded: boolean;
  hasSettings: boolean;
  save: (next: Settings) => void;
  clear: () => void;
  update: (patch: Partial<Settings>) => void;
}

const STORAGE_KEY = 'flux_ai_settings';

const DEFAULT_SETTINGS: Omit<Settings, 'endpoint' | 'apiKey' | 'name'> = {
  defaultModel: 'gemini/gemini-2.0-flash-lite',
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function readSettings(): Settings | null {
  if (typeof globalThis.window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Settings;
    if (!parsed.endpoint || !parsed.apiKey || !parsed.name) return null;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
}

function writeSettings(settings: Settings | null) {
  if (typeof globalThis.window === 'undefined') return;
  if (settings === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}

type SettingsProviderProps = Readonly<React.PropsWithChildren>;

export function SettingsProvider(props: SettingsProviderProps) {
  const { children } = props;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setIsLoaded(true);
  }, []);

  const save = useCallback((next: Settings) => {
    const merged = { ...DEFAULT_SETTINGS, ...next };
    writeSettings(merged);
    setSettings(merged);
    void fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: merged.endpoint, apiKey: merged.apiKey }),
    }).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    writeSettings(null);
    setSettings(null);
    void fetch('/api/settings', { method: 'DELETE' }).catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch };
      writeSettings(merged);
      return merged;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    isLoaded,
    hasSettings: !!settings,
    save,
    clear,
    update,
  }), [settings, isLoaded, save, clear, update]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
