import { useSyncExternalStore } from "react";

// One theme for the whole app. Every useTheme() caller (the sidebar toggle,
// the Settings page) reads and writes this store, so they never disagree.

export type Theme = "light" | "dark";

const STORAGE_KEY = "hisab-theme";
const listeners = new Set<() => void>();
let current: Theme | null = null;

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getTheme(): Theme {
  if (current === null) {
    current = initialTheme();
    apply(current);
  }
  return current;
}

export function setTheme(theme: Theme) {
  if (theme === getTheme()) return;
  current = theme;
  apply(theme);
  listeners.forEach((notify) => notify());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test hook: forget the cached theme so the next read starts fresh */
export function resetThemeForTests() {
  current = null;
  listeners.clear();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
