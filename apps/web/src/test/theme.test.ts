import assert from "node:assert/strict";
import test from "node:test";
import {
  type ThemeMode,
  getNextBoundaryDelay,
  getStoredThemeMode,
  resolveTheme,
  setStoredThemeMode,
  THEME_STORAGE_KEY,
} from "../services/theme.ts";

test("@devforge/web: Theme Resolution — AUTO Mode Time-Based Rules", () => {
  const createDateAtHour = (hour: number, minute = 0, second = 0): Date => {
    const d = new Date(2026, 8, 6, hour, minute, second);
    return d;
  };

  // 1. Day hours (07:00 - 18:59:59) resolve to LIGHT
  assert.equal(resolveTheme("AUTO", createDateAtHour(7, 0, 0)), "light");
  assert.equal(resolveTheme("AUTO", createDateAtHour(7, 0, 1)), "light");
  assert.equal(resolveTheme("AUTO", createDateAtHour(12, 0, 0)), "light");
  assert.equal(resolveTheme("AUTO", createDateAtHour(14, 30, 0)), "light");
  assert.equal(resolveTheme("AUTO", createDateAtHour(18, 59, 59)), "light");

  // 2. Night hours (19:00 - 06:59:59) resolve to DARK
  assert.equal(resolveTheme("AUTO", createDateAtHour(19, 0, 0)), "dark");
  assert.equal(resolveTheme("AUTO", createDateAtHour(19, 0, 1)), "dark");
  assert.equal(resolveTheme("AUTO", createDateAtHour(23, 59, 59)), "dark");
  assert.equal(resolveTheme("AUTO", createDateAtHour(0, 0, 0)), "dark");
  assert.equal(resolveTheme("AUTO", createDateAtHour(3, 45, 0)), "dark");
  assert.equal(resolveTheme("AUTO", createDateAtHour(6, 59, 59)), "dark");
});

test("@devforge/web: Theme Resolution — Manual LIGHT and DARK Overrides", () => {
  const dayTime = new Date(2026, 8, 6, 12, 0, 0);
  const nightTime = new Date(2026, 8, 6, 23, 0, 0);

  // Manual LIGHT always resolves to light
  assert.equal(resolveTheme("LIGHT", dayTime), "light");
  assert.equal(resolveTheme("LIGHT", nightTime), "light");

  // Manual DARK always resolves to dark
  assert.equal(resolveTheme("DARK", dayTime), "dark");
  assert.equal(resolveTheme("DARK", nightTime), "dark");
});

test("@devforge/web: Theme Boundary Calculation & Next Timer Delay", () => {
  // At 06:00:00 -> Next boundary is 07:00:00 today (1 hour = 3600000 ms)
  const at6am = new Date(2026, 8, 6, 6, 0, 0, 0);
  const delay6am = getNextBoundaryDelay(at6am);
  // Delay should be ~ 3600100 ms (1 hr + 100ms safety buffer)
  assert.ok(delay6am >= 3600000 && delay6am <= 3600200);

  // At 12:00:00 -> Next boundary is 19:00:00 today (7 hours = 25200000 ms)
  const at12pm = new Date(2026, 8, 6, 12, 0, 0, 0);
  const delay12pm = getNextBoundaryDelay(at12pm);
  assert.ok(delay12pm >= 25200000 && delay12pm <= 25200200);

  // At 20:00:00 -> Next boundary is 07:00:00 tomorrow (11 hours = 39600000 ms)
  const at8pm = new Date(2026, 8, 6, 20, 0, 0, 0);
  const delay8pm = getNextBoundaryDelay(at8pm);
  assert.ok(delay8pm >= 39600000 && delay8pm <= 39600200);
});

test("@devforge/web: Theme Mode LocalStorage Persistence", () => {
  const originalStorage = globalThis.localStorage;

  const mockStorage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  try {
    // Default is AUTO when storage is empty
    assert.equal(getStoredThemeMode(), "AUTO");

    // Set and retrieve DARK
    setStoredThemeMode("DARK");
    assert.equal(getStoredThemeMode(), "DARK");
    assert.equal(mockStorage[THEME_STORAGE_KEY], "DARK");

    // Set and retrieve LIGHT
    setStoredThemeMode("LIGHT");
    assert.equal(getStoredThemeMode(), "LIGHT");
    assert.equal(mockStorage[THEME_STORAGE_KEY], "LIGHT");

    // Set and retrieve AUTO
    setStoredThemeMode("AUTO");
    assert.equal(getStoredThemeMode(), "AUTO");
    assert.equal(mockStorage[THEME_STORAGE_KEY], "AUTO");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalStorage,
      writable: true,
      configurable: true,
    });
  }
});
