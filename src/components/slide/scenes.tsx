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
};

/** Wordless animated metaphors. Pure SVG and CSS, drawn in the slide's own colours. */
export function Scene({ name }: { name: SceneName }) {
  return (
    <svg className={`scene scene-${name}`} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {RENDER[name]()}
    </svg>
  );
}
