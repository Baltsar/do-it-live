import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { body, COLORS, heading } from "../brand";
import { fadeOut, pop, ramp } from "../motion";

interface Stat {
  value: number;
  decimals: number;
  unit: string;
  label: string;
  color: string;
}

// From the recorded 80-second test talk after the race and variety fixes (see docs/submission.md).
const STATS: Stat[] = [
  { value: 1.7, decimals: 1, unit: "s", label: "from your words to the screen", color: COLORS.yellow },
  { value: 9, decimals: 0, unit: "", label: "different looks in one talk", color: COLORS.pink },
  { value: 0, decimals: 0, unit: "", label: "slides built", color: COLORS.mint },
];

/** Three figures that count up one after another. */
export function Numbers() {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: COLORS.black, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 70, opacity: fadeOut(frame, d, 8) }}>
      {STATS.map((s, i) => {
        const start = Math.round(d * 0.08) + i * Math.round(d * 0.17);
        const show = pop(frame, start, 12);
        const count = s.value * ramp(frame, start, start + 24);
        return (
          <div key={s.label} style={{ width: 500, textAlign: "center", opacity: Math.min(1, show * 1.5), transform: `translateY(${(1 - show) * 50}px)` }}>
            <div style={{ ...heading, fontSize: 230, fontStretch: "100%", color: s.color, letterSpacing: "-0.05em", whiteSpace: "nowrap" }}>
              {count.toFixed(s.decimals)}
              <span style={{ fontSize: 110, marginLeft: 8 }}>{s.unit}</span>
            </div>
            <div style={{ ...body, fontSize: 40, color: COLORS.white, marginTop: 26, lineHeight: 1.15 }}>{s.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
