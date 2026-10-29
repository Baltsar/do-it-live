// Turns the session log of a take into the labels the pitch shows on each live slide: what made it and how
// fast. Reads a local sessions/*.jsonl or a saved Vercel runtime log ("SESSION <id> {...}" lines).
// Usage: node scripts/labels.mjs <session-file>   (writes src/labels.json)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/labels.mjs <session-file>");
  process.exit(1);
}

const byKey = new Map();
for (const line of readFileSync(file, "utf8").split("\n")) {
  const json = line.trim().startsWith("{") ? line.trim() : line.match(/SESSION \S+ (\{.*\})\s*$/)?.[1];
  if (!json) continue;
  const row = JSON.parse(json);
  byKey.set(`${row.t}|${row.kind}|${json.length}`, row);
}
const rows = [...byKey.values()].sort((a, b) => a.t - b.t);

// The drawing race, best model first (src/lib/draw.ts).
const MODELS = { "model 1": "Kimi-K3", "model 2": "gpt-oss-120b", "model 3": "Nemotron 3 Ultra" };
const LOOKS = { KINETIC: "Moving type", QUOTE: "Your own words", VERSUS: "Duel", BIG_NUMBER: "Big number" };
const secs = (ms) => (typeof ms === "number" ? `${(ms / 1000).toFixed(1)} s` : "");
const near = (kind, t, before = 3000, after = 3000, test = () => true) => rows.find((r) => r.kind === kind && r.t >= t - before && r.t <= t + after && test(r));

const labels = [];
for (const r of rows) {
  if (r.kind !== "onair" || r.fresh === false) continue;
  const lag = secs(r.lagMs);
  const drawn = near("draw", r.t, 1500, 6000, (d) => d.ok && d.label === r.headline);
  const model = drawn ? (MODELS[drawn.by] ?? drawn.by) : "";
  const parts = (...xs) => xs.filter(Boolean).join(" · ");
  let text;
  let tone;
  if (near("prepared", r.t, 1500, 0)) [text, tone] = [parts("Prepared from your notes", "Nemotron 3 Ultra"), "draw"];
  else if (near("director", r.t, 15000, 0, (d) => d.addressed && d.action !== "hold")) [text, tone] = [parts("Fact", "Tavily + Nemotron 3 Ultra", lag), "fact"];
  else if (near("figure", r.t, 1500, 0)) [text, tone] = [parts("Spoken figure", "no model", "instant"), "figure"];
  else if (r.layout === "LIVE_UI") [text, tone] = [parts("Drawn live", model, lag), "draw"];
  else if (r.layout === "UI_HERO") [text, tone] = [parts(`Interface card${r.ui ? `: ${r.ui}` : ""}`, model, lag), "card"];
  else if (LOOKS[r.layout] && r.ui) [text, tone] = [parts(LOOKS[r.layout], model, lag), "card"];
  else if (r.layout === "SCENE") [text, tone] = [parts(`Scene: ${r.scene ?? r.headline}`, "Nemotron 3.5 Lightning"), "scene"];
  else if (r.layout === "GIF_REACTION" || r.layout === "PHOTO") [text, tone] = [parts("Your own GIF", "picked by Nemotron"), "media"];
  else [text, tone] = [parts(r.layout, lag), "draw"];
  labels.push({ at: Number((r.t / 1000).toFixed(2)), text, tone });
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "labels.json");
writeFileSync(out, `${JSON.stringify(labels, null, 2)}\n`);
for (const l of labels) console.log(`${l.at.toFixed(1).padStart(6)}s  ${l.text}`);
console.log(`${labels.length} labels -> ${path.relative(process.cwd(), out)}`);
