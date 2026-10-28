"use client";

import { useEffect, useState } from "react";
import { SlideView } from "@/components/slide/slide-view";
import { artDirect } from "@/lib/art-director";
import { normalizeSlide, type ImageSource, type Slide, type VisualMode } from "@/lib/slide";
import { resolveVisuals } from "@/lib/visuals";

interface ReelEntry {
  t: number;
  text: string;
  mode?: VisualMode;
  source?: ImageSource;
  kind: "slide" | "hold" | "anchor" | "skip";
  note: string;
  slide?: unknown;
}

interface Step {
  text: string;
  note: string;
  /** Present when this line changes what the audience sees. */
  slide: Slide | null;
}

const STEP_MS = 3600;

/**
 * Hands-free playback of a recorded run: the audience renderer at full size, the spoken line as a
 * subtitle, looping. No clicks needed. `?f=reel-pitch` picks another run, `?ms=2500` changes pace.
 */
export default function DemoPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [ms, setMs] = useState(STEP_MS);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    const file = (params.get("f") ?? "reel").replace(/[^\w-]/g, "");
    const pace = Number(params.get("ms"));
    void (async () => {
      const entries = (await (await fetch(`/${file}.json`, { cache: "no-store" })).json()) as ReelEntry[];
      const shown: Slide[] = [];
      const built: Step[] = [];
      for (const e of entries) {
        if (e.kind !== "slide" || !e.slide) {
          built.push({ text: e.text, note: e.kind === "hold" ? "Bill holds back" : "", slide: null });
          continue;
        }
        const slide = normalizeSlide(e.slide);
        await resolveVisuals(slide, e.mode ?? "balanced", e.source ?? "library");
        const directed = artDirect(slide, shown.slice(-3), e.mode ?? "balanced");
        shown.push(directed);
        built.push({ text: e.text, note: e.note.split("  ")[0], slide: directed });
      }
      if (alive) {
        if (pace >= 800) setMs(pace);
        setSteps(built);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (steps.length === 0) return;
    const id = setInterval(() => setI((n) => (n + 1) % steps.length), ms);
    return () => clearInterval(id);
  }, [steps.length, ms]);

  if (steps.length === 0) return <p className="p-6 text-muted-foreground">Loading demo...</p>;

  const current = steps[i];
  const onAir = [...steps.slice(0, i + 1)].reverse().find((s) => s.slide)?.slide ?? null;

  return (
    <main className="grid min-h-screen place-items-center gap-3 bg-black p-3">
      <div className="w-full" style={{ maxWidth: "min(100vw - 24px, (100vh - 150px) * 16 / 9)" }}>
        <div className="overflow-hidden rounded-xl">
          <SlideView slide={onAir} />
        </div>
        <p className="mt-4 text-center text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">&ldquo;{current.text}&rdquo;</p>
        <p className="mt-1 text-center text-sm text-white/50">
          {i + 1} / {steps.length}
          {current.note ? ` · ${current.note}` : ""}
        </p>
        <div className="mx-auto mt-3 h-1 max-w-md overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-white/70 transition-all duration-500" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
    </main>
  );
}
