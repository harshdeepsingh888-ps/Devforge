import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type ResolvedTheme,
  type ThemeMode,
  applyThemeToDocument,
  getNextBoundaryDelay,
  getStoredThemeMode,
  resolveTheme,
  setStoredThemeMode,
} from "../services/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredThemeMode()),
  );

  const updateResolvedTheme = useCallback(() => {
    const nextResolved = resolveTheme(mode);
    setResolvedTheme(nextResolved);
    applyThemeToDocument(nextResolved);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    setStoredThemeMode(newMode);
    const nextResolved = resolveTheme(newMode);
    setResolvedTheme(nextResolved);
    applyThemeToDocument(nextResolved);
  }, []);

  // Update theme on mode change & initial mount
  useEffect(() => {
    updateResolvedTheme();
  }, [updateResolvedTheme]);

  // Schedule next boundary timer + handle tab focus/visibility changes
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextBoundary = () => {
      const delay = getNextBoundaryDelay();
      timerId = setTimeout(() => {
        updateResolvedTheme();
        scheduleNextBoundary();
      }, delay);
    };

    scheduleNextBoundary();

    // Re-evaluate on window focus or visibility regain
    const handleVisibilityOrFocus = () => {
      updateResolvedTheme();
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Periodic safety check every 60 seconds
    const intervalId = setInterval(() => {
      updateResolvedTheme();
    }, 60000);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [updateResolvedTheme]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
