/**
 * Sends a browser error to the session log. A crash on a phone cannot be watched in a console, but the
 * hosted session log can be read back from Vercel's runtime log. sendBeacon still delivers while the
 * page is tearing itself down after the error.
 */
export function reportClientError(where: string, error: unknown): void {
  try {
    const err = error instanceof Error ? error : null;
    const body = JSON.stringify({
      id: `s-error-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      entry: {
        t: 0,
        kind: "client-error",
        where,
        message: err ? `${err.name}: ${err.message}` : String(error),
        stack: err?.stack?.slice(0, 1500) ?? null,
        page: location.pathname,
        agent: navigator.userAgent,
      },
    });
    const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/session", new Blob([body], { type: "application/json" }));
    if (!sent) void fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    // Reporting must never throw on top of the error it reports.
  }
}
