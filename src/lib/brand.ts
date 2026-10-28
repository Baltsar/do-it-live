// Server-only: reads a brand's look straight from its website (colours, logo, typeface feel).
import { distance, hexToRgb, luminance, saturation, toHex, type FontKey, type Rgb } from "@/lib/theme";

export interface BrandResult {
  name: string;
  /** Brand colours, most characteristic first, then a dark and a light if the site has them. */
  palette: string[];
  /** Logo as a data URL, or null when none could be fetched. */
  logo: string | null;
  fontGuess: FontKey | null;
  fonts: string[];
}

const UA = "Mozilla/5.0 (compatible; doitlive-brand/0.1; reads public brand colours)";
const MAX_HTML = 1_500_000;
const MAX_CSS = 700_000;
const MAX_LOGO = 400_000;

/** Only public web pages: a URL field must never become a way to reach the local network. */
function assertPublic(raw: string): URL {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("That does not look like a web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https addresses work.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host === "::1" || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe80:/.test(host) || !host.includes(".");
  if (privateHost) throw new Error("That address is not a public website.");
  return url;
}

async function fetchText(url: URL, limit: number): Promise<{ text: string; finalUrl: URL }> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,text/css,*/*" }, signal: AbortSignal.timeout(7000) });
  // A redirect may land somewhere else: check where we ended up before reading it.
  const finalUrl = assertPublic(res.url || url.href);
  if (!res.ok) throw new Error(`The site answered ${res.status}.`);
  const text = (await res.text()).slice(0, limit);
  return { text, finalUrl };
}

const attr = (tag: string, name: string): string | null => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? null;

const BRAND_VAR = /--[\w-]*(brand|primary|accent|main|theme|highlight|cta)[\w-]*\s*:\s*([^;}{]+)/gi;
const HEX8 = /#([0-9a-f]{6})[0-9a-f]{2}\b/gi;
const HEX = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RGB = /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi;

function colorsIn(text: string): string[] {
  const out: string[] = [];
  const plain = text.replace(HEX8, (_m, six: string) => `#${six}`);
  for (const m of plain.matchAll(HEX)) out.push(toHex(hexToRgb(m[0])));
  for (const m of plain.matchAll(RGB)) {
    const rgb = [m[1], m[2], m[3]].map(Number) as Rgb;
    if (rgb.every((c) => c <= 255)) out.push(toHex(rgb));
  }
  return out;
}

const FONT_HINTS: [RegExp, FontKey][] = [
  [/anton|bebas|oswald|impact|league gothic|condensed|compressed/i, "anton"],
  [/fraunces|playfair|merriweather|georgia|garamond|lora|times|serif(?!-)|tiempos|canela|recoleta/i, "fraunces"],
  [/space grotesk|mono|ibm plex|jetbrains|roboto mono|geist/i, "space"],
  [/bricolage|poppins|nunito|quicksand|rubik|dm sans|manrope|circular|gilroy/i, "bricolage"],
  [/archivo|inter|helvetica|arial|roboto|montserrat|sohne|söhne|akkurat|grotesk|neue/i, "archivo"],
];

export async function readBrand(rawUrl: string): Promise<BrandResult> {
  const { text: html, finalUrl: page } = await fetchText(assertPublic(rawUrl.trim()), MAX_HTML);

  // Stylesheets carry most of the brand: read the first few, same public-only rule.
  const sheets = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag))
    .map((tag) => attr(tag, "href"))
    .filter((href): href is string => Boolean(href))
    .slice(0, 4);
  const css = (
    await Promise.all(
      sheets.map(async (href) => {
        try {
          return (await fetchText(assertPublic(new URL(href, page).href), MAX_CSS)).text;
        } catch {
          return "";
        }
      }),
    )
  ).join("\n");

  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const attrs = [...html.matchAll(/\b(?:style|fill|stroke|color|bgcolor)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).join("\n");
  const all = `${css}\n${inline}`;

  const score = new Map<string, number>();
  const add = (hex: string, points: number): void => void score.set(hex, (score.get(hex) ?? 0) + points);
  for (const hex of colorsIn(all)) add(hex, 1);
  for (const hex of colorsIn(attrs)) add(hex, 2);
  // Colours a site names as its brand count far more than a stray border colour.
  for (const m of all.matchAll(BRAND_VAR)) for (const hex of colorsIn(m[2])) add(hex, 25);
  const themeColor = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((tag) => /name\s*=\s*["']theme-color["']/i.test(tag));
  for (const hex of colorsIn(themeColor ? attr(themeColor, "content") ?? "" : "")) add(hex, 40);

  // Merge near-identical shades so one brand colour is not split across ten hover states.
  const merged: { hex: string; points: number }[] = [];
  for (const [hex, points] of [...score.entries()].sort((a, b) => b[1] - a[1])) {
    const near = merged.find((m) => distance(m.hex, hex) < 30);
    if (near) near.points += points;
    else merged.push({ hex, points });
  }
  merged.sort((a, b) => b.points - a.points);

  const vivid = merged.filter((c) => saturation(c.hex) > 0.3 && luminance(c.hex) > 0.04 && luminance(c.hex) < 0.9).slice(0, 4);
  if (vivid.length === 0) throw new Error("Found no brand colours on that page. Drop a screenshot of the style guide instead.");
  const dark = merged.find((c) => luminance(c.hex) < 0.08);
  const light = merged.find((c) => luminance(c.hex) > 0.85);
  const palette = [...vivid, dark, light].filter((c): c is { hex: string; points: number } => Boolean(c)).map((c) => c.hex);

  const families = [...all.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].map((m) => m[1].split(",")[0].replace(/["']/g, "").trim()).filter((f) => f && !/^(inherit|var\(|initial|unset|system-ui|-apple-system)/i.test(f));
  const counts = new Map<string, number>();
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1);
  const fonts = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f]) => f);
  const fontGuess = fonts.map((f) => FONT_HINTS.find(([re]) => re.test(f))?.[1]).find(Boolean) ?? null;

  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const siteName = metas.find((t) => /property\s*=\s*["']og:site_name["']/i.test(t));
  const title = html.match(/<title[^>]*>([^<]{1,80})/i)?.[1]?.trim();
  const name = (siteName ? attr(siteName, "content") : null) ?? title?.split(/[|\-–·:]/)[0].trim() ?? page.hostname.replace(/^www\./, "");

  return { name: name.slice(0, 60), palette, logo: await findLogo(html, page), fontGuess, fonts };
}

async function findLogo(html: string, page: URL): Promise<string | null> {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => /rel\s*=\s*["'][^"']*icon/i.test(tag));
  const rank = (tag: string): number => {
    if (/image\/svg/i.test(tag) || /\.svg/i.test(attr(tag, "href") ?? "")) return 1000; // vector: sharp at any size
    const size = Number.parseInt(attr(tag, "sizes")?.split("x")[0] ?? "0", 10) || 0;
    return size + (/apple-touch-icon/i.test(tag) ? 150 : 0);
  };
  const candidates = [...links.sort((a, b) => rank(b) - rank(a)).map((tag) => attr(tag, "href")), "/favicon.ico"].filter((h): h is string => Boolean(h));
  for (const href of candidates.slice(0, 4)) {
    try {
      const url = assertPublic(new URL(href, page).href);
      const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(5000) });
      assertPublic(res.url || url.href);
      const type = res.headers.get("content-type")?.split(";")[0] ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_LOGO) continue;
      return `data:${type};base64,${bytes.toString("base64")}`;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}
