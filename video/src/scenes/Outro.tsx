import { AbsoluteFill, useCurrentFrame } from "remotion";
import { body, COLORS, heading } from "../brand";
import { pop } from "../motion";

/** The name, the movement, where to find it. */
export function Outro() {
  const frame = useCurrentFrame();
  const line = (from: number) => {
    const p = pop(frame, from, 16);
    return { opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 30}px)` };
  };
  return (
    <AbsoluteFill style={{ background: COLORS.black, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ ...heading, fontSize: 250, color: COLORS.white, ...line(0) }}>DO IT LIVE</div>
      <div style={{ ...body, fontWeight: 900, fontSize: 64, color: COLORS.yellow, marginTop: 34, ...line(10) }}>#vibepresenting</div>
      <div style={{ ...body, fontSize: 40, color: COLORS.white, marginTop: 70, lineHeight: 1.5, ...line(22) }}>
        do-it-live-two.vercel.app
        <br />
        github.com/Baltsar/do-it-live
      </div>
      <div style={{ ...body, fontSize: 26, color: COLORS.grey, marginTop: 70, ...line(34) }}>Built in Stockholm for the Nebius × NVIDIA Global AI Hackathon · NVIDIA Nemotron on Nebius Token Factory</div>
    </AbsoluteFill>
  );
}
