import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { getConfig } from '../config';

export interface BackgroundItem {
  url: string;
}

export interface BackgroundPack {
  name: string;
  items: BackgroundItem[];
}

export type BackgroundSetting = string | null;

interface BackgroundContextValue {
  backgroundPacks: BackgroundPack[];
  backgroundSetting: BackgroundSetting;
  setBackground: (setting: BackgroundSetting) => void;
  backgroundImage: string;
}

const STORAGE_KEY = 'app_background';

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

/**
 * Provides background packs and current background selection across the app.
 */
export const BackgroundProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const backgroundPacks = useMemo<BackgroundPack[]>(() => {
    try {
      const cfg = getConfig();
      return Object.entries(cfg.backgrounds || {}).map(([name, items]) => ({ name, items }));
    } catch (error) {
      console.warn('Failed to load background packs:', error);
      return [];
    }
  }, []);

  const [backgroundSetting, setBackgroundSetting] = useState<BackgroundSetting>(null);

  // Load and validate stored setting when packs are available
  useEffect(() => {
    if (backgroundPacks.length === 0) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && backgroundPacks.some((p) => p.name === stored)) {
        setBackgroundSetting(stored);
      } else {
        setBackgroundSetting(null);
        if (stored) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      setBackgroundSetting(null);
    }
  }, [backgroundPacks]);

  const setBackground = useCallback((setting: BackgroundSetting) => {
    setBackgroundSetting(setting);
    try {
      if (setting) {
        localStorage.setItem(STORAGE_KEY, setting);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const backgroundImage = useMemo<string>(() => {
    if (!backgroundSetting) return '';
    const pack = backgroundPacks.find((p) => p.name === backgroundSetting);
    if (!pack || pack.items.length === 0) return '';
    const dayIndex = (new Date().getDate() - 1) % pack.items.length;
    return pack.items[dayIndex].url;
  }, [backgroundPacks, backgroundSetting]);

  return (
    <BackgroundContext.Provider
      value={{ backgroundPacks, backgroundSetting, setBackground, backgroundImage }}
    >
      {children}
    </BackgroundContext.Provider>
  );
};

/**
 * Hook to access background settings and current wallpaper.
 * Must be used within a BackgroundProvider.
 */
export function useBackgroundContext(): BackgroundContextValue {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackgroundContext must be used within BackgroundProvider');
  }
  return context;
}