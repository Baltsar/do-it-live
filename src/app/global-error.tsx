"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/** Replaces the root layout when it crashes, so it brings its own document and inline styles. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => reportClientError("global-error.tsx", error), [error]);
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 48, fontWeight: 900, margin: "0 0 16px" }}>Something broke.</h1>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, color: "rgba(255,255,255,0.6)", overflowWrap: "anywhere", maxWidth: 420, margin: "0 auto 24px" }}>{message}</p>
          <button type="button" onClick={() => retry()} style={{ font: "inherit", fontWeight: 700, padding: "12px 24px", border: 0, borderRadius: 999, background: "#ffd60a", color: "#000" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
