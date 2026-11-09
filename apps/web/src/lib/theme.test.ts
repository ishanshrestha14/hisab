import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTheme, resetThemeForTests, setTheme, subscribe } from "./theme";

let storage: Record<string, string>;
let classes: Set<string>;

function stubBrowser({ prefersDark = false } = {}) {
  storage = {};
  classes = new Set();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
  });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: prefersDark }) });
  vi.stubGlobal("document", {
    documentElement: {
      classList: {
        toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)),
      },
    },
  });
}

beforeEach(() => {
  resetThemeForTests();
  stubBrowser();
});

afterEach(() => vi.unstubAllGlobals());

describe("theme store", () => {
  it("starts from the saved theme", () => {
    storage["hisab-theme"] = "dark";
    expect(getTheme()).toBe("dark");
    expect(classes.has("dark")).toBe(true);
  });

  it("falls back to the system preference", () => {
    resetThemeForTests();
    stubBrowser({ prefersDark: true });
    expect(getTheme()).toBe("dark");
  });

  it("notifies every subscriber, so all toggles stay in sync", () => {
    const sidebar = vi.fn();
    const settings = vi.fn();
    subscribe(sidebar);
    subscribe(settings);

    setTheme("dark");

    expect(sidebar).toHaveBeenCalledTimes(1);
    expect(settings).toHaveBeenCalledTimes(1);
    expect(getTheme()).toBe("dark");
    expect(storage["hisab-theme"]).toBe("dark");
    expect(classes.has("dark")).toBe(true);
  });

  it("does nothing when the theme is unchanged", () => {
    getTheme();
    const listener = vi.fn();
    subscribe(listener);

    setTheme("light");

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();

    setTheme("dark");

    expect(listener).not.toHaveBeenCalled();
  });
});
