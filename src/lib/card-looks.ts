// Other ways to show the point of an interface card at once, with no model call. A card is the quickest
// picture there is, but every card looks alike: when one more would be one too many, the same point goes
// up as a big number, a duel, moving type or the speaker's own words instead.

import type { Layout, Mood } from "@/lib/slide";
import type { UiKind, UiSpec } from "@/lib/ui-spec";

/** A slide as normalizeSlide takes it. */
export interface CardLook {
  layout: Layout;
  headline: string;
  number?: string;
  versus?: string[];
  mood: Mood;
  /** Kept on the slide, so the kind still counts as recently shown. */
  ui: UiSpec;
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

// The kinds whose count is the point, and what a bare count stands for when the card had no words.
const COUNTED: Partial<Record<UiKind, string>> = {
  notifications: "notifications", people: "people", like: "likes", balance: "", progress: "", rating: "stars", poll: "",
  battery: "battery", trend: "", error: "", timer: "", post: "likes",
  stars: "stars", video: "views", tabs: "tabs", table: "rows", receipt: "", temperature: "", pricing: "",
};
const PERCENT: readonly UiKind[] = ["progress", "poll", "battery", "trend"];

const bare = (word: string): string => word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
const FILLER = new Set(["and", "so", "but", "or", "um", "uh", "like", "well", "then", "because", "yeah"]);

/**
 * The speaker's own words that end with the point: from the start of its clause, at most nine words.
 * Null when the point is not in the line word for word, or the quote would be too short to read as one.
 */
export function quoteAround(line: string, point: string): string | null {
  const words = line.replace(/[“”"]/g, "").split(/\s+/).filter(Boolean);
  const target = point.split(/\s+/).map(bare).filter(Boolean);
  if (target.length === 0) return null;
  let end = -1;
  for (let i = words.length - target.length; i >= 0 && end === -1; i -= 1) {
    if (target.every((t, j) => bare(words[i + j]) === t)) end = i + target.length;
  }
  if (end === -1) return null;
  let start = Math.max(0, end - 9);
  for (let i = end - target.length - 1; i >= start; i -= 1) {
    if (/[.!?;:,]$/.test(words[i])) {
      start = i + 1;
      break;
    }
  }
  while (start < end - target.length && FILLER.has(bare(words[start]))) start += 1;
  const phrase = words.slice(start, end).join(" ").replace(/[.,;:!?]+$/, "");
  return phrase.split(/\s+/).length >= 3 ? `“${phrase}”` : null;
}

/** Every other look this card's point can take, best first. `line` is what the speaker said. */
export function looksFor(ui: UiSpec, line: string): CardLook[] {
  const looks: CardLook[] = [];
  const words = ui.text;
  const counted = COUNTED[ui.kind];
  if (ui.count !== null && counted !== undefined) {
    const n = ui.count;
    const sign = ui.kind === "trend" ? (ui.state === "off" ? "-" : "+") : "";
    const number = PERCENT.includes(ui.kind)
      ? `${sign}${Math.round(n)}%`
      : ui.kind === "rating"
        ? `${n}/5`
        : ui.kind === "temperature"
          ? `${Math.round(n)}°`
          : ui.kind === "receipt" || ui.kind === "pricing"
            ? `$${compact.format(n)}`
            : ui.kind === "error"
              ? String(Math.round(n))
              : compact.format(n);
    const headline = (ui.kind === "poll" ? ui.items[0] : "") || words || counted;
    looks.push({ layout: "BIG_NUMBER", number, headline, mood: "hype", ui });
  }
  if (ui.items.length >= 2 && (ui.kind === "compare" || ui.kind === "poll")) looks.push({ layout: "VERSUS", headline: words, versus: ui.items.slice(0, 2), mood: "chaos", ui });
  if (words) looks.push({ layout: "KINETIC", headline: words, mood: ui.kind === "alert" ? "chaos" : "hype", ui });
  const quote = words ? quoteAround(line, words) : null;
  if (quote) looks.push({ layout: "QUOTE", headline: quote, mood: "calm", ui });
  return looks;
}
