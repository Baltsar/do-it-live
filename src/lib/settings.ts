import type { ImageSource, VisualMode } from "@/lib/slide";

/** Show settings, kept in the browser and shared by every page. */
export interface ShowSettings {
  visualMode: VisualMode;
  imageSource: ImageSource;
  dwellMs: number;
  bold: boolean;
  /** Optional heads-up from the speaker: a few sentences on what the talk is about. */
  brief: string;
}

export const SETTINGS_KEY = "doitlive.settings";
export const MAX_BRIEF = 600;

// Image first: the audience listens, it does not read.
export const DEFAULT_SETTINGS: ShowSettings = { visualMode: "pure", imageSource: "library", dwellMs: 2500, bold: false, brief: "" };
// Raised when a default changes on purpose (2: slides gave way too slowly for a punchline at 4 s).
// A browser that saved the old default gets the new one once; what the speaker picks afterwards is kept.
const SETTINGS_VERSION = 2;

export function loadSettings(): ShowSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<ShowSettings> & { version?: number };
    if (saved.version !== SETTINGS_VERSION) saved.dwellMs = undefined;
    return {
      visualMode: saved.visualMode === "minimal" || saved.visualMode === "balanced" || saved.visualMode === "pure" ? saved.visualMode : DEFAULT_SETTINGS.visualMode,
      imageSource: saved.imageSource === "web" ? "web" : "library",
      dwellMs: typeof saved.dwellMs === "number" && saved.dwellMs >= 2000 && saved.dwellMs <= 10000 ? saved.dwellMs : DEFAULT_SETTINGS.dwellMs,
      bold: saved.bold === true,
      brief: typeof saved.brief === "string" ? saved.brief.slice(0, MAX_BRIEF) : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<ShowSettings>): ShowSettings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...next, version: SETTINGS_VERSION }));
  } catch {
    // Private mode or blocked storage: settings last for this session only.
  }
  return next;
}
