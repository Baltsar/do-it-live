// The film is cut to its music, so its timing is counted in bars. BPM is a placeholder until the track is
// picked and measured; every cut moves with it. No imports: scripts read this file as is.

export const FPS = 30;
export const BEATS_PER_BAR = 4;

/** A stretch of a filmed file, in seconds of that file. */
export interface Part {
  file: string;
  from: number;
  to: number;
}

// What was filmed, and the part of each file the film uses. Null or empty shows the storyboard stand-in,
// so the film renders before anything is filmed.
export const CLIP_WALL = null as Part | null;
export const CLIP_WRONG = null as Part | null;

/** The screen recording of the take. The browser's own bars above the app and the strip beside its window are cut away. */
export const SCREEN = { file: "take.mp4", width: 1284, height: 720, crop: { x: 18, y: 98, w: 1204, h: 622 } } as const;

/**
 * The live section: six stretches of the take, with the take fast-forwarded between them so the viewer sees
 * the time pass. Each stretch is a whole number of beats at the placeholder tempo, so every cut lands on one.
 */
export const DEMO: readonly Part[] = [
  // The mic goes on. "Welcome to my presentation,"
  { file: SCREEN.file, from: 1.3, to: 5.9875 },
  // "around 700 builders are right now active on the community": builders, then 700 counting up and landing.
  { file: SCREEN.file, from: 14.9, to: 22.4 },
  // "So the LLM is kind of sycophantic ... so you get hooked. That's why you need a community": the chat, the robot, the puppet, spend more, hooked.
  { file: SCREEN.file, from: 63.0, to: 80.34375 },
  // A glimpse: "...you up, because" as WAKE UP! lands.
  { file: SCREEN.file, from: 82.4, to: 84.275 },
  // "I don't remember the word for... that": the app puts up ??? and waits.
  { file: SCREEN.file, from: 119.4, to: 127.36875 },
  // "What's the word. Psychosis. AI psychosis.": that's the word!
  { file: SCREEN.file, from: 130.0, to: 136.5625 },
  // A glimpse: "no one visits" lands as he says "that's my presentation".
  { file: SCREEN.file, from: 158.3, to: 160.64375 },
  // "you enjoyed the presentation. Have a good day, my name is Gustaf.": doitlive.app, 0, then 1 likes.
  { file: SCREEN.file, from: 169.9, to: 177.86875 },
];

/** Seconds of the take at which the app put up a new slide, read off a frame a second of the recording. Counted on screen as the cut reaches them, fast-forwards included. */
export const SLIDES_UP: readonly number[] = [10.5, 13.25, 18.0, 20.5, 49.75, 56.75, 65.0, 68.25, 71.0, 73.5, 79.0, 81.25, 83.5, 89.25, 92.75, 102.25, 104.75, 107.25, 113.0, 116.0, 126.25, 135.0, 153.75, 156.25, 158.75, 173.0, 175.25];

/** The track, its tempo, and the second in it where the drop lands: the film puts bar 14 there. */
export interface Track {
  file: string;
  bpm: number;
  drop: number;
}
/** The bar the drop lands on: WE'LL DO IT LIVE. The bar before it is dead silent. */
export const DROP_BAR = 10;

/** Made by scripts/music-standin.mjs to the film's own bars: our own synthesis, nothing to license. Its drop is written to land on DROP_BAR. */
export const MUSIC = { file: "music-standin.wav", bpm: 128, drop: (DROP_BAR - 1) * BEATS_PER_BAR * (60 / 128) } as Track | null;

export const BPM = MUSIC?.bpm ?? 128;

const beatSeconds = 60 / BPM;

/** Frame where a bar starts (counted from 1, as musicians do), plus `beat` beats into it. */
export const at = (bar: number, beat = 0): number => Math.round(((bar - 1) * BEATS_PER_BAR + beat) * beatSeconds * FPS);

/** Frames in `beats` beats. */
export const beats = (n: number): number => Math.round(n * beatSeconds * FPS);

/** The live section as cut: a part of the take at speed, or the stretch between two parts fast-forwarded. */
export type Cut = { kind: "part"; part: Part; frames: number } | { kind: "skip"; from: number; to: number; frames: number };

/** Beats a fast-forward takes: one when it has little to skip, two when it has far to go. */
export const skipBeats = (seconds: number): number => (seconds < 5 ? 1 : 2);

export function demoCuts(): Cut[] {
  const cuts: Cut[] = [];
  DEMO.forEach((part, i) => {
    if (i > 0) {
      const from = DEMO[i - 1].to;
      cuts.push({ kind: "skip", from, to: part.from, frames: beats(skipBeats(part.from - from)) });
    }
    cuts.push({ kind: "part", part, frames: Math.round((part.to - part.from) * FPS) });
  });
  return cuts;
}

export const demoFrames = (): number => demoCuts().reduce((s, c) => s + c.frames, 0);

/** Bars for the live section: its length rounded up to whole bars, so the hype starts on a downbeat. */
export const DEMO_BARS = Math.ceil(demoFrames() / (beatSeconds * BEATS_PER_BAR * FPS) - 1e-6);

export type Shot =
  | "setupYou"
  | "setupThis"
  | "hunt"
  | "wall"
  | "wrong"
  | "text"
  | "bingo"
  | "silence"
  | "fuckIt"
  | "live"
  | "usp"
  | "demo"
  | "metaphor"
  | "now"
  | "didIt"
  | "mic"
  | "end"
  | "black";

export const DEMO_BAR = DROP_BAR + 2;
export const HYPE_BAR = DEMO_BAR + DEMO_BARS;

/** Each shot runs until the next one starts. */
export const SHOTS: ReadonlyArray<{ bar: number; beat?: number; shot: Shot }> = [
  // The situation, then the problem, over the track's build-up: two gags everyone has lived, one thing to look at in each.
  { bar: 1, shot: "setupYou" },
  { bar: 2, shot: "setupThis" },
  { bar: 3, shot: "hunt" },
  { bar: 6, shot: "text" },
  // The turn: the music stops dead, a mic clicks on, and the drop lands on WE'LL DO IT LIVE.
  { bar: DROP_BAR - 1, shot: "silence" },
  { bar: DROP_BAR - 1, beat: 2, shot: "fuckIt" },
  { bar: DROP_BAR, shot: "live" },
  { bar: DROP_BAR + 1, shot: "usp" },
  // The proof: the live take, with the music low under the voice.
  { bar: DEMO_BAR, shot: "demo" },
  // The hype, and the callback: it was not a promise, it was the film.
  { bar: HYPE_BAR, shot: "metaphor" },
  { bar: HYPE_BAR + 1, shot: "now" },
  { bar: HYPE_BAR + 3, shot: "fuckIt" },
  { bar: HYPE_BAR + 3, beat: 2, shot: "didIt" },
  { bar: HYPE_BAR + 5, shot: "mic" },
  { bar: HYPE_BAR + 7, shot: "black" },
];

export const END_BAR = HYPE_BAR + 8;

export const shotStart = (s: { bar: number; beat?: number }): number => at(s.bar, s.beat ?? 0);
export const filmFrames = (): number => at(END_BAR);
