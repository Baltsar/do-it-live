import { interpolate, spring } from "remotion";
import { FPS } from "./brand";

/** 0 to 1 over a snappy spring that starts at `from` (frames). */
export const pop = (frame: number, from: number, damping = 14): number => spring({ frame: frame - from, fps: FPS, config: { damping, stiffness: 180, mass: 0.6 } });

/** 0 to 1, linear and clamped, between two frames. */
export const ramp = (frame: number, from: number, to: number): number => interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Fades out over the last `frames` of a scene that lasts `total`. */
export const fadeOut = (frame: number, total: number, frames = 12): number => 1 - ramp(frame, total - frames, total);
