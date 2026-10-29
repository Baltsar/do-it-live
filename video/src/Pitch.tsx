import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { body, COLORS, FPS, HEIGHT, WIDTH } from "./brand";
import { EDIT, INTRO_SECONDS, OUTRO_SECONDS, type Bubble } from "./edit";
import labels from "./labels.json";
import { HowItWorks } from "./scenes/HowItWorks";
import { Intro } from "./scenes/Intro";
import { Numbers } from "./scenes/Numbers";
import { Outro } from "./scenes/Outro";
import { SlideLabel, type Tone } from "./SlideLabel";

interface Label {
  /** Seconds after the session started (the mic press). */
  at: number;
  text: string;
  tone: Tone;
}

const LABEL_SECONDS = 3.2;
const f = (seconds: number): number => Math.round(seconds * FPS);

export const pitchFrames = (): number => f(INTRO_SECONDS + (EDIT.to - EDIT.from) + OUTRO_SECONDS);

function Placeholder() {
  return (
    <AbsoluteFill style={{ background: "#151515", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...body, fontSize: 44, color: COLORS.grey, textAlign: "center", lineHeight: 1.4 }}>
        Take A goes here
        <br />
        <span style={{ fontSize: 30 }}>video/public/take.mp4, then set EDIT.take in src/edit.ts</span>
      </div>
      <div style={{ position: "absolute", right: 60, bottom: 60, width: 260, height: 260, borderRadius: 130, background: "#2a2a2a" }} />
    </AbsoluteFill>
  );
}

/** The speaker's face, cut out of the take as a circle, so it stays on screen over a cutaway. */
function KeepBubble({ take, at, bubble }: { take: string; at: number; bubble: Bubble }) {
  return (
    <div style={{ position: "absolute", left: bubble.x, top: bubble.y, width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
      <OffthreadVideo src={staticFile(take)} trimBefore={f(at)} muted style={{ position: "absolute", left: -bubble.x, top: -bubble.y, width: WIDTH, height: HEIGHT }} />
    </div>
  );
}

/**
 * The whole pitch: cold open, the live take with a label on every slide it drew and two cutaways laid over
 * it (the voice keeps running underneath), then the outro.
 */
export function Pitch() {
  const takeFrames = f(EDIT.to - EDIT.from);
  const inCutaway = (t: number): boolean => EDIT.cutaways.some((c) => t >= c.from - 0.5 && t <= c.to);
  const placed = (labels as Label[])
    .map((l) => ({ ...l, t: EDIT.sessionAt + l.at }))
    .filter((l) => l.t >= EDIT.from && l.t + LABEL_SECONDS <= EDIT.to && !inCutaway(l.t));
  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      <Sequence durationInFrames={f(INTRO_SECONDS)}>
        <Intro />
      </Sequence>
      <Sequence from={f(INTRO_SECONDS)} durationInFrames={takeFrames}>
        {EDIT.take ? <OffthreadVideo src={staticFile(EDIT.take)} trimBefore={f(EDIT.from)} style={{ width: WIDTH, height: HEIGHT }} /> : <Placeholder />}
        {placed.map((l, i) => {
          // A label gives way to the next one rather than overlapping it.
          const next = placed[i + 1];
          const seconds = next ? Math.min(LABEL_SECONDS, next.t - l.t) : LABEL_SECONDS;
          return (
            <Sequence key={`${l.t}-${l.text}`} from={f(l.t - EDIT.from)} durationInFrames={Math.max(1, f(seconds))}>
              <SlideLabel text={l.text} tone={l.tone} />
            </Sequence>
          );
        })}
        {EDIT.cutaways.map((c) => (
          <Sequence key={c.scene} from={f(c.from - EDIT.from)} durationInFrames={f(c.to - c.from)}>
            {c.scene === "how" ? <HowItWorks /> : <Numbers />}
            {EDIT.take && EDIT.bubble ? <KeepBubble take={EDIT.take} at={c.from} bubble={EDIT.bubble} /> : null}
          </Sequence>
        ))}
      </Sequence>
      <Sequence from={f(INTRO_SECONDS) + takeFrames} durationInFrames={f(OUTRO_SECONDS)}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
