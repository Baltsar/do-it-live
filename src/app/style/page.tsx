"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { SlideView } from "@/components/slide/slide-view";
import { useTheme } from "@/hooks/use-theme";
import { loadSettings, saveSettings } from "@/lib/settings";
import { MOODS, normalizeSlide, type Mood, type Slide, type VisualMode } from "@/lib/slide";
import { contrast, DEFAULT_THEME, extractPalette, FONTS, isFontKey, parseHexes, themeFromPalette, type FieldColors, type FontKey, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// One sample per colour field, covering type, charts and scenes.
const SAMPLES: Slide[] = [
  { layout: "SCENE", scene: "surge", headline: "growth", mood: "hype" },
  { layout: "BIG_NUMBER", number: "80%", headline: "shipped with AI", mood: "funny" },
  { layout: "SCENE", scene: "swarm", headline: "community", mood: "calm" },
  { layout: "VERSUS", versus: ["Clicker", "Voice"], headline: "duel", mood: "serious" },
].map((raw) => normalizeSlide(raw));

const FIELD_LABEL: Record<Mood, string> = { hype: "Energy", funny: "Playful", calm: "Calm", serious: "Serious", chaos: "Bold" };
const PART_LABEL: Record<keyof FieldColors, string> = { bg: "Field", fg: "Type", alt: "Accent" };
const WORDS: { value: VisualMode; label: string; note: string }[] = [
  { value: "pure", label: "None", note: "Pictures and motion only. Numbers you say still show." },
  { value: "minimal", label: "A few", note: "A one or two word label, plus lists and duels." },
  { value: "balanced", label: "All", note: "Every template, with headlines." },
];

interface BrandResponse {
  name?: string;
  palette?: string[];
  logo?: string | null;
  fontGuess?: string | null;
  error?: string;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

function drawTo(img: HTMLImageElement, maxWidth: number): HTMLCanvasElement {
  const width = img.naturalWidth || 256;
  const height = img.naturalHeight || 256;
  const scale = Math.min(1, maxWidth / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Any logo (svg, ico, png) as a small PNG that fits in browser storage. */
async function toLogo(src: string): Promise<string | null> {
  try {
    return drawTo(await loadImage(src), 480).toDataURL("image/png");
  } catch {
    return null;
  }
}

const pill = "rounded-full px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60";

export default function LookPage() {
  const [theme, setTheme] = useTheme();
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [words, setWords] = useState<VisualMode>("pure");
  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setWords(loadSettings().visualMode), 0);
    return () => clearTimeout(id);
  }, []);

  const update = (patch: Partial<Theme>): void => setTheme({ ...theme, ...patch });

  const fromSite = async (): Promise<void> => {
    const url = address.trim();
    if (!url) return;
    setError("");
    setBusy(`Reading ${url.replace(/^https?:\/\//, "").split("/")[0]}`);
    try {
      const brand = (await (await fetch(`/api/brand?url=${encodeURIComponent(url)}`)).json()) as BrandResponse;
      if (brand.error || !brand.palette?.length) {
        setError(brand.error ?? "Found no brand colours there. Drop a screenshot instead.");
        return;
      }
      const next = themeFromPalette(brand.palette, theme);
      setTheme({
        ...next,
        name: brand.name ?? next.name,
        font: isFontKey(brand.fontGuess) ? brand.fontGuess : theme.font,
        logo: (brand.logo ? await toLogo(brand.logo) : null) ?? theme.logo,
      });
    } catch {
      setError("Could not reach that site. Check the address, or drop a screenshot instead.");
    } finally {
      setBusy("");
    }
  };

  const fromImage = async (file: File | undefined): Promise<void> => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Screenshot the colour page of your style guide and drop that.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const canvas = drawTo(await loadImage(url), 220);
      const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
      const palette = pixels ? extractPalette(pixels) : [];
      if (palette.length === 0) {
        setError("No colours found in that image.");
        return;
      }
      setTheme({ ...themeFromPalette(palette, theme), font: theme.font, logo: theme.logo });
    } catch {
      setError("Could not read that image. Try a PNG or JPG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const fromLogo = async (file: File | undefined): Promise<void> => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const logo = await toLogo(url);
    URL.revokeObjectURL(url);
    if (logo) update({ logo });
    else setError("Could not read that logo. Try a PNG with a transparent background.");
  };

  const setPart = (mood: Mood, part: keyof FieldColors, value: string): void =>
    update({ fields: { ...theme.fields, [mood]: { ...theme.fields[mood], [part]: value } } });

  const brandColors = [...new Set(MOODS.map((m) => theme.fields[m].bg))];
  const custom = JSON.stringify(theme) !== JSON.stringify(DEFAULT_THEME);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center gap-2 px-5 py-4">
        <Link href="/" className="text-lg font-black tracking-tight outline-none [font-stretch:125%] focus-visible:underline">
          Do it live
        </Link>
        <Link href="/" className={cn(pill, "ml-auto text-white/70 hover:bg-white/10 hover:text-white")}>
          Done
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-5 pb-16">
        <section
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void fromImage(e.dataTransfer.files[0]); }}
          className={cn("rounded-3xl p-1 transition-colors", drag && "bg-[#ffd60a]/20")}
        >
          <h1 className="text-[clamp(56px,11vw,150px)] font-black leading-[0.85] tracking-[-0.05em] [font-stretch:125%]">Your look.</h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void fromSite()}
              placeholder="yourcompany.com"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Your website"
              className="h-16 min-w-0 flex-1 rounded-2xl border-2 border-white/20 bg-transparent px-5 text-2xl font-bold outline-none placeholder:text-white/30 focus:border-[#ffd60a]"
            />
            <button type="button" onClick={() => void fromSite()} disabled={!address.trim() || Boolean(busy)} className="h-16 rounded-2xl bg-[#ffd60a] px-7 text-xl font-black text-black outline-none transition-transform enabled:hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-white/70 disabled:opacity-40">
              {busy ? "Reading" : "Get my look"}
            </button>
          </div>
          <p className="mt-3 text-sm text-white/50">
            {busy || "Paste your website and we read the colours, logo and type. Or drop your style guide here, or "}
            {busy ? null : (
              <button type="button" className="font-semibold text-white underline underline-offset-4 outline-none hover:text-[#ffd60a] focus-visible:ring-2 focus-visible:ring-white/60" onClick={() => fileInput.current?.click()}>
                choose an image
              </button>
            )}
            {busy ? null : "."}
          </p>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { void fromImage(e.target.files?.[0]); e.target.value = ""; }} />
          {error ? <p className="mt-3 text-sm font-semibold text-[#ff4fa3]">{error}</p> : null}
          {custom ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/60">
              <span className="font-semibold text-white">{theme.name}</span>
              {brandColors.map((hex) => (
                <span key={hex} className="size-6 rounded-full border border-white/25" style={{ background: hex }} title={hex} />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element -- the speaker's own logo as a data URL */}
              {theme.logo ? <img src={theme.logo} alt="Your logo" className="h-6 max-w-24 object-contain" /> : null}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {SAMPLES.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-2xl">
              <SlideView slide={s} still />
            </div>
          ))}
        </section>

        <section className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-black tracking-tight">Typeface</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FONTS) as FontKey[]).map((key) => (
                <button key={key} type="button" onClick={() => update({ font: key })} aria-pressed={theme.font === key} style={{ fontFamily: FONTS[key].css }} className={cn(pill, "text-base", theme.font === key ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}>
                  {FONTS[key].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-black tracking-tight">Words on screen</h2>
            <div className="flex flex-wrap gap-2">
              {WORDS.map((w) => (
                <button key={w.value} type="button" onClick={() => { setWords(w.value); saveSettings({ visualMode: w.value }); }} aria-pressed={words === w.value} className={cn(pill, "text-base", words === w.value ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}>
                  {w.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-white/50">{WORDS.find((w) => w.value === words)?.note}</p>
          </div>
        </section>

        <details className="rounded-2xl border border-white/15 px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-white/70 outline-none focus-visible:underline">Fine-tune colours and logo</summary>
          <div className="mt-5 space-y-5">
            <div className="space-y-3">
              {MOODS.map((mood) => {
                const f = theme.fields[mood];
                const ratio = contrast(f.fg, f.bg);
                return (
                  <div key={mood} className="flex flex-wrap items-center gap-3">
                    <span className="w-16 text-sm font-semibold">{FIELD_LABEL[mood]}</span>
                    {(Object.keys(PART_LABEL) as (keyof FieldColors)[]).map((part) => (
                      <label key={part} className="flex items-center gap-1.5 text-xs text-white/60">
                        <input type="color" value={f[part]} onChange={(e) => setPart(mood, part, e.target.value)} className="size-8 cursor-pointer rounded border border-white/20 bg-transparent" />
                        {PART_LABEL[part]}
                      </label>
                    ))}
                    {ratio < 4.5 ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#ffd60a]">
                        <TriangleAlert className="size-3.5" /> Type is hard to read ({ratio.toFixed(1)}:1)
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <input
              placeholder="Paste colour codes: #0B5FFF #FFD400 #111111"
              aria-label="Colour codes"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const codes = parseHexes(e.currentTarget.value);
                if (codes.length === 0) setError("No colour codes found. Paste codes like #2B3BFF.");
                else setTheme({ ...themeFromPalette(codes, theme), font: theme.font, logo: theme.logo });
              }}
              className="h-10 w-full rounded-xl border border-white/20 bg-transparent px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/60"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={cn(pill, "bg-white/10 hover:bg-white/20")} onClick={() => logoInput.current?.click()}>
                {theme.logo ? "Replace logo" : "Add logo"}
              </button>
              {theme.logo ? (
                <button type="button" className={cn(pill, "text-white/70 hover:bg-white/10")} onClick={() => update({ logo: null })}>
                  Remove logo
                </button>
              ) : null}
              <button type="button" disabled={!custom} className={cn(pill, "ml-auto text-white/70 enabled:hover:bg-white/10 disabled:opacity-30")} onClick={() => setTheme(null)}>
                Reset to default
              </button>
              <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { void fromLogo(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>
        </details>
      </main>
    </div>
  );
}
