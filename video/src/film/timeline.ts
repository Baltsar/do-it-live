// The film's timing, in seconds. The picture is drawn from these and scripts/cues.mjs reads the same
// file for the sound, so a re-timed cut moves its sound with it. No imports: Node reads this file as is.

export const FPS = 30;

export type HookShot = "noSlides" | "noDeck" | "nothing" | "fuckIt" | "live" | "talk" | "builders" | "delta" | "share" | "black";

/** Segment 1, the hook. Each shot runs until the next one starts. */
export const HOOK_SHOTS: ReadonlyArray<{ at: number; shot: HookShot }> = [
  { at: 0, shot: "noSlides" },
  { at: 1.2, shot: "noDeck" },
  { at: 2.4, shot: "nothing" },
  { at: 3.8, shot: "fuckIt" },
  { at: 5.0, shot: "live" },
  { at: 6.5, shot: "talk" },
  { at: 8.0, shot: "builders" },
  { at: 9.0, shot: "delta" },
  { at: 10.0, shot: "share" },
  { at: 11.5, shot: "black" },
];

export const HOOK_SECONDS = 12;

/**
 * What the speaker says over the three slides, typed out at the bottom as it is said. Each sentence starts
 * before its slide, so the slide lands mid-sentence: "Seven hundred b|", "From twelve to |", "One in fi|".
 */
export const HOOK_CAPTIONS: ReadonlyArray<{ at: number; text: string }> = [
  { at: 7.35, text: "Seven hundred builders." },
  { at: 8.35, text: "From twelve to seven hundred." },
  { at: 9.6, text: "One in five startups make it." },
];

/** Characters a second: a fast talker. */
export const CAPTION_RATE = 24;

export interface BuiltLine {
  lines: string[];
  note?: string;
}

/** Segment 2, how it is built: one claim a frame, broken by hand so each block reads at a glance. */
export const BUILT_LINES: ReadonlyArray<BuiltLine> = [
  { lines: ["YOU TALK."] },
  { lines: ["NEMOTRON 3.5", "LIGHTNING", "DECIDES."], note: "every few words" },
  // Kimi K3 leads the drawing race in src/lib/draw.ts and Nemotron 3 Ultra runs third, so the frame names the race.
  { lines: ["THREE MODELS", "RACE TO DRAW."], note: "Nemotron 3 Ultra, Kimi K3 and gpt-oss" },
  // Lightning, Ultra, Super VL, Kimi K3, gpt-oss and Qwen3 Embedding, all through one Token Factory endpoint.
  { lines: ["NEBIUS TOKEN", "FACTORY SERVES."], note: "one endpoint, six models" },
  { lines: ["TAVILY CHECKS", "THE FACTS."], note: "and names your memes" },
  { lines: ["NO MODEL MAY", "INVENT A NUMBER."] },
  { lines: ["1.7 SECONDS", "FROM WORDS", "TO SCREEN."], note: "median, measured on a recorded talk" },
  { lines: ["7 LOOKS.", "23 SLIDE TYPES.", "60 CARDS.", "80 SCENES."] },
];

export const BUILT_LINE_SECONDS = 2;
export const BUILT_END_SECONDS = 4;
/** Black after the last mic click, so the segment does not end on a bright frame. */
export const BUILT_BLACK_SECONDS = 1;

export const builtEndAt = (): number => BUILT_LINES.length * BUILT_LINE_SECONDS;
export const builtBlackAt = (): number => builtEndAt() + BUILT_END_SECONDS;
export const builtSeconds = (): number => builtBlackAt() + BUILT_BLACK_SECONDS;

export const hookShotAt = (shot: HookShot): number => {
  const found = HOOK_SHOTS.find((s) => s.shot === shot);
  if (!found) throw new Error(`No hook shot named ${shot}`);
  return found.at;
};

/** Seconds to frames, rounded to the nearest frame. */
export const f = (seconds: number): number => Math.round(seconds * FPS);
