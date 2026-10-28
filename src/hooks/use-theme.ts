"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_THEME, parseTheme, THEME_KEY, type Theme } from "@/lib/theme";

const CHANGED = "doitlive-theme";

// useSyncExternalStore needs the same object back while nothing changed.
let cachedRaw: string | null | undefined;
let cachedTheme: Theme = DEFAULT_THEME;

function read(): Theme {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage blocked: default theme.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedTheme = parseTheme(raw);
  }
  return cachedTheme;
}

function subscribe(notify: () => void): () => void {
  // "storage" fires in other windows (the audience screen); the custom event covers this one.
  window.addEventListener("storage", notify);
  window.addEventListener(CHANGED, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(CHANGED, notify);
  };
}

/** The speaker's style guide, shared by every window through localStorage. */
export function useTheme(): [Theme, (theme: Theme | null) => void] {
  const theme = useSyncExternalStore(subscribe, read, () => DEFAULT_THEME);
  const setTheme = useCallback((next: Theme | null) => {
    try {
      if (next) localStorage.setItem(THEME_KEY, JSON.stringify(next));
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // Too large (a big logo) or storage blocked: the change is not kept.
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return [theme, setTheme];
}
