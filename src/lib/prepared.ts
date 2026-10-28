// Slides prepared before the talk, and the matcher that fires them the moment the speaker gets there.
// Matching speech against known cues is far more robust than guessing from open speech:
// it tolerates misheard words and needs no model call, so the slide appears at once.
import { spokenNumbers } from "@/lib/grounding";

export interface PreparedMoment {
  id: string;
  /** Words or short phrases the speaker will say at this moment. */
  cues: string[];
  /** The most telling cue. */
  strong: string;
  /** Raw slide, same shape the director returns. */
  slide: unknown;
  /** The part of the heads-up this moment is about, in the speaker's words: what a drawn slide is drawn from. */
  say: string;
}

const norm = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}\s%]/gu, " ").replace(/\s+/g, " ").trim();

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

/** "opensvaria" is close enough to "opensverige": long words may differ by about a third. */
const soundsLike = (heard: string, cue: string): boolean =>
  heard === cue || (cue.length >= 6 && Math.abs(heard.length - cue.length) <= 3 && editDistance(heard, cue) <= Math.floor(cue.length * 0.34));

function cueHeard(cue: string, text: string, words: string[], numbers: Set<number>): boolean {
  const c = norm(cue);
  if (!c) return false;
  const digits = c.match(/\d[\d.,]*/);
  if (digits) {
    // "700" matches "seven hundred" too.
    const n = Number.parseFloat(digits[0].replace(/,/g, ""));
    if (Number.isFinite(n) && numbers.has(n)) return true;
  }
  if (text.includes(c)) return true;
  // "without a login" must also match "without the login": the small words of a phrase are not the cue.
  const telling = c.split(" ").filter((part) => part.length > 2 && part !== "the" && part !== "and");
  const parts = telling.length > 0 ? telling : c.split(" ");
  if (c.includes(" ")) {
    // "open sverige" heard as one mangled word: compare the glued forms as well.
    const glued = parts.join("");
    if (words.some((w) => soundsLike(w, glued))) return true;
    return parts.every((part) => words.some((w) => soundsLike(w, part)));
  }
  return words.some((w) => soundsLike(w, c));
}

/**
 * The prepared moment the speaker has just reached, if any. A number or a distinctive name is
 * enough alone; a short strong cue needs one more; without the strong cue it takes three.
 */
export function matchPrepared<T extends Pick<PreparedMoment, "cues" | "strong">>(thought: string, moments: readonly T[]): T | null {
  const text = norm(thought);
  if (!text) return null;
  const words = text.split(" ");
  const numbers = spokenNumbers(thought);
  let best: T | null = null;
  let bestScore = 0;
  for (const moment of moments) {
    const cues = [...new Set([moment.strong, ...moment.cues].map(norm).filter(Boolean))];
    const hits = cues.filter((cue) => cueHeard(cue, text, words, numbers)).length;
    const strong = cueHeard(moment.strong, text, words, numbers);
    // A number or a distinctive name is enough on its own; a short common word needs company.
    const distinctive = /\d/.test(moment.strong) || norm(moment.strong).replace(/\s/g, "").length >= 8;
    const fires = (strong && distinctive) || (strong && hits >= 2) || hits >= 3;
    const score = hits + (strong ? 1.5 : 0);
    if (fires && score > bestScore) {
      best = moment;
      bestScore = score;
    }
  }
  return best;
}
