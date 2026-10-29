// The cut, in seconds of the recorded take. Filled in once the take exists: until then the pitch renders
// with a placeholder where the take goes.

export interface Cutaway {
  scene: "how" | "numbers";
  from: number;
  to: number;
}

/** Where the face bubble sits in the 1920x1080 take, so it stays visible over the cutaways. */
export interface Bubble {
  x: number;
  y: number;
  size: number;
}

export interface Edit {
  /** File in video/public, or null for the placeholder. */
  take: string | null;
  from: number;
  to: number;
  /** Second of the take at which the session log starts (the mic press): lines the labels up. */
  sessionAt: number;
  cutaways: Cutaway[];
  bubble: Bubble | null;
}

export const EDIT: Edit = {
  take: null,
  from: 0,
  to: 134,
  sessionAt: 12,
  cutaways: [
    { scene: "how", from: 79, to: 109 },
    { scene: "numbers", from: 109, to: 122 },
  ],
  bubble: null,
};

export const INTRO_SECONDS = 6;
export const OUTRO_SECONDS = 10;
