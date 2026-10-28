"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { icons, type LucideIcon } from "lucide-react";
import { LiveUi } from "@/components/slide/live-ui";
import { UiHero } from "@/components/slide/ui-hero";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useTheme } from "@/hooks/use-theme";
import { hostOf, type ChartData, type Slide } from "@/lib/slide";
import { themeVars } from "@/lib/theme";
import { Backdrop } from "./backdrop";
import { Scene } from "./scenes";
import "./slide.css";

// Width axis steps for the heavy cut. Short words go wide, long phrases narrow.
const STRETCHES = [125, 112, 100, 85] as const;

interface FitTextProps {
  text: string;
  /** Box in container units: width in cqw, height in cqh. The text never leaves it. */
  w: number;
  h: number;
  max: number;
  min?: number;
  align?: "left" | "center";
  /** Words slam in one by one. */
  slam?: boolean;
  /** Rendered instead of the text (it is still measured). Used for counting numbers. */
  node?: ReactNode;
  className?: string;
}

/**
 * Fits text to a box by measuring the real layout, not by guessing glyph widths: binary search
 * for the largest size that neither overflows sideways (a long word) nor runs out of height.
 * Runs for each width cut and keeps the widest one that is still close to the best size.
 */
function FitText({ text, w, h, max, min = 2.5, align = "left", slam = true, node, className = "" }: FitTextProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || o.clientWidth === 0) return;
    // Entry animations scale and shift the words; measure without them.
    i.classList.add("measuring");
    const sizes = STRETCHES.map((stretch) => {
      i.style.fontStretch = `${stretch}%`;
      let lo = min;
      let hi = max;
      for (let n = 0; n < 9; n += 1) {
        const mid = (lo + hi) / 2;
        i.style.fontSize = `${mid}cqw`;
        if (i.scrollWidth <= o.clientWidth + 1 && i.offsetHeight <= o.clientHeight + 1) lo = mid;
        else hi = mid;
      }
      return lo;
    });
    const best = Math.max(...sizes);
    const pick = sizes.findIndex((size) => size >= best * 0.86);
    i.style.fontStretch = `${STRETCHES[pick]}%`;
    i.style.fontSize = `${sizes[pick]}cqw`;
    i.classList.remove("measuring");
  }, [max, min]);

  useLayoutEffect(() => {
    fit();
  }, [fit, text, w, h]);

  useEffect(() => {
    // A typeface that arrives late (first use, or a new style guide) changes every width: fit again.
    void document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => document.fonts?.removeEventListener("loadingdone", fit);
  }, [fit, text]);

  return (
    <div ref={outer} className={`fit ${className}`} style={{ width: `${w}cqw`, height: `${h}cqh` }}>
      <div ref={inner} className="type" style={{ textAlign: align }}>
        {node ? (
          <span className="w" style={{ "--i": 0 } as CSSProperties}>
            {node}
          </span>
        ) : slam
          ? text.split(" ").map((word, i) => (
              <span key={`${word}-${i}`} className="w" style={{ "--i": i } as CSSProperties}>
                {word}
              </span>
            ))
          : text}
      </div>
    </div>
  );
}

/**
 * A number that counts up. The final text is rendered invisibly underneath so the box is already
 * the right width, which keeps the fitted size stable while the digits change.
 */
function tickerNode(text: string, still: boolean, delay = 0.35): ReactNode | null {
  if (still) return null;
  const m = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const [, prefix, digits, suffix] = m;
  const value = Number.parseFloat(digits.replace(/,/g, ""));
  // A bare 2024 must not become "2,024": only tick numbers that already carry grouping or are small.
  if (!Number.isFinite(value) || (value >= 1000 && !digits.includes(","))) return null;
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  return (
    <span className="ticker">
      <span className="ticker-final" aria-hidden>
        {text}
      </span>
      <span className="ticker-live">
        {prefix}
        <NumberTicker value={value} decimalPlaces={decimals} delay={delay} />
        {suffix}
      </span>
    </span>
  );
}

/** A small label over a full-bleed image: the only text in minimal mode. */
function LabelChip({ text, right }: { text: string; right: boolean }) {
  if (!text) return null;
  return (
    <div className={`label-chip${right ? " right" : ""}`}>
      <FitText text={text} w={24} h={6.5} max={4.2} slam={false} />
    </div>
  );
}

/** Graphic backdrop in the accent colour. Gives text slides structure beyond type. */
function Motif({ kind }: { kind: Slide["motif"] }) {
  const common = { fill: "none", stroke: "var(--alt)", strokeWidth: 1.1 } as const;
  return (
    <svg className="motif" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {kind === "rings" && [14, 26, 38, 50, 62].map((r) => <circle key={r} cx="132" cy="22" r={r} {...common} />)}
      {kind === "stripes" &&
        Array.from({ length: 9 }, (_, i) => <line key={i} x1={96 + i * 11} y1="-4" x2={56 + i * 11} y2="96" stroke="var(--alt)" strokeWidth="4.2" />)}
      {kind === "dots" &&
        Array.from({ length: 6 * 9 }, (_, i) => {
          const x = 94 + (i % 9) * 8;
          const y = 8 + Math.floor(i / 9) * 8;
          return <circle key={i} cx={x} cy={y} r={0.6 + ((i * 7) % 5) * 0.55} fill="var(--alt)" />;
        })}
      {kind === "burst" &&
        Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return <line key={i} x1={150 + Math.cos(a) * 14} y1={78 + Math.sin(a) * 14} x2={150 + Math.cos(a) * 90} y2={78 + Math.sin(a) * 90} stroke="var(--alt)" strokeWidth="1.6" />;
        })}
      {kind === "grid" &&
        [0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={i}>
            <line x1={90 + i * 12} y1="0" x2={90 + i * 12} y2="90" {...common} />
            <line x1="90" y1={i * 14} x2="160" y2={i * 14} {...common} />
          </g>
        ))}
    </svg>
  );
}

function IconGlyph({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  const Glyph: LucideIcon | undefined = (icons as Record<string, LucideIcon>)[name];
  return Glyph ? <Glyph className={className} style={style} strokeWidth={2.4} aria-hidden /> : null;
}

function Chart({ chart, still }: { chart: ChartData; still: boolean }) {
  if (chart.kind === "ring") {
    const pct = Math.max(0, Math.min(100, chart.values[0]));
    const r = 36;
    const c = 2 * Math.PI * r;
    return (
      <div className="ring-wrap">
        <svg className="chart-ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--alt)" strokeOpacity="0.35" strokeWidth="14" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke="var(--fg)" strokeWidth="14" strokeLinecap="butt"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 50 50)"
            style={{ "--c": c } as CSSProperties} className="ring-arc"
          />
        </svg>
        {chart.illustrative ? null : (
          <div className="ring-center">{tickerNode(`${Math.round(pct)}%`, still, 0.2) ?? `${Math.round(pct)}%`}</div>
        )}
      </div>
    );
  }
  const max = Math.max(...chart.values, 1);
  return (
    <div className="chart-bars">
      {chart.values.map((v, i) => (
        <div key={i} className="bar-col">
          <div className="bar" style={{ height: `${(v / max) * 100}%`, animationDelay: `${0.25 + i * 0.12}s`, background: i === chart.values.indexOf(max) ? "var(--fg)" : "var(--alt)" }} />
          <span>{chart.labels[i] ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

function Media({ src, className }: { src: string; className: string }) {
  return /\.mp4(\?|$)/i.test(src) ? (
    <video className={className} src={src} autoPlay loop muted playsInline />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- third-party animated GIF or photo, not optimizable
    <img className={className} src={src} alt="" />
  );
}

function Chrome({ slide }: { slide: Slide }) {
  return (
    <>
      {slide.source ? <div className="source">{hostOf(slide.source)}</div> : null}
      {slide.vibe ? <div className="unverified">not fact-checked</div> : null}
      {slide.failed ? <div className="stamp">we do it live</div> : null}
    </>
  );
}

/** Everything inside a layer. `flush` layouts own the whole frame and bring their own padding. */
function renderContent(slide: Slide, still: boolean): { node: ReactNode; flush: boolean } {
  const { style } = slide;
  const centered = style.align === "center";
  const align = centered ? "center" : "left";

  switch (slide.layout) {
    case "SCENE":
      if (!slide.scene) break;
      return {
        flush: true,
        node: (
          <>
            <Scene name={slide.scene} />
            <LabelChip text={style.text === "none" ? "" : slide.headline} right={centered} />
          </>
        ),
      };

    case "TITLE_CARD":
      return {
        flush: false,
        node: (
          <>
            <Motif kind={slide.motif} />
            <div className="stack center">
              <FitText text={slide.headline} w={84} h={slide.body ? 52 : 64} max={40} align="center" />
              <div className="rule" />
              {slide.body ? <div className="sub center">{slide.body}</div> : null}
            </div>
          </>
        ),
      };

    case "BIG_NUMBER":
      return {
        flush: false,
        node: (
          <>
            <Motif kind={slide.motif} />
            <div className={`stack ${align}`}>
              <FitText text={slide.number || slide.headline} w={88} h={56} max={60} align={align} node={tickerNode(slide.number || "", still)} />
              {(slide.number ? slide.headline : slide.body).toLowerCase() !== (slide.number || slide.headline).toLowerCase() ? (
                <div className="num-label">{slide.number ? slide.headline : slide.body}</div>
              ) : null}
            </div>
          </>
        ),
      };

    case "SPLIT_STAT":
      return {
        flush: false,
        node: (
          <div className={`split${style.photoSide === "left" ? " flip" : ""}`}>
            <div className="split-text">
              <FitText text={slide.number} w={44} h={40} max={34} node={tickerNode(slide.number, still)} />
              <div className="num-label">{slide.headline}</div>
            </div>
            <div className="split-art">
              {slide.image ? (
                <Media src={slide.image} className="split-img" />
              ) : (
                <IconGlyph name={slide.icon ?? "TrendingUp"} className="split-glyph" />
              )}
            </div>
          </div>
        ),
      };

    case "QUOTE":
      return {
        flush: false,
        node: (
          <>
            <Motif kind={slide.motif} />
            <div className="quote">
              <div className="quote-bar" />
              <div>
                <FitText text={slide.headline} w={74} h={slide.body ? 48 : 60} max={14} />
                {slide.body ? <div className="sub">{slide.body}</div> : null}
              </div>
            </div>
          </>
        ),
      };

    case "REVEAL_3":
      return {
        flush: false,
        node: (
          <>
            <Motif kind={slide.motif} />
            {slide.headline ? <div className="reveal-head">{slide.headline}</div> : null}
            <div className="reveal-list">
              {slide.items.slice(0, 3).map((item, i) => (
                <div key={`${item}-${i}`} className="reveal-item">
                  <i>{i + 1}</i>
                  <FitText text={item} w={80} h={slide.headline ? 19 : 22} max={11} slam={false} />
                </div>
              ))}
            </div>
          </>
        ),
      };

    case "PROCESS": {
      const n = slide.items.length;
      const cardW = (88 - (n - 1) * 6) / n;
      return {
        flush: false,
        node: (
          <>
            {slide.headline ? <div className="reveal-head">{slide.headline}</div> : null}
            <div className="process">
              {slide.items.map((item, i) => (
                <div key={`${item}-${i}`} className="process-cell" style={{ "--i": i } as CSSProperties}>
                  <div className="step" style={{ width: `${cardW}cqw` }}>
                    <FitText text={item} w={cardW - 3} h={26} max={7} align="center" slam={false} />
                  </div>
                  {i < n - 1 ? <IconGlyph name="ArrowRight" className="process-arrow" /> : null}
                </div>
              ))}
            </div>
          </>
        ),
      };
    }

    case "CHECKLIST":
      return {
        flush: false,
        node: (
          <>
            <div className="checklist">
              <div className="check-title">
                <FitText text={slide.headline} w={32} h={60} max={12} />
              </div>
              <div className="check-rows">
                {slide.items.map((item, i) => (
                  <div key={`${item}-${i}`} className="check-row" style={{ "--i": i } as CSSProperties}>
                    <span className="check-box">
                      <IconGlyph name="Check" className="check-glyph" />
                    </span>
                    <FitText text={item} w={41} h={slide.items.length > 4 ? 10 : 12} max={6.5} slam={false} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ),
      };

    case "ICON_GRID": {
      const n = Math.min(slide.items.length, 4);
      const cellW = (88 - (n - 1) * 3) / n;
      return {
        flush: false,
        node: (
          <>
            <Motif kind={slide.motif} />
            <div className="grid-head">
              <FitText text={slide.headline} w={60} h={14} max={8} />
            </div>
            <div className="icon-grid">
              {slide.items.slice(0, n).map((item, i) => (
                <div key={`${item}-${i}`} className="grid-cell" style={{ width: `${cellW}cqw`, "--i": i } as CSSProperties}>
                  <div className="grid-disc">
                    <IconGlyph name={slide.icons[i] ?? "Star"} className="grid-glyph" />
                  </div>
                  <FitText text={item} w={cellW} h={13} max={5} align="center" slam={false} />
                </div>
              ))}
            </div>
          </>
        ),
      };
    }

    case "LIVE_UI":
      return { flush: true, node: <LiveUi id={slide.id} /> };

    case "UI_HERO":
      if (!slide.ui) break;
      return { flush: true, node: <UiHero spec={slide.ui} still={still} /> };

    case "ICON": {
      const word = style.text !== "none" && slide.headline ? slide.headline : "";
      return {
        flush: false,
        node: (
          <div className={`icon-stage${word ? "" : " alone"}`}>
            <div className="icon-disc">
              <IconGlyph name={slide.icon ?? "Sparkles"} className="icon-glyph" />
            </div>
            {word ? (
              <div className="icon-word">
                <FitText text={word} w={72} h={18} max={9} align="center" slam={false} />
              </div>
            ) : null}
          </div>
        ),
      };
    }

    case "CHART":
      return {
        flush: false,
        node: (
          <>
            <Motif kind={slide.motif} />
            <div className="chart-wrap">
              {slide.chart ? <Chart chart={slide.chart} still={still} /> : null}
              {style.text === "full" ? <FitText text={slide.headline} w={slide.chart?.kind === "bars" ? 30 : 36} h={44} max={10} /> : null}
            </div>
          </>
        ),
      };

    case "VERSUS":
      return {
        flush: true,
        node: (
          <>
            <div className="versus">
              {slide.versus.map((side, i) => (
                <div key={`${side}-${i}`}>
                  <FitText text={side} w={38} h={36} max={13} align="center" slam={false} />
                </div>
              ))}
            </div>
            <div className="vs">vs</div>
          </>
        ),
      };

    case "MEME":
      if (!slide.gif) break;
      return {
        flush: true,
        node: (
          <>
            <Media src={slide.gif} className="gif-media" />
            <div className="meme top">
              <FitText text={slide.headline} w={92} h={22} max={10} align="center" slam={false} className="meme-text" />
            </div>
            {slide.body ? (
              <div className="meme bottom">
                <FitText text={slide.body} w={92} h={22} max={9} align="center" slam={false} className="meme-text" />
              </div>
            ) : null}
          </>
        ),
      };

    case "GIF_REACTION":
      if (!slide.gif) break;
      return {
        flush: true,
        node: (
          <>
            <Media src={slide.gif} className="gif-media" />
            {style.text === "full" ? (
              <div className={`gif-slab${centered ? " right" : ""}`}>
                <FitText text={slide.headline} w={52} h={16} max={8} />
              </div>
            ) : (
              <LabelChip text={style.text === "label" ? slide.headline : ""} right={centered} />
            )}
          </>
        ),
      };

    case "PHOTO":
      if (!slide.image) break;
      if (style.bleed || style.text !== "full") {
        return {
          flush: true,
          node: (
            <>
              <Media src={slide.image} className="gif-media" />
              {style.text === "full" ? (
                <div className={`gif-slab${centered ? " right" : ""}`}>
                  <FitText text={slide.headline} w={52} h={16} max={8} />
                </div>
              ) : (
                <LabelChip text={style.text === "label" ? slide.headline : ""} right={centered} />
              )}
              {slide.credit ? <div className="credit">{slide.credit}</div> : null}
            </>
          ),
        };
      }
      return {
        flush: true,
        node: (
          <div className={`photo${style.photoSide === "left" ? " flip" : ""}`}>
            <div className="photo-text">
              <FitText text={slide.headline} w={34} h={56} max={15} />
            </div>
            <Media src={slide.image} className="photo-img" />
            {slide.credit ? <div className="credit">{slide.credit}</div> : null}
          </div>
        ),
      };

    default:
      break;
  }

  // BIG_WORD, and the fallback for any layout whose media never arrived.
  return {
    flush: false,
    node: (
      <>
        <Motif kind={slide.motif} />
        <div className={`stack ${align}`}>
          <FitText text={slide.headline} w={88} h={slide.body ? 58 : 76} max={44} align={align} />
          {slide.body ? <div className="sub">{slide.body}</div> : null}
        </div>
      </>
    ),
  };
}

const QUIET: readonly Slide["layout"][] = ["CHECKLIST", "PROCESS", "ICON_GRID", "REVEAL_3", "CHART"];

function Layer({ slide, enter, still, onEntered }: { slide: Slide; enter: boolean; still: boolean; onEntered?: () => void }) {
  const { node, flush } = renderContent(slide, still);
  const backdrop = !still && slide.style.backdrop !== "none";
  return (
    <div
      className={`layer mood-${slide.style.field}${flush ? " flush" : ""}${QUIET.includes(slide.layout) ? " quiet" : ""}${backdrop ? " has-backdrop" : ""}${enter ? " enter" : ""}`}
      onAnimationEnd={(e) => e.target === e.currentTarget && onEntered?.()}
    >
      {/* Live only: thumbnails would each run their own canvas loop. */}
      {backdrop ? <Backdrop kind={slide.style.backdrop as Exclude<Slide["style"]["backdrop"], "none">} field={slide.style.field} /> : null}
      {node}
      <Chrome slide={slide} />
    </div>
  );
}

interface SlideViewProps {
  slide: Slide | null;
  blank?: boolean;
  /** Fixed to the viewport (audience screen). Otherwise a 16:9 block. */
  fill?: boolean;
  /** No motion: thumbnails and previews. */
  still?: boolean;
  idleTitle?: string;
}

/**
 * Renders one slide. On change, the new colour field wipes in over the old one,
 * the signature "cut". The previous layer is dropped once the wipe finishes.
 */
export function SlideView({ slide, blank, fill, still, idleTitle = "Do it live" }: SlideViewProps) {
  const [shown, setShown] = useState<Slide | null>(slide);
  const [prev, setPrev] = useState<Slide | null>(null);
  const [theme] = useTheme();

  if (slide !== shown) {
    setPrev(shown);
    setShown(slide);
  }

  return (
    <div className={`slide-frame${fill ? " fill" : ""}${still ? " static" : ""}`} style={themeVars(theme)}>
      {prev && !still ? <Layer key={`${prev.id}:${theme.font}`} slide={prev} enter={false} still /> : null}
      {shown ? (
        <Layer key={`${shown.id}:${theme.font}`} slide={shown} enter={!still} still={Boolean(still)} onEntered={() => setPrev(null)} />
      ) : (
        <div className="idle">
          <h1>{idleTitle}</h1>
          <p>Talk. Bill runs the slides.</p>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- the speaker's own logo as a data URL */}
      {theme.logo ? <img className="brand-logo" src={theme.logo} alt="" /> : null}
      {blank ? <div className="blank" /> : null}
    </div>
  );
}
