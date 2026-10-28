// Summarises one recorded show: what was heard, what the director decided, what reached the screen.
// Usage: node scripts/session-report.mjs [session-file]   (defaults to the newest in sessions/)
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "sessions");
const newest = () =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const file = process.argv[2] ?? newest();
if (!file) {
  console.log("No sessions recorded yet.");
  process.exit(0);
}

const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const sec = (ms) => `${(ms / 1000).toFixed(1).padStart(6)}s`;
const start = rows.find((r) => r.kind === "start");
console.log(path.basename(file));
if (start) console.log(`settings: words=${start.visualMode} source=${start.imageSource} bold=${start.bold} dwell=${start.dwellMs}ms lang=${start.lang}`);
if (start?.prepared?.length) console.log(`prepared before the talk, each waiting for its cue: ${start.prepared.join(", ")}`);
console.log("");

for (const r of rows) {
  if (r.kind === "line") {
    const lag = r.phraseMs != null ? ` (recogniser held it ${(r.phraseMs / 1000).toFixed(1)}s)` : "";
    console.log(`${sec(r.t)}  HEARD  "${r.text}"${lag}`);
  } else if (r.kind === "director") {
    const d = r.debug ?? {};
    const what = r.action === "hold" ? "HOLD" : `SHOW ${r.layout ?? ""} ${r.scene ?? r.headline ?? ""}`.trim();
    const why = [d.scene && d.scene !== "none" ? `scene ${d.scene}=${d.sceneFit}` : "", d.alt ? `or ${d.alt}=${d.altFit}` : "", d.count ? `figure ${d.count}` : "", d.proposed ? `library ${d.proposed}=${d.judgeFit}` : ""].filter(Boolean).join(", ");
    console.log(`${sec(r.t)}    -> ${what}  [${r.ms}ms]${why ? `  {${why}}` : ""}  ${String(r.reason ?? "").slice(0, 80)}`);
  } else if (r.kind === "onair") {
    console.log(`${sec(r.t)}    ON SCREEN: ${r.layout} ${r.scene ?? r.headline ?? ""}`);
  } else if (r.kind === "figure") {
    console.log(`${sec(r.t)}    FIGURE ${r.value} (no model)`);
  } else if (r.kind === "draw" && (r.skipped === "late" || r.skipped === "repeat")) {
    console.log(`${sec(r.t)}    DRAWN skipped: ${r.skipped === "late" ? "something else took the screen first" : "same picture as a recent one"}`);
  } else if (r.kind === "draw") {
    const how = r.declined ? (r.same ? "held: still on the picture that is up" : "declined: nothing worth a picture") : r.ok ? `"${r.label}"${r.by && r.by !== "model 1" ? ` (${r.by})` : ""} first sign after ${(r.firstMs / 1000).toFixed(1)}s, finished in ${(r.ms / 1000).toFixed(1)}s` : `FAILED${r.stalled ? " (stalled)" : ""}`;
    console.log(`${sec(r.t)}    DRAWN ${how}`);
  } else if (r.kind === "prepared") {
    console.log(`${sec(r.t)}    PREPARED fired on "${r.strong}"`);
  } else if (r.kind === "error") {
    console.log(`${sec(r.t)}    ERROR ${String(r.message ?? "").slice(0, 100)}`);
  } else if (r.kind === "mic") {
    console.log(`${sec(r.t)}    mic ${r.event}${r.error ? `: ${r.error}` : ""}`);
  }
}

const lines = rows.filter((r) => r.kind === "line");
const decisions = rows.filter((r) => r.kind === "director");
const shows = decisions.filter((r) => r.action !== "hold");
const onAir = rows.filter((r) => r.kind === "onair" && r.fresh !== false);
const fired = rows.filter((r) => r.kind === "prepared");
// The talk ends at the last thing the engine did, not when the mic was finally switched off.
const active = rows.filter((r) => r.kind === "director" || r.kind === "onair" || r.kind === "prepared").at(-1)?.t ?? rows.at(-1)?.t ?? 0;
const minutes = Math.max(active / 60000, 1 / 60);
// A hold that had a clearly fitting scene (4+, enough to overrule the director) is an idea the engine
// threw away. Staying on a scene that is already on screen is not one.
const wasted = decisions.filter((r) => r.action === "hold" && (r.debug?.sceneFit ?? 0) >= 4 && !/on screen/.test(String(r.reason ?? "")));
const fragments = lines.filter((l) => l.text.trim().split(/\s+/).length <= 2);
const lags = lines.map((l) => l.phraseMs).filter((x) => typeof x === "number").sort((a, b) => a - b);
console.log("");
console.log(`length ${(minutes * 60).toFixed(0)}s | heard ${lines.length} segments, ${fragments.length} of them 1-2 words | ${decisions.length} decisions, ${decisions.length - shows.length} holds`);
const unfired = (start?.prepared ?? []).filter((cue) => !fired.some((f) => f.strong === cue));
if (unfired.length) console.log(`prepared but never fired (cue not heard): ${unfired.join(", ")}`);
console.log(`on screen: ${onAir.length} slides, ${fired.length} of them prepared | holds with a clearly fitting scene thrown away: ${wasted.length}`);
console.log(`slides per minute: ${(onAir.length / minutes).toFixed(1)}${lags.length ? ` | median wait for the recogniser: ${(lags[Math.floor(lags.length / 2)] / 1000).toFixed(1)}s` : ""}`);
