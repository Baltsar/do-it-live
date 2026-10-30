import type { ReactNode } from "react";
import { AbsoluteFill, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HEIGHT, WIDTH } from "../brand";
import { Aside, BLUE, FontsReady, fitSize, hand, INK, ON_BLUE, ON_INK, ON_PAPER, ON_YELLOW, ORANGE, shout, shoutWidth, Shout, slamScale, useSlam, YELLOW, type Field } from "./look";
import { CAPTION_RATE, f, FPS, HOOK_CAPTIONS, HOOK_SECONDS, HOOK_SHOTS, hookShotAt, type HookShot } from "./timeline";

const FIELD: Record<HookShot, Field> = {
  noSlides: ON_INK,
  noDeck: ON_INK,
  nothing: ON_INK,
  fuckIt: ON_YELLOW,
  live: ON_BLUE,
  talk: ON_BLUE,
  builders: ON_BLUE,
  delta: ON_PAPER,
  share: ON_YELLOW,
  black: ON_INK,
};

function Centre({ field, children, lift = 0 }: { field: Field; children?: ReactNode; lift?: number }) {
  return <AbsoluteFill style={{ background: field.bg, alignItems: "center", justifyContent: "center", flexDirection: "column", paddingBottom: lift }}>{children}</AbsoluteFill>;
}

const LIVE_LINES = ["WE'LL", "DO IT LIVE."] as const;
const TITLE = "DO IT LIVE";
const TITLE_SIZE = 72;
const TITLE_AT = { x: 72, y: 60 };

/**
 * "WE'LL DO IT LIVE." as big as the frame allows; unless `hold`, at the talk shot WE'LL drops out and the rest
 * flies to the top left corner as the show's title. Positions are computed rather than laid out, so the
 * title leaves from exactly where the line stood.
 */
export function LiveWords({ hold = false }: { hold?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = fitSize(LIVE_LINES, 0.94, 0.8);
  const leading = size * (shout.lineHeight as number);
  const left = (text: string): number => WIDTH / 2 - (shoutWidth(text) * size) / 200;
  const slam = useSlam();
  const shrinkAt = f(hookShotAt("talk") - hookShotAt("live"));

  if (hold || frame < shrinkAt) {
    return (
      <AbsoluteFill style={{ transform: `scale(${slamScale(slam)})`, transformOrigin: "50% 50%" }}>
        {LIVE_LINES.map((line, i) => (
          <div key={line} style={{ ...shout, position: "absolute", fontSize: size, color: ON_BLUE.fg, left: left(line), top: HEIGHT / 2 - leading + i * leading }}>
            {line}
          </div>
        ))}
      </AbsoluteFill>
    );
  }

  const p = spring({ frame: frame - shrinkAt, fps, config: { stiffness: 400, damping: 22, mass: 1 } });
  const lerp = (a: number, b: number): number => a + (b - a) * p;
  return (
    <div style={{ ...shout, position: "absolute", color: ON_BLUE.fg, fontSize: lerp(size, TITLE_SIZE), left: lerp(left(LIVE_LINES[1]), TITLE_AT.x), top: lerp(HEIGHT / 2, TITLE_AT.y) }}>
      {TITLE}
    </div>
  );
}

const BAR_SHAPE = [0.55, 0.85, 1, 0.8, 0.6];
const BAR_WIDTH = 64;
const BAR_GAP = 40;
const BAR_MIN = 36;
const BAR_MAX = 360;

/** Loudness of a made-up voice at `t` seconds: syllables at about four and a half a second, in phrases that swell and dip. */
function voice(t: number): number {
  const syllable = Math.abs(Math.sin(t * Math.PI * 4.5)) ** 0.6;
  const phrase = 0.6 + 0.4 * Math.sin(t * Math.PI * 1.1 + 0.8);
  return syllable * phrase;
}

/** Five ink bars bouncing to the voice, with "talk." under them until the first words come up as captions. */
function Talk() {
  const frame = useCurrentFrame();
  const slam = useSlam();
  const talkUntil = f(HOOK_CAPTIONS[0].at - hookShotAt("talk"));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: BAR_GAP, height: BAR_MAX, transform: `scale(${slamScale(slam)})` }}>
        {BAR_SHAPE.map((shape, i) => {
          const t = frame / FPS - i * 0.045;
          const jitter = 0.75 + 0.5 * random(`bar-${i}-${frame}`);
          const level = Math.min(1, voice(t) * shape * jitter);
          return <div key={i} style={{ width: BAR_WIDTH, height: BAR_MIN + (BAR_MAX - BAR_MIN) * level, background: INK }} />;
        })}
      </div>
      {frame < talkUntil ? <Aside text="talk." color={ON_BLUE.fg} size={96} delay={3} style={{ position: "absolute", top: HEIGHT / 2 + BAR_MAX / 2 + 40 }} /> : null}
    </AbsoluteFill>
  );
}

/** Room left under each slide for the caption. */
const CAPTION_ROOM = 150;

function Builders() {
  return (
    <Centre field={ON_BLUE} lift={CAPTION_ROOM}>
      <Shout lines={["700"]} color={YELLOW} width={0.62} height={0.56} />
      <Aside text="builders" color={YELLOW} size={140} delay={2} style={{ marginTop: 10 }} />
    </Centre>
  );
}

function Delta() {
  return (
    <Centre field={ON_PAPER} lift={CAPTION_ROOM}>
      <Shout lines={["12 → 700"]} color={ORANGE} width={0.8} height={0.42} />
      <Aside text="58×" color={ORANGE} size={190} delay={2} style={{ marginTop: 36 }} />
    </Centre>
  );
}

const FIGURE_WIDTH = 170;

/** A person drawn the way the app's PICTOGRAM slide draws one: a head and shoulders, filled when lit. */
function Person({ lit, delay }: { lit: boolean; delay: number }) {
  const slam = useSlam(delay);
  const frame = useCurrentFrame();
  return (
    <svg viewBox="-4 -4 108 178" width={FIGURE_WIDTH} height={(FIGURE_WIDTH * 178) / 108} style={{ transform: `scale(${slamScale(slam)})`, visibility: frame < delay ? "hidden" : "visible" }}>
      <g fill={lit ? INK : "none"} stroke={INK} strokeWidth={8}>
        <circle cx={50} cy={26} r={24} />
        <path d="M0 170 V104 A44 44 0 0 1 44 60 H56 A44 44 0 0 1 100 104 V170 Z" />
      </g>
    </svg>
  );
}

function Share() {
  return (
    <Centre field={ON_YELLOW} lift={CAPTION_ROOM}>
      <div style={{ display: "flex", gap: 60, marginBottom: 56 }}>
        {[true, false, false, false, false].map((lit, i) => (
          <Person key={i} lit={lit} delay={i * 2} />
        ))}
      </div>
      <Shout lines={["1 IN 5"]} color={INK} width={0.5} height={0.24} delay={4} />
    </Centre>
  );
}

const SHOT: Record<Exclude<HookShot, "talk" | "live">, () => ReactNode> = {
  noSlides: () => (
    <Centre field={ON_INK}>
      <Shout lines={["NO SLIDES."]} color={ON_INK.fg} />
    </Centre>
  ),
  noDeck: () => (
    <Centre field={ON_INK}>
      <Shout lines={["NO DECK."]} color={ON_INK.fg} />
    </Centre>
  ),
  nothing: () => (
    <Centre field={ON_INK}>
      <Shout lines={["NOTHING", "TO FORGET."]} color={ON_INK.fg} />
    </Centre>
  ),
  fuckIt: () => (
    <Centre field={ON_YELLOW}>
      <Shout lines={["F*CK IT."]} color={ON_YELLOW.fg} width={0.88} />
    </Centre>
  ),
  builders: () => <Builders />,
  delta: () => <Delta />,
  share: () => <Share />,
  black: () => <Centre field={ON_INK} />,
};

const shotAtFrame = (frame: number): HookShot => {
  const t = frame / FPS;
  return [...HOOK_SHOTS].reverse().find((s) => s.at <= t)?.shot ?? "noSlides";
};

/** What is being said, typed out at the bottom as it is said, in the colour that reads on the shot under it. */
function Captions() {
  const frame = useCurrentFrame();
  const shot = shotAtFrame(frame);
  if (shot === "black") return null;
  const t = frame / FPS;
  const line = [...HOOK_CAPTIONS].reverse().find((c) => c.at <= t);
  if (!line) return null;
  const typed = line.text.slice(0, Math.floor((frame - f(line.at)) / FPS * CAPTION_RATE));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 84 }}>
      <div style={{ ...hand, fontSize: 60, color: FIELD[shot].fg }}>{typed}</div>
    </AbsoluteFill>
  );
}

/** Segment 1, 0:00 to 0:12: the hook. Ends on half a second of black, where the screen recording takes over. */
export function Hook() {
  const liveAt = hookShotAt("live");
  const talkAt = hookShotAt("talk");
  const slidesAt = hookShotAt("builders");
  return (
    <FontsReady>
      <AbsoluteFill style={{ background: INK }}>
        {HOOK_SHOTS.map((s, i) => {
          if (s.shot === "live" || s.shot === "talk") return null;
          const end = HOOK_SHOTS[i + 1]?.at ?? HOOK_SECONDS;
          const draw = SHOT[s.shot];
          return (
            <Sequence key={s.shot} from={f(s.at)} durationInFrames={f(end) - f(s.at)}>
              {draw()}
            </Sequence>
          );
        })}
        <Sequence from={f(liveAt)} durationInFrames={f(slidesAt) - f(liveAt)}>
          <AbsoluteFill style={{ background: BLUE }}>
            <LiveWords />
            <Sequence from={f(talkAt) - f(liveAt)}>
              <Talk />
            </Sequence>
          </AbsoluteFill>
        </Sequence>
        <Captions />
      </AbsoluteFill>
    </FontsReady>
  );
}

/** The title frame on its own, for the thumbnail. */
export function TitleCard() {
  return (
    <FontsReady>
      <AbsoluteFill style={{ background: BLUE }}>
        <LiveWords hold />
      </AbsoluteFill>
    </FontsReady>
  );
}
