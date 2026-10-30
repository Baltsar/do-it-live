import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// The app's own colour fields and typeface, so the cutaways look like the show they cut away from.
export const COLORS = {
  black: "#0a0a0a",
  white: "#f4f4ef",
  yellow: "#ffd60a",
  pink: "#ff4fa3",
  blue: "#2b3bff",
  mint: "#8cf5c9",
  grey: "rgba(244, 244, 239, 0.55)",
} as const;

export const FONT = "Archivo";

// Variable in weight and width: headings run wide (125%) and heavy, like the start page.
export const archivoLoaded: Promise<void> = loadFont({ family: FONT, url: staticFile("fonts/Archivo.ttf"), weight: "100 900", stretch: "62% 125%" });

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const heading = {
  fontFamily: FONT,
  fontWeight: 900,
  fontStretch: "125%",
  letterSpacing: "-0.05em",
  lineHeight: 0.85,
} as const;

export const body = {
  fontFamily: FONT,
  fontWeight: 600,
  letterSpacing: "-0.01em",
} as const;
