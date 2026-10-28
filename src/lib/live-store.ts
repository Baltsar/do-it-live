// Slides that a model draws while the talk runs. Their content grows after the slide is on screen, so it lives
// outside the slide object: a slide only says "I am drawn live" and the view reads the drawing from here by id.
import type { DrawPalette } from "@/lib/draw";
import { parseUiSpec, type UiSpec } from "@/lib/ui-spec";

export interface LiveDrawing {
  html: string;
  /** The model has finished writing. */
  done: boolean;
  palette: DrawPalette;
}

const drawings = new Map<string, LiveDrawing>();
const listeners = new Map<string, Set<() => void>>();

export const getLive = (id: string): LiveDrawing | undefined => drawings.get(id);

export function setLive(id: string, drawing: LiveDrawing): void {
  drawings.set(id, drawing);
  // Old drawings are only needed for the last few slides and the prepared ones.
  if (drawings.size > 60) drawings.delete(drawings.keys().next().value as string);
  listeners.get(id)?.forEach((notify) => notify());
}

export function subscribeLive(id: string, notify: () => void): () => void {
  const set = listeners.get(id) ?? new Set<() => void>();
  set.add(notify);
  listeners.set(id, set);
  return () => {
    set.delete(notify);
    if (set.size === 0) listeners.delete(id);
  };
}

/**
 * Splits the model's raw answer into the label and the markup written so far.
 * `label` is null until its line is complete; "none" means the model saw nothing worth a picture.
 */
export function parseDrawing(raw: string): { label: string | null; html: string; same?: boolean; ui?: UiSpec } {
  const newline = raw.indexOf("\n");
  const first = (newline === -1 ? raw : raw.slice(0, newline)).trim();
  // One interface element instead of a drawing: the whole answer is this one line.
  const uiLine = first.match(/^UI\s*(\{.*\})\s*$/i);
  if (uiLine) {
    try {
      const ui = parseUiSpec(JSON.parse(uiLine[1]));
      if (ui) return { label: ui.text || ui.kind, html: "", ui };
    } catch {
      // Not complete yet, or not JSON: wait for more, or let the drawing go on.
    }
    if (newline === -1) return { label: null, html: "" };
  }
  // "SAME" (still on the picture that is up) and "NONE" both mean: no new slide.
  if (/^(same|none)\b/i.test(first) && (newline !== -1 || first.length <= 5)) return { label: "none", html: "", same: /^same/i.test(first) };
  const match = first.match(/^LABEL:\s*(.*)$/i);
  if (newline === -1) return { label: match && /^none\b/i.test(match[1]) ? "none" : null, html: "" };
  if (match && /^none\b/i.test(match[1])) return { label: "none", html: "" };
  const label = match ? match[1].replace(/[<>"]/g, "").trim().slice(0, 40) : "";
  const rest = match ? raw.slice(newline + 1) : raw;
  const start = rest.indexOf("<");
  // Models like to wrap code in a fence; the closing one must not end up as text on the slide.
  const html = start === -1 ? "" : rest.slice(start).replace(/```\s*$/, "");
  return { label: label || "", html };
}
