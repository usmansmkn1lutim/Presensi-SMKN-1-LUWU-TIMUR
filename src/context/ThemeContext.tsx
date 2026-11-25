import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tamaki-theme';
const LIGHT_THEME_COLOR = '#ffffff';
const DARK_THEME_COLOR = '#171717';

export function isValidTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

function writeStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors (e.g., restricted or private browsing mode)
  }
}

function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = theme;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
    );
  }
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const pendingPersistRef = useRef(false);

  useEffect(() => {
    applyThemeToDocument(theme);
    if (pendingPersistRef.current) {
      pendingPersistRef.current = false;
      writeStoredTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea !== null && event.storageArea !== window.localStorage) {
          return;
        }
      } catch {
        return;
      }

      if (event.key === null) {
        pendingPersistRef.current = false;
        setThemeState('light');
        return;
      }

      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      if (event.newValue === null) {
        pendingPersistRef.current = false;
        setThemeState('light');
        return;
      }

      if (!isValidTheme(event.newValue)) {
        return;
      }

      pendingPersistRef.current = false;
      setThemeState(event.newValue);
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    const validatedTheme: Theme = isValidTheme(nextTheme) ? nextTheme : 'light';
    pendingPersistRef.current = false;
    writeStoredTheme(validatedTheme);
    setThemeState(validatedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    pendingPersistRef.current = true;
    setThemeState((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
