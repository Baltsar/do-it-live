import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { body, COLORS, heading } from "../brand";
import { fadeOut, pop, ramp } from "../motion";

const KICKER = "F*CK IT, WE'LL DO IT LIVE.";

/** Cold open: the line types itself, then the name slams in. */
export function Intro() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const typed = KICKER.slice(0, Math.floor(ramp(frame, 6, 40) * KICKER.length));
  const slam = pop(frame, 48, 11);
  const sub = pop(frame, 92, 18);
  return (
    <AbsoluteFill style={{ background: COLORS.black, alignItems: "center", justifyContent: "center", opacity: fadeOut(frame, durationInFrames, 8) }}>
      <div style={{ ...body, fontWeight: 900, fontSize: 46, letterSpacing: "0.06em", color: COLORS.yellow, height: 60 }}>
        {typed}
        <span style={{ opacity: frame < 44 && Math.floor(frame / 8) % 2 === 0 ? 1 : 0 }}>|</span>
      </div>
      <div
        style={{
          ...heading,
          fontSize: 236,
          color: COLORS.white,
          marginTop: 30,
          opacity: Math.min(1, slam * 2),
          transform: `scale(${1.35 - 0.35 * slam})`,
        }}
      >
        DO IT LIVE
      </div>
      <div style={{ ...body, fontSize: 52, color: COLORS.grey, marginTop: 48, opacity: sub, transform: `translateY(${(1 - sub) * 24}px)` }}>Vibe presenting.</div>
    </AbsoluteFill>
  );
}
