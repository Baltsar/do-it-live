import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { FONT } from "../brand";
import { FontsReady, hand, INK, ORANGE, PAPER, shout, YELLOW } from "../film/look";
import { at, BPM, END_BAR, filmFrames } from "./bars";
import { LiveFilm, METAPHORS, MetaphorFrame, type MetaphorKey } from "./Film";

// The storyboard: stills of the film itself at the chosen moments, with notes in Swedish for the director.

const SCALE = 0.375;
const PANEL = { w: 1920 * SCALE, h: 1080 * SCALE };
const MARGIN = 48;
const GUTTER = 32;
export const BOARD_WIDTH = MARGIN * 2 + PANEL.w * 3 + GUTTER * 2;
export const BOARD_HEIGHT = 3320;

export const note: CSSProperties = { fontFamily: FONT, fontWeight: 500, fontSize: 25, lineHeight: 1.3, color: INK, marginTop: 14 };

export function Frame({ children, scale = SCALE }: { children: ReactNode; scale?: number }) {
  return (
    <div style={{ width: 1920 * scale, height: 1080 * scale, position: "relative", overflow: "hidden", outline: `2px solid ${INK}` }}>
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0 }}>{children}</div>
    </div>
  );
}

function Still({ frame, text }: { frame: number; text: string }) {
  return (
    <div>
      <Frame>
        <Freeze frame={frame}>
          <LiveFilm />
        </Freeze>
      </Frame>
      <div style={note}>{text}</div>
    </div>
  );
}

// A frame after the slam has settled, for frames shown outside the film's own timeline.
const SETTLED = 20;

function Option({ letter, text }: { letter: MetaphorKey; text: string }) {
  const [first, second] = METAPHORS[letter];
  const half = (PANEL.w - 16) / 2 / 1920;
  return (
    <div>
      <div style={{ display: "flex", gap: 16 }}>
        <Frame scale={half}>
          <Freeze frame={SETTLED}>
            <MetaphorFrame {...first} />
          </Freeze>
        </Frame>
        <Frame scale={half}>
          <Freeze frame={SETTLED}>
            <MetaphorFrame {...second} />
          </Freeze>
        </Frame>
      </div>
      <div style={note}>
        <b>{letter}</b> · {text}
      </div>
    </div>
  );
}

export const SCRIPT: ReadonlyArray<{ say: string; shows: string }> = [
  { say: "No slides today. I'm just going to talk.", shows: "inget, eller en teckning" },
  { say: "About the most important meeting in Sweden: fika.", shows: "teckning: kaffe och bulle" },
  { say: "Bill, how much coffee does a Swede drink in a year?", shows: "faktaslide med källa, vänta in den" },
  { say: "In our office, fika went from ten to forty-five minutes.", shows: "10 → 45, 4,5×" },
  { say: "One in three meetings should have been a fika.", shows: "1 av 3 figurer tända" },
  { say: "So: no deck. We do it live.", shows: "" },
]

export function Script({ span = 2 }: { span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span}`, alignSelf: "start", border: `2px solid ${INK}`, background: "#fff", padding: "26px 32px 22px" }}>
      <div style={{ ...hand, fontSize: 34, color: ORANGE }}>Vad du säger, ca 50 ord, 35–45 s, ingen teknik</div>
      {SCRIPT.map((line, i) => (
        <div key={line.say} style={{ display: "flex", gap: 18, marginTop: 12, fontFamily: FONT, fontSize: 27, lineHeight: 1.25 }}>
          <span style={{ fontWeight: 800, width: 26 }}>{i + 1}</span>
          <span style={{ fontWeight: 600, flex: 1 }}>{line.say}</span>
          <span style={{ fontWeight: 500, color: "#777", width: 400 }}>{line.shows ? `→ ${line.shows}` : ""}</span>
        </div>
      ))}
      <div style={{ ...note, color: "#555", marginTop: 18 }}>Byt gärna ämne. Behåll "from X to Y" och "Bill, how much/many…": de är kollade i koden.</div>
    </div>
  );
}

const MUSIC: ReadonlyArray<{ from: number; to: number; label: string; bg: string; fg: string }> = [
  { from: 1, to: 12, label: "låtens uppbyggnad", bg: "#cfcfcf", fg: INK },
  { from: 13, to: 13, label: "tyst", bg: INK, fg: PAPER },
  { from: 14, to: 15, label: "DROPPEN", bg: YELLOW, fg: INK },
  { from: 16, to: 39, label: "låg matta under din röst", bg: "#ececec", fg: INK },
  { from: 40, to: 46, label: "full fart, klipp på takten", bg: ORANGE, fg: INK },
  { from: 47, to: 47, label: "svart", bg: INK, fg: PAPER },
];

function MusicRow() {
  const width = BOARD_WIDTH - MARGIN * 2;
  const perBar = width / (END_BAR - 1);
  return (
    <div style={{ position: "relative", height: 120, marginTop: 28 }}>
      <div style={{ ...hand, fontSize: 30, color: INK }}>Musiken, takt för takt</div>
      <div style={{ position: "absolute", top: 46, left: 0, width, height: 44, display: "flex" }}>
        {MUSIC.map((m) => (
          <div key={m.from} style={{ width: (m.to - m.from + 1) * perBar, background: m.bg, color: m.fg, fontFamily: FONT, fontWeight: 700, fontSize: m.to === m.from ? 15 : 20, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", whiteSpace: "nowrap", borderRight: `2px solid ${PAPER}` }}>
            {m.label}
          </div>
        ))}
      </div>
      {[1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45].map((bar) => (
        <div key={bar} style={{ position: "absolute", top: 96, left: (bar - 1) * perBar, fontFamily: FONT, fontWeight: 600, fontSize: 18, color: "#666" }}>
          {bar}
        </div>
      ))}
    </div>
  );
}

const seconds = (Math.round((filmFrames() / 30) * 10) / 10).toString().replace(".", ",");

export function Board() {
  return (
    <FontsReady>
      <AbsoluteFill style={{ background: PAPER, padding: MARGIN, boxSizing: "border-box", display: "block" }}>
        <div style={{ ...shout, fontSize: 84, color: INK }}>DO IT LIVE · STORYBOARD 1</div>
        <div style={{ ...hand, fontSize: 34, color: "#555", marginTop: 10 }}>
          ca {seconds} s, {END_BAR - 1} takter vid {BPM} BPM. Allt flyttas till ditt spårs tempo när jag har mätt det. Inga ljud ännu.
        </div>
        <MusicRow />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${PANEL.w}px)`, columnGap: GUTTER, rowGap: 34, marginTop: 36 }}>
          <Still frame={at(1, 3)} text="Takt 1–3 · Scenario 1: pekaren jagar helskärm i menyerna. Påhittad app, inga riktiga varumärken." />
          <Still frame={at(3, 3)} text={'Takt 3 · Fel klick: "Rehearsing timings…" medan publiken väntar.'} />
          <Still frame={at(4, 2)} text="Takt 4–5 · Mobilklipp 1: du vänder ryggen mot publiken och läser från skärmen." />
          <Still frame={at(6, 3)} text="Takt 6–7 · Mobilklipp 2: klickern hoppar till slide 17 av 87." />
          <Still frame={at(9, 1)} text="Takt 8–10 · Textväggen, den enda täta bilden. Raderna lyses upp som karaoke: talaren läser högt." />
          <Still frame={at(12, 3)} text="Takt 11–12 · Samma mall, en till för varje taktslag." />
          <Still frame={at(13, 3)} text="Takt 13 · Musiken tystnar tvärt. Svart, mickklick, sedan F*CK IT. Svordomen finns bara i text." />
          <Still frame={at(14, 2)} text="Takt 14 · Droppen landar på WE'LL DO IT LIVE." />
          <Still frame={at(15, 2)} text="Takt 15 · USP:n, fyra ord." />
          <Still frame={at(24)} text="Takt 16–39, 45 s · LIVE: samma utsnitt som klipp 1, men vänd mot oss. Slides landar på skärmen bakom dig. Musiken ligger lågt under rösten." />
          <Script />
          <Option letter="A" text="Sändningen: en deck är en repris, det här är live." />
          <Option letter="B" text="Formatet med 20 slides à 20 sekunder, utan att nämna namnet (det är ett varumärke)." />
          <Option letter="C" text="Musiken: slides var noter, det här är jazz." />
          <Still frame={at(42, 3)} text="Takt 42–43 · Tre smällar på takten: THIS IS / HOW YOU PRESENT / IN 2026." />
          <Still frame={at(45)} text="Takt 44–46 · Länken. Den enda tekniska raden står kvar för grindkollen i steg 1. Du kan stryka den." />
          <div style={{ ...note, ...hand, fontSize: 40, lineHeight: 1.25, color: INK, marginTop: 0, whiteSpace: "normal" }}>
            Takt 47 · mickklick, svart.
            <br />
            <br />
            Säg kör, eller vilka rutor vi ändrar.
            <br />
            Och: metafor A, B eller C?
          </div>
        </div>
      </AbsoluteFill>
    </FontsReady>
  );
}
