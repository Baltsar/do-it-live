import { loadFont } from "@remotion/fonts";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cancelRender, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { archivoLoaded, FONT, HEIGHT, WIDTH } from "../brand";

export const INK = "#1d1d1d";
export const PAPER = "#fbfaf7";
export const BLUE = "#2f5bea";
export const YELLOW = "#ffe500";
export const ORANGE = "#f25c3b";

/** One colour fills the frame; the type on it is the colour that reads best there. */
export interface Field {
  bg: string;
  fg: string;
}

export const ON_INK: Field = { bg: INK, fg: PAPER };
export const ON_BLUE: Field = { bg: BLUE, fg: PAPER };
export const ON_YELLOW: Field = { bg: YELLOW, fg: INK };
export const ON_PAPER: Field = { bg: PAPER, fg: INK };

const HAND_FONT = "Shantell Sans";

const shantellLoaded: Promise<void> = loadFont({ family: HAND_FONT, url: staticFile("fonts/ShantellSans.woff2"), weight: "300 800" });

const SHOUT_TRACKING = -0.04;
const SHOUT_LEADING = 0.96;
// Tight tracking closes the word spaces too; this opens them back to where the words read apart.
const SHOUT_WORD_SPACE = 0.14;

/** The shouting lines: Archivo at full weight and normal width, the cut of Archivo Black. */
export const shout: CSSProperties = {
  fontFamily: FONT,
  fontWeight: 900,
  letterSpacing: `${SHOUT_TRACKING}em`,
  wordSpacing: `${SHOUT_WORD_SPACE}em`,
  lineHeight: SHOUT_LEADING,
  whiteSpace: "pre",
};

/** The hand-written asides, set as the app's Scribble look sets Shantell Sans. */
export const hand: CSSProperties = {
  fontFamily: HAND_FONT,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  fontVariationSettings: '"INFM" 100, "BNCE" 25',
  whiteSpace: "pre",
};

/**
 * Holds the frame until both typefaces are in, because the lines are sized by measuring them: measured in a
 * fallback font, a line would come out the wrong size.
 */
export function FontsReady({ children }: { children: ReactNode }) {
  const [handle] = useState(() => delayRender("Loading Archivo and Shantell Sans"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([archivoLoaded, shantellLoaded])
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err: unknown) => cancelRender(err));
  }, [handle]);
  return ready ? <>{children}</> : null;
}

let ruler: CanvasRenderingContext2D | null = null;
const widths = new Map<string, number>();

/** Width of a shouting line set at 100 px, tracking included. */
export function shoutWidth(text: string): number {
  const known = widths.get(text);
  if (known !== undefined) return known;
  ruler ??= document.createElement("canvas").getContext("2d");
  if (!ruler) throw new Error("No 2D canvas to measure type with");
  ruler.font = `900 100px "${FONT}"`;
  ruler.letterSpacing = `${SHOUT_TRACKING * 100}px`;
  ruler.wordSpacing = `${SHOUT_WORD_SPACE * 100}px`;
  const width = ruler.measureText(text).width;
  widths.set(text, width);
  return width;
}

/** The size at which the longest line fills `width` of the frame, unless the block would be taller than `height`. */
export function fitSize(lines: readonly string[], width: number, height = 0.7): number {
  const widest = Math.max(...lines.map(shoutWidth));
  const byWidth = (100 * width * WIDTH) / widest;
  const byHeight = (height * HEIGHT) / (lines.length * SHOUT_LEADING);
  return Math.min(byWidth, byHeight);
}

/** Stiffness 400, damping 22: crosses its mark at about 120 ms, overshoots by about an eighth, settles. */
const SLAM = { stiffness: 400, damping: 22, mass: 1 } as const;

/** 0 to 1 with the overshoot, starting `delay` frames into the current sequence. */
export function useSlam(delay = 0): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: SLAM });
}

/** A word slams in from a quarter larger than it lands, dips under its size on the overshoot, and settles. */
export const slamScale = (s: number): number => 1 + 0.25 * (1 - s);

/** A block of shouting lines that fills `width` of the frame and slams in when its sequence starts. */
export function Shout({ lines, color, width = 0.8, height = 0.7, delay = 0 }: { lines: readonly string[]; color: string; width?: number; height?: number; delay?: number }) {
  const s = useSlam(delay);
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...shout,
        fontSize: fitSize(lines, width, height),
        color,
        textAlign: "center",
        transform: `scale(${slamScale(s)})`,
        visibility: frame < delay ? "hidden" : "visible",
      }}
    >
      {lines.join("\n")}
    </div>
  );
}

/** A hand-written aside that slams in with its line, `delay` frames later. */
export function Aside({ text, color, size, delay = 0, style }: { text: string; color: string; size: number; delay?: number; style?: CSSProperties }) {
  const s = useSlam(delay);
  const frame = useCurrentFrame();
  return <div style={{ ...hand, fontSize: size, color, transform: `scale(${slamScale(s)})`, visibility: frame < delay ? "hidden" : "visible", ...style }}>{text}</div>;
}
