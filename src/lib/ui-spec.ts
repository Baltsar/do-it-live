// One big interface element as a slide: a button, a switch, a pile of notifications. The model names it in
// one line instead of writing a whole screen, so it appears at once, and the audience gets it in a second:
// everything but the one word or number that carries the point is a grey placeholder bar.

export const UI_KINDS = [
  "button",
  "form",
  "toggle",
  "notifications",
  "progress",
  "chat",
  "people",
  "search",
  "balance",
  "dialog",
  "checklist",
  // Not about screens at all: familiar interface patterns that carry any topic, from software to mushrooms.
  "rating",
  "poll",
  "calendar",
  "map",
  "compare",
  "tags",
  "profile",
  "alert",
  "like",
  // Moments every talk has: a history, code, a crash, a quoted text, running low, a curve, a ranking,
  // a deadline, being cut off, going viral.
  "timeline",
  "terminal",
  "error",
  "message",
  "battery",
  "trend",
  "leaderboard",
  "timer",
  "signal",
  "post",
] as const;
export type UiKind = (typeof UI_KINDS)[number];

export const UI_STATES = ["on", "off", "crossed", "error", "loading", "done", "empty"] as const;
export type UiState = (typeof UI_STATES)[number];

export interface UiSpec {
  kind: UiKind;
  /** The only words in the picture: a button label, a search query, a question. One to three words. */
  text: string;
  /** A figure the speaker said: unread notifications, people, an amount, a percentage. */
  count: number | null;
  state: UiState | null;
  /** Poll options, the two sides of a comparison, tags: up to four, two words each. */
  items: string[];
}

const isKind = (v: unknown): v is UiKind => typeof v === "string" && (UI_KINDS as readonly string[]).includes(v);
const isState = (v: unknown): v is UiState => typeof v === "string" && (UI_STATES as readonly string[]).includes(v);

/** Coerces whatever the model wrote into a spec, or null when it named no known element. */
export function parseUiSpec(raw: unknown): UiSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = typeof r.kind === "string" ? r.kind.toLowerCase().trim() : "";
  if (!isKind(kind)) return null;
  const count = typeof r.count === "number" ? r.count : Number.parseFloat(String(r.count ?? "").replace(/[^\d.]/g, ""));
  const state = typeof r.state === "string" ? r.state.toLowerCase().trim() : "";
  // A quoted message, a post or a command is read word for word: it may run a little longer than a label.
  const long = kind === "message" || kind === "post" || kind === "terminal";
  const text = typeof r.text === "string" ? r.text.replace(/[<>]/g, "").trim().split(/\s+/).slice(0, long ? 5 : 3).join(" ").slice(0, long ? 40 : 28) : "";
  const items = Array.isArray(r.items)
    ? r.items.filter((x): x is string => typeof x === "string").map((x) => x.replace(/[<>]/g, "").trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 18)).filter(Boolean).slice(0, 4)
    : [];
  return { kind, text, count: Number.isFinite(count) && count > 0 ? count : null, state: isState(state) ? state : null, items };
}

/** The menu the drawing model chooses from, as it is written in its instructions. */
export const UI_MENU = `button (text = the button word; state "crossed" = not needed any more), form (a sign-up or login; state "crossed" = no login needed: the fields fold away and only the button stays, "error" = it fails), toggle (text = what is switched; state "on" or "off"), notifications (count = how many), progress (count = percent; state "loading" = stuck, waiting), chat (state "empty" = nobody answers), people (count = how many), search (text = what is searched; state "empty" = nothing found), balance (count = the amount), dialog (text = the question; state "crossed" = refused), checklist (state "done" = all ticked), rating (count = stars out of 5; text = what is rated), poll (text = the question; items = the 2-3 answers, the winning one first; count = the winner's percent if said), calendar (text = a month or weekday; count = the day), map (text = the place), compare (items = the two things, the good one first; state "crossed" = the second is a fake or a trap), tags (items = 3-4 short labels of what something is), profile (text = the name of a person, animal, thing or species being introduced; items = 2-3 traits), alert (text = the warning in 1-2 words, like a danger or a mistake), like (count = how many love it), timeline (items = 2-4 moments in order, like years or "Then", "Now"; the last is highlighted), terminal (text = the command, like "npm run deploy"; state "error" = it fails, "loading" = still running), error (count = the error code like 404 or 500; text = 1-3 words of what broke), message (text = the exact words of a text someone sent, up to five), battery (count = percent left; state "loading" = charging), trend (count = percent change; text = what is measured; state "off" = it fell), leaderboard (items = 2-4 names in rank order, the winner first), timer (count = how much time; text = the unit, like "hours"; state "done" = time is up), signal (state "off" = no connection; text = 1-2 words if any), post (text = what was posted, up to five words; count = likes)`;
