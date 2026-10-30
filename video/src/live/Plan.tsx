import type { ReactNode } from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { FONT } from "../brand";
import { FontsReady, hand, INK, ORANGE, PAPER, shout } from "../film/look";
import { at, DEMO_BAR, FPS, HYPE_BAR } from "./bars";
import { Frame, note, Script } from "./Board";
import { LiveFilm } from "./Film";

// One page for the shoot: the film in eight frames, three ways to record the live part, and what to say.

const MARGIN = 48;
const THUMB = 0.27;
const SETUP = 0.375;
export const PLAN_WIDTH = MARGIN * 2 + 1920 * SETUP * 3 + 32 * 2;
export const PLAN_HEIGHT = 2110;

const FILM: ReadonlyArray<{ frame: number; label: string }> = [
  { frame: at(3, 2), label: "Helskärm? Rummet väntar." },
  { frame: at(4, 2), label: "Ryggen mot publiken." },
  { frame: at(6, 4.5), label: "Fel slide." },
  { frame: at(12, 0), label: "Presentation bingo." },
  { frame: at(14, 2), label: "Tyst. Klick. Droppen." },
  { frame: at(DEMO_BAR + 2), label: "DU, live, 35–45 s." },
  { frame: at(HYPE_BAR + 2, 3), label: "This is how you present in 2026." },
  { frame: at(HYPE_BAR + 5), label: "Länken." },
];

const clock = (frame: number): string => {
  const s = Math.floor(frame / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Person({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <>
      <div style={{ position: "absolute", left: x - 85 * size, top: y, width: 170 * size, height: 170 * size, borderRadius: "50%", background: "#5a5a5a" }} />
      <div style={{ position: "absolute", left: x - 210 * size, top: y + 190 * size, width: 420 * size, height: 420 * size, borderRadius: `${200 * size}px ${200 * size}px 0 0`, background: "#5a5a5a" }} />
    </>
  );
}

function Laptop({ x, y }: { x: number; y: number }) {
  return <div style={{ position: "absolute", left: x - 150, top: y, width: 300, height: 120, background: "#bfc5cc", border: "8px solid #222", borderRadius: 10 }} />;
}

function MiniSlide({ left, top, width }: { left: number; top: number; width: number }) {
  return (
    <div style={{ position: "absolute", left, top, width, height: (width * 9) / 16, background: PAPER, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "10px solid #111" }}>
      <div style={{ ...shout, fontSize: width / 6, color: INK }}>10 → 45</div>
      <div style={{ ...hand, fontSize: width / 14, color: ORANGE }}>minutes of fika</div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return <div style={{ ...shout, position: "absolute", left: 50, top: 40, fontSize: 90, color: PAPER, padding: "6px 24px", background: INK }}>{text}</div>;
}

const SETUPS: ReadonlyArray<{ title: string; text: string; scene: ReactNode }> = [
  {
    title: "A · PROJEKTOR",
    text: "Bäst. Mobilen på stativ filmar dig och duken. Datorn i handen speglar skärmen till projektorn, kör Do it live och spelar in skärmen, och dess mikrofon tar ljudet. Titta på oss, aldrig på duken.",
    scene: (
      <AbsoluteFill style={{ background: "#2a2a2a" }}>
        <MiniSlide left={760} top={90} width={1050} />
        <Person x={500} y={330} />
        <Laptop x={500} y={640} />
        <Tag text="A" />
      </AbsoluteFill>
    ),
  },
  {
    title: "B · UTOMHUS",
    text: "Spontant. Mobilen filmar dig, datorn i handen spelar in skärmen. Jag lägger slidesen bredvid dig i bild.",
    scene: (
      <AbsoluteFill style={{ background: "#9cc9f5" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 360, background: "#5d8f4e" }} />
        <Person x={640} y={300} />
        <Laptop x={640} y={610} />
        <MiniSlide left={1080} top={150} width={720} />
        <Tag text="B" />
      </AbsoluteFill>
    ),
  },
  {
    title: "C · VID DATORN",
    text: "Enklast. Mobilen filmar dig, datorn spelar in skärmen. Jag gör den runda bubblan med ditt ansikte.",
    scene: (
      <AbsoluteFill style={{ background: "#111" }}>
        <MiniSlide left={360} top={120} width={1200} />
        <div style={{ position: "absolute", right: 70, bottom: 60, width: 330, height: 330, borderRadius: "50%", background: "#3a3a3a", overflow: "hidden" }}>
          <Person x={165} y={70} size={0.55} />
        </div>
        <Tag text="C" />
      </AbsoluteFill>
    ),
  },
];

const STEPS = [
  "Starta skärminspelning på datorn: QuickTime → Arkiv → Ny skärminspelning, mikrofon: MacBook.",
  "Starta mobilen, liggande, så att du syns.",
  "Klappa en gång i händerna. Då synkar jag de två inspelningarna.",
  "Tryck på micken i Do it live och prata. Titta på oss.",
  "Stoppa båda. Skicka båda filerna.",
];

export function Plan() {
  return (
    <FontsReady>
      <AbsoluteFill style={{ background: PAPER, padding: MARGIN, boxSizing: "border-box", display: "block" }}>
        <div style={{ ...shout, fontSize: 78, color: INK }}>DO IT LIVE · PLANEN</div>
        <div style={{ ...hand, fontSize: 34, color: "#555", marginTop: 8 }}>Filmen, ca 90 s. Allt utom ruta 6 är redan byggt. Ruta 6 är du.</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${1920 * THUMB}px)`, columnGap: 32, rowGap: 22, marginTop: 28 }}>
          {FILM.map((f, i) => (
            <div key={f.frame}>
              <div style={{ outline: i === 5 ? `8px solid ${ORANGE}` : "none" }}>
                <Frame scale={THUMB}>
                  <Freeze frame={f.frame}>
                    <LiveFilm />
                  </Freeze>
                </Frame>
              </div>
              <div style={{ ...note, fontSize: 24, marginTop: 10 }}>
                <b>
                  {i + 1} · {clock(f.frame)}
                </b>{" "}
                {f.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...shout, fontSize: 56, color: INK, marginTop: 44 }}>RUTA 6: VÄLJ ETT SÄTT ATT SPELA IN</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${1920 * SETUP}px)`, columnGap: 32, marginTop: 20 }}>
          {SETUPS.map((s) => (
            <div key={s.title}>
              <Frame scale={SETUP}>{s.scene}</Frame>
              <div style={note}>
                <b>{s.title}.</b> {s.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `${1920 * SETUP}px ${1920 * SETUP * 2 + 32}px`, columnGap: 32, marginTop: 40 }}>
          <div style={{ border: `2px solid ${INK}`, background: "#fff", padding: "26px 32px 22px", alignSelf: "start" }}>
            <div style={{ ...hand, fontSize: 34, color: ORANGE }}>Gör så här, alla tre sätten</div>
            {STEPS.map((step, i) => (
              <div key={step} style={{ display: "flex", gap: 16, marginTop: 12, fontFamily: FONT, fontSize: 25, fontWeight: 600, lineHeight: 1.3 }}>
                <span style={{ fontWeight: 800 }}>{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <Script span={1} />
        </div>
      </AbsoluteFill>
    </FontsReady>
  );
}
