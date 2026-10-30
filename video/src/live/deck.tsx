import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";

// The old way, made up on purpose: a generic slide app and a default corporate template. No real product's
// name, logo or menus, since the rules forbid third-party trademarks in the video.

const SANS = "Arial, Helvetica, sans-serif";
const NAVY = "#1f3a5f";
const TEMPLATE_BG = "linear-gradient(160deg, #eef2f7 0%, #c6d3e2 100%)";

export const DECK_TOTAL = 87;

/** A slide in the template everyone has seen a thousand times. */
export function TemplateSlide({ title, bullets, page, centred = false, small = false, lit }: { title: string; bullets?: readonly string[]; page: number; centred?: boolean; small?: boolean; lit?: number }) {
  return (
    <AbsoluteFill style={{ background: TEMPLATE_BG, fontFamily: SANS, color: "#333", padding: small ? "60px 80px" : "90px 120px" }}>
      <div style={{ fontSize: centred ? 96 : 64, fontWeight: 700, color: NAVY, textAlign: centred ? "center" : "left", marginTop: centred ? 300 : 0 }}>{title}</div>
      <div style={{ height: 6, width: centred ? 360 : 220, background: "#3a6ea5", margin: centred ? "28px auto 0" : "22px 0 0" }} />
      {centred ? <div style={{ fontSize: 38, color: "#5b6b7f", textAlign: "center", marginTop: 26 }}>Presented by: [Your name]</div> : null}
      {bullets ? (
        <ul style={{ margin: "40px 0 0", paddingLeft: 40, fontSize: small ? 22 : 36, lineHeight: small ? 1.32 : 1.5 }}>
          {bullets.map((b, i) => (
            <li key={b} style={{ marginLeft: b.startsWith("  ") ? 44 : 0, listStyleType: b.startsWith("  ") ? "circle" : "disc", background: i === lit ? "#ffe500" : "transparent" }}>
              {b.trim()}
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 30, display: "flex", justifyContent: "space-between", fontSize: 22, color: "#7a8899" }}>
        <span>Company confidential</span>
        <span>
          {page} / {DECK_TOTAL}
        </span>
      </div>
    </AbsoluteFill>
  );
}

export const MENUS = ["File", "Edit", "View", "Insert", "Arrange", "Present", "Help"] as const;
export type Menu = (typeof MENUS)[number];

export const MENU_ITEMS: Record<Menu, readonly string[]> = {
  File: ["New", "Open…", "Save as…", "Print…"],
  Edit: ["Undo", "Redo", "Find…"],
  View: ["Normal", "Outline", "Grid", "Notes page", "Zoom…"],
  Insert: ["Table", "Chart", "Shape", "Clip art", "Equation"],
  Arrange: ["Bring forward", "Send backward", "Group", "Align"],
  Present: ["From the beginning", "From this slide", "Presenter view", "Rehearse timings", "Record narration"],
  Help: ["Search help…"],
};

const MENU_X0 = 40;
const MENU_GAP = 34;
const MENU_FONT = 30;
const BAR_TOP = 64;
const BAR_HEIGHT = 56;

/** Left edge of each menu title, from a fixed width a character: the app is made up, so it can be. */
export const menuX = (menu: Menu): number => {
  let x = MENU_X0;
  for (const m of MENUS) {
    if (m === menu) return x;
    x += m.length * MENU_FONT * 0.56 + MENU_GAP;
  }
  return x;
};
export const MENU_Y = BAR_TOP + BAR_HEIGHT / 2;
export const ITEM_HEIGHT = 50;
export const itemY = (index: number): number => BAR_TOP + BAR_HEIGHT + 16 + index * ITEM_HEIGHT + ITEM_HEIGHT / 2;

/** The made-up slide app around the deck, with one menu open and one item lit. */
export function AppWindow({ open, lit, children }: { open?: Menu; lit?: string; children: ReactNode }) {
  const chrome: CSSProperties = { fontFamily: SANS, color: "#222" };
  return (
    <AbsoluteFill style={{ background: "#d9dde3", ...chrome }}>
      <div style={{ height: BAR_TOP, background: "#ececec", display: "flex", alignItems: "center", padding: "0 28px", gap: 14, borderBottom: "1px solid #c8c8c8" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />
        ))}
        <span style={{ flex: 1, textAlign: "center", fontSize: 26, color: "#555" }}>Q3_strategy_FINAL_v7_REAL.deck</span>
      </div>
      <div style={{ height: BAR_HEIGHT, background: "#f6f6f6", borderBottom: "1px solid #cfcfcf", position: "relative" }}>
        {MENUS.map((m) => (
          <span key={m} style={{ position: "absolute", left: menuX(m) - 10, top: 8, padding: "4px 10px", fontSize: MENU_FONT, borderRadius: 6, background: open === m ? "#3a6ea5" : "transparent", color: open === m ? "#fff" : "#222" }}>
            {m}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", top: BAR_TOP + BAR_HEIGHT, left: 0, bottom: 0, width: 260, background: "#eceff3", borderRight: "1px solid #c8c8c8", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} style={{ height: 118, borderRadius: 4, background: TEMPLATE_BG, border: n === 1 ? "4px solid #3a6ea5" : "1px solid #b8c2cf" }} />
        ))}
      </div>
      <div style={{ position: "absolute", top: BAR_TOP + BAR_HEIGHT + 50, left: 330, width: 1520, height: 855, boxShadow: "0 6px 24px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${1520 / 1920})`, transformOrigin: "top left", position: "relative" }}>{children}</div>
      </div>
      {open ? (
        <div style={{ position: "absolute", left: menuX(open) - 10, top: BAR_TOP + BAR_HEIGHT + 4, minWidth: 420, background: "#fff", borderRadius: 10, boxShadow: "0 10px 40px rgba(0,0,0,0.3)", padding: "12px 0" }}>
          {MENU_ITEMS[open].map((item) => (
            <div key={item} style={{ height: ITEM_HEIGHT, display: "flex", alignItems: "center", padding: "0 28px", fontSize: 28, background: lit === item ? "#3a6ea5" : "transparent", color: lit === item ? "#fff" : "#222" }}>
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

/** A mouse pointer, drawn plainly. */
export function Pointer({ x, y }: { x: number; y: number }) {
  return (
    <svg width={44} height={64} viewBox="0 0 22 32" style={{ position: "absolute", left: x, top: y }}>
      <path d="M1 1 L1 25 L7 19 L11 30 L15 28 L11 18 L19 18 Z" fill="#fff" stroke="#000" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}
