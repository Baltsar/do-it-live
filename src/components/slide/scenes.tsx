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

  earth: () => (
    <>
      <circle cx="80" cy="45" r="30" fill="none" stroke={FG} strokeWidth="3.6" />
      <ellipse cx="80" cy="45" rx="13" ry="30" fill="none" stroke={FG} strokeWidth="2" opacity="0.6" />
      <line x1="50" y1="45" x2="110" y2="45" stroke={FG} strokeWidth="2" opacity="0.6" />
      <line x1="54" y1="30" x2="106" y2="30" stroke={FG} strokeWidth="2" opacity="0.6" />
      <line x1="54" y1="60" x2="106" y2="60" stroke={FG} strokeWidth="2" opacity="0.6" />
      {([[64, 30], [92, 26], [104, 44], [70, 52], [86, 62], [58, 46], [96, 58], [76, 38]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} className="er" cx={x} cy={y} r="3.4" fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  deal: () => (
    <>
      <rect x="46" y="14" width="68" height="62" rx="3" fill="none" stroke={FG} strokeWidth="3.6" />
      <rect x="56" y="26" width="48" height="3" fill={FG} opacity="0.35" />
      <rect x="56" y="34" width="40" height="3" fill={FG} opacity="0.35" />
      <rect x="56" y="42" width="44" height="3" fill={FG} opacity="0.35" />
      <path className="dl-sign" d="M58 60 C 64 50, 68 70, 74 58 S 84 48, 90 62 S 100 52, 104 58" fill="none" stroke={FG} strokeWidth="3" strokeLinecap="round" pathLength={100} />
      <g className="dl-stamp">
        <circle cx="104" cy="66" r="11" fill={ALT} />
        <path d="M98 66 L102 70.5 L110.5 61.5" fill="none" stroke={FG} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  ),

  money: () => (
    <>
      <rect x="30" y="80" width="100" height="2.6" fill={FG} opacity="0.3" />
      {[[52, 3], [80, 5], [108, 7]].flatMap(([x, n], s) =>
        range(n).map((i) => {
          const k = s * 7 + i;
          const top = s === 2 && i === n - 1;
          // The field colour as a hairline between coins: a stack reads as coins, not as one column.
          return <ellipse key={k} className="mn" cx={x} cy={76 - i * 5.5} rx="12" ry="4" fill={top ? ALT : FG} stroke="var(--bg)" strokeWidth="1.4" style={v({ "--i": k })} />;
        }),
      )}
    </>
  ),

  clock: () => (
    <>
      <circle cx="80" cy="45" r="30" fill="none" stroke={FG} strokeWidth="3.6" />
      {range(12).map((i) => {
        const a = (i * Math.PI) / 6;
        const big = i % 3 === 0;
        const r0 = big ? 23 : 25;
        return <line key={i} x1={80 + Math.sin(a) * r0} y1={45 - Math.cos(a) * r0} x2={80 + Math.sin(a) * 28} y2={45 - Math.cos(a) * 28} stroke={FG} strokeWidth={big ? 3.4 : 2.2} strokeLinecap="round" />;
      })}
      <line className="ck-h" x1="80" y1="45" x2="80" y2="27" stroke={FG} strokeWidth="4.2" strokeLinecap="round" />
      <line className="ck-m" x1="80" y1="45" x2="80" y2="19" stroke={ALT} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="80" cy="45" r="3.2" fill={ALT} />
    </>
  ),

  idea: () => (
    <>
      <circle className="id-glow" cx="80" cy="36" r="13" fill={ALT} />
      <circle cx="80" cy="36" r="17" fill="none" stroke={FG} strokeWidth="3.6" />
      <rect x="71" y="52" width="18" height="5" rx="1.5" fill={FG} />
      <rect x="73" y="59" width="14" height="4" rx="1.5" fill={FG} />
      <rect x="75" y="65" width="10" height="3" rx="1.5" fill={FG} />
      {([[80, 13, 80, 5], [96.3, 19.7, 101.9, 14.1], [63.7, 19.7, 58.1, 14.1], [102.6, 32, 110.5, 30.6], [57.4, 32, 49.5, 30.6]] as [number, number, number, number][]).map(([x1, y1, x2, y2], i) => (
        <line key={i} className="id-ray" x1={x1} y1={y1} x2={x2} y2={y2} stroke={ALT} strokeWidth="3.4" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
    </>
  ),

  trophy: () => (
    <>
      <g className="tr">
        <path d="M62 18 H98 V40 C98 54, 88 60, 80 60 C72 60, 62 54, 62 40 Z" fill={FG} />
        <path d="M62 24 H52 C46 24, 46 40, 56 42" fill="none" stroke={FG} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M98 24 H108 C114 24, 114 40, 104 42" fill="none" stroke={FG} strokeWidth="3.6" strokeLinecap="round" />
        <rect x="77" y="60" width="6" height="10" fill={FG} />
        <rect x="66" y="70" width="28" height="6" rx="1.5" fill={FG} />
        <polygon points="80,28 82.4,33.4 88,34 83.8,37.8 85,43.6 80,40.6 75,43.6 76.2,37.8 72,34 77.6,33.4" fill={ALT} />
      </g>
      {([[48, 16], [114, 12], [120, 36]] as [number, number][]).map(([x, y], i) => (
        <polygon key={i} className="tr-sp" points={`${x},${y - 5} ${x + 3},${y} ${x},${y + 5} ${x - 3},${y}`} fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  speed: () => (
    <>
      {/* Three streaks on their own clocks, so something is always crossing. */}
      {[[26, 42, 9], [60, 56, 5], [14, 72, 6]].map(([y, len, r], i) => (
        <g key={i} className="spd" style={v({ "--i": i })}>
          <line x1={108 - len} y1={y} x2="102" y2={y} stroke={FG} strokeWidth={r * 0.55} strokeLinecap="round" opacity="0.9" />
          <line x1={108 - len * 1.7} y1={y} x2={108 - len - 6} y2={y} stroke={FG} strokeWidth={r * 0.4} strokeLinecap="round" opacity="0.45" />
          <circle cx="108" cy={y} r={r} fill={i === 0 ? ALT : FG} />
        </g>
      ))}
    </>
  ),

  team: () => (
    <>
      <rect x="20" y="78" width="120" height="2.6" fill={FG} opacity="0.3" />
      {[44, 68, 92, 116].map((x, i) => (
        <g key={i} className="tm" style={v({ "--i": i, "--dx": `${i < 2 ? -70 : 70}px` })}>
          <circle cx={x} cy="32" r="7.5" fill={i === 2 ? ALT : FG} />
          <rect x={x - 11} y="44" width="22" height="34" rx="10" fill={i === 2 ? ALT : FG} />
        </g>
      ))}
    </>
  ),

  heart: () => (
    <>
      <path className="ht" d="M80 72 C 58 58, 44 46, 44 31 C 44 19, 56 12, 65 18 C 72 22, 78 29, 80 33 C 82 29, 88 22, 95 18 C 104 12, 116 19, 116 31 C 116 46, 102 58, 80 72 Z" fill={FG} />
      {([[46, 22], [118, 18]] as [number, number][]).map(([x, y], i) => (
        <path key={i} className="ht-sm" d={`M${x} ${y + 6} C ${x - 5} ${y + 3}, ${x - 8} ${y}, ${x - 8} ${y - 3} C ${x - 8} ${y - 6}, ${x - 5} ${y - 7}, ${x - 3} ${y - 5} C ${x - 1} ${y - 4}, ${x} ${y - 2}, ${x} ${y - 1} C ${x} ${y - 2}, ${x + 1} ${y - 4}, ${x + 3} ${y - 5} C ${x + 5} ${y - 7}, ${x + 8} ${y - 6}, ${x + 8} ${y - 3} C ${x + 8} ${y}, ${x + 5} ${y + 3}, ${x} ${y + 6} Z`} fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  question: () => (
    <>
      <g transform="translate(14 8) scale(0.45)" opacity="0.25">
        <path d="M64 34 C 64 16, 96 16, 96 34 C 96 46, 80 44, 80 58" fill="none" stroke={FG} strokeWidth="7" strokeLinecap="round" />
        <circle cx="80" cy="70" r="5" fill={FG} />
      </g>
      <g transform="translate(96 40) scale(0.4)" opacity="0.25">
        <path d="M64 34 C 64 16, 96 16, 96 34 C 96 46, 80 44, 80 58" fill="none" stroke={FG} strokeWidth="7" strokeLinecap="round" />
        <circle cx="80" cy="70" r="5" fill={FG} />
      </g>
      <path className="qs-ln" d="M64 34 C 64 16, 96 16, 96 34 C 96 46, 80 44, 80 58" fill="none" stroke={FG} strokeWidth="7" strokeLinecap="round" pathLength={100} />
      <circle className="qs-dot" cx="80" cy="70" r="5" fill={ALT} />
    </>
  ),

  journey: () => (
    <>
      <path d="M28 72 C 50 72, 54 40, 76 40 S 104 70, 124 30" fill="none" stroke={FG} strokeWidth="3" strokeDasharray="4 5" strokeLinecap="round" opacity="0.3" />
      <path className="jn-ln" d="M28 72 C 50 72, 54 40, 76 40 S 104 70, 124 30" fill="none" stroke={ALT} strokeWidth="3.4" strokeLinecap="round" pathLength={100} />
      <circle cx="28" cy="72" r="4.5" fill={FG} />
      <g className="jn-pin">
        <path d="M124 30 C 116 20, 114 16, 114 12 A 10 10 0 1 1 134 12 C 134 16, 132 20, 124 30 Z" fill={ALT} />
        <circle cx="124" cy="12" r="3.6" fill={FG} />
      </g>
    </>
  ),

  fire: () => (
    <>
      <path className="fr-out" d="M80 14 C 66 30, 56 42, 56 58 C 56 72, 67 80, 80 80 C 93 80, 104 72, 104 58 C 104 46, 96 40, 92 30 C 90 40, 86 42, 84 40 C 88 30, 86 22, 80 14 Z" fill={FG} />
      <path className="fr-in" d="M80 48 C 72 56, 68 62, 68 68 C 68 75, 73 80, 80 80 C 87 80, 92 75, 92 68 C 92 62, 88 58, 80 48 Z" fill={ALT} />
      {([[62, 30], [100, 22], [70, 18]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} className="fr-em" cx={x} cy={y} r="2.4" fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  shield: () => (
    <>
      <path className="sh-body" d="M80 12 L110 22 V44 C110 62, 97 74, 80 80 C63 74, 50 62, 50 44 V22 Z" fill="none" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 24 L100 31 V44 C100 56, 91 65, 80 70 Z" fill={FG} opacity="0.25" />
      {[32, 46, 60].map((y, i) => (
        <circle key={i} className="sh-hit" cx="12" cy={y} r="3.6" fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  magnet: () => (
    <>
      <path d="M108 28 H68 A17 17 0 0 0 68 62 H108" fill="none" stroke={FG} strokeWidth="11" />
      <rect x="108" y="22.5" width="14" height="11" fill={ALT} />
      <rect x="108" y="56.5" width="14" height="11" fill={ALT} />
      {([[140, 22], [146, 30], [142, 58], [148, 66], [144, 40]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} className="mg-dot" cx={x} cy={y} r="3" fill={FG} style={v({ "--i": i })} />
      ))}
    </>
  ),

  puzzle: () => (
    <>
      <rect x="53" y="19" width="26" height="26" rx="3" fill={FG} />
      <rect x="81" y="19" width="26" height="26" rx="3" fill={FG} />
      <rect x="53" y="47" width="26" height="26" rx="3" fill={FG} />
      <circle cx="80" cy="32" r="4.5" fill={FG} />
      <circle cx="94" cy="46" r="4.5" fill={FG} />
      <rect className="pz-last" x="81" y="47" width="26" height="26" rx="3" fill={ALT} />
      <circle cx="80" cy="60" r="4.5" fill={FG} />
    </>
  ),

  key: () => (
    <>
      <rect x="92" y="20" width="40" height="50" rx="6" fill="none" stroke={FG} strokeWidth="3.6" />
      <circle className="ky-hole" cx="112" cy="40" r="5" fill={ALT} />
      <rect x="109.5" y="43" width="5" height="10" rx="1" fill={ALT} />
      <g className="ky">
        <circle cx="40" cy="45" r="9" fill="none" stroke={FG} strokeWidth="5" />
        <rect x="48" y="42.5" width="42" height="5" fill={FG} />
        <rect x="78" y="47" width="4" height="7" fill={FG} />
        <rect x="85" y="47" width="4" height="5" fill={FG} />
      </g>
    </>
  ),

  fall: () => (
    <>
      <rect x="10" y="82" width="140" height="2.6" fill={FG} opacity="0.3" />
      {range(5).map((i) => (
        <rect key={i} x="10" y={22 + i * 12} width="140" height="1" fill={FG} opacity="0.12" />
      ))}
      <path className="fl-ln" d="M14 22 L46 26 L70 40 L96 44 L118 66 L146 76" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={100} />
      <circle className="fl-dot" cx="146" cy="76" r="5" fill={ALT} />
    </>
  ),

  target: () => (
    <>
      <circle cx="104" cy="45" r="26" fill="none" stroke={FG} strokeWidth="4" />
      <circle cx="104" cy="45" r="15" fill="none" stroke={FG} strokeWidth="4" />
      <circle className="tg-eye" cx="104" cy="45" r="5.5" fill={ALT} />
      <g className="tg-ar">
        <line x1="22" y1="45" x2="98" y2="45" stroke={FG} strokeWidth="4" strokeLinecap="round" />
        <polygon points="102,45 92,39.5 92,50.5" fill={FG} />
        <polygon points="22,45 12,38 17,45 12,52" fill={ALT} />
      </g>
    </>
  ),

  fork: () => (
    <>
      <path d="M12 45 H64" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
      <path d="M64 45 C 84 45, 96 22, 148 22" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
      <path d="M64 45 C 84 45, 96 68, 148 68" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
      <path className="fk-pick" d="M64 45 C 84 45, 96 22, 148 22" fill="none" stroke={ALT} strokeWidth="4" strokeLinecap="round" pathLength={100} />
      <circle className="fk-dot" cx="12" cy="45" r="5.5" fill={ALT} />
    </>
  ),

  bridge: () => (
    <>
      <rect x="6" y="56" width="42" height="28" fill={FG} />
      <rect x="112" y="56" width="42" height="28" fill={FG} />
      {range(6).map((i) => (
        <rect key={i} className="br-pl" x={48 + i * 10.7} y="54" width="9" height="4" rx="1" fill={FG} style={v({ "--i": i })} />
      ))}
      <circle className="br-dot" cx="28" cy="48" r="5" fill={ALT} />
    </>
  ),

  funnel: () => (
    <>
      <path d="M34 14 H126 L92 50 V72 H68 V50 Z" fill="none" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
      {range(9).map((i) => (
        <circle key={i} className="fn-in" cx={44 + i * 9} cy="6" r="3.2" fill={ALT} style={v({ "--i": i % 4 })} />
      ))}
      <circle className="fn-out" cx="80" cy="76" r="4" fill={ALT} />
    </>
  ),

  crowd: () => (
    <>
      {range(27).map((i) => {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const x = 16 + col * 16 + (row % 2) * 8;
        const y = 28 + row * 21;
        const alt = i === 4 || i === 13 || i === 23;
        return (
          <g key={i} className="cr" style={v({ "--i": i })}>
            <circle cx={x} cy={y} r="4.6" fill={alt ? ALT : FG} />
            <rect x={x - 6} y={y + 6} width="12" height="11" rx="5" fill={alt ? ALT : FG} />
          </g>
        );
      })}
    </>
  ),

  eye: () => (
    <>
      <circle cx="80" cy="45" r="16" fill={FG} />
      <circle className="ey-pu" cx="80" cy="45" r="7" fill={ALT} />
      <path className="ey-lid" d="M18 45 C 40 14, 120 14, 142 45 C 120 76, 40 76, 18 45 Z" fill="var(--bg)" />
      <path d="M18 45 C 40 14, 120 14, 142 45 C 120 76, 40 76, 18 45 Z" fill="none" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
    </>
  ),

  chip: () => (
    <>
      {range(6).map((i) => (
        <rect key={`l${i}`} className="cp-pin" x="44" y={25.5 + i * 7.5} width="12" height="3" fill={FG} style={v({ "--i": i })} />
      ))}
      {range(6).map((i) => (
        <rect key={`r${i}`} className="cp-pin" x="104" y={25.5 + i * 7.5} width="12" height="3" fill={FG} style={v({ "--i": i + 6 })} />
      ))}
      {range(6).map((i) => (
        <rect key={`t${i}`} className="cp-pin" x={60.5 + i * 7.5} y="9" width="3" height="12" fill={FG} style={v({ "--i": i + 12 })} />
      ))}
      {range(6).map((i) => (
        <rect key={`b${i}`} className="cp-pin" x={60.5 + i * 7.5} y="69" width="3" height="12" fill={FG} style={v({ "--i": i + 18 })} />
      ))}
      <rect x="56" y="21" width="48" height="48" rx="4" fill={FG} />
      <rect className="cp-core" x="68" y="33" width="24" height="24" rx="2" fill={ALT} />
    </>
  ),

  cloud: () => (
    <>
      <path d="M44 60 H116 A14 14 0 0 0 112 33 A20 20 0 0 0 74 26 A17 17 0 0 0 44 60 Z" fill={FG} />
      <path className="cd-up" d="M66 84 V68 M59 75 L66 68 L73 75" fill="none" stroke={ALT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path className="cd-dn" d="M94 68 V84 M87 77 L94 84 L101 77" fill="none" stroke={ALT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  bug: () => (
    <>
      {[[60, 22], [84, 36], [50, 50], [72, 64]].map(([w, y], i) => (
        <rect key={i} className={i === 2 ? "bq-err" : undefined} x="24" y={y} width={w} height="4" rx="2" fill={FG} opacity="0.3" />
      ))}
      <g className="bq">
        {range(3).map((i) => (
          <line key={`a${i}`} className="bq-leg" x1="36" y1={46 + i * 5} x2="26" y2={42 + i * 5} stroke={FG} strokeWidth="2.4" strokeLinecap="round" />
        ))}
        {range(3).map((i) => (
          <line key={`b${i}`} className="bq-leg" x1="52" y1={46 + i * 5} x2="62" y2={42 + i * 5} stroke={FG} strokeWidth="2.4" strokeLinecap="round" />
        ))}
        <ellipse cx="44" cy="50" rx="10" ry="7.5" fill={ALT} />
        <circle cx="44" cy="40" r="4.5" fill={FG} />
        <line x1="44" y1="43" x2="44" y2="57" stroke={FG} strokeWidth="1.6" />
      </g>
    </>
  ),

  wall: () => (
    <>
      {range(8).map((row) =>
        range(3).map((col) => (
          <rect key={`${row}-${col}`} x={94 + col * 24 - (row % 2) * 12} y={8 + row * 10} width="22" height="8" rx="1" fill={FG} />
        )),
      )}
      <polyline className="wl-crack" points="94,45 101,40 98,33 106,28" fill="none" stroke={ALT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="wl-ball" cx="34" cy="46" r="7" fill={ALT} />
    </>
  ),

  gift: () => (
    <>
      <rect x="54" y="46" width="52" height="34" rx="2" fill={FG} />
      <rect x="77" y="46" width="6" height="34" fill={ALT} />
      <g className="gf-lid">
        <rect x="50" y="36" width="60" height="12" rx="2" fill={FG} />
        <rect x="77" y="36" width="6" height="12" fill={ALT} />
        <circle cx="73" cy="32" r="5" fill={ALT} />
        <circle cx="87" cy="32" r="5" fill={ALT} />
      </g>
      {([[44, 26], [116, 22], [122, 44]] as [number, number][]).map(([x, y], i) => (
        <polygon key={i} className="gf-sp" points={`${x},${y - 5} ${x + 3},${y} ${x},${y + 5} ${x - 3},${y}`} fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  dice: () => (
    <>
      <g className="dc dc-a">
        <rect x="42" y="32" width="26" height="26" rx="5" fill={FG} />
        {([[48, 38], [62, 38], [55, 45], [48, 52], [62, 52]] as [number, number][]).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill="var(--bg)" />
        ))}
      </g>
      <g className="dc dc-b">
        <rect x="92" y="32" width="26" height="26" rx="5" fill={ALT} />
        {([[98, 38], [105, 45], [112, 52]] as [number, number][]).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill={FG} />
        ))}
      </g>
    </>
  ),

  flag: () => (
    <>
      <path d="M0 86 C 50 86, 60 52, 80 52 C 100 52, 110 86, 160 86 Z" fill={FG} opacity="0.25" />
      <g className="fla-pole">
        <rect x="78.5" y="20" width="3" height="34" fill={FG} />
        <polygon className="fla-flag" points="81.5,20 110,27.5 81.5,35" fill={ALT} />
      </g>
    </>
  ),

  slow: () => (
    <>
      <rect x="10" y="78" width="140" height="2.6" fill={FG} opacity="0.3" />
      <path className="sl-tr" d="M14 75 H60" fill="none" stroke={ALT} strokeWidth="3" strokeLinecap="round" strokeDasharray="4 5" pathLength={100} />
      <g className="sl">
        <rect x="56" y="66" width="44" height="10" rx="5" fill={FG} />
        <circle cx="98" cy="63" r="6" fill={FG} />
        <line x1="100" y1="58" x2="104" y2="50" stroke={FG} strokeWidth="2" strokeLinecap="round" />
        <line x1="95" y1="58" x2="93" y2="50" stroke={FG} strokeWidth="2" strokeLinecap="round" />
        <circle cx="104" cy="49" r="1.8" fill={FG} />
        <circle cx="93" cy="49" r="1.8" fill={FG} />
        <circle cx="72" cy="58" r="13" fill={FG} />
        <circle cx="72" cy="58" r="7" fill="none" stroke={ALT} strokeWidth="3" />
        <circle cx="72" cy="58" r="2" fill={ALT} />
      </g>
    </>
  ),

  sunrise: () => (
    <>
      {([[-62, 10], [-46, 20], [-26, 27], [0, 30], [26, 27], [46, 20], [62, 10]] as [number, number][]).map(([dx, dy], i) => (
        <line key={i} className="sr-ray" x1={80 + dx * 0.78} y1={56 - dy * 0.78 - 6} x2={80 + dx} y2={56 - dy - 8} stroke={ALT} strokeWidth="3.4" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
      <circle className="sr-sun" cx="80" cy="78" r="18" fill={ALT} />
      <rect x="0" y="63" width="160" height="27" fill="var(--bg)" />
      <rect x="0" y="62" width="160" height="2.6" fill={FG} opacity="0.4" />
    </>
  ),

  ship: () => (
    <>
      <g className="shp">
        <polygon points="40,60 120,60 108,74 52,74" fill={FG} />
        <rect x="68" y="48" width="22" height="12" rx="1.5" fill={FG} />
        <rect x="92" y="40" width="7" height="20" fill={ALT} />
        {range(3).map((i) => (
          <circle key={i} className="shp-sm" cx="95.5" cy="36" r={2.4 + i * 0.6} fill={ALT} style={v({ "--i": i })} />
        ))}
      </g>
      <path className="shp-wv" d="M-20 76 Q -10 70 0 76 T 20 76 T 40 76 T 60 76 T 80 76 T 100 76 T 120 76 T 140 76 T 160 76 T 180 76" fill="none" stroke={FG} strokeWidth="3.4" strokeLinecap="round" />
      <path className="shp-wv shp-wv2" d="M-20 84 Q -10 78 0 84 T 20 84 T 40 84 T 60 84 T 80 84 T 100 84 T 120 84 T 140 84 T 160 84 T 180 84" fill="none" stroke={FG} strokeWidth="3.4" strokeLinecap="round" opacity="0.5" />
    </>
  ),

  bolt: () => (
    <>
      {([[40, 30, 30, 22], [120, 30, 130, 22], [36, 58, 26, 62], [124, 58, 134, 62]] as [number, number, number, number][]).map(([x1, y1, x2, y2], i) => (
        <line key={i} className="bt-ray" x1={x1} y1={y1} x2={x2} y2={y2} stroke={FG} strokeWidth="3.4" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
      <polygon className="bt-b" points="88,8 56,50 76,50 66,82 104,38 84,38 94,8" fill={ALT} stroke={FG} strokeWidth="3" strokeLinejoin="round" />
    </>
  ),

  chain: () => (
    <>
      {range(5).map((i) => (
        <rect key={i} className={`chn-lk${i === 2 ? " chn-br" : ""}`} x={18 + i * 26} y="37" width="26" height="16" rx="8" fill="none" stroke={i === 2 ? ALT : FG} strokeWidth="4" style={v({ "--i": i })} />
      ))}
      {range(4).map((i) => (
        <rect key={`j${i}`} className="chn-lk" x={38 + i * 26} y="41" width="12" height="8" rx="4" fill={FG} style={v({ "--i": i + 0.5 })} />
      ))}
    </>
  ),

  domino: () => (
    <>
      <rect x="10" y="80" width="140" height="2.6" fill={FG} opacity="0.3" />
      {range(7).map((i) => (
        <rect key={i} className={`dm${i < 3 ? " dm-f" : ""}`} x={22 + i * 18} y="52" width="6" height="28" rx="1.5" fill={i === 0 ? ALT : FG} style={v({ "--i": i })} />
      ))}
    </>
  ),

  bubble: () => (
    <>
      <g className="bb">
        <circle cx="80" cy="50" r="24" fill="none" stroke={FG} strokeWidth="4" />
        <path d="M66 40 A16 16 0 0 1 78 32" fill="none" stroke={ALT} strokeWidth="3.4" strokeLinecap="round" />
      </g>
      {([[-26, -22], [26, -24], [-30, 10], [30, 12], [0, -32], [4, 30]] as [number, number][]).map(([dx, dy], i) => (
        <circle key={i} className="bb-pop" cx="80" cy="38" r="3" fill={ALT} style={v({ "--dx": `${dx}px`, "--dy": `${dy}px` })} />
      ))}
    </>
  ),

  iceberg: () => (
    <>
      <polygon points="80,12 97,40 63,40" fill={FG} />
      <polygon className="ib-deep" points="56,41 104,41 118,64 90,84 60,80 44,60" fill={FG} opacity="0.35" />
      <rect x="0" y="39" width="160" height="2.6" fill={ALT} />
      {range(4).map((i) => (
        <rect key={i} x={10 + i * 40} y={52 + (i % 2) * 20} width="18" height="2" rx="1" fill={ALT} opacity="0.5" />
      ))}
    </>
  ),

  mountain: () => (
    <>
      <polygon points="0,84 44,30 70,56 100,16 130,52 160,84" fill={FG} />
      <polygon points="100,16 93,27 107,27" fill={ALT} />
      <polygon points="44,30 38,38 50,38" fill={ALT} />
      <path className="mt-path" d="M10 84 C 40 80, 52 62, 70 56 S 92 30, 100 20" fill="none" stroke={ALT} strokeWidth="3" strokeLinecap="round" strokeDasharray="3 4" pathLength={100} />
    </>
  ),

  night: () => (
    <>
      <circle cx="120" cy="24" r="12" fill={FG} />
      <circle cx="126" cy="20" r="11" fill="var(--bg)" />
      {([[20, 16], [44, 10], [60, 26], [92, 12], [142, 40], [30, 40], [150, 14]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} className="nt-st" cx={x} cy={y} r="1.8" fill={ALT} style={v({ "--i": i })} />
      ))}
      <rect x="54" y="44" width="40" height="40" fill={FG} />
      {range(9).map((i) => (
        <rect key={i} className={i === 4 ? "nt-win" : undefined} x={60 + (i % 3) * 11} y={50 + Math.floor(i / 3) * 11} width="6" height="6" fill={i === 4 ? ALT : "var(--bg)"} opacity={i === 4 ? 1 : 0.35} />
      ))}
      <rect x="0" y="84" width="160" height="2.6" fill={FG} opacity="0.3" />
    </>
  ),

  mic: () => (
    <>
      <rect x="70" y="14" width="20" height="36" rx="10" fill={FG} />
      <path d="M60 42 A20 20 0 0 0 100 42" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
      <rect x="78.5" y="62" width="3" height="12" fill={FG} />
      <rect x="66" y="74" width="28" height="4" rx="2" fill={FG} />
      {range(3).map((i) => (
        <path key={`l${i}`} className="mc-wv" d={`M${54 - i * 9} ${24 - i * 4} A${16 + i * 9} ${16 + i * 9} 0 0 0 ${54 - i * 9} ${56 + i * 4}`} fill="none" stroke={ALT} strokeWidth="3" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
      {range(3).map((i) => (
        <path key={`r${i}`} className="mc-wv" d={`M${106 + i * 9} ${24 - i * 4} A${16 + i * 9} ${16 + i * 9} 0 0 1 ${106 + i * 9} ${56 + i * 4}`} fill="none" stroke={ALT} strokeWidth="3" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
    </>
  ),

  plug: () => (
    <>
      <rect x="100" y="27" width="36" height="36" rx="5" fill="none" stroke={FG} strokeWidth="4" />
      <rect className="pg-glow" x="104" y="31" width="28" height="28" rx="3" fill={ALT} />
      <rect x="108" y="39" width="8" height="3" fill={FG} />
      <rect x="108" y="48" width="8" height="3" fill={FG} />
      <g className="pg">
        <path d="M30 45 H10" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
        <rect x="30" y="35" width="26" height="20" rx="4" fill={FG} />
        <rect x="56" y="39" width="12" height="3" fill={FG} />
        <rect x="56" y="48" width="12" height="3" fill={FG} />
      </g>
    </>
  ),

  gear: () => (
    <>
      <circle className="ge-a" cx="66" cy="48" r="20" fill="none" stroke={FG} strokeWidth="10" strokeDasharray="6 6.57" />
      <circle cx="66" cy="48" r="12" fill="none" stroke={FG} strokeWidth="4" />
      <circle cx="66" cy="48" r="3" fill={FG} />
      <circle className="ge-b" cx="106" cy="32" r="13" fill="none" stroke={ALT} strokeWidth="8" strokeDasharray="5.5 6.17" />
      <circle cx="106" cy="32" r="6.5" fill="none" stroke={ALT} strokeWidth="3.4" />
      <circle cx="106" cy="32" r="2" fill={ALT} />
    </>
  ),

  brain: () => (
    <>
      <path d="M80 24 C 70 12, 50 18, 52 32 C 40 36, 42 54, 54 58 C 54 70, 72 74, 80 62 C 88 74, 106 70, 106 58 C 118 54, 120 36, 108 32 C 110 18, 90 12, 80 24 Z" fill="none" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 24 V62" fill="none" stroke={FG} strokeWidth="3" />
      <path d="M58 40 C 64 36, 70 40, 68 46 M92 40 C 98 36, 104 40, 102 46 M60 54 C 66 50, 70 54, 72 58 M88 58 C 92 52, 98 54, 100 58" fill="none" stroke={FG} strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
      {([[64, 32], [96, 34], [70, 52], [94, 50], [80, 42]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} className="bn-sp" cx={x} cy={y} r="3.2" fill={ALT} style={v({ "--i": i })} />
      ))}
    </>
  ),

  bot: () => (
    <>
      <g className="bo">
        <rect x="78.5" y="16" width="3" height="14" fill={FG} />
        <circle className="bo-ant" cx="80" cy="15" r="4" fill={ALT} />
        <rect x="48" y="42" width="6" height="14" rx="2" fill={FG} />
        <rect x="106" y="42" width="6" height="14" rx="2" fill={FG} />
        <rect x="54" y="30" width="52" height="40" rx="8" fill={FG} />
        <rect className="bo-eye" x="65" y="43" width="10" height="9" rx="2" fill={ALT} />
        <rect className="bo-eye" x="85" y="43" width="10" height="9" rx="2" fill={ALT} />
        <rect x="70" y="59" width="20" height="3.4" rx="1.7" fill={ALT} />
      </g>
    </>
  ),

  empty: () => (
    <>
      <path d="M48 44 V78 H112 V44" fill="none" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
      <path d="M48 44 L38 30 M112 44 L122 30" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
      <path d="M48 44 H112" fill="none" stroke={FG} strokeWidth="4" />
      <rect className="em-dash" x="60" y="50" width="40" height="20" rx="3" fill="none" stroke={ALT} strokeWidth="2.6" strokeDasharray="5 4" />
    </>
  ),

  trash: () => (
    <>
      <polygon points="58,36 102,36 97,80 63,80" fill={FG} />
      {range(3).map((i) => (
        <rect key={i} x={70 + i * 9} y="44" width="2.4" height="28" fill="var(--bg)" opacity="0.5" />
      ))}
      <g className="ts-lid">
        <rect x="54" y="28" width="52" height="6" rx="2" fill={FG} />
        <rect x="74" y="23" width="12" height="5" rx="2" fill={FG} />
      </g>
      <circle className="ts-ball" cx="80" cy="34" r="6" fill={ALT} />
    </>
  ),

  confetti: () => (
    <>
      {range(18).map((i) => (
        <rect key={i} className="cf" x={10 + ((i * 37) % 140)} y={6 + ((i * 23) % 30)} width="4" height="8" rx="1" fill={i % 3 === 0 ? ALT : FG} style={v({ "--i": i })} />
      ))}
    </>
  ),

  door: () => (
    <>
      <rect x="62" y="16" width="36" height="66" fill={ALT} />
      {([[28, -18], [40, 0], [28, 18]] as [number, number][]).map(([dx, dy], i) => (
        <line key={i} className="dr-ray" x1="98" y1={49 + dy * 0.4} x2={98 + dx} y2={49 + dy} stroke={ALT} strokeWidth="3" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
      <rect className="dr-leaf" x="62" y="16" width="36" height="66" fill={FG} />
      <rect x="60" y="14" width="40" height="70" fill="none" stroke={FG} strokeWidth="4" />
    </>
  ),

  maze: () => (
    <>
      <path d="M30 26 V76 H130 V70 M130 62 V14 H30 V18 M40 30 V76 M40 40 H80 M50 60 H100 M100 40 V60 M60 22 H120 V56 M70 60 V76 M100 14 V22" fill="none" stroke={FG} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="128" y="62" width="4" height="8" fill={ALT} />
      <circle className="mz-dot" cx="32" cy="22" r="4" fill={ALT} />
    </>
  ),

  umbrella: () => (
    <>
      {range(10).map((i) => (
        <line key={i} className="um-rn" x1={34 + i * 10} y1="6" x2={32 + i * 10} y2="14" stroke={ALT} strokeWidth="2.6" strokeLinecap="round" style={v({ "--i": i })} />
      ))}
      <path d="M44 50 A36 36 0 0 1 116 50 Z" fill={FG} />
      <path d="M80 50 V76 A6 6 0 0 1 68 76" fill="none" stroke={FG} strokeWidth="4" strokeLinecap="round" />
      <rect x="78" y="10" width="4" height="6" rx="2" fill={FG} />
    </>
  ),

  lighthouse: () => (
    <>
      <polygon className="lh-beam" points="80,26 158,4 158,48" fill={ALT} opacity="0.4" />
      <polygon points="72,80 88,80 84,30 76,30" fill={FG} />
      <rect x="70" y="22" width="20" height="8" rx="1.5" fill={FG} />
      <circle cx="80" cy="26" r="3" fill={ALT} />
      <rect x="0" y="80" width="160" height="2.6" fill={FG} opacity="0.3" />
    </>
  ),

  train: () => (
    <>
      <rect x="0" y="74" width="160" height="2.6" fill={FG} opacity="0.35" />
      {range(15).map((i) => (
        <rect key={i} className="tn-sl" x={-12 + i * 12} y="77" width="6" height="4" rx="1" fill={FG} opacity="0.3" />
      ))}
      <g className="tn">
        <rect x="76" y="50" width="42" height="20" rx="2" fill={FG} />
        <rect x="20" y="44" width="52" height="26" rx="3" fill={FG} />
        <rect x="56" y="34" width="16" height="12" rx="2" fill={FG} />
        <rect x="26" y="34" width="8" height="12" fill={ALT} />
        {[32, 58, 86, 108].map((x, i) => (
          <g key={i} className="tn-wh" style={v({ "--cx": `${x}px` })}>
            <circle cx={x} cy="72" r="5" fill={ALT} />
            <line x1={x} y1="67" x2={x} y2="77" stroke="var(--bg)" strokeWidth="1.6" />
          </g>
        ))}
        {range(3).map((i) => (
          <circle key={`s${i}`} className="shp-sm" cx="30" cy="30" r={2.4 + i * 0.6} fill={ALT} style={v({ "--i": i })} />
        ))}
      </g>
    </>
  ),

  parachute: () => (
    <g className="pc">
      <path d="M50 44 A30 30 0 0 1 110 44 Z" fill={ALT} />
      <path d="M50 44 L76 68 M80 44 V68 M110 44 L84 68" fill="none" stroke={FG} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="74" y="68" width="12" height="10" rx="1.5" fill={FG} />
    </g>
  ),

  compass: () => (
    <>
      <circle cx="80" cy="45" r="27" fill="none" stroke={FG} strokeWidth="4" />
      {range(4).map((i) => (
        <rect key={i} x={79} y={15} width="2" height="6" fill={i === 0 ? ALT : FG} transform={`rotate(${i * 90} 80 45)`} />
      ))}
      <g className="cm-nd">
        <polygon points="80,24 85.5,45 80,47 74.5,45" fill={ALT} />
        <polygon points="80,66 85.5,45 80,43 74.5,45" fill={FG} />
      </g>
      <circle cx="80" cy="45" r="3" fill={FG} />
    </>
  ),

  crown: () => (
    <g className="cw">
      <polygon points="40,66 46,30 64,48 80,20 96,48 114,30 120,66" fill={ALT} />
      <rect x="40" y="64" width="80" height="10" rx="2" fill={FG} />
      {([[64, 56], [80, 50], [96, 56]] as [number, number][]).map(([x, y], i) => (
        <circle key={i} className="cw-jw" cx={x} cy={y} r="3.2" fill={FG} style={v({ "--i": i })} />
      ))}
    </g>
  ),

  envelope: () => (
    <>
      <rect x="44" y="30" width="72" height="46" rx="3" fill="none" stroke={FG} strokeWidth="4" />
      <rect className="en-lt" x="56" y="36" width="48" height="32" rx="2" fill={ALT} />
      <polygon points="44,36 80,62 116,36 116,76 44,76" fill="var(--bg)" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
      <path d="M44 36 L80 62 L116 36" fill="none" stroke={FG} strokeWidth="4" strokeLinejoin="round" />
    </>
  ),

  network: () => {
    const nodes: [number, number][] = [[30, 30], [64, 20], [96, 34], [130, 22], [48, 62], [84, 60], [120, 66]];
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 5], [3, 6], [4, 5], [5, 6]];
    return (
      <>
        {edges.map(([a, b], i) => (
          <line key={i} className="nw-ed" x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={FG} strokeWidth="2.6" opacity="0.5" pathLength={100} style={v({ "--i": i })} />
        ))}
        {nodes.map(([x, y], i) => (
          <circle key={i} className="nw-nd" cx={x} cy={y} r="5" fill={FG} style={v({ "--i": i })} />
        ))}
      </>
    );
  },
};

/** Wordless animated metaphors. Pure SVG and CSS, drawn in the slide's own colours. */
export function Scene({ name }: { name: SceneName }) {
  return (
    <svg className={`scene scene-${name}`} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {RENDER[name]()}
    </svg>
  );
}
