// A speaker's own style guide: colour fields, typeface and logo for every slide.
// Framework-free; the React binding lives in hooks/use-theme.ts.
import type { CSSProperties } from "react";
import { MOODS, type Mood } from "@/lib/slide";

// weight and tracking are per typeface: a face without a black cut must not be faked bold,
// and condensed faces need air that a wide grotesque does not.
export const FONTS = {
  archivo: { label: "Archivo", css: "var(--font-archivo)", note: "Wide, loud grotesque", weight: 900, tracking: "-0.035em" },
  bricolage: { label: "Bricolage Grotesque", css: "var(--font-bricolage)", note: "Friendly, a bit quirky", weight: 800, tracking: "-0.03em" },
  anton: { label: "Anton", css: "var(--font-anton)", note: "Tall condensed poster type", weight: 400, tracking: "0.005em" },
  fraunces: { label: "Fraunces", css: "var(--font-fraunces)", note: "Soft editorial serif", weight: 900, tracking: "-0.025em" },
  space: { label: "Space Grotesk", css: "var(--font-space)", note: "Clean and technical", weight: 700, tracking: "-0.035em" },
} as const;
export type FontKey = keyof typeof FONTS;
export const isFontKey = (v: unknown): v is FontKey => typeof v === "string" && v in FONTS;

export interface FieldColors {
  /** The colour field itself. */
  bg: string;
  /** Type and main shapes. */
  fg: string;
  /** Accent: motifs, highlights, the odd one out. */
  alt: string;
}

export interface Theme {
  name: string;
  fields: Record<Mood, FieldColors>;
  font: FontKey;
  /** Data URL of a logo shown small in a corner, or null. */
  logo: string | null;
}

export const DEFAULT_THEME: Theme = {
  name: "Do it live",
  fields: {
    hype: { bg: "#2b3bff", fg: "#ffd60a", alt: "#ff4fa3" },
    funny: { bg: "#ffd60a", fg: "#0a0a0a", alt: "#2b3bff" },
    calm: { bg: "#8cf5c9", fg: "#0a0a0a", alt: "#2b3bff" },
    serious: { bg: "#0a0a0a", fg: "#8cf5c9", alt: "#ffd60a" },
    chaos: { bg: "#ff4fa3", fg: "#0a0a0a", alt: "#ffd60a" },
  },
  font: "archivo",
  logo: null,
};

const INK = "#0a0a0a";
const PAPER = "#ffffff";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export const toHex = ([r, g, b]: Rgb): string => `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. Type on a projector wants 4.5 or more. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const saturation = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

export const distance = (a: string, b: string): number => {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

const mix = (a: string, b: string, amount: number): string => {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
};

/** Every #rgb or #rrggbb in a pasted brand guide, in order, without repeats. */
export function parseHexes(text: string): string[] {
  const found = text.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) ?? [];
  const normal = found.map((h) => toHex(hexToRgb(h)));
  return normal.filter((h, i) => normal.indexOf(h) === i).slice(0, 8);
}

/**
 * Dominant colours of an image (RGBA pixel data), most used first. Coarse bins find the
 * clusters, the average inside each bin gives the exact brand colour.
 */
export function extractPalette(pixels: Uint8ClampedArray, max = 6): string[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue; // transparent: not a brand colour
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
    total += 1;
  }
  const ranked = [...bins.values()]
    .filter((bin) => bin.n / Math.max(total, 1) > 0.004)
    .sort((a, b) => b.n - a.n)
    .map((bin) => toHex([bin.r / bin.n, bin.g / bin.n, bin.b / bin.n]));
  const picked: string[] = [];
  for (const hex of ranked) {
    // Anti-aliasing and JPEG noise make many near-duplicates: keep one per visible colour.
    if (picked.every((p) => distance(p, hex) > 48)) picked.push(hex);
    if (picked.length === max) break;
  }
  return picked;
}

/**
 * Builds the five colour fields from a brand palette. Vivid brand colours become fields; each
 * field then gets the type colour with the best contrast and a distinct accent.
 */
export function themeFromPalette(palette: string[], base: Theme = DEFAULT_THEME): Theme {
  const colors = palette.map((h) => toHex(hexToRgb(h))).filter((h, i, all) => all.indexOf(h) === i);
  if (colors.length === 0) return base;

  const vivid = colors.filter((c) => saturation(c) > 0.35 && luminance(c) > 0.03 && luminance(c) < 0.9);
  const darkest = [...colors].sort((a, b) => luminance(a) - luminance(b))[0];
  const lightest = [...colors].sort((a, b) => luminance(b) - luminance(a))[0];
  const primary = vivid[0] ?? colors[0];
  const dark = luminance(darkest) < 0.1 ? darkest : INK;
  const light = luminance(lightest) > 0.7 ? lightest : mix(primary, PAPER, 0.86);
  const secondary = vivid[1] ?? mix(primary, dark, 0.45);
  const accent = vivid[2] ?? vivid[1] ?? mix(primary, PAPER, 0.5);

  const pool = [...new Set([...vivid, light, dark, PAPER, INK])];
  const field = (bg: string): FieldColors => {
    // Prefer a brand colour for type when it is readable; otherwise the strongest neutral.
    const readable = pool.filter((c) => c !== bg && contrast(c, bg) >= 4.5);
    const brandType = readable.find((c) => vivid.includes(c));
    const fg = brandType ?? [...pool].filter((c) => c !== bg).sort((a, b) => contrast(b, bg) - contrast(a, bg))[0];
    const alt =
      pool.find((c) => c !== bg && c !== fg && contrast(c, bg) >= 2.2 && distance(c, fg) > 90) ??
      [PAPER, INK].sort((a, b) => contrast(b, bg) - contrast(a, bg)).find((c) => c !== fg) ??
      mix(fg, bg, 0.5);
    return { bg, fg, alt };
  };

  // Five fields must look like five fields: when the brand has fewer colours, derive tints and shades.
  const chosen: string[] = [];
  const pick = (...options: string[]): string => {
    const free = options.find((o) => chosen.every((c) => distance(c, o) > 60)) ?? options[options.length - 1];
    chosen.push(free);
    return free;
  };
  const hype = pick(primary);
  const serious = pick(dark, mix(primary, INK, 0.75));
  const calm = pick(light, mix(primary, PAPER, 0.86), mix(secondary, PAPER, 0.86));
  const chaos = pick(secondary, mix(primary, dark, 0.45), mix(primary, PAPER, 0.4));
  const funny = pick(accent, mix(secondary, PAPER, 0.5), mix(primary, PAPER, 0.55), mix(secondary, dark, 0.4), mix(primary, PAPER, 0.3));

  return {
    ...base,
    name: "My style guide",
    fields: { hype: field(hype), funny: field(funny), calm: field(calm), serious: field(serious), chaos: field(chaos) },
  };
}

/** CSS custom properties for a slide frame. The stylesheet falls back to the default theme without them. */
export function themeVars(theme: Theme): CSSProperties {
  const font = FONTS[theme.font];
  const vars: Record<string, string> = { "--slide-font": font.css, "--slide-weight": String(font.weight), "--slide-tracking": font.tracking };
  for (const mood of MOODS) {
    const f = theme.fields[mood];
    vars[`--${mood}-bg`] = f.bg;
    vars[`--${mood}-fg`] = f.fg;
    vars[`--${mood}-alt`] = f.alt;
  }
  return vars as CSSProperties;
}

export const THEME_KEY = "doitlive.theme";
const HEX = /^#[0-9a-f]{6}$/i;

/** Accepts only a complete, well-formed theme: anything else in storage falls back to the default. */
export function parseTheme(raw: string | null): Theme {
  if (!raw) return DEFAULT_THEME;
  try {
    const t = JSON.parse(raw) as Partial<Theme>;
    const fields = {} as Record<Mood, FieldColors>;
    for (const mood of MOODS) {
      const f = t.fields?.[mood];
      if (!f || !HEX.test(f.bg) || !HEX.test(f.fg) || !HEX.test(f.alt)) return DEFAULT_THEME;
      fields[mood] = { bg: f.bg, fg: f.fg, alt: f.alt };
    }
    return {
      name: typeof t.name === "string" ? t.name.slice(0, 60) : "My style guide",
      fields,
      font: isFontKey(t.font) ? t.font : "archivo",
      logo: typeof t.logo === "string" && t.logo.startsWith("data:image/") ? t.logo : null,
    };
  } catch {
    return DEFAULT_THEME;
  }
}
