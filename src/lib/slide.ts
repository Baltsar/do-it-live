import { z } from "zod";
import { isIconName, type IconName } from "@/lib/icons";
import { isScene, type SceneName } from "@/lib/scene-catalog";
import { parseUiSpec, type UiSpec } from "@/lib/ui-spec";

export const LAYOUTS = [
  "BIG_WORD",
  "BIG_NUMBER",
  "QUOTE",
  "VERSUS",
  "GIF_REACTION",
  "REVEAL_3",
  "PHOTO",
  "ICON",
  "CHART",
  "PROCESS",
  "CHECKLIST",
  "ICON_GRID",
  "MEME",
  "TITLE_CARD",
  "SPLIT_STAT",
  "SCENE",
  // Drawn by a model while the talk runs. The drawing itself lives in live-store, keyed by the slide id.
  "LIVE_UI",
  // One big, simplified interface element (see ui-spec.ts).
  "UI_HERO",
  // One to three words as moving type: the letters drop in over echoes of the word sliding past.
  "KINETIC",
] as const;

export { SCENES, isScene, type SceneName } from "@/lib/scene-catalog";
const VISUAL_LAYOUTS: readonly string[] = ["PHOTO", "ICON", "CHART", "GIF_REACTION", "ICON_GRID", "TITLE_CARD", "SCENE", "LIVE_UI", "UI_HERO", "KINETIC"];
export const MOTIFS = ["rings", "stripes", "dots", "burst", "grid"] as const;
export const MOODS = ["hype", "funny", "calm", "serious", "chaos"] as const;

export type Layout = (typeof LAYOUTS)[number];
export type Mood = (typeof MOODS)[number];
export type Motif = (typeof MOTIFS)[number];

/** How much text the audience sees. Pure: images only. Minimal: a tiny label. Balanced: full templates. */
export const VISUAL_MODES = ["pure", "minimal", "balanced"] as const;
export type VisualMode = (typeof VISUAL_MODES)[number];
export type TextMode = "none" | "label" | "full";

/** Where photos and clips may come from: only what the speaker uploaded, or also a web search. */
export const IMAGE_SOURCES = ["library", "web"] as const;
export type ImageSource = (typeof IMAGE_SOURCES)[number];

export interface ChartData {
  kind: "ring" | "bars";
  values: number[];
  labels: string[];
  /** Values were not said by the speaker: shape only, no figures shown. */
  illustrative: boolean;
}

/** Moving layers behind a slide. Decoration only: variety, not meaning. */
export const BACKDROPS = ["flicker", "retro", "ripple", "particles", "gridpulse", "depth"] as const;
export type BackdropName = (typeof BACKDROPS)[number];

/** Chosen by the art director, never by the model: keeps consecutive slides visibly different. */
export interface SlideStyle {
  /** Colour field. Usually the mood's own, shifted when the previous slide used it. */
  field: Mood;
  align: "left" | "center";
  photoSide: "left" | "right";
  /** Photo runs edge to edge with a caption slab instead of the split layout. */
  bleed: boolean;
  /** Text on media slides: none, a small label chip, or the full slab. */
  text: TextMode;
  backdrop: BackdropName | "none";
}

export interface Slide {
  id: string;
  layout: Layout;
  headline: string;
  body: string;
  number: string;
  items: string[];
  versus: string[];
  mood: Mood;
  gifQuery: string;
  gif: string | null;
  /** Id in the speaker's own GIF library. */
  libraryId: string | null;
  icon: IconName | null;
  scene: SceneName | null;
  ui: UiSpec | null;
  /** One icon per item (ICON_GRID). */
  icons: IconName[];
  imageQuery: string;
  /** Two other photographable scenes for the same metaphor. */
  imageAlts: string[];
  /** What the picture shows and why it amplifies the line: the brief for picking the photo. */
  metaphor: string;
  image: string | null;
  /** Attribution for the photo, shown small. */
  credit: string;
  motif: Motif;
  chart: ChartData | null;
  style: SlideStyle;
  source: string | null;
  /** A claim without a source. Rendered as a stamp, part of the joke. */
  vibe: boolean;
  failed: boolean;
}

/** What the Director LLM may return. Every field is optional: models drift. */
const RawSlide = z.object({
  layout: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  number: z.union([z.string(), z.number()]).optional(),
  items: z.array(z.string()).optional(),
  versus: z.array(z.string()).optional(),
  gif_query: z.string().optional(),
  library_id: z.string().optional(),
  icon: z.string().optional(),
  scene: z.string().optional(),
  icons: z.array(z.string()).optional(),
  image_query: z.string().optional(),
  alt_queries: z.array(z.string()).optional(),
  metaphor: z.string().optional(),
  motif: z.string().optional(),
  chart: z
    .object({
      kind: z.string().optional(),
      values: z.array(z.number()).optional(),
      labels: z.array(z.string()).optional(),
      illustrative: z.boolean().optional(),
    })
    .optional(),
  mood: z.string().optional(),
  claims_fact: z.boolean().optional(),
  source: z.string().nullable().optional(),
  gif: z.string().nullable().optional(),
  failed: z.boolean().optional(),
  ui: z.unknown().optional(),
});

const clampWords = (text: string | undefined, max: number): string =>
  (text ?? "").trim().split(/\s+/).filter(Boolean).slice(0, max).join(" ");

const isLayout = (v: string | undefined): v is Layout =>
  LAYOUTS.some((l) => l === v);

const LAYOUT_ALIASES: Record<string, Layout> = {
  NUMBER: "BIG_NUMBER",
  TEXT: "BIG_WORD",
  WORD: "BIG_WORD",
  GIF: "GIF_REACTION",
  REACTION: "GIF_REACTION",
  IMAGE: "PHOTO",
  REVEAL: "REVEAL_3",
  LIST: "REVEAL_3",
  COMPARE: "VERSUS",
  FLOW: "PROCESS",
  STEPS: "PROCESS",
  TIMELINE: "PROCESS",
  CHECK: "CHECKLIST",
  TODO: "CHECKLIST",
  GRID: "ICON_GRID",
  TITLE: "TITLE_CARD",
  SECTION: "TITLE_CARD",
  STAT: "SPLIT_STAT",
};
/** Models drift on spelling and case; map what we can before falling back to plain text. */
const toLayout = (v: string | undefined): Layout | undefined => {
  const key = (v ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return isLayout(key) ? key : LAYOUT_ALIASES[key];
};

const MOOD_ALIASES: Record<string, Mood> = {
  informative: "serious",
  dark: "serious",
  neutral: "calm",
  excited: "hype",
  playful: "funny",
  humorous: "funny",
  dramatic: "chaos",
};
const isMood = (v: string | undefined): v is Mood => MOODS.some((m) => m === v);
const isMotif = (v: string | undefined): v is Motif => MOTIFS.some((m) => m === v);

/** Stable pick so the same headline always gets the same motif. */
const pickMotif = (seed: string): Motif => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MOTIFS[h % MOTIFS.length];
};

let counter = 0;
const nextId = (): string => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Enforces the presentation rules in code, not only in the prompt:
 * headline max 5 words, body max 12, three short items, source rule.
 */
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Models return fields in odd shapes ({value, unit} objects, numbers as strings): coerce, never discard the slide. */
function coerce(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return {};
  const r: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  // Models write null for "nothing here"; the schema wants the field left out.
  for (const key of Object.keys(r)) if (r[key] === null) delete r[key];
  const n = r.number;
  if (n && typeof n === "object") {
    const o = n as { value?: unknown; unit?: unknown };
    const value = typeof o.value === "number" ? compact.format(o.value) : String(o.value ?? "");
    r.number = `${value}${typeof o.unit === "string" && o.unit.length <= 4 ? ` ${o.unit}` : ""}`.trim();
  }
  for (const key of ["headline", "body", "gif_query", "image_query", "icon", "motif", "mood", "layout", "library_id", "metaphor", "scene"]) {
    if (r[key] !== undefined && typeof r[key] !== "string") r[key] = String(r[key]);
  }
  if (r.source !== undefined && r.source !== null && typeof r.source !== "string") r.source = null;
  for (const key of ["items", "versus", "alt_queries"]) {
    if (r[key] !== undefined && !Array.isArray(r[key])) delete r[key];
    else if (Array.isArray(r[key])) r[key] = (r[key] as unknown[]).map((x) => String(x));
  }
  return r;
}

/** One odd field must not cost the whole slide: drop what failed and keep the rest. */
function parseRaw(raw: unknown): z.infer<typeof RawSlide> {
  const candidate = coerce(raw) as Record<string, unknown>;
  const first = RawSlide.safeParse(candidate);
  if (first.success) return first.data;
  for (const issue of first.error.issues) delete candidate[String(issue.path[0])];
  const second = RawSlide.safeParse(candidate);
  return second.success ? second.data : {};
}

export function normalizeSlide(raw: unknown): Slide {
  const s = parseRaw(raw);
  let layout: Layout = toLayout(s.layout) ?? "BIG_WORD";
  const cleanItem = (i: string): string => clampWords(i.replace(/^\s*(?:one|two|three|four|five|first|second|third|\d)[\s,.:)-]+/i, ""), 5);
  const items = (s.items ?? []).slice(0, 5).map(cleanItem).filter(Boolean);
  const versus = (s.versus ?? []).slice(0, 2).map((i) => clampWords(i, 4));
  if (layout === "REVEAL_3" && items.length < 3) layout = "BIG_WORD";
  if (layout === "VERSUS" && versus.length < 2) layout = "BIG_WORD";
  if (layout === "PROCESS" && (items.length < 2 || items.length > 4)) layout = items.length >= 3 ? "REVEAL_3" : "BIG_WORD";
  if (layout === "CHECKLIST" && items.length < 2) layout = "BIG_WORD";
  if (layout === "ICON_GRID" && items.length < 3) layout = items.length === 3 ? "REVEAL_3" : "BIG_WORD";
  const icon = isIconName(s.icon) ? s.icon : null;
  const icons = items.slice(0, 4).map((_, i) => (isIconName(s.icons?.[i]) ? s.icons[i] : icon ?? "Star"));
  const chartValues = (s.chart?.values ?? []).slice(0, 5).filter((n) => Number.isFinite(n));
  const chart: ChartData | null =
    chartValues.length > 0
      ? {
          kind: s.chart?.kind === "bars" && chartValues.length > 1 ? "bars" : "ring",
          values: chartValues,
          labels: (s.chart?.labels ?? []).slice(0, 5).map((l) => clampWords(l, 2)),
          illustrative: Boolean(s.chart?.illustrative),
        }
      : null;
  if (layout === "CHART" && !chart) layout = "BIG_WORD";
  if (layout === "ICON" && !icon) layout = "BIG_WORD";
  const scene = isScene(s.scene?.toLowerCase()) ? (s.scene?.toLowerCase() as SceneName) : null;
  if (layout === "SCENE" && !scene) layout = "BIG_WORD";
  const ui = parseUiSpec(s.ui);
  if (layout === "UI_HERO" && !ui) layout = "BIG_WORD";
  if (layout === "SPLIT_STAT" && !(s.number !== undefined && String(s.number).trim())) layout = "BIG_WORD";
  const source = s.source && /^https?:\/\//.test(s.source) ? s.source : null;
  // Never trust the model's own claim flag: any digit in the text counts as a claim.
  const text = [s.headline, s.body, s.number, ...items, ...versus, ...chartValues].join(" ");
  const claims = Boolean(s.claims_fact) || /\d/.test(text);
  return {
    id: nextId(),
    layout,
    headline: clampWords(s.headline, layout === "QUOTE" ? 14 : VISUAL_LAYOUTS.includes(layout) ? 3 : 5) || (layout === "BIG_WORD" ? "Do it live" : ""),
    body: clampWords(s.body, 12),
    number: s.number === undefined ? "" : String(s.number).slice(0, 14),
    items,
    versus,
    mood: isMood(s.mood) ? s.mood : MOOD_ALIASES[(s.mood ?? "").toLowerCase()] ?? "hype",
    gifQuery: (s.gif_query ?? "").slice(0, 80),
    gif: s.gif ?? null,
    libraryId: s.library_id && /^[\w-]{1,40}$/.test(s.library_id) ? s.library_id : null,
    icon,
    scene,
    ui,
    icons,
    imageQuery: (s.image_query ?? "").slice(0, 80),
    imageAlts: (s.alt_queries ?? []).slice(0, 3).map((q) => q.slice(0, 80)),
    metaphor: (s.metaphor ?? "").slice(0, 200),
    image: null,
    credit: "",
    motif: isMotif(s.motif) ? s.motif : pickMotif(s.headline ?? ""),
    chart,
    style: { field: isMood(s.mood) ? s.mood : MOOD_ALIASES[(s.mood ?? "").toLowerCase()] ?? "hype", align: "left", photoSide: "right", bleed: false, text: "full", backdrop: "none" },
    source,
    vibe: claims && source === null,
    failed: Boolean(s.failed),
  };
}

export interface DirectorResult {
  action: "show" | "hold" | "fact_lookup";
  reason?: string;
  /** The picture the director wished the library had for this line. */
  wish?: string;
  /** Why this decision was made: classifier and judge scores, for the session log. */
  debug?: Record<string, unknown>;
  slide?: unknown;
  /** The line deserves a picture nobody has: the client asks the drawing model, with `slide` as the fallback. */
  draw?: boolean;
  ms?: number;
  model?: string;
  mock?: boolean;
}

export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
