// Builds the finished film from the picture, the track, the take and two mic clicks, all timed from
// src/live/bars.ts, then measures it. Needs Node 22 (it reads bars.ts as is), ffmpeg, and the sound-layer
// skill's scripts for the mix and the check.
//
//   node scripts/live.mjs               render the picture, mix, mux, check  ->  out/live/do-it-live.mp4
//   node scripts/live.mjs --no-render   reuse out/live/picture.mp4
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { at, DEMO, DEMO_BAR, demoCuts, DROP_BAR, END_BAR, filmFrames, FPS, HYPE_BAR, MUSIC } from "../src/live/bars.ts";

const SOUND = `${homedir()}/.claude/skills/sound-layer/scripts`;
const OUT = "out/live";
const AUDIO = "audio/live";
// Loudness the brief asks for: the track and the voice are each brought there, so neither drowns the other.
const TARGET = -16;
// A click in the silence of the turn needs no more than this to be heard: about 13 dB under full scale.
const CLICK_GAIN = 0.35;

const t = (bar, beat = 0) => at(bar, beat) / FPS;
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
const length = filmFrames() / FPS;

mkdirSync(OUT, { recursive: true });
mkdirSync(AUDIO, { recursive: true });

if (!process.argv.includes("--no-render")) {
  run("npx", ["remotion", "render", "src/index.ts", "LiveFilm", `${OUT}/picture.mp4`, "--muted", "--image-format=png", "--color-space=bt709", "--crf=16", "--log=error"]);
}

// The track: cut so that its drop falls on the drop bar, and brought to the target loudness.
let music;
if (MUSIC) {
  const offset = MUSIC.drop - t(DROP_BAR);
  const source = `public/${MUSIC.file}`;
  run("ffmpeg", ["-y", "-v", "error", ...(offset > 0 ? ["-ss", offset.toFixed(3)] : []), "-i", source, "-ar", "48000", "-ac", "2", `${AUDIO}/music.wav`]);
  const lufs = measure(`${AUDIO}/music.wav`);
  music = {
    file: `${AUDIO}/music.wav`,
    gain: Number((10 ** ((TARGET - lufs) / 20)).toFixed(3)),
    ...(offset < 0 ? { delay: Number((-offset).toFixed(3)) } : {}),
    // Open over the old way; dead stop for the turn; the drop on WE'LL DO IT LIVE; low under the voice; open for the hype.
    shape: [
      [0, "open"],
      [t(DROP_BAR - 1), "off", 0.02],
      [t(DROP_BAR), "open", 0.02],
      [t(DEMO_BAR), "far", 0.3],
      [t(HYPE_BAR), "open", 0.05],
      // Out a breath before the last click, so the click is heard on its own.
      [t(END_BAR - 1) - 0.15, "off", 0.05],
    ],
  };
}

const sheet = {
  length,
  fps: FPS,
  target: null,
  ...(music ? { music } : {}),
  // The turn is silent on purpose: the music stops dead on bar 13 and F*CK IT sits in that silence until the drop.
  silence_ok: music ? [[t(DROP_BAR - 1) - 0.05, t(DROP_BAR) + 0.05], [t(END_BAR - 1) - 0.2, length]] : [[0, length]],
  cues: [
    { t: t(DROP_BAR - 1, 2), name: "the mic switches on as F*CK IT cuts in", sound: "mic-click", tag: "cut", hero: true, gain: CLICK_GAIN },
    { t: t(END_BAR - 1), name: "the mic button is pressed as the film cuts to black", sound: "mic-click", tag: "cut", hero: true, gain: CLICK_GAIN },
  ],
};
writeFileSync(`${AUDIO}/cues.json`, `${JSON.stringify(sheet, null, 2)}\n`);
run("node", [`${SOUND}/mix.mjs`, `${AUDIO}/cues.json`, "--out", AUDIO, "--kit", "audio/kit"]);

// The voice: the take's own sound through the cut, the parts at speed and the skipped stretches sped up to
// the fast-forward's length (the tape-zip of a real fast-forward, from the recording itself, kept low),
// levelled once, laid in where the live section starts.
if (DEMO.length > 0) {
  renameSync(`${AUDIO}/mix.wav`, `${AUDIO}/music-fx.wav`);
  const cuts = demoCuts().map((c) => (c.kind === "part" ? { ...c, from: c.part.from, to: c.part.to, file: c.part.file } : { ...c, file: DEMO[0].file }));
  const inputs = cuts.flatMap((c) => ["-ss", String(c.from), "-t", String(c.to - c.from), "-i", `public/${c.file}`]);
  const streams = cuts.map((c, i) => `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo${c.kind === "skip" ? `,${tempo(((c.to - c.from) * FPS) / c.frames)},highpass=f=300,volume=0.35` : ""}[p${i}]`).join(";");
  const joined = `${cuts.map((_, i) => `[p${i}]`).join("")}concat=n=${cuts.length}:v=0:a=1[v]`;
  const delay = Math.round(t(DEMO_BAR) * 1000);
  // The take was recorded outdoors on the laptop's microphone: the rumble under the voice goes, then it is levelled once.
  const graph = `${streams};${joined};[v]highpass=f=110:poles=2,loudnorm=I=${TARGET}:TP=-2:LRA=11,adelay=${delay}|${delay}[voice];[0:a][voice]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=false[out]`;
  run("ffmpeg", ["-y", "-v", "error", "-i", `${AUDIO}/music-fx.wav`, ...inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", `${AUDIO}/mix.wav`]);
}

/** ffmpeg's atempo takes 0.5 to 100 a step, so a steeper fast-forward is several steps. */
function tempo(rate) {
  const steps = [];
  let left = rate;
  while (left > 100) {
    steps.push("atempo=100");
    left /= 100;
  }
  steps.push(`atempo=${left.toFixed(4)}`);
  return steps.join(",");
}

run("ffmpeg", ["-y", "-v", "error", "-i", `${OUT}/picture.mp4`, "-i", `${AUDIO}/mix.wav`, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", `${OUT}/do-it-live.mp4`]);
console.log(`${OUT}/do-it-live.mp4: ${length.toFixed(1)} s`);

if (!existsSync(`${SOUND}/qa.mjs`)) throw new Error(`No sound check at ${SOUND}/qa.mjs`);
run("node", [`${SOUND}/qa.mjs`, `${OUT}/do-it-live.mp4`, "--cues", `${AUDIO}/cues.json`, "--audio", AUDIO]);

/** Integrated loudness in LUFS, from ffmpeg's EBU R128 summary. */
function measure(file) {
  // The meter prints its summary on stderr.
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const m = log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/);
  if (!m) throw new Error(`Could not read the loudness of ${file}`);
  return Number(m[1]);
}
