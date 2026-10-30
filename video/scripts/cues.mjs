// Writes the cue sheets for the two segments from the same timeline the picture is drawn from, so a re-timed
// cut takes its sound along. Needs Node 22 (it reads src/film/timeline.ts as is).
//
//   node scripts/cues.mjs   ->  audio/hook/cues.json, audio/built/cues.json
//
// The hook's click takes its level from segment 2's last mix, so after changing a sound: run this, mix built,
// run this again, then mix hook.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BUILT_LINE_SECONDS, BUILT_LINES, builtBlackAt, builtEndAt, builtSeconds, FPS, HOOK_SECONDS, hookShotAt } from "../src/film/timeline.ts";

// Loudness the brief asks for, for both segments.
const TARGET = -16;
// Every sound goes into the mix at this gain before segment 2 is levelled.
const CUE_GAIN = 0.2;

function write(name, sheet) {
  mkdirSync(`audio/${name}`, { recursive: true });
  writeFileSync(`audio/${name}/cues.json`, `${JSON.stringify(sheet, null, 2)}\n`);
  console.log(`audio/${name}/cues.json: ${sheet.cues.length} cues over ${sheet.length} s`);
}

// One click cannot be levelled to -16 LUFS: the 400 ms window around it would need 23 dB more and the limiter
// would flatten it. So the hook is left unlevelled and its click gets the level the -16 LUFS levelling of
// segment 2 gives the same click there, read from that mix, and both clicks match.
const BUILT_REPORT = "audio/built/mix-report.json";
if (!existsSync(BUILT_REPORT)) console.warn(`${BUILT_REPORT} is missing: mix built, then run this again for the hook's click level`);
const builtLiftDb = existsSync(BUILT_REPORT) ? JSON.parse(readFileSync(BUILT_REPORT, "utf8")).liftDb : 0;
const HOOK_CLICK_GAIN = Number((CUE_GAIN * 10 ** (builtLiftDb / 20)).toFixed(3));

const live = hookShotAt("live");
write("hook", {
  length: HOOK_SECONDS,
  fps: FPS,
  target: null,
  // No music under the hook: the one mic click is all there is.
  silence_ok: [[0, HOOK_SECONDS]],
  cues: [{ t: live, name: "the mic switches on as WE'LL DO IT LIVE slams in", sound: "mic-click", tag: "cut", hero: true, gain: HOOK_CLICK_GAIN }],
});

const kicks = BUILT_LINES.map((line, i) => ({
  t: i * BUILT_LINE_SECONDS,
  name: `cut to ${line.lines.join(" ")}`,
  sound: "kick",
  tag: "cut",
  hero: i === 0,
  gain: CUE_GAIN,
}));
write("built", {
  length: builtSeconds(),
  fps: FPS,
  target: TARGET,
  // A dry kick on each cut and nothing between them.
  silence_ok: [[0, builtSeconds()]],
  cues: [
    ...kicks,
    { t: builtEndAt(), name: "cut to the address", sound: "kick", tag: "cut", hero: true, gain: CUE_GAIN },
    { t: builtBlackAt(), name: "the mic switches off as the frame cuts to black", sound: "mic-click", tag: "cut", hero: true, gain: CUE_GAIN },
  ],
});
