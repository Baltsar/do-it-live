// The film's track, written to its own bars at 128 BPM: a build up to the dead bar before the drop, the
// drop on DROP_BAR (WE'LL DO IT LIVE), the groove low under the take, and the hype to the end. Our own
// synthesis, so nothing to license; swap the file in src/live/bars.ts (MUSIC) if a real track ever replaces it.
//
//   node scripts/music-standin.mjs   ->  public/music-standin.wav
import { writeFileSync } from "node:fs";
import { DEMO_BAR, DROP_BAR, END_BAR, HYPE_BAR } from "../src/live/bars.ts";

const SR = 48000;
const BPM = 128;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const DROP = DROP_BAR;
const BARS = END_BAR + 1;
const LENGTH = Math.round(BARS * BAR * SR) + SR;

const drums = [new Float64Array(LENGTH), new Float64Array(LENGTH)];
const tonal = [new Float64Array(LENGTH), new Float64Array(LENGTH)];

const bar = (b) => (b - 1) * BAR;
const beat = (b, n) => bar(b) + n * BEAT;
const noise = () => Math.random() * 2 - 1;
const TAU = Math.PI * 2;

/** Adds `fn(seconds)` to a layer from `t`, for `dur` seconds, panned -1 (left) to 1 (right). */
function play(layer, t, dur, fn, pan = 0) {
  const start = Math.round(t * SR);
  const n = Math.round(dur * SR);
  const gl = pan > 0 ? 1 - pan : 1;
  const gr = pan < 0 ? 1 + pan : 1;
  for (let i = 0; i < n && start + i < LENGTH; i++) {
    const v = fn(i / SR);
    layer[0][start + i] += v * gl;
    layer[1][start + i] += v * gr;
  }
}

/** White noise through a one-pole difference: bright, for hats and claps. */
const bright = () => {
  let prev = 0;
  return () => {
    const x = noise();
    const y = x - prev;
    prev = x;
    return y * 0.5;
  };
};

function kick(t, vel = 1) {
  const br = bright();
  play(drums, t, 0.45, (s) => {
    const phase = TAU * (52 * s + 110 * 0.03 * (1 - Math.exp(-s / 0.03)));
    const click = s < 0.003 ? br() * 0.5 : 0;
    return (Math.sin(phase) * Math.exp(-s / 0.16) * 0.8 + click) * vel;
  });
}

function hat(t, vel = 1, decay = 0.03, pan = 0) {
  const br = bright();
  play(drums, t, decay * 6, (s) => br() * Math.exp(-s / decay) * 0.44 * vel, pan);
}

function clap(t, vel = 1) {
  const br = bright();
  play(drums, t, 0.4, (s) => {
    const env = Math.exp(-s / 0.045) + 0.7 * Math.exp(-Math.max(0, s - 0.011) / 0.045) + 0.5 * Math.exp(-Math.max(0, s - 0.022) / 0.09);
    return (br() * 0.7 + noise() * 0.3) * env * 0.34 * vel;
  });
}

function crash(t, vel = 1) {
  const br = bright();
  play(drums, t, 2.5, (s) => br() * Math.exp(-s / 0.7) * 0.3 * vel);
}

/** A saw through a lowpass that opens on the attack and closes: the bass pluck. */
function bass(t, f, dur, open = 1, vel = 1) {
  play(tonal, t, dur, (s) => {
    const fc = 120 + 2200 * open * Math.exp(-s / 0.09);
    let v = 0;
    for (let k = 1; k <= 10; k++) v += (Math.sin(TAU * k * f * s) / k) * (1 / (1 + ((k * f) / fc) ** 2));
    const release = dur - s < 0.02 ? (dur - s) / 0.02 : 1;
    return v * Math.exp(-s / 0.3) * release * 0.3 * vel;
  });
}

function pluck(t, f, vel = 1, pan = 0) {
  play(tonal, t, 0.5, (s) => (Math.sin(TAU * f * s) + Math.sin(TAU * 3 * f * s) / 9 + Math.sin(TAU * 5 * f * s) / 25) * Math.exp(-s / 0.14) * 0.26 * vel, pan);
}

function pad(t, notes, dur, vel = 1) {
  for (const f of notes) {
    for (const [detune, pan] of [[1.003, -0.6], [0.997, 0.6]]) {
      play(tonal, t, dur, (s) => {
        let v = 0;
        for (let k = 1; k <= 6; k++) v += (Math.sin(TAU * k * f * detune * s) / k) * (1 / (1 + ((k * f) / 700) ** 2));
        const attack = Math.min(1, s / 0.25);
        const release = dur - s < 0.15 ? (dur - s) / 0.15 : 1;
        return v * attack * release * 0.06 * vel;
      }, pan);
    }
  }
}

function riser(t, dur) {
  const br = bright();
  play(drums, t, dur, (s) => {
    const x = s / dur;
    const sweep = Math.sin(TAU * ((220 * dur) / Math.log(8)) * (8 ** x - 1));
    return br() * x * x * 0.28 + sweep * x ** 1.5 * 0.12;
  });
}

const A1 = 55;
const C2 = 65.41;
const G1 = 49;
const CHORDS = [
  [110, 130.81, 164.81],
  [130.81, 164.81, 196],
  [98, 123.47, 146.83],
  [110, 130.81, 164.81],
];
const ROOTS = [A1, C2, G1, A1];
const LEAD = [
  [440, 0, 523.25, 0, 659.25, 587.33, 523.25, 0],
  [440, 0, 392, 440, 0, 523.25, 0, 0],
];

const DEAD = DROP - 1;
const ROLL = DROP - 2;
const RISER = DROP - 5;

for (let b = 1; b <= BARS; b++) {
  if (b === DEAD) continue;
  if (b >= END_BAR) {
    if (b === END_BAR) {
      kick(bar(b));
      crash(bar(b));
      bass(bar(b), A1, 1.2, 1);
    }
    continue;
  }
  const build = b < DROP;
  const rise = build ? Math.min(1, (b - 1) / (DEAD - 2)) : 1;
  const hype = b >= HYPE_BAR;
  const underVoice = b >= DEMO_BAR && b < HYPE_BAR;
  for (let n = 0; n < 4; n++) {
    kick(beat(b, n), build ? 0.75 + 0.25 * rise : 1);
    hat(beat(b, n + 0.5), 1, build ? 0.03 : 0.08, 0.25);
    if (!build) hat(beat(b, n), 0.45, 0.02, -0.25);
    if (!build || b >= RISER) {
      if (!(build && b === ROLL) && (n === 1 || n === 3)) clap(beat(b, n));
    }
  }
  if (build && b === ROLL) {
    for (let i = 0; i < 8; i++) clap(beat(b, i / 4), 0.35 + (0.5 * i) / 8);
    for (let i = 0; i < 16; i++) clap(beat(b, 2 + i / 8), 0.75 + (0.25 * i) / 16);
  }
  if (!build || b >= 2) {
    const root = build ? A1 : ROOTS[(b - DROP) % 4];
    for (let n = 0; n < 8; n++) bass(beat(b, n / 2), root, BEAT / 2 - 0.01, build ? 0.15 + 0.85 * rise : 1, n % 2 === 0 ? 1 : 0.75);
  }
  if (build && b >= RISER + 1) {
    const notes = [220, 261.63, 329.63, 440];
    for (let n = 0; n < 4; n++) pluck(beat(b, n + 0.5), notes[(n + b) % 4], 0.6 + 0.4 * rise, n % 2 === 0 ? -0.3 : 0.3);
  }
  if (!build) {
    pad(bar(b), CHORDS[(b - DROP) % 4], BAR, underVoice ? 0.6 : 1);
    const phrase = LEAD[(b - DROP) % 2];
    const leadOn = !underVoice || (b - DROP) % 4 < 2;
    if (leadOn) for (let n = 0; n < 8; n++) if (phrase[n]) pluck(beat(b, n / 2), phrase[n], underVoice ? 0.5 : hype ? 1.1 : 1, n % 2 === 0 ? -0.2 : 0.2);
  }
  if (b === RISER) riser(bar(b), BAR * 4);
}

// The tonal layer pumps with the kick, the two layers meet, and a soft clip glues them.
const out = [new Float64Array(LENGTH), new Float64Array(LENGTH)];
let peak = 0;
for (let i = 0; i < LENGTH; i++) {
  const s = i / SR;
  const sinceBeat = s % BEAT;
  const pump = 1 - 0.65 * Math.exp(-sinceBeat / 0.09);
  for (const ch of [0, 1]) {
    const v = drums[ch][i] + tonal[ch][i] * pump;
    out[ch][i] = Math.tanh(v * 1.3) / Math.tanh(1.3);
    peak = Math.max(peak, Math.abs(out[ch][i]));
  }
}
const gain = 0.89 / peak;

const data = Buffer.alloc(LENGTH * 4);
for (let i = 0; i < LENGTH; i++) {
  data.writeInt16LE(Math.round(out[0][i] * gain * 32767), i * 4);
  data.writeInt16LE(Math.round(out[1][i] * gain * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
writeFileSync("public/music-standin.wav", Buffer.concat([header, data]));
console.log(`public/music-standin.wav: ${(LENGTH / SR).toFixed(1)} s, drop at ${bar(DROP).toFixed(3)} s`);
