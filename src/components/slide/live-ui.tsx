"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/hooks/use-theme";
import { getLive, subscribeLive } from "@/lib/live-store";
import { contrast, FONTS, type LookKey } from "@/lib/theme";

const STAGE_W = 1600;
const STAGE_H = 900;

// The drawing is model-written markup. It runs in a frame that cannot execute scripts (sandbox) and cannot
// load anything from the network (the policy below): all it can do is paint.
// The only thing it may fetch is the style guide's typeface, from this site.
const shell = (bg: string, fg: string, font: StageFont, kit: string): string =>
  `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'self' data:">` +
  `<style>${font.faces}html,body{margin:0;background:${bg};overflow:hidden}` +
  `.stage{width:${STAGE_W}px;height:${STAGE_H}px;position:relative;overflow:hidden;background:${bg};color:${fg};font-family:${font.family}system-ui,-apple-system,"Segoe UI",sans-serif !important;font-weight:${font.weight};font-variation-settings:${font.variation};font-synthesis:none;box-sizing:border-box}` +
  // The model is told not to pick a typeface; if it does anyway (even "inherit" on the stage), the style guide still wins.
  `.stage *{box-sizing:border-box;font-family:inherit !important}${kit}</style>`;

const mask = (svg: string): string => {
  const src = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return `-webkit-mask:${src} center/100% 100% no-repeat;mask:${src} center/100% 100% no-repeat`;
};
const LOOP = mask(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="none"><path d="M30 60 C 18 18, 178 6, 192 48 C 202 88, 70 100, 26 82 C 8 72, 12 52, 46 36" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/></svg>`);
const WAVE = mask(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 24" preserveAspectRatio="none"><path d="M4 15 C 50 4, 100 22, 150 11 S 250 6, 296 13" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/></svg>`);
const ARROW = mask(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 60"><path d="M6 34 C 40 18, 80 46, 118 28 M96 10 L122 28 L100 50" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
const INK = "#1d1d1d";

/**
 * The Scribble look's building blocks, ready in the drawing's own stylesheet: the model composes the
 * slide from these instead of inventing a style, so a live drawing matches the templates around it.
 */
function scribbleKit(fg: string, alt: string): string {
  const onMark = contrast(alt, INK) >= contrast(alt, "#ffffff") ? INK : "#ffffff";
  const paper = `background:#fff;color:${INK};border:6px solid ${INK}`;
  // Scoped under the stage so a model's own ".big" or ".card" rule cannot restyle them; text sizes are locked
  // because a model that shrinks a label to 40px makes the slide unreadable from the back row.
  return (
    // Whatever the model puts straight on the stage lands in the middle, as on the templates.
    `body .stage{--mark:${alt};--on-mark:${onMark};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;background-image:radial-gradient(color-mix(in srgb,${fg} 16%,transparent) 2.6px,transparent 3px);background-size:48px 48px}` +
    `.stage .card{display:inline-flex;flex-direction:column;align-items:center;gap:28px;${paper};border-radius:34px 12px 38px 14px/14px 38px 12px 34px;box-shadow:12px 12px 0 ${INK};padding:56px 88px;font-size:96px;line-height:1.05}` +
    `.stage .note{display:inline-block;background:var(--mark);color:var(--on-mark);border:6px solid ${INK};border-radius:10px 26px 8px 30px/26px 8px 30px 10px;box-shadow:12px 12px 0 ${INK};padding:44px 64px;font-size:96px !important;line-height:1.05;rotate:-2deg}` +
    `.stage .pill{display:inline-block;white-space:nowrap;background:var(--mark);color:var(--on-mark);border:6px solid ${INK};border-radius:60px 40px 64px 44px/44px 64px 40px 60px;box-shadow:10px 10px 0 ${INK};padding:28px 80px;font-size:96px !important}` +
    `.stage .bubble{position:relative;display:inline-block;${paper};border-radius:60px 40px 70px 30px/40px 70px 30px 60px;padding:56px 88px;font-size:104px !important;line-height:1.05}` +
    `.stage .bubble::after{content:"";position:absolute;left:90px;bottom:-30px;width:52px;height:52px;background:#fff;border-right:6px solid ${INK};border-bottom:6px solid ${INK};transform:rotate(45deg) skew(10deg,10deg)}` +
    `.stage :is(.loop,.under){position:relative;display:inline-block;white-space:nowrap}` +
    `.stage .loop::after{content:"";position:absolute;inset:-22% -16% -16% -14%;background:var(--mark);${LOOP};animation:ink .7s .5s both}` +
    `.stage .under::after{content:"";position:absolute;left:-4%;right:-4%;bottom:-.16em;height:.22em;background:var(--mark);${WAVE};animation:ink .6s .6s both}` +
    `.stage .arrow{display:inline-block;width:150px;height:70px;background:currentColor;${ARROW}}` +
    // Not locked: a model that shrinks a huge word does it to make room, and forcing it back overlaps the rest.
    `.stage .big{font-size:320px;line-height:.9;white-space:nowrap}` +
    `.stage .tilt-l{rotate:-3deg}.stage .tilt-r{rotate:3deg}` +
    `@keyframes ink{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}`
  );
}

const KITS: Partial<Record<LookKey, (fg: string, alt: string) => string>> = { scribble: scribbleKit };

interface StageFont {
  /** Family list ending in a comma, or empty when the typeface could not be resolved. */
  family: string;
  weight: number;
  /** The face's own axes, as font-variation-settings. */
  variation: string;
  /** The @font-face rules of that family, copied from this page. */
  faces: string;
}

/** The style guide's typeface as plain CSS the drawing's own document can use. */
function stageFont(el: HTMLElement, key: keyof typeof FONTS): StageFont {
  const font = FONTS[key];
  const variable = font.css.match(/var\((--[\w-]+)\)/)?.[1];
  const family = variable ? getComputedStyle(el).getPropertyValue(variable).trim() : "";
  if (!family) return { family: "", weight: 800, variation: "normal", faces: "" };
  const names = family.split(",").map((n) => n.trim().replace(/^["']|["']$/g, ""));
  let faces = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      // Font files are written relative to their stylesheet ("../media/x.woff2"); in the frame that path would
      // point somewhere else and the face would fail, so each one is made absolute first.
      const base = sheet.href ?? location.href;
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule && names.includes(rule.style.getPropertyValue("font-family").trim().replace(/^["']|["']$/g, ""))) {
          faces += rule.cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (_m, quote: string, path: string) => `url(${quote}${new URL(path, base).href}${quote})`);
        }
      }
    } catch {
      // A stylesheet from another origin cannot be read; the typeface is not in one of those.
    }
  }
  return { family: `${family},`, weight: font.weight, variation: font.variation, faces };
}

/** A slide a model is drawing right now: the markup is written into the frame as it arrives, so it builds up live. */
export function LiveUi({ id }: { id: string }) {
  const drawing = useSyncExternalStore(
    (notify) => subscribeLive(id, notify),
    () => getLive(id),
    () => undefined,
  );
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const written = useRef(-1);
  const closed = useRef(false);
  const [theme] = useTheme();
  // The stage keeps its 16:9 shape and is centred, whatever shape the window has.
  const [fit, setFit] = useState({ scale: 0, left: 0, top: 0 });

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = (): void => {
      const scale = Math.min(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H);
      setFit({ scale, left: (el.clientWidth - STAGE_W * scale) / 2, top: (el.clientHeight - STAGE_H * scale) / 2 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    // Writing to a closed document would wipe it and start over.
    if (!doc || !drawing || closed.current) return;
    if (written.current === -1) {
      doc.open();
      const kit = KITS[theme.look]?.(drawing.palette.fg, drawing.palette.alt) ?? "";
      doc.write(shell(drawing.palette.bg, drawing.palette.fg, stageFont(frame.current ?? document.body, theme.font), kit));
      written.current = 0;
    }
    // Only the new tail is written: the parser keeps its place, so nothing flickers or restarts.
    if (drawing.html.length > written.current) {
      doc.write(drawing.html.slice(written.current));
      written.current = drawing.html.length;
    }
    if (drawing.done) {
      doc.close();
      closed.current = true;
    }
  }, [drawing, theme.font, theme.look]);

  return (
    <div ref={wrap} className="live-ui" style={{ background: drawing?.palette.bg }}>
      <iframe
        ref={frame}
        title="Live drawing"
        sandbox="allow-same-origin"
        tabIndex={-1}
        style={{ width: STAGE_W, height: STAGE_H, left: fit.left, top: fit.top, transform: `scale(${fit.scale})`, visibility: fit.scale ? "visible" : "hidden" }}
      />
    </div>
  );
}
