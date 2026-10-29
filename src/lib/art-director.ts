import { BACKDROPS, MOTIFS, type BackdropName, type Mood, type Slide, type SlideStyle, type TextMode, type VisualMode } from "@/lib/slide";

// Preferred colour fields per mood, best first. A neighbour in the list stands in when the
// previous slide already used the best one, so the audience always sees the field change.
const FIELD_ORDER: Record<Mood, Mood[]> = {
  hype: ["hype", "chaos", "calm"],
  funny: ["funny", "calm", "chaos"],
  calm: ["calm", "funny", "hype"],
  serious: ["serious", "hype", "calm"],
  chaos: ["chaos", "funny", "hype"],
};

const hash = (seed: string): number => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

const TEXT_LAYOUTS: readonly Slide["layout"][] = ["BIG_WORD", "QUOTE", "TITLE_CARD", "BIG_NUMBER", "QUESTION", "WORDS", "DELTA", "PICTOGRAM"];

/**
 * The art director. Takes a slide as the director made it and decides how it looks next to the
 * slides before it: colour field, alignment, photo side, motif. Pure and deterministic.
 */
// Layouts with room behind them. Photos, GIFs and dense lists stay clean.
const BACKDROP_LAYOUTS: readonly Slide["layout"][] = ["SCENE", "ICON", "BIG_NUMBER", "BIG_WORD", "TITLE_CARD", "DELTA", "PICTOGRAM", "QUESTION"];
// Pairs that fight: rings behind rings, a dot grid behind a dot grid.
const CLASHES: Partial<Record<BackdropName, readonly string[]>> = {
  ripple: ["echo", "orbit", "lock", "swarm", "focus", "loop"],
  flicker: ["spark", "outlier", "focus", "scatter"],
  gridpulse: ["spark", "outlier", "focus", "stack", "climb"],
  particles: ["scatter", "swarm", "spark"],
  depth: ["scatter", "swarm", "spark", "focus"],
  retro: ["wave", "climb", "launch"],
};

function pickBackdrop(slide: Slide, previous: readonly Slide[]): SlideStyle["backdrop"] {
  if (!BACKDROP_LAYOUTS.includes(slide.layout)) return "none";
  const recent = previous.slice(-2).map((p) => p.style.backdrop);
  const start = hash(`${slide.headline}${slide.scene ?? ""}`) % BACKDROPS.length;
  for (let i = 0; i < BACKDROPS.length; i += 1) {
    const candidate = BACKDROPS[(start + i) % BACKDROPS.length];
    if (recent.includes(candidate)) continue;
    if (slide.scene && CLASHES[candidate]?.includes(slide.scene)) continue;
    return candidate;
  }
  return "none";
}

const TEXT_FOR_MODE: Record<VisualMode, TextMode> = { pure: "none", minimal: "label", balanced: "full" };

export function artDirect(slide: Slide, previous: readonly Slide[], mode: VisualMode = "balanced"): Slide {
  const last = previous.at(-1);
  const beforeLast = previous.at(-2);

  const candidates = FIELD_ORDER[slide.mood];
  const field =
    candidates.find((f) => f !== last?.style.field && f !== beforeLast?.style.field) ??
    candidates.find((f) => f !== last?.style.field) ??
    candidates[0];

  const lastAlign = [...previous].reverse().find((p) => TEXT_LAYOUTS.includes(p.layout) || p.layout === "GIF_REACTION")?.style.align;
  const align: SlideStyle["align"] = lastAlign === "left" ? "center" : "left";

  const lastPhoto = [...previous].reverse().find((p) => p.layout === "PHOTO");
  const photoSide: SlideStyle["photoSide"] = lastPhoto?.style.photoSide === "right" ? "left" : "right";
  // Every second photo goes full bleed, so photos never look like the same template twice.
  // Image-first modes always run photos edge to edge: nothing competes with the picture.
  const bleed = mode !== "balanced" || (lastPhoto ? !lastPhoto.style.bleed : hash(slide.headline) % 3 === 0);

  const motif = slide.motif === last?.motif ? MOTIFS[(MOTIFS.indexOf(slide.motif) + 1 + (hash(slide.headline) % 3)) % MOTIFS.length] : slide.motif;

  return { ...slide, motif, style: { field, align, photoSide, bleed, text: TEXT_FOR_MODE[mode], backdrop: pickBackdrop(slide, previous) } };
}

/** Review helper: names the layout streaks and field repeats that make a run look samey. */
export function auditSequence(slides: readonly Slide[]): string[] {
  const issues: string[] = [];
  slides.forEach((s, i) => {
    const p = slides[i - 1];
    if (!p) return;
    if (p.style.field === s.style.field) issues.push(`slide ${i + 1}: same colour field as the one before`);
    if (p.layout === s.layout && slides[i - 2]?.layout === s.layout) issues.push(`slide ${i + 1}: ${s.layout} three times in a row`);
  });
  return issues;
}
