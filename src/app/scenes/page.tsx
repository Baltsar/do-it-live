"use client";

import { SlideView } from "@/components/slide/slide-view";
import { artDirect } from "@/lib/art-director";
import { SCENE_CATALOG, SCENES } from "@/lib/scene-catalog";
import { MOODS, normalizeSlide, type Slide } from "@/lib/slide";

// Every scene, live. Each is art directed against the one before so the colour fields differ.
const slides: Slide[] = [];
SCENES.forEach((scene, i) => {
  slides.push(artDirect(normalizeSlide({ layout: "SCENE", scene, headline: scene, mood: MOODS[i % MOODS.length] }), slides.slice(-3), "pure"));
});

export default function ScenesPage() {
  return (
    <main className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {slides.map((s) => (
        <figure key={s.id} className="space-y-2">
          <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <SlideView slide={s} />
          </div>
          <figcaption className="text-sm">
            <span className="font-semibold">{s.scene}</span>
            <span className="block text-muted-foreground">{s.scene ? SCENE_CATALOG[s.scene].shows : ""}</span>
          </figcaption>
        </figure>
      ))}
    </main>
  );
}
