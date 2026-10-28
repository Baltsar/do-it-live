"use client";

import { useEffect, useState } from "react";
import { SlideView } from "@/components/slide/slide-view";
import { artDirect, auditSequence } from "@/lib/art-director";
import { normalizeSlide, type Slide } from "@/lib/slide";
import { resolveVisuals } from "@/lib/visuals";

// Template reel: every layout with sample content, art directed in order. Not part of the show.
const RAW = [
  { layout: "TITLE_CARD", headline: "Why we ship", body: "Part one", mood: "hype", motif: "rings" },
  { layout: "PHOTO", headline: "Taco bar", image_query: "taco bar", mood: "funny" },
  { layout: "PHOTO", headline: "Concert crowd", image_query: "concert crowd", mood: "serious" },
  { layout: "SPLIT_STAT", number: "80%", headline: "shipped with an agent", icon: "Bot", mood: "calm" },
  { layout: "PROCESS", headline: "How it works", items: ["Talk", "Bill listens", "Slide appears"], mood: "hype" },
  { layout: "CHECKLIST", headline: "What you get", items: ["No clicker", "No slides to build", "No stage fright", "Pure improv"], mood: "funny" },
  { layout: "ICON_GRID", headline: "Four tools", items: ["Voice", "Photos", "GIFs", "Charts"], icons: ["Mic", "Camera", "Film", "ChartPie"], mood: "chaos" },
  { layout: "CHART", headline: "never read it", chart: { kind: "ring", values: [74] }, mood: "calm", source: "https://example.org/study" },
  { layout: "CHART", headline: "Cost per year", chart: { kind: "bars", values: [3, 5, 9, 14], labels: ["2023", "2024", "2025", "2026"] }, mood: "serious", source: "https://example.org/data" },
  { layout: "VERSUS", versus: ["Clicker", "Voice"], headline: "Duel", mood: "hype" },
  { layout: "REVEAL_3", headline: "Three rules", items: ["We ship", "We share", "We never wait for permission"], mood: "funny" },
  { layout: "ICON", headline: "Rocket speed", icon: "Rocket", mood: "chaos" },
  { layout: "BIG_NUMBER", number: "10.6M", headline: "people in Sweden", mood: "serious", source: "https://www.scb.se" },
  { layout: "QUOTE", headline: "The best slide is the one you never notice.", body: "Someone smart", mood: "calm" },
  { layout: "BIG_WORD", headline: "Ship it.", body: "Then tell people.", mood: "hype" },
  { layout: "BIG_WORD", headline: "Supercalifragilisticexpialidocious", mood: "funny" },
];

export default function PreviewPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const directed: Slide[] = [];
      for (const raw of RAW) {
        const slide = normalizeSlide(raw);
        await resolveVisuals(slide);
        directed.push(artDirect(slide, directed.slice(-3)));
      }
      if (alive) {
        setSlides(directed);
        setIssues(auditSequence(directed));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="space-y-4 p-6">
      <p className="text-sm text-muted-foreground">{issues.length === 0 ? "Sequence audit: no repeats." : issues.join(" | ")}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {slides.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <SlideView slide={s} still />
          </div>
        ))}
      </div>
    </main>
  );
}
