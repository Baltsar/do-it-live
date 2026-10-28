"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/hooks/use-theme";
import { getLive, subscribeLive } from "@/lib/live-store";
import { FONTS } from "@/lib/theme";

const STAGE_W = 1600;
const STAGE_H = 900;

// The drawing is model-written markup. It runs in a frame that cannot execute scripts (sandbox) and cannot
// load anything from the network (the policy below): all it can do is paint.
// The only thing it may fetch is the style guide's typeface, from this site.
const shell = (bg: string, fg: string, font: StageFont): string =>
  `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'self' data:">` +
  `<style>${font.faces}html,body{margin:0;background:${bg};overflow:hidden}` +
  `.stage{width:${STAGE_W}px;height:${STAGE_H}px;position:relative;overflow:hidden;background:${bg};color:${fg};font-family:${font.family}system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:${font.weight};font-synthesis:none;box-sizing:border-box}` +
  // The model is told not to pick a typeface; if it does anyway, the style guide still wins.
  `.stage *{box-sizing:border-box;font-family:inherit !important}</style>`;

interface StageFont {
  /** Family list ending in a comma, or empty when the typeface could not be resolved. */
  family: string;
  weight: number;
  /** The @font-face rules of that family, copied from this page. */
  faces: string;
}

/** The style guide's typeface as plain CSS the drawing's own document can use. */
function stageFont(el: HTMLElement, key: keyof typeof FONTS): StageFont {
  const font = FONTS[key];
  const variable = font.css.match(/var\((--[\w-]+)\)/)?.[1];
  const family = variable ? getComputedStyle(el).getPropertyValue(variable).trim() : "";
  if (!family) return { family: "", weight: 800, faces: "" };
  const names = family.split(",").map((n) => n.trim().replace(/^["']|["']$/g, ""));
  let faces = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule && names.includes(rule.style.getPropertyValue("font-family").trim().replace(/^["']|["']$/g, ""))) faces += rule.cssText;
      }
    } catch {
      // A stylesheet from another origin cannot be read; the typeface is not in one of those.
    }
  }
  return { family: `${family},`, weight: font.weight, faces };
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
      doc.write(shell(drawing.palette.bg, drawing.palette.fg, stageFont(frame.current ?? document.body, theme.font)));
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
  }, [drawing, theme.font]);

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
