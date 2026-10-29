import { useCurrentFrame, useVideoConfig } from "remotion";
import { body, COLORS } from "./brand";
import { fadeOut, pop } from "./motion";

export type Tone = "draw" | "card" | "figure" | "scene" | "fact" | "media";

const DOT: Record<Tone, string> = {
  draw: COLORS.yellow,
  card: COLORS.pink,
  figure: COLORS.mint,
  scene: "#8f9bff",
  fact: COLORS.white,
  media: COLORS.pink,
};

/** What made the slide that just went up, from the session log: a chip in the top left corner. */
export function SlideLabel({ text, tone }: { text: string; tone: Tone }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const show = pop(frame, 0, 15);
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 48,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 26px 16px 22px",
        borderRadius: 999,
        background: "rgba(10,10,10,0.82)",
        border: "2px solid rgba(244,244,239,0.14)",
        ...body,
        fontSize: 30,
        color: COLORS.white,
        opacity: Math.min(1, show * 1.5) * fadeOut(frame, durationInFrames, 10),
        transform: `translateX(${(1 - show) * -40}px)`,
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: 8, background: DOT[tone], boxShadow: `0 0 18px ${DOT[tone]}` }} />
      {text}
    </div>
  );
}
