import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { body, COLORS, heading } from "../brand";
import { fadeOut, pop, ramp } from "../motion";

function Node({ show, title, sub, accent, style }: { show: number; title: string; sub: string; accent: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        borderRadius: 28,
        background: "rgba(244,244,239,0.06)",
        border: `3px solid ${accent}`,
        padding: "28px 28px 30px",
        opacity: Math.min(1, show * 1.5),
        transform: `translateY(${(1 - show) * 40}px) scale(${0.9 + 0.1 * show})`,
        ...style,
      }}
    >
      <div style={{ ...heading, fontSize: 46, fontStretch: "100%", letterSpacing: "-0.03em", lineHeight: 1, color: COLORS.white }}>{title}</div>
      <div style={{ ...body, fontSize: 27, color: COLORS.grey, marginTop: 14, lineHeight: 1.25 }}>{sub}</div>
    </div>
  );
}

function Arrow({ grow }: { grow: number }) {
  return (
    <div style={{ width: 56, display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div style={{ height: 6, width: `${grow * 100}%`, background: COLORS.white, borderRadius: 3, opacity: 0.7 }} />
      <div style={{ width: 0, height: 0, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: `16px solid ${COLORS.white}`, opacity: grow > 0.95 ? 0.7 : 0 }} />
    </div>
  );
}

/** Three bars racing. The first to the end is the picture that goes up, and the others stop where they are. */
function Race({ frame, start }: { frame: number; start: number }) {
  const lanes: [name: string, frames: number, color: string][] = [
    ["Kimi-K3", 60, COLORS.yellow],
    ["gpt-oss-120b", 84, COLORS.pink],
    ["Nemotron 3 Ultra", 72, COLORS.mint],
  ];
  const finish = start + Math.min(...lanes.map(([, frames]) => frames));
  const now = Math.min(frame, finish);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
      {lanes.map(([name, frames, color]) => {
        const p = ramp(now, start, start + frames);
        const won = p >= 1;
        const stopped = frame >= finish && !won;
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ ...body, fontSize: 25, width: 230, flexShrink: 0, color: won ? COLORS.white : COLORS.grey, fontWeight: won ? 800 : 600 }}>{name}</div>
            <div style={{ flex: 1, height: 16, borderRadius: 8, background: "rgba(244,244,239,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p * 100}%`, background: color, borderRadius: 8, opacity: stopped ? 0.3 : 1 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Role({ show, model, job, color }: { show: number; model: string; job: string; color: string }) {
  return (
    <div style={{ flex: 1, borderRadius: 32, background: color, padding: "40px 40px 44px", opacity: Math.min(1, show * 1.5), transform: `translateY(${(1 - show) * 60}px)` }}>
      <div style={{ ...heading, fontSize: 54, letterSpacing: "-0.04em", lineHeight: 0.95, color: COLORS.black }}>{model}</div>
      <div style={{ ...body, fontSize: 30, color: COLORS.black, marginTop: 22, lineHeight: 1.2, opacity: 0.8 }}>{job}</div>
    </div>
  );
}

function Beat({ opacity, children }: { opacity: number; children: ReactNode }) {
  return <AbsoluteFill style={{ opacity, padding: "80px 60px", justifyContent: "center" }}>{children}</AbsoluteFill>;
}

/**
 * How it works, in two beats that stretch to whatever length the voice-over needs: the pipeline from
 * voice to screen, then the three Nemotron models and their jobs.
 */
export function HowItWorks() {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const at = (share: number): number => Math.round(d * share);
  const split = at(0.6);
  const first = 1 - ramp(frame, split - 10, split + 4);
  const second = ramp(frame, split, split + 12);
  return (
    <AbsoluteFill style={{ background: COLORS.black, opacity: fadeOut(frame, d, 8) }}>
      <Beat opacity={first}>
        <div style={{ ...body, fontSize: 30, fontWeight: 800, letterSpacing: "0.08em", color: COLORS.yellow, marginBottom: 46, opacity: pop(frame, 2) }}>UNDER THE HOOD</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Node show={pop(frame, at(0.02))} title="Your voice" sub="mid-sentence" accent={COLORS.yellow} style={{ width: 196, flexShrink: 0 }} />
          <Arrow grow={ramp(frame, at(0.06), at(0.09))} />
          <Node show={pop(frame, at(0.09))} title="Speech to text" sub="AssemblyAI streaming: words in about a second" accent={COLORS.white} style={{ width: 270, flexShrink: 0 }} />
          <Arrow grow={ramp(frame, at(0.13), at(0.16))} />
          <Node show={pop(frame, at(0.16))} title="Stage engine" sub="in the browser: figures and cues need no model" accent={COLORS.white} style={{ width: 270, flexShrink: 0 }} />
          <Arrow grow={ramp(frame, at(0.2), at(0.23))} />
          <div style={{ flex: 1, borderRadius: 36, border: `3px dashed ${COLORS.blue}`, padding: "34px 24px 24px", opacity: Math.min(1, pop(frame, at(0.23)) * 1.5), position: "relative" }}>
            <div style={{ ...body, position: "absolute", top: -22, left: 30, background: COLORS.black, padding: "0 14px", fontSize: 30, fontWeight: 800, color: "#8f9bff" }}>Nebius Token Factory</div>
            <Node show={pop(frame, at(0.26))} title="Director" sub="Nemotron 3.5 Lightning: show or hold, every few words" accent={COLORS.yellow} />
            <div style={{ height: 22 }} />
            <div style={{ opacity: Math.min(1, pop(frame, at(0.33)) * 1.5), borderRadius: 28, background: "rgba(244,244,239,0.06)", border: `3px solid ${COLORS.pink}`, padding: "28px 28px 30px" }}>
              <div style={{ ...heading, fontSize: 46, fontStretch: "100%", letterSpacing: "-0.03em", lineHeight: 1, color: COLORS.white }}>Drawing race</div>
              <div style={{ ...body, fontSize: 27, color: COLORS.grey, marginTop: 12 }}>three models at once: the first good picture wins</div>
              <Race frame={frame} start={at(0.36)} />
            </div>
          </div>
          <Arrow grow={ramp(frame, at(0.46), at(0.49))} />
          <Node show={pop(frame, at(0.49))} title="On screen" sub="about 2 s after you said it" accent={COLORS.mint} style={{ width: 236, flexShrink: 0 }} />
        </div>
      </Beat>
      <Beat opacity={second}>
        <div style={{ ...heading, fontSize: 92, color: COLORS.white, marginBottom: 56, opacity: pop(frame, split + 2) }}>
          NVIDIA Nemotron, <span style={{ color: COLORS.yellow }}>three jobs</span>
        </div>
        <div style={{ display: "flex", gap: 36 }}>
          <Role show={pop(frame, split + 10)} model="Nemotron 3.5 Lightning" job="Decides show or hold, every few spoken words." color={COLORS.yellow} />
          <Role show={pop(frame, split + 24)} model="Nemotron 3 Ultra" job="Prepares slides from your notes, checks facts, and runs in the drawing race." color={COLORS.pink} />
          <Role show={pop(frame, split + 38)} model="Nemotron 3.5 Super VL" job="Watches your own GIFs and photos, so they come up when they fit." color={COLORS.mint} />
        </div>
        <div style={{ ...body, fontSize: 30, color: COLORS.grey, marginTop: 50, opacity: pop(frame, split + 56) }}>One OpenAI-compatible endpoint on Nebius Token Factory for every model.</div>
      </Beat>
    </AbsoluteFill>
  );
}
