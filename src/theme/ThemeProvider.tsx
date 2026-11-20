import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Theme,
  LightTheme,
  DarkTheme,
  createTheme,
  StudioAccentKey,
  StudioAccent,
  STUDIO_ACCENTS,
} from './theme';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  accentColor: StudioAccentKey;
  setAccentColor: (accent: StudioAccentKey) => void;
  accents: Record<StudioAccentKey, StudioAccent>;
}

const THEME_STORAGE_KEY = '@earbudkit/theme-mode';
const ACCENT_STORAGE_KEY = '@earbudkit/accent-color';

const ThemeContext = createContext<ThemeContextValue>({
  theme: DarkTheme,
  themeMode: 'system',
  setThemeMode: () => {},
  accentColor: 'crimson',
  setAccentColor: () => {},
  accents: STUDIO_ACCENTS,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentColor, setAccentColorState] = useState<StudioAccentKey>('crimson');

  useEffect(() => {
    // Load persisted theme mode & accent color
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(ACCENT_STORAGE_KEY),
    ]).then(([storedTheme, storedAccent]) => {
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        setThemeModeState(storedTheme);
      }
      if (
        storedAccent === 'crimson' ||
        storedAccent === 'blue' ||
        storedAccent === 'amber' ||
        storedAccent === 'emerald'
      ) {
        setAccentColorState(storedAccent);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const setAccentColor = useCallback((accent: StudioAccentKey) => {
    setAccentColorState(accent);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, accent).catch(() => {});
  }, []);

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const theme = useMemo(
    () => createTheme(isDark ? 'dark' : 'light', accentColor),
    [isDark, accentColor]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        accentColor,
        setAccentColor,
        accents: STUDIO_ACCENTS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export {
  type Theme,
  type ThemeColors,
  type StudioAccentKey,
  type StudioAccent,
  STUDIO_ACCENTS,
  createTheme,
  DarkTheme,
  LightTheme,
} from './theme';
