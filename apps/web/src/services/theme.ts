export type ThemeMode = "AUTO" | "LIGHT" | "DARK";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "devforge_theme_mode";

/**
 * Returns the persisted theme mode preference from localStorage,
 * falling back to "AUTO" if none is stored or invalid.
 */
export function getStoredThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "LIGHT" || stored === "DARK" || stored === "AUTO") {
      return stored;
    }
  } catch (err) {
    console.error("Failed to read theme mode from storage:", err);
  }
  return "AUTO";
}

/**
 * Persists the user's theme mode preference to localStorage.
 */
export function setStoredThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (err) {
    console.error("Failed to save theme mode to storage:", err);
  }
}

/**
 * Resolves the active theme ("light" | "dark") based on the configured mode
 * and the local client time.
 *
 * Rules:
 * - LIGHT => "light"
 * - DARK => "dark"
 * - AUTO:
 *   - 07:00 to 18:59 => "light" (hours >= 7 && hours < 19)
 *   - 19:00 to 06:59 => "dark" (hours < 7 || hours >= 19)
 */
export function resolveTheme(
  mode: ThemeMode,
  now: Date = new Date(),
): ResolvedTheme {
  if (mode === "LIGHT") return "light";
  if (mode === "DARK") return "dark";

  const hours = now.getHours();
  if (hours >= 7 && hours < 19) {
    return "light";
  }
  return "dark";
}

/**
 * Calculates the milliseconds until the next 07:00 or 19:00 boundary
 * relative to the given local timestamp.
 */
export function getNextBoundaryDelay(now: Date = new Date()): number {
  const current = now.getTime();

  // Target 1: Today 07:00:00
  const t7 = new Date(now);
  t7.setHours(7, 0, 0, 0);

  // Target 2: Today 19:00:00
  const t19 = new Date(now);
  t19.setHours(19, 0, 0, 0);

  // Target 3: Tomorrow 07:00:00
  const t7Tomorrow = new Date(now);
  t7Tomorrow.setDate(t7Tomorrow.getDate() + 1);
  t7Tomorrow.setHours(7, 0, 0, 0);

  let nextTargetTime: number;
  if (current < t7.getTime()) {
    nextTargetTime = t7.getTime();
  } else if (current < t19.getTime()) {
    nextTargetTime = t19.getTime();
  } else {
    nextTargetTime = t7Tomorrow.getTime();
  }

  // Add 100ms safety buffer so timer triggers strictly after the boundary
  const delay = nextTargetTime - current + 100;
  return Math.max(1000, delay);
}

/**
 * Applies the resolved theme to document.documentElement via data-theme and .dark class.
 */
export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
