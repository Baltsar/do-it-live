import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LiveWords } from "../film/Hook";
import { Aside, BLUE, FontsReady, fitSize, hand, INK, ON_BLUE, ON_INK, ON_PAPER, ON_YELLOW, ORANGE, PAPER, shout, Shout, slamScale, useSlam, YELLOW, type Field } from "../film/look";
import { at, beats, CLIP_WALL, CLIP_WRONG, DEMO, demoCuts, END_BAR, FPS, SCREEN, SHOTS, shotStart, SLIDES_UP, type Cut, type Part, type Shot } from "./bars";
import { AppWindow, DECK_TOTAL, itemY, MENU_ITEMS, MENU_Y, menuX, Pointer, TemplateSlide, type Menu } from "./deck";

const ON_ORANGE: Field = { bg: ORANGE, fg: INK };

const SCREEN_SCALE = 1920 / SCREEN.crop.w;
const SCREEN_HEIGHT = SCREEN.crop.h * SCREEN_SCALE;

/**
 * A stretch of filmed footage, at speed or fast-forwarded at `rate`. The screen recording is cropped to the
 * app and fills the width, on the app's own black; anything else fills the frame. Its sound is mixed
 * separately, so the picture is muted.
 */
function Footage({ part, rate = 1 }: { part: Part; rate?: number }) {
  const video = (style: CSSProperties) => <OffthreadVideo src={staticFile(part.file)} trimBefore={Math.round(part.from * FPS)} trimAfter={Math.round(part.to * FPS)} playbackRate={rate} muted style={style} />;
  if (part.file !== SCREEN.file) return <AbsoluteFill style={{ background: INK }}>{video({ width: "100%", height: "100%", objectFit: "cover" })}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ position: "absolute", left: 0, top: (1080 - SCREEN_HEIGHT) / 2, width: 1920, height: SCREEN_HEIGHT, overflow: "hidden" }}>
        {video({ position: "absolute", left: -SCREEN.crop.x * SCREEN_SCALE, top: -SCREEN.crop.y * SCREEN_SCALE, width: SCREEN.width * SCREEN_SCALE, height: SCREEN.height * SCREEN_SCALE })}
      </div>
    </AbsoluteFill>
  );
}

/** The film's voice over the old way: one short line on a yellow band, slammed in on a beat. */
function Caption({ text, delay = 0 }: { text: string; delay?: number }) {
  const frame = useCurrentFrame();
  const s = useSlam(delay);
  if (frame < delay) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 210, background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...shout, fontSize: fitSize([text], 0.84, 0.14), color: INK, transform: `scale(${slamScale(s)})` }}>{text}</div>
    </div>
  );
}

function Fill({ field, children }: { field: Field; children?: ReactNode }) {
  return <AbsoluteFill style={{ background: field.bg, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>{children}</AbsoluteFill>;
}

// Scenario 1, as the room sees it on the projector: the pointer goes everywhere except to full screen, the
// room's wait runs up in the corner, and the one click it makes zooms the editor in instead.
const HUNT: ReadonlyArray<{ beat: number; x: number; y: number; open?: Menu; lit?: string }> = [
  { beat: 0, x: 1000, y: 620 },
  { beat: 1.2, x: menuX("View") + 30, y: MENU_Y, open: "View" },
  { beat: 2, x: menuX("View") + 60, y: itemY(1), open: "View", lit: MENU_ITEMS.View[1] },
  { beat: 3.5, x: menuX("Insert") + 30, y: MENU_Y, open: "Insert" },
  { beat: 5.2, x: menuX("Present") + 40, y: MENU_Y, open: "Present" },
  { beat: 6, x: menuX("Present") + 60, y: itemY(0), open: "Present", lit: MENU_ITEMS.Present[0] },
  { beat: 6.8, x: menuX("Present") + 60, y: itemY(2), open: "Present", lit: MENU_ITEMS.Present[2] },
  { beat: 8, x: menuX("View") + 30, y: MENU_Y, open: "View" },
  { beat: 8.8, x: menuX("View") + 60, y: itemY(4), open: "View", lit: MENU_ITEMS.View[4] },
];
const HUNT_CLICK = 9.5;
const ZOOM = 3.4;
// The room's wait runs this many times faster than the film, so it reaches about six minutes by the end of
// the scene: surveys put the late start of a meeting, mostly spent connecting a laptop to the room, at about six.
const WAIT_SPEED = 64;

function RoomWaiting() {
  const frame = useCurrentFrame();
  const seconds = Math.floor((frame / FPS) * WAIT_SPEED);
  return (
    <div style={{ position: "absolute", right: 60, top: 150, padding: "14px 26px", borderRadius: 18, background: INK, textAlign: "right" }}>
      <div style={{ ...hand, fontSize: 34, color: PAPER }}>the room has waited</div>
      <div style={{ ...shout, fontSize: 90, color: ORANGE }}>
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </div>
    </div>
  );
}

function Hunt() {
  const frame = useCurrentFrame();
  const times = HUNT.map((w) => beats(w.beat));
  const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) } as const;
  const x = interpolate(frame, times, HUNT.map((w) => w.x), ease);
  const y = interpolate(frame, times, HUNT.map((w) => w.y), ease);
  const clicked = frame >= beats(HUNT_CLICK);
  const step = [...HUNT].reverse().find((w) => frame >= beats(w.beat));
  const zoom = 1 + (ZOOM - 1) * useSlam(beats(HUNT_CLICK));
  return (
    <AbsoluteFill>
      <AppWindow open={clicked ? undefined : step?.open} lit={clicked ? undefined : step?.lit}>
        <AbsoluteFill style={{ transform: `scale(${clicked ? zoom : 1})`, transformOrigin: "960px 450px" }}>
          <TemplateSlide title="Q3 Strategy Update" page={1} centred />
        </AbsoluteFill>
      </AppWindow>
      <RoomWaiting />
      <Pointer x={x} y={y} />
      <Caption text="WHERE'S FULL SCREEN?" delay={beats(1)} />
    </AbsoluteFill>
  );
}

const MARKET = ["The market is growing", "Competition is increasing", "We need to move fast", "More on the next slide"] as const;

/** Without the phone clip: the speaker reads the slide aloud, a laser dot shaking along each line. */
function WallStandIn() {
  const frame = useCurrentFrame();
  const line = Math.min(MARKET.length - 1, Math.floor(frame / beats(1)));
  const along = (frame % beats(1)) / beats(1);
  const x = 175 + along * (MARKET[line].length * 19) + (random(`lx-${frame}`) - 0.5) * 14;
  const y = 258 + line * 54 + (random(`ly-${frame}`) - 0.5) * 10;
  const looks = 7 + Math.floor(frame / beats(0.5));
  return (
    <AbsoluteFill>
      <TemplateSlide title="Market overview" bullets={MARKET} page={5} />
      <div style={{ position: "absolute", left: x - 14, top: y - 14, width: 28, height: 28, borderRadius: 14, background: "#ff1f1f", boxShadow: "0 0 24px 8px rgba(255,31,31,0.55)" }} />
      <Aside text={`looked back ${looks}×`} color={ORANGE} size={96} style={{ position: "absolute", right: 80, top: 60, transform: "rotate(-5deg)" }} />
    </AbsoluteFill>
  );
}

function Wall() {
  return (
    <AbsoluteFill>
      {CLIP_WALL ? <Footage part={CLIP_WALL} /> : <WallStandIn />}
      <Caption text="TALKING TO THE WALL." delay={beats(1)} />
    </AbsoluteFill>
  );
}

/** Without the phone clip: the deck itself jumps, from where it was to where nobody wanted it. */
const PAGES: Record<number, { title: string; bullets: readonly string[] }> = {
  4: { title: "Key takeaways (1 of 4)", bullets: ["Leverage synergies", "Drive alignment", "Move the needle"] },
  5: { title: "Market overview", bullets: MARKET },
  6: { title: "Our journey", bullets: ["2019: the idea", "2021: the pivot", "2023: the other pivot"] },
  7: { title: "Lessons learned", bullets: ["Communicate more", "Align earlier"] },
  8: { title: "Synergies", bullets: ["See previous slide"] },
  9: { title: "BACKUP (do not show)", bullets: ["Numbers we are not sure about"] },
  10: { title: "Roadmap (old)", bullets: ["Q1: everything", "Q2: the rest"] },
  11: { title: "Org chart (2019)", bullets: ["Mostly people who have left"] },
  12: { title: "Thank you!", bullets: [] },
  13: { title: "Questions?", bullets: [] },
  14: { title: "Appendix A", bullets: ["Data"] },
  15: { title: "Appendix A (cont.)", bullets: ["More data"] },
  16: { title: "Appendix B", bullets: ["Methodology"] },
  17: { title: "Appendix B: Methodology (cont.)", bullets: ["See slides 44 to 61", "  Assumptions (preliminary)", "  Data sources (to be confirmed)", "Footnotes continued on the next slide"] },
};

// One click too many: 4, 5, then the deck races past the rest of the talk, through "Thank you!", into the
// appendix; then the speaker clicks back, one slide at a time.
const RACE = { from: 3, to: 5 };
const LANDED = 17;
const BACK: ReadonlyArray<{ beat: number; page: number }> = [
  { beat: 8.5, page: 16 },
  { beat: 10.5, page: 15 },
  { beat: 12.5, page: 14 },
];

function wrongPage(frame: number): number {
  if (frame < beats(1.5)) return 4;
  if (frame < beats(RACE.from)) return 5;
  if (frame < beats(RACE.to)) return 6 + Math.floor(((frame - beats(RACE.from)) / (beats(RACE.to) - beats(RACE.from))) * (LANDED - 6));
  return [...BACK].reverse().find((b) => frame >= beats(b.beat))?.page ?? LANDED;
}

function Wrong() {
  const frame = useCurrentFrame();
  const page = wrongPage(frame);
  const lost = page > 5;
  return (
    <AbsoluteFill>
      {CLIP_WRONG ? <Footage part={CLIP_WRONG} /> : <TemplateSlide {...(PAGES[page] ?? PAGES[4])} page={page} centred={page === 12 || page === 13} />}
      <div style={{ position: "absolute", right: 70, top: 60, padding: "14px 34px", borderRadius: 18, background: lost ? ORANGE : PAPER, ...shout, fontSize: 150, color: INK }}>
        {page} / {DECK_TOTAL}
      </div>
      <Aside text="oops." color={ORANGE} size={150} delay={beats(RACE.to + 0.5)} style={{ position: "absolute", right: 120, top: 300, transform: "rotate(-8deg)" }} />
      <Caption text="WRONG SLIDE." delay={beats(RACE.to)} />
    </AbsoluteFill>
  );
}

const WALL_OF_TEXT = [
  "Leverage cross-functional synergies to drive alignment across all key stakeholder groups",
  "  Ensure holistic, best-in-class value creation going forward",
  "  Circle back on actionable learnings from the Q2 deep dives",
  "Optimise the go-to-market motion for scalable, sustainable growth",
  "  Deliver on the north star metrics (see appendix B, slides 44 to 61)",
  "  Revisit the roadmap in light of evolving market dynamics",
  "Empower teams to own outcomes, not outputs, in an agile way",
  "  Socialise the framework with leadership before the offsite",
  "  Align on next steps, owners and timelines (to be decided)",
  "Move the needle on customer-centric innovation at pace",
  "  Unlock efficiencies through strategic process re-engineering",
  "  Benchmark against peers and adjacent verticals where relevant",
  "Questions? Please hold them until the end of the presentation",
] as const;

const WALL_TITLE = "Key takeaways (1 of 4)";
// The counter on screen is the real count of the slide's words, so the joke is also true.
const WALL_WORDS = [WALL_TITLE, ...WALL_OF_TEXT].join(" ").split(/\s+/).filter(Boolean).length;

/** The only dense frame in the film: a wall of text, read out loud a line a beat like karaoke. */
function TextWall() {
  const frame = useCurrentFrame();
  const lit = Math.min(WALL_OF_TEXT.length - 1, Math.floor(frame / beats(1)));
  return (
    <AbsoluteFill>
      <TemplateSlide title={WALL_TITLE} bullets={WALL_OF_TEXT} page={23} small lit={lit} />
      <Aside text={`${WALL_WORDS} words`} color={ORANGE} size={110} delay={beats(1)} style={{ position: "absolute", right: 80, top: 50, transform: "rotate(-6deg)" }} />
      <Caption text="THEY READ. NOBODY LISTENS." delay={beats(1.5)} />
    </AbsoluteFill>
  );
}

// Presentation bingo: the lines every talk has. The centre is free, because every deck has an agenda.
const BINGO = [
  "Can everyone see my screen?",
  "Next slide, please.",
  "Sorry, one back.",
  "This slide is a bit busy…",
  "AGENDA",
  "You're on mute.",
  "Any questions?",
  "I'll be quick.",
  "Thank you!",
] as const;
const FREE = 4;
// Marked a cell at a time, so no line is complete until the last mark, which completes two.
const MARKS: ReadonlyArray<{ beat: number; cell: number }> = [
  { beat: 0.5, cell: 0 },
  { beat: 2, cell: 3 },
  { beat: 3.5, cell: 7 },
  { beat: 5, cell: 2 },
  { beat: 6.5, cell: 6 },
];
const BINGO_AT = 7.5;
const CARD = { left: 270, top: 40, width: 1380, cellH: 220, head: 120 };

function Dab({ delay, tilt }: { delay: number; tilt: number }) {
  const frame = useCurrentFrame();
  const s = useSlam(delay);
  if (frame < delay) return null;
  return (
    <svg viewBox="0 0 460 220" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: `rotate(${tilt}deg) scale(${slamScale(s)})` }}>
      <ellipse cx={230} cy={110} rx={205} ry={88} fill="none" stroke={ORANGE} strokeWidth={12} strokeLinecap="round" />
    </svg>
  );
}

function Bingo() {
  const cellW = CARD.width / 3;
  return (
    <AbsoluteFill style={{ background: "#3b4250" }}>
      <div style={{ position: "absolute", left: CARD.left, top: CARD.top, width: CARD.width, height: CARD.head + CARD.cellH * 3, background: "#fff", borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ height: CARD.head, display: "flex", alignItems: "center", justifyContent: "center", ...shout, fontSize: 84, color: INK }}>PRESENTATION BINGO</div>
        {BINGO.map((line, i) => {
          const mark = MARKS.find((m) => m.cell === i);
          return (
            <div
              key={line}
              style={{
                position: "absolute",
                left: (i % 3) * cellW,
                top: CARD.head + Math.floor(i / 3) * CARD.cellH,
                width: cellW,
                height: CARD.cellH,
                borderTop: "3px solid #1f3a5f",
                borderLeft: i % 3 ? "3px solid #1f3a5f" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontWeight: 700,
                fontSize: i === FREE ? 56 : 40,
                color: "#1f3a5f",
                textAlign: "center",
                padding: "0 30px",
                boxSizing: "border-box",
              }}
            >
              {line}
              {i === FREE ? <span style={{ fontSize: 26, color: "#7a8899", marginTop: 6 }}>FREE</span> : null}
              {i === FREE ? <Dab delay={0} tilt={-4} /> : null}
              {mark ? <Dab delay={beats(mark.beat)} tilt={(i % 2 ? 1 : -1) * (3 + i)} /> : null}
            </div>
          );
        })}
      </div>
      <Caption text="BINGO!" delay={beats(BINGO_AT)} />
    </AbsoluteFill>
  );
}

/** A broadcast tally in the corner while the take runs: this part is live, not a deck. */
function Tally() {
  return (
    <div style={{ position: "absolute", right: 30, top: 44, display: "flex", alignItems: "center", gap: 16, padding: "12px 34px 12px 20px", borderRadius: 12, background: INK }}>
      <span style={{ width: 26, height: 26, borderRadius: 13, background: "#ff1f1f" }} />
      <span style={{ ...shout, fontSize: 44, color: PAPER }}>LIVE</span>
    </div>
  );
}

const CUTS = demoCuts();

/** Frame into the live section at which second `t` of the take is on screen, at speed or flying past in a fast-forward; null before the first part or after the last. */
function demoFrame(t: number): number | null {
  let start = 0;
  for (const c of CUTS) {
    const from = c.kind === "part" ? c.part.from : c.from;
    const to = c.kind === "part" ? c.part.to : c.to;
    if (t >= from && t < to) return start + Math.round(((t - from) / (to - from)) * c.frames);
    start += c.frames;
  }
  return null;
}

/** Frames into the live section at which the viewer sees a new slide go up, the fast-forwards included. */
const SLIDE_EVENTS = SLIDES_UP.map(demoFrame).filter((f): f is number => f !== null);
/** How many slides the film shows being made: the hype quotes it, so it stays true to the cut. */
export const SLIDES_MADE = SLIDE_EVENTS.length;

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** The take fast-forwarded from one part to the next: the skipped stretch flies past under a blinking ▶▶ and the take's own clock, so the jump is seen for what it is. */
function Skip({ cut }: { cut: Extract<Cut, { kind: "skip" }> }) {
  const frame = useCurrentFrame();
  const rate = ((cut.to - cut.from) * FPS) / cut.frames;
  const now = cut.from + ((cut.to - cut.from) * frame) / cut.frames;
  const blink = frame % 6 < 4 ? 1 : 0.35;
  const triangle: CSSProperties = { width: 0, height: 0, borderTop: "26px solid transparent", borderBottom: "26px solid transparent", borderLeft: `40px solid ${YELLOW}`, opacity: blink };
  return (
    <AbsoluteFill>
      <Footage part={{ file: SCREEN.file, from: cut.from, to: cut.to }} rate={rate} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 372, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "18px 44px 18px 40px", borderRadius: 22, background: INK, border: `3px solid ${YELLOW}` }}>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={triangle} />
            <div style={triangle} />
          </div>
          <span style={{ ...shout, fontSize: 72, color: YELLOW, fontVariantNumeric: "tabular-nums" }}>{clock(now)}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Chip({ label, value, field, border, scale = 1 }: { label: string; value: string; field: Field; border?: string; scale?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, height: 64, padding: "0 26px", borderRadius: 32, background: field.bg, border: border ? `2px solid ${border}` : "none", transform: `scale(${scale})`, transformOrigin: "left center" }}>
      <span style={{ ...shout, fontSize: 28, color: field.fg, opacity: 0.75 }}>{label}</span>
      <span style={{ ...shout, fontSize: 40, color: field.fg, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

/** The score the old way never shows: slides prepared, none; slides made, counting up as the app puts them up. */
function Score() {
  const frame = useCurrentFrame();
  const made = SLIDE_EVENTS.filter((f) => f <= frame);
  const s = useSlam(made.length > 0 ? made[made.length - 1] : 0);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 44, display: "flex", justifyContent: "center", gap: 14 }}>
      <Chip label="SLIDES PREPARED" value="0" field={ON_INK} border="#3a3a3a" />
      <Chip label="SLIDES MADE" value={String(made.length).padStart(2, "0")} field={ON_YELLOW} scale={slamScale(s)} />
    </div>
  );
}

/** Hand-written remarks in the margin beside the stage, each at a second of the take, gone again after a few beats. */
const ASIDES: ReadonlyArray<{ t: number; lines: string }> = [
  { t: 1.9, lines: "no deck.\nno notes.\nno rehearsal." },
  { t: 126.4, lines: "forgot\nthe word." },
  { t: 135.2, lines: "it waited." },
  { t: 175.4, lines: "tough\ncrowd." },
];

/** The live section: the parts of the take with the fast-forwards between them and the score over it all, or the storyboard stand-in until a take exists. */
function Demo() {
  if (DEMO.length === 0) {
    return (
      <AbsoluteFill>
        <DemoStandIn />
        <Tally />
      </AbsoluteFill>
    );
  }
  let from = 0;
  return (
    <AbsoluteFill>
      {CUTS.map((cut) => {
        const start = from;
        from += cut.frames;
        return (
          <Sequence key={`${cut.kind}-${start}`} from={start} durationInFrames={cut.frames}>
            {cut.kind === "part" ? <Footage part={cut.part} /> : <Skip cut={cut} />}
          </Sequence>
        );
      })}
      {ASIDES.map((a) => {
        const f = demoFrame(a.t);
        if (f === null) return null;
        return (
          <Sequence key={a.t} from={f} durationInFrames={beats(8)}>
            <div style={{ position: "absolute", left: 56, top: 200, width: 360 }}>
              <Aside text={a.lines} color={YELLOW} size={60} style={{ whiteSpace: "pre-line", lineHeight: 1.05, transformOrigin: "left top" }} />
            </div>
          </Sequence>
        );
      })}
      <Score />
      <Tally />
    </AbsoluteFill>
  );
}

/** Board stand-in for the live take: the same framing as clip 1, but facing the room, slides behind. */
function DemoStandIn() {
  return (
    <AbsoluteFill style={{ background: "#1a1a1a" }}>
      <div style={{ position: "absolute", left: 400, top: 90, width: 1120, height: 630, background: "#000", borderRadius: 18, padding: 22 }}>
        <div style={{ width: "100%", height: "100%", background: PAPER, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...shout, fontSize: 210, color: INK }}>10 → 45</div>
          <div style={{ ...hand, fontSize: 90, color: ORANGE }}>minutes of fika</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 960 - 110, top: 600, width: 220, height: 220, borderRadius: 110, background: "#5a5a5a" }} />
      <div style={{ position: "absolute", left: 960 - 260, top: 800, width: 520, height: 320, borderRadius: "200px 200px 0 0", background: "#5a5a5a" }} />
      <div style={{ ...hand, position: "absolute", left: 60, top: 50, fontSize: 56, color: YELLOW }}>no clicker</div>
      <div style={{ ...hand, position: "absolute", right: 60, bottom: 40, fontSize: 40, color: "#999" }}>LIVE · din tagning, 45 s</div>
    </AbsoluteFill>
  );
}

export type MetaphorKey = "A" | "B" | "C" | "D";

/** Four ways to say what changed; the film plays the chosen one, the board shows them all. D quotes the take's score. */
export const METAPHORS: Record<MetaphorKey, readonly [{ field: Field; lines: string[] }, { field: Field; lines: string[] }]> = {
  A: [
    { field: ON_INK, lines: ["A DECK IS", "A RERUN."] },
    { field: ON_ORANGE, lines: ["THIS IS LIVE."] },
  ],
  B: [
    { field: ON_PAPER, lines: ["20 SLIDES.", "20 SECONDS."] },
    { field: ON_BLUE, lines: ["0 SLIDES.", "NO TIMER."] },
  ],
  C: [
    { field: ON_YELLOW, lines: ["SLIDES WERE", "SHEET MUSIC."] },
    { field: ON_INK, lines: ["THIS IS JAZZ."] },
  ],
  D: [
    { field: ON_YELLOW, lines: [`${SLIDES_MADE} SLIDES.`, "0 PREPARED."] },
    { field: ON_ORANGE, lines: ["NO DECK.", "NO CLICKER."] },
  ],
};

export const METAPHOR: MetaphorKey = "D";

export function MetaphorFrame({ field, lines }: { field: Field; lines: string[] }) {
  return (
    <Fill field={field}>
      <Shout lines={lines} color={field.fg} />
    </Fill>
  );
}

function Metaphor() {
  const [first, second] = METAPHORS[METAPHOR];
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={beats(4)}>
        <MetaphorFrame {...first} />
      </Sequence>
      <Sequence from={beats(4)}>
        <MetaphorFrame {...second} />
      </Sequence>
    </AbsoluteFill>
  );
}

const NOW: ReadonlyArray<{ beat: number; field: Field; lines: string[] }> = [
  { beat: 0, field: ON_BLUE, lines: ["THIS IS"] },
  { beat: 2, field: ON_YELLOW, lines: ["HOW YOU PRESENT"] },
  { beat: 4, field: ON_INK, lines: ["IN 2026."] },
];

function Now() {
  return (
    <AbsoluteFill>
      {NOW.map((n, i) => (
        <Sequence key={n.beat} from={beats(n.beat)} durationInFrames={i < NOW.length - 1 ? beats(NOW[i + 1].beat - n.beat) : undefined}>
          <MetaphorFrame field={n.field} lines={n.lines} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function End() {
  return (
    <Fill field={ON_BLUE}>
      <Shout lines={["DO IT LIVE"]} color={PAPER} width={0.62} />
      <Aside text="doitlive.app" color={PAPER} size={84} delay={beats(1)} style={{ marginTop: 40 }} />
      <Aside text="NVIDIA Nemotron · Nebius Token Factory" color={PAPER} size={34} delay={beats(2)} style={{ marginTop: 70, opacity: 0.7 }} />
    </Fill>
  );
}

/** The app's microphone, drawn in ink: a capsule, its cradle, and the stand. */
function Mic() {
  return (
    <div style={{ position: "relative", width: 120, height: 152 }}>
      <div style={{ position: "absolute", left: 35, top: 0, width: 50, height: 92, borderRadius: 25, background: INK }} />
      <div style={{ position: "absolute", left: 14, top: 50, width: 92, height: 62, borderRadius: "0 0 46px 46px", border: `12px solid ${INK}`, borderTop: "none", boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: 54, top: 110, width: 12, height: 30, background: INK }} />
      <div style={{ position: "absolute", left: 30, top: 140, width: 60, height: 12, borderRadius: 6, background: INK }} />
    </div>
  );
}

/**
 * The last card: the app's own mic button, big and breathing on the beat, waiting for the viewer. On the
 * film's last frames it is pressed, and the click cuts to black.
 */
function MicEnd() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const slam = useSlam(0);
  const pressed = frame >= durationInFrames - 5;
  const breath = 1 + 0.03 * Math.sin((frame / beats(1)) * Math.PI * 2);
  const scale = pressed ? 0.88 : slamScale(slam) * breath;
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...shout, fontSize: 124, color: PAPER, marginBottom: 54 }}>doitlive.app</div>
      <div style={{ width: 300, height: 300, borderRadius: 150, background: YELLOW, boxShadow: `0 0 ${pressed ? 60 : 130}px ${pressed ? 16 : 44}px rgba(255,229,0,${pressed ? 0.7 : 0.4})`, transform: `scale(${scale})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mic />
      </div>
      <Aside text="your turn." color={YELLOW} size={76} delay={beats(2)} style={{ marginTop: 54 }} />
      <div style={{ ...hand, position: "absolute", bottom: 44, fontSize: 32, color: "#7a7a7a" }}>NVIDIA Nemotron · Nebius Token Factory</div>
    </AbsoluteFill>
  );
}

const SHOT: Record<Shot, () => ReactNode> = {
  setupYou: () => (
    <Fill field={ON_INK}>
      <Shout lines={["YOU'RE ABOUT", "TO PRESENT."]} color={PAPER} />
    </Fill>
  ),
  setupThis: () => (
    <Fill field={ON_ORANGE}>
      <Shout lines={["THIS HAPPENS."]} color={INK} />
    </Fill>
  ),
  hunt: () => <Hunt />,
  wall: () => <Wall />,
  wrong: () => <Wrong />,
  text: () => <TextWall />,
  bingo: () => <Bingo />,
  silence: () => <Fill field={ON_INK} />,
  fuckIt: () => (
    <Fill field={ON_YELLOW}>
      <Shout lines={["F*CK IT."]} color={INK} width={0.88} />
    </Fill>
  ),
  live: () => (
    <AbsoluteFill style={{ background: BLUE }}>
      <LiveWords hold />
    </AbsoluteFill>
  ),
  usp: () => (
    <Fill field={ON_PAPER}>
      <Shout lines={["YOU TALK.", "IT SHOWS."]} color={INK} />
    </Fill>
  ),
  demo: () => <Demo />,
  metaphor: () => <Metaphor />,
  now: () => <Now />,
  didIt: () => (
    <Fill field={ON_BLUE}>
      <Shout lines={["WE DID", "IT LIVE."]} color={PAPER} />
    </Fill>
  ),
  mic: () => <MicEnd />,
  end: () => <End />,
  black: () => <Fill field={ON_INK} />,
};

/** The whole film, about 88 seconds at the placeholder tempo: the old way, the turn, the live take, the hype. */
export function LiveFilm() {
  return (
    <FontsReady>
      <AbsoluteFill style={{ background: INK }}>
        {SHOTS.map((s, i) => {
          const from = shotStart(s);
          const to = i < SHOTS.length - 1 ? shotStart(SHOTS[i + 1]) : at(END_BAR);
          return (
            <Sequence key={`${s.shot}-${from}`} from={from} durationInFrames={to - from}>
              {SHOT[s.shot]()}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </FontsReady>
  );
}
