import type { CSSProperties, ReactNode } from "react";
import type { SceneName } from "@/lib/scene-catalog";

const v = (vars: Record<string, string | number>): CSSProperties => vars as CSSProperties;
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const FG = "var(--fg)";
const ALT = "var(--alt)";

// Offsets the swarm dots start from before they pull into a ring.
const SWARM: [number, number][] = [
  [-62, -30], [58, -34], [-70, 12], [66, 20], [-30, -40], [28, 38], [-48, 34], [44, -8],
  [-12, 42], [14, -42], [-74, -8], [72, -22], [0, 40], [-36, 8],
];

// Where the scatter dots end up: [x, y] across the whole frame.
const SCATTER: [number, number][] = [
  [18, 14], [52, 8], [96, 16], [142, 12], [30, 38], [70, 30], [118, 34], [150, 46],
  [12, 62], [46, 70], [84, 62], [124, 72], [146, 80], [64, 82], [104, 50], [28, 84],
];

// One wavelength is 40 units; the path runs past both edges so it can slide a full wavelength.
// Hype that comes and goes: up, down, higher, lower, as one line.
const RIDE = "M8 64 C 22 64 26 24 40 24 S 56 70 70 70 S 86 14 100 14 S 116 60 130 60 S 144 36 154 36";

const RENDER: Record<SceneName, () => ReactNode> = {
  surge: () =>
    [3, 4, 5, 7, 9, 34, 96].map((h, i) => (
      <rect key={i} className="sg" x={18 + i * 19} y={82 - h} width="12" height={h} fill={i === 6 ? ALT : FG} style={v({ "--i": i })} />
    )),

  hush: () => (
    <>
      {range(7).map((i) => (
        <circle key={i} className={i === 3 ? "hs-one" : undefined} cx={26 + i * 18} cy="56" r="6.5" fill={i === 3 ? ALT : FG} />
      ))}
      <circle className="hs-word" cx="80" cy="40" r="3.2" fill={ALT} />
    </>
  ),

  swarm: () => (
    <>
      <circle cx="80" cy="45" r="7" fill={ALT} className="sw-core" />
      {SWARM.map(([dx, dy], i) => {
        const a = (i / SWARM.length) * Math.PI * 2;
        return <circle key={i} className="sw" cx={80 + Math.cos(a) * 19} cy={45 + Math.sin(a) * 19} r="3.4" fill={FG} style={v({ "--dx": `${dx}px`, "--dy": `${dy}px`, "--i": i })} />;
      })}
    </>
  ),

  collapse: () =>
    range(6).map((i) => (
      <rect key={i} className="cl" x="66" y={70 - i * 11} width="28" height="9" fill={i === 5 ? ALT : FG} style={v({ "--i": i, "--tx": `${(i % 2 ? 1 : -1) * (14 + i * 7)}px`, "--r": `${(i % 2 ? 1 : -1) * (40 + i * 22)}deg` })} />
    )),

  spark: () =>
    range(28).map((i) => {
      const col = i % 7;
      const row = Math.floor(i / 7);
      return <circle key={i} className="sp" cx={26 + col * 18} cy={18 + row * 18} r="3.6" fill={i === 21 ? ALT : FG} style={v({ "--d": col + (3 - row) })} />;
    }),

  wait: () => (
    <>
      <circle cx="80" cy="45" r="24" fill="none" stroke={FG} strokeWidth="7" opacity="0.18" />
      <g className="wt-spin">
        <circle className="wt-arc" cx="80" cy="45" r="24" fill="none" stroke={ALT} strokeWidth="7" strokeLinecap="round" pathLength={100} />
      </g>
    </>
  ),

  clash: () => (
    <>
      <rect className="cs-l" x="14" y="27" width="46" height="36" fill={FG} />
      <rect className="cs-r" x="100" y="27" width="46" height="36" fill={ALT} />
      {[-34, 0, 34].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 80 45)`}>
          <rect className="cs-spark" x="78.8" y="6" width="2.4" height="13" fill={FG} />
        </g>
      ))}
    </>
  ),

  climb: () => (
    <>
      {range(6).map((i) => (
        <rect key={i} x={20 + i * 20} y={84 - 10 * (i + 1)} width="20" height={10 * (i + 1)} fill={FG} />
      ))}
      <circle className="cb" cx="30" cy="69" r="4.6" fill={ALT} />
    </>
  ),

  scatter: () =>
    SCATTER.map(([x, y], i) => (
      <circle key={i} className="sct" cx={x} cy={y} r={i % 3 === 0 ? 4.4 : 3.2} fill={i % 4 === 0 ? ALT : FG} style={v({ "--tx": `${80 - x}px`, "--ty": `${45 - y}px`, "--i": i })} />
    )),

  focus: () => (
    <>
      {range(45).map((i) => {
        const col = i % 9;
        const row = Math.floor(i / 9);
        const target = col === 5 && row === 2;
        return <circle key={i} className={target ? "fc-dot" : undefined} cx={24 + col * 14} cy={15 + row * 15} r="3" fill={FG} opacity={target ? 1 : 0.22} />;
      })}
      <circle className="fc-ring" cx="94" cy="45" r="9" fill="none" stroke={ALT} strokeWidth="2.6" />
    </>
  ),

  orbit: () => (
    <>
      <circle cx="80" cy="45" r="20" fill="none" stroke={FG} strokeWidth="0.9" opacity="0.3" />
      <circle cx="80" cy="45" r="33" fill="none" stroke={FG} strokeWidth="0.9" opacity="0.3" />
      <circle cx="80" cy="45" r="9" fill={ALT} />
      <g className="ob ob-a">
        <circle cx="100" cy="45" r="4.2" fill={FG} />
      </g>
      <g className="ob ob-b">
        <circle cx="113" cy="45" r="5.2" fill={FG} />
      </g>
      <g className="ob ob-c">
        <circle cx="47" cy="45" r="2.8" fill={FG} />
      </g>
    </>
  ),

  pulse: () => (
    <>
      <path d="M-4 45 H164" stroke={FG} strokeWidth="1" opacity="0.25" fill="none" />
      <path className="pl" d="M-4 45 H52 l7 -24 l9 48 l8 -38 l6 14 H164" fill="none" stroke={FG} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" pathLength={100} />
      <circle className="pl-beat" cx="124" cy="45" r="4.6" fill={ALT} />
    </>
  ),

  grow: () => (
    <>
      <rect x="40" y="80" width="80" height="2.6" fill={FG} opacity="0.3" />
      <rect className="gr-stem" x="78.4" y="28" width="3.2" height="52" fill={FG} />
      {/* The tilt lives on a wrapper: a CSS transform on the leaf itself would replace it. */}
      <g transform="rotate(-24 90 60)">
        <ellipse className="gr-leaf" cx="90" cy="60" rx="10" ry="4.6" fill={FG} style={v({ "--d": 0 })} />
      </g>
      <g transform="rotate(24 70 49)">
        <ellipse className="gr-leaf" cx="70" cy="49" rx="10" ry="4.6" fill={FG} style={v({ "--d": 1 })} />
      </g>
      <g transform="rotate(-24 89 39)">
        <ellipse className="gr-leaf" cx="89" cy="39" rx="8" ry="4" fill={FG} style={v({ "--d": 2 })} />
      </g>
      <circle className="gr-leaf" cx="80" cy="24" r="8.5" fill={ALT} style={v({ "--d": 3.4 })} />
    </>
  ),

  lock: () => (
    <>
      <circle className="lk-flash" cx="80" cy="52" r="34" fill="none" stroke={ALT} strokeWidth="2.2" />
      <path className="lk-shackle" d="M67 46 V33 a13 13 0 0 1 26 0 V46" fill="none" stroke={FG} strokeWidth="7" strokeLinecap="round" />
      <rect x="58" y="44" width="44" height="34" rx="6" fill={FG} />
      <circle className="lk-hole" cx="80" cy="58" r="4.6" fill={ALT} />
      <rect className="lk-hole" x="78" y="60" width="4" height="9" rx="2" fill={ALT} />
    </>
  ),

  drain: () => (
    <>
      <rect x="44" y="28" width="68" height="34" rx="6" fill="none" stroke={FG} strokeWidth="3.6" />
      <rect x="114" y="38" width="6" height="14" rx="2" fill={FG} />
      <rect className="dn-cell" x="50" y="34" width="56" height="22" rx="2.5" fill={FG} />
    </>
  ),

  stack: () =>
    range(5).map((i) => (
      <rect key={i} className="stk" x="58" y={72 - i * 13} width="44" height="11" fill={i === 4 ? ALT : FG} style={v({ "--i": i })} />
    )),

  wave: () => (
    <>
      <path d={RIDE} fill="none" stroke={FG} strokeWidth="2" opacity="0.18" />
      <path className="wv-line" d={RIDE} fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={100} />
      <circle r="5.6" fill={ALT}>
        <animateMotion dur="3.6s" repeatCount="indefinite" path={RIDE} keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" />
      </circle>
    </>
  ),

  echo: () => (
    <>
      {range(4).map((i) => (
        <circle key={i} className="ec" cx="80" cy="45" r="40" fill="none" stroke={FG} strokeWidth="2.6" style={v({ "--i": i })} />
      ))}
      <circle cx="80" cy="45" r="5.4" fill={ALT} />
    </>
  ),

  outlier: () =>
    range(24).map((i) => {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const x = 22 + col * 16.6;
      const y = 18 + row * 22;
      return col === 5 && row === 1 ? (
        <circle key={i} className="ot" cx={x + 4.5} cy={y + 4.5} r="6" fill={ALT} />
      ) : (
        <rect key={i} x={x} y={y} width="9" height="9" fill={FG} />
      );
    }),

  balance: () => (
    <>
      <polygon points="80,57 69,78 91,78" fill={FG} />
      <g className="bl">
        <rect x="22" y="52" width="116" height="5" fill={FG} />
        <circle cx="36" cy="41" r="10.5" fill={FG} />
        <rect x="114" y="32" width="20" height="20" fill={ALT} />
      </g>
    </>
  ),

  loop: () => (
    <>
      <g className="lp">
        <circle cx="80" cy="45" r="26" fill="none" stroke={FG} strokeWidth="6" pathLength={100} strokeDasharray="74 100" />
        <polygon points="80,8 80,30 96,19" fill={FG} />
      </g>
      <circle cx="80" cy="45" r="6.5" fill={ALT} />
    </>
  ),

  launch: () => (
    <>
      <rect x="0" y="82" width="160" height="2.6" fill={FG} opacity="0.3" />
      <g className="ln">
        <polygon className="ln-flame" points="74,62 86,62 80,78" fill={ALT} />
        <polygon points="80,18 70,36 90,36" fill={ALT} />
        <rect x="72" y="36" width="16" height="26" fill={FG} />
        <polygon points="72,50 61,64 72,62" fill={FG} />
        <polygon points="88,50 99,64 88,62" fill={FG} />
      </g>
    </>
  ),
};

/** Wordless animated metaphors. Pure SVG and CSS, drawn in the slide's own colours. */
export function Scene({ name }: { name: SceneName }) {
  return (
    <svg className={`scene scene-${name}`} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {RENDER[name]()}
    </svg>
  );
}
