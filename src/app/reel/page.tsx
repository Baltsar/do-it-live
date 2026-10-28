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

interface Card extends ReelEntry {
  resolved?: Slide;
}

/** Review sheet: every line of a test script next to the slide the director chose for it. */
export default function ReelPage() {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const file = new URLSearchParams(window.location.search).get("f") ?? "reel";
      const entries = (await (await fetch(`/${file.replace(/[^\w-]/g, "")}.json`, { cache: "no-store" })).json()) as ReelEntry[];
      const shown: Slide[] = [];
      const resolved: Card[] = [];
      for (const e of entries) {
        if (e.kind !== "slide" || !e.slide) {
          resolved.push(e);
          continue;
        }
        const slide = normalizeSlide(e.slide);
        await resolveVisuals(slide, e.mode ?? "balanced", e.source ?? "library");
        const directed = artDirect(slide, shown.slice(-3), e.mode ?? "balanced");
        shown.push(directed);
        resolved.push({ ...e, resolved: directed });
      }
      if (alive) setCards(resolved);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!cards) return <p className="p-6 text-muted-foreground">Loading reel...</p>;

  return (
    <main className="mx-auto max-w-[1500px] space-y-4 p-4 lg:p-6">
      <h1 className="text-2xl font-black tracking-tight [font-stretch:125%]">Reel review</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <figure key={`${c.t}-${c.text}`} className="space-y-2">
            <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
              {c.resolved ? (
                <SlideView slide={c.resolved} still />
              ) : (
                <div className="grid aspect-video place-items-center bg-card text-sm text-muted-foreground">
                  {c.kind === "hold" ? "Held back" : c.kind === "skip" ? "Skipped: repeat" : "Anchor slide"}
                </div>
              )}
            </div>
            <figcaption className="text-sm">
              <span className="text-muted-foreground">{Math.round(c.t)} s </span>
              {c.text}
              {c.note ? <span className="block text-xs text-muted-foreground">{c.note}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
