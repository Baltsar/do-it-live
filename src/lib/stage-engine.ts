// Client-side show engine: speech in, slides out. Framework-free so the React
// layer is a thin useSyncExternalStore binding.
import { ANCHORS } from "@/lib/anchors";
import { artDirect } from "@/lib/art-director";
import { looksFor } from "@/lib/card-looks";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from "@/lib/settings";
import { countFromLine, isAnnouncement, percentFromLine } from "@/lib/grounding";
import { matchPrepared, type PreparedMoment } from "@/lib/prepared";
import { detectSignpost, PAYLOAD_WORDS } from "@/lib/signposts";
import { resolveVisuals } from "@/lib/visuals";
import { StreamRecognition } from "@/lib/stream-recognition";
import type { BudgetView } from "@/lib/budget";
import { closedFor } from "@/lib/budget-rules";
import type { DrawPalette } from "@/lib/draw";
import { getLive, parseDrawing, setLive, type LiveDrawing } from "@/lib/live-store";
import { parseTheme, THEME_KEY } from "@/lib/theme";
import { hostOf, normalizeSlide, type ImageSource, type VisualMode, type DirectorResult, type Slide } from "@/lib/slide";

export type Mode = "hybrid" | "yolo" | "manual";

export interface TranscriptLine {
  id: number;
  text: string;
  addressed: boolean;
}

export interface Wish {
  line: string;
  wish: string;
}

/** A slide built before the talk from the speaker's heads-up, waiting for its cue. */
export interface PreparedSlide {
  id: string;
  cues: string[];
  strong: string;
  slide: Slide;
  used: boolean;
}

export interface ShelfItem {
  slide: Slide;
  reason: string;
}

export interface ProviderStatus {
  nebius: boolean;
  tavily: boolean;
  /** Speech to text runs on AssemblyAI instead of the browser's own recogniser. */
  assemblyai?: boolean;
  /** The speaker's own media can be added: false on a host with no disk to keep it on. */
  uploads?: boolean;
  /** Free minutes left today on the hosted demo; null or absent on a laptop. */
  budget?: BudgetView | null;
  /** Shows are recorded to disk for review: true on a laptop, false on the hosted demo. */
  record?: boolean;
  model: string | null;
  roles?: Record<"fast" | "quality" | "vision" | "embed", string | null>;
}

export interface StageSnapshot {
  current: Slide | null;
  history: Slide[];
  idx: number;
  /** Slide waiting for the dwell time to pass. */
  next: Slide | null;
  nextReason: string;
  /** Milliseconds `next` waits before it goes on air (for the progress bar). */
  nextMs: number;
  /** Generated but not shown: the backstage shelf. */
  shelf: ShelfItem[];
  lines: TranscriptLine[];
  interim: string;
  heard: string;
  log: string[];
  status: ProviderStatus;
  mode: Mode;
  lang: string;
  listening: boolean;
  blank: boolean;
  busy: boolean;
  lastMs: number | null;
  model: string | null;
  /** Seconds since the recognizer last returned any text, while listening. */
  quietSec: number;
  /** The browser refused the microphone: listening cannot start here. */
  micBlocked: boolean;
  /** Who refused it: this site's own setting, or the operating system for the whole browser. */
  micBlockedBy: "site" | "system" | null;
  /** The browser is asking "allow the microphone?" right now, and the show waits for the answer. */
  micAsking: boolean;
  /** The microphone was allowed after a refusal, while the page was open: one press and it works. */
  micAllowedNow: boolean;
  /** Listening for a while and not one word back since the start: the take is not getting through. */
  micNoWords: boolean;
  /** Recognition keeps ending the moment it starts: something else holds the microphone. */
  micBusy: boolean;
  /** The input the browser listens to, as the browser names it. Known before listening once the mic is allowed. */
  micDevice: string | null;
  /** Capture rate of that input. 16000 or less is a Bluetooth headset in call mode, which garbles names. */
  micRate: number | null;
  /** Where speech becomes text: on this machine, or on Google's servers. */
  micMode: "on-device" | "cloud" | "assemblyai" | null;
  /** The input delivers exact digital silence: muted, or a virtual device with nothing behind it. */
  micSilent: boolean;
  /** Sound arrives but the browser turns none of it into words: it has the speech API, not the service. */
  micDeaf: boolean;
  /** There is no microphone at all. */
  micMissing: boolean;
  replaying: boolean;
  replayDone: number;
  replayTotal: number;
  sessionId: string | null;
  visualMode: VisualMode;
  imageSource: ImageSource;
  dwellMs: number;
  /** Careful: only clear fits from the library. Bold: a stretch is allowed. */
  bold: boolean;
  brief: string;
  prepared: PreparedSlide[];
  preparing: boolean;
  /** Lines where Bill wanted a picture the library did not have: the speaker's shopping list. */
  wishes: Wish[];
}

export type StageMessage =
  | { type: "state"; slide: Slide | null; blank: boolean }
  /** The growing content of a slide that is being drawn, for the audience window. */
  | { type: "live"; id: string; drawing: LiveDrawing };

export const CHANNEL = "doitlive";

const WINDOW_MS = 90_000;
const THOUGHT_MS = 20_000;
const THOUGHT_WORDS = 32;
// A fragment shorter than this waits for more words before the director is asked.
const MIN_WORDS = 4;
// A long run-on sentence is not final for many seconds: decide on it while it is still being spoken.
const INTERIM_STEP_WORDS = 9;
const INTERIM_GAP_MS = 2500;
// A signpost ("but here's the problem") says the payload is one clause away, so the gate is cut to
// roughly half. Short enough to beat the speaker there, long enough that a marker alone cannot fire.
const SIGNPOST_STEP_WORDS = 5;
const SIGNPOST_GAP_MS = 1200;
// Two aborts further apart than this are bad luck, not a tug of war over the microphone.
const ABORT_FIGHT_MS = 3000;
const SETTLE_MS = 700;
// No word from a drawing model after this long means it is stuck.
const DRAW_FIRST_MS = 3000;
// There are three drawing models, best pictures first (see DRAW_MODELS). A healthy one has named its
// picture after about 0.7 s. When none has after this long, the next one starts drawing beside them,
// and the first picture on screen wins.
const DRAW_TIERS = 3;
// How many of them, from the top, may decide that a line deserves no picture.
const TRUSTED_JUDGES = 2;
const NEXT_TIER_MS = 1200;
// A model that was this slow twice in a row gets company from the start, until it is quick again.
const SLOW_STREAK = 2;
// A drawing that sends nothing for this long has stalled (seen: a 12 s gap mid-answer).
const DRAW_STALL_MS = 6000;
// No new word for this long means the speaker paused: act on the phrase now. The recogniser itself
// takes another one to three seconds to call it finished, and a punchline cannot wait for that.
const PAUSE_MS = 700;
// A demo talk types each line into the caption a word at a time, about the pace of quick speech at
// replay speed, so a visitor without a mic sees the transcript arrive the way a live one does.
const REPLAY_WORD_MS = 230;
// Less markup than this is not a picture.
const DRAW_MIN_CHARS = 300;
// The slide goes on air once this much of the picture itself exists. Going up at the first word of the
// answer left an empty coloured frame for up to three seconds while the model wrote its style block.
const DRAW_VISIBLE_CHARS = 180;
// The speaker has talked this long and the screen has not changed: the audience notices.
const DEAD_AIR_MS = 8000;
// After a drawing found nothing to show, the director's sure scene still goes up once the screen has
// stood still this long. In a real take the director asked for "clash" three times in a 16 s stretch
// with nothing new on screen, and each time the drawing's "none" buried it.
const STILL_MS = 5000;
// A director answer this late is about words the speaker left long ago, and while it is out no new
// decision can start: in one test take 8 of 12 answers took 8 to 10 s. A request to Bill may take longer.
const DIRECTOR_TIMEOUT_MS = 6000;
// An interface kind among the last this many slides is not used again.
const UI_KIND_COOLDOWN = 4;
// A card's other look (big number, duel, moving type, quote) is not used again within this many slides.
const LOOK_COOLDOWN = 3;
type DrawOutcome = "drawn" | "declined" | "same" | "refused" | "failed";
// Each drawn slide takes the next colour field of the style guide, so two in a row never look the same.
const DRAW_FIELDS = ["serious", "hype", "calm", "chaos", "funny"] as const;
const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const PROFILE = {
  language: "en",
  venue: "conference stage",
  audience: "mixed conference crowd",
  goal: "impress and entertain",
  tone: "funny, confident",
};
// "Bill" at the start of a final segment. Short names are easy to mishear, so
// aliases are listed and the console always shows what was heard.
const WAKE = /^\s*(?:hey|hi|okay|ok)?[\s,]*(?:bill|bil|bille|beel)\b[\s,:.!-]*(.*)$/i;

export interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  /** With a track, recognises that audio instead of opening the microphone itself (newer Chrome). */
  start(track?: MediaStreamTrack): void;
  stop(): void;
  /** Names to listen for (contextual biasing). Not every recogniser has it. */
  phrases?: unknown[];
  /** Recognise on this machine with the browser's own model instead of sending the audio away. */
  processLocally?: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
export interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
type RecognitionCtor = new () => RecognitionLike;

/**
 * Names in the heads-up that a recogniser will not know: a capital inside the word ("OpenSverige") or a
 * capitalised word in the middle of a sentence. Chrome heard "OpenSverige" as "open sorry", "offense sorry"
 * and "open Sia" in three tests, so the recogniser is told to expect them where it can be.
 */
export function namesIn(text: string): string[] {
  const found = new Set<string>();
  for (const sentence of text.split(/[.!?\n]+/)) {
    sentence.trim().split(/\s+/).forEach((raw, i) => {
      const word = raw.replace(/^[^\p{L}]+|[^\p{L}\p{N}]+$/gu, "");
      if (word.length < 4) return;
      if (/\p{Ll}\p{Lu}/u.test(word) || (i > 0 && /^\p{Lu}\p{Ll}/u.test(word))) found.add(word);
    });
  }
  return [...found].slice(0, 12);
}

type PhraseCtor = new (phrase: string, boost?: number) => unknown;

/** The static side of a recogniser that can run on the device (Chrome: Google's own small model). */
interface OnDeviceSupport {
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * One tab owns the microphone. Two tabs running the show each start a recogniser, and they take the
 * mic from each other about once a second ("aborted" in a real session) until neither hears a word.
 * Resolves to a release function, or null when another tab already holds it. Release returns a
 * promise that settles once the lock is really free: the browser lets go a moment after it is asked,
 * and a stop followed at once by a start (changing language) would otherwise find its own old lock
 * still held and report "another tab".
 */
function acquireMicLock(): Promise<(() => Promise<void>) | null> {
  if (!("locks" in navigator)) return Promise.resolve(() => Promise.resolve());
  return new Promise((resolve) => {
    const held: Promise<unknown> = navigator.locks.request("doitlive-mic", { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve(null);
        return undefined;
      }
      // Held until this promise settles, which is when the show stops listening.
      return new Promise<void>((release) =>
        resolve(() => {
          release();
          return held.then(() => undefined);
        }),
      );
    });
  });
}

// A meter frame where every sample is exactly zero is digital silence: a muted headset or a virtual
// device sends that, while a live microphone always has a noise floor. This long without a single
// non-zero sample is a dead input, not a quiet room.
const DEAD_INPUT_MS = 5000;
// How often the session log gets a level summary while listening.
const LEVEL_SUMMARY_MS = 5000;
// Clear sound this long into a take with not one word and not one error back: the browser has the
// speech API but no service behind it. Comet did exactly that on 27 Oct (a minute of speech at 0.2,
// silence from the recogniser), while Google Chrome on the same Mac transcribed the same input.
const DEAF_MS = 9000;
const DEAF_LEVEL = 0.03;
// Most people start within a few seconds of pressing the mic. Past this with not one word back, the
// page says so and shows the level, so the speaker can tell a silent mic from a slow one.
const FIRST_WORDS_MS = 8000;
// Sound well above the take's own floor, yet no word recognised for this long: the recogniser is stuck.
const STUCK_MS = 6000;
// Off: every take on 20 Oct that sent the heads-up names to the recogniser heard nothing at all (one ran
// four minutes, no error, no word), while every take without them did. A second tab was open during some
// of them, so the names are a suspect, not a proven cause, and they never showed a gain worth the risk.
const NAME_HINTS = false;

/** A touch-first device: a phone or a tablet. */
function onPhone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

const INITIAL: StageSnapshot = {
  current: null,
  history: [],
  idx: -1,
  next: null,
  nextReason: "",
  nextMs: 0,
  shelf: [],
  lines: [],
  interim: "",
  heard: "",
  log: [],
  status: { nebius: false, tavily: false, model: null },
  mode: "hybrid",
  lang: "en-US",
  listening: false,
  blank: false,
  busy: false,
  lastMs: null,
  model: null,
  quietSec: 0,
  micBlocked: false,
  micBlockedBy: null,
  micAsking: false,
  micAllowedNow: false,
  micNoWords: false,
  micBusy: false,
  micDevice: null,
  micRate: null,
  micMode: null,
  micSilent: false,
  micDeaf: false,
  micMissing: false,
  replaying: false,
  replayDone: 0,
  replayTotal: 0,
  sessionId: null,
  ...DEFAULT_SETTINGS,
  prepared: [],
  preparing: false,
  wishes: [],
};

export function createStage() {
  let snap: StageSnapshot = INITIAL;
  const listeners = new Set<() => void>();
  let channel: BroadcastChannel | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let shownAt = 0;
  let inFlight = false;
  let dirty = false;
  let seq = 0;
  let lineId = 0;
  const spoken: { t: number; text: string }[] = [];
  let recognition: RecognitionLike | null = null;
  let stopMeter: (() => void) | null = null;
  let watchdog: ReturnType<typeof setInterval> | null = null;
  let lastHeardAt = 0;
  // One listening session's own numbers, for its stop record: a log that ends without them cannot
  // say whether a silent take ran for two seconds or a whole minute.
  let listenStartedAt = 0;
  let resultCount = 0;
  let errorCount = 0;
  let finalCount = 0;
  const levelStats = { frames: 0, sum: 0, max: 0 };
  let releaseMicLock: (() => Promise<void>) | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  // Settles when the last lock this tab held is really free; a new start waits for it.
  let lockFree: Promise<void> = Promise.resolve();
  // A second press while the mic is still being opened must not start a second recogniser.
  let starting = false;
  let replaying = false;
  // Stays on after a replay ends: its last director answers and queued slides arrive later
  // and must not open a new session log. Real input (mic or typing) turns recording back on.
  let recordingOff = false;
  // A prepared slide waiting out the dwell time is the speaker's own plan: a live guess may not replace it.
  let nextIsPrepared = false;
  // The slide a model is drawing right now (one at a time), and how many have been drawn.
  let drawCount = 0;
  // Every decision gets a number. The drawing model and the director are asked at the same moment,
  // and whichever answers second needs to know what the first one did with that decision.
  let decisionCount = 0;
  // What the drawing came to: a picture, "nothing to show", "still the picture that is up", a card refused
  // for variety, or no answer at all.
  const drawOutcome = new Map<number, DrawOutcome>();
  const standIn = new Map<number, Slide>();
  // When each slide's words were handed to the models, so the log can say how long they took to reach the screen.
  const askedAt = new Map<string, number>();
  // The last few decisions in one line each. A stretch where the speaker talks and the screen stands
  // still is logged with these, so the log says why nothing went up instead of only that nothing did.
  const outcomes: string[] = [];
  let deadAirOf = 0;
  let maxResultGap = 0;
  // The decision whose drawing took the screen, and the handle that stops a drawing still being written.
  let pictureOf = 0;
  let activeDraw: AbortController | null = null;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  // Whether the browser's on-device recogniser can be used: "available", "downloadable", "unavailable"...
  let onDevice = "unknown";
  // How many times in a row each drawing model was slow to answer.
  const slowStreak: number[] = Array.from({ length: DRAW_TIERS }, () => 0);
  // The words each slide was made for, so the drawing model can tell "still on that point" from "new point".
  const madeFrom = new Map<string, string>();
  // A figure went up from the phrase still being spoken: the rest of that phrase belongs to it.
  let phraseSpent = false;
  // One log line per phrase: the marker is still in the text on every later word of the same phrase.
  let signpostSeen = false;
  // When the recogniser first heard the phrase it is still working on, and when it last finished one.
  let phraseStartedAt = 0;
  let lastFinalAt = 0;
  // Real speech arrives in fragments ("and", "that", "we"). The engine reacts to the thought so far:
  // everything said since the last slide went on air, not the latest fragment.
  let thought: { t: number; text: string }[] = [];
  let undecidedWords = 0;
  // Words of the phrase still being recognised that a decision has already seen.
  let interimSeen = 0;
  let liveInterim = "";
  let slideFromInterim = false;
  // How many words of the phrase still being spoken already have a slide.
  let interimCut = 0;
  let lastDecisionAt = 0;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionStart = 0;
  const replayTimers: ReturnType<typeof setTimeout>[] = [];
  let levelListener: ((level: number) => void) | null = null;

  const emit = (patch: Partial<StageSnapshot>): void => {
    snap = { ...snap, ...patch };
    listeners.forEach((l) => l());
  };

  const postLive = (id: string): void => {
    const drawing = getLive(id);
    if (!drawing) return;
    channel ??= new BroadcastChannel(CHANNEL);
    const msg: StageMessage = { type: "live", id, drawing };
    channel.postMessage(msg);
  };

  const post = (): void => {
    channel ??= new BroadcastChannel(CHANNEL);
    // The drawing goes first, so the audience window has it when the slide arrives.
    if (snap.current?.layout === "LIVE_UI") postLive(snap.current.id);
    const msg: StageMessage = { type: "state", slide: snap.current, blank: snap.blank };
    channel.postMessage(msg);
  };

  const persist = (): void => {
    saveSettings({ visualMode: snap.visualMode, imageSource: snap.imageSource, dwellMs: snap.dwellMs, bold: snap.bold, brief: snap.brief });
  };

  const log = (msg: string): void => {
    emit({ log: [`${new Date().toLocaleTimeString()}  ${msg}`, ...snap.log].slice(0, 40) });
  };

  /**
   * Fire-and-forget session log. Replays are not recorded again, and nothing is sent until the server
   * says it records at all: the hosted demo does not, so no spoken line ever leaves for a log.
   */
  function record(entry: Record<string, unknown>): void {
    if (replaying || recordingOff || snap.status.record !== true) return;
    if (!snap.sessionId) {
      sessionStart = Date.now();
      emit({ sessionId: `s-${new Date().toISOString().replace(/[:.]/g, "-")}` });
      // What the show was running with: a log is useless without the settings that produced it.
      void fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: snap.sessionId,
          entry: { t: 0, kind: "start", visualMode: snap.visualMode, imageSource: snap.imageSource, bold: snap.bold, dwellMs: snap.dwellMs, lang: snap.lang, brief: snap.brief, prepared: snap.prepared.map((p) => p.strong), library: snap.status, agent: navigator.userAgent, brands: (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.map((b) => b.brand) ?? null },
        }),
      }).catch(() => undefined);
    }
    void fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: snap.sessionId, entry: { t: Date.now() - sessionStart, ...entry } }),
    }).catch(() => undefined);
  }

  const toShelf = (slide: Slide, reason: string): ShelfItem[] =>
    [{ slide, reason }, ...snap.shelf.filter((s) => s.slide.id !== slide.id)].slice(0, 6);

  function show(incoming: Slide, fresh = true): void {
    // Re-shown history slides keep the look they had; new ones are art directed against what came before.
    const slide = fresh ? artDirect(incoming, snap.history.slice(0, snap.idx + 1).slice(-3), snap.visualMode) : incoming;
    // The words a slide was made for are spent when it is accepted (see enqueue), not here:
    // what the speaker says while it waits its turn belongs to the next slide.
    if (timer) clearTimeout(timer);
    timer = null;
    nextIsPrepared = false;
    const prevMs = shownAt ? Date.now() - shownAt : 0;
    shownAt = Date.now();
    const asked = askedAt.get(incoming.id);
    askedAt.delete(incoming.id);
    const history = fresh ? [...snap.history.slice(0, snap.idx + 1), slide] : snap.history;
    emit({
      current: slide,
      history,
      idx: fresh ? history.length - 1 : history.findIndex((s) => s.id === slide.id),
      next: null,
      nextMs: 0,
      shelf: snap.shelf.filter((s) => s.slide.id !== slide.id),
    });
    post();
    // What actually reached the screen, as opposed to what the director decided.
    record({ kind: "onair", headline: slide.headline, layout: slide.layout, ui: slide.ui?.kind ?? null, scene: slide.scene, libraryId: slide.libraryId, field: slide.style.field, fresh, lagMs: asked ? shownAt - asked : null, prevMs });
    note(`on air: ${slide.layout}${slide.ui ? `/${slide.ui.kind}` : ""} "${slide.scene ?? slide.headline}"`);
  }

  const note = (text: string): void => {
    outcomes.push(`${((Date.now() - sessionStart) / 1000).toFixed(1)}s ${text}`);
    if (outcomes.length > 8) outcomes.shift();
  };

  /** Speech goes on while the screen stands still: logged once per slide, with the decisions that led there. */
  function watchDeadAir(): void {
    const since = shownAt || listenStartedAt;
    if (!since || deadAirOf === since || snap.next || Date.now() - since < DEAD_AIR_MS) return;
    deadAirOf = since;
    const up = snap.current;
    record({ kind: "deadair", ms: Date.now() - since, onScreen: up ? up.scene || up.headline || (up.libraryId ? `gif ${up.libraryId}` : up.layout) : "", why: outcomes.slice(-5) });
  }

  /** The words said so far have their slide. What is still being spoken counts only from here on. */
  function consumeThought(): void {
    thought = [];
    undecidedWords = 0;
    slideFromInterim = liveInterim !== "";
    interimCut = slideFromInterim ? interimSeen : 0;
  }

  /**
   * Puts a slide in line that took a while to make (a drawing, the director's pick). It was made for `line`;
   * whatever the speaker has said since then is not spent with it. Those words are often the punchline
   * ("...a robot that says no. I am going to be a millionaire."), so they get their own decision at once.
   */
  function acceptLate(line: string, slide: Slide, immediate: boolean, reason: string): void {
    const tail = wordsAfter(line);
    // Everything heard so far in this phrase is accounted for: by the slide, or by the tail kept below.
    interimSeen = countWords(liveInterim);
    enqueue(slide, immediate, reason);
    keepTail(tail);
  }

  /** What the speaker has said beyond `line`, the words a decision was made on. */
  const wordsAfter = (line: string): string => thoughtText(unseenInterim()).split(/\s+/).filter(Boolean).slice(countWords(line)).join(" ");

  function keepTail(tail: string): void {
    if (!tail) return;
    thought.push({ t: Date.now(), text: tail });
    if (countWords(tail) >= 2) decide();
  }

  /**
   * The drawing model found that `line` is still about the picture on screen. Those words are then
   * spent, like the words a slide was made for. Left in the thought, the end of one sentence ran into
   * the next and blurred it: "...on my keyboard all day and the investor looked at me" was judged as dog talk.
   */
  function spendOnCurrent(line: string): void {
    const tail = wordsAfter(line);
    interimSeen = countWords(liveInterim);
    consumeThought();
    keepTail(tail);
  }

  /** Dwell rule: a slide stays up for the dwell time. Newer slides wait, addressed ones cut in. */
  function enqueue(slide: Slide, immediate: boolean, reason: string, prepared = false): void {
    // Whatever takes the screen makes answers that are still on their way out of date,
    // and the words it was made for are spent: they must not be illustrated a second time.
    seq += 1;
    consumeThought();
    const wait = shownAt + snap.dwellMs - Date.now();
    if (immediate || wait <= 0) return show(slide);
    if (snap.next && nextIsPrepared && !prepared) {
      emit({ shelf: toShelf(slide, reason) });
      log(`shelved: a prepared slide is next`);
      return;
    }
    const shelf = snap.next ? toShelf(snap.next, snap.nextReason) : snap.shelf;
    nextIsPrepared = prepared;
    emit({ next: slide, nextReason: reason, nextMs: wait, shelf });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (snap.next) show(snap.next);
    }, wait);
    log(`dwell: "${slide.headline}" waits ${(wait / 1000).toFixed(1)}s`);
  }

  function step(delta: number): void {
    const i = snap.idx + delta;
    const target = snap.history[i];
    if (!target) return;
    emit({ idx: i });
    show(target, false);
    emit({ idx: i });
  }

  function setBlank(on?: boolean): void {
    emit({ blank: on ?? !snap.blank });
    post();
  }

  const windowText = (): string => {
    const cutoff = Date.now() - WINDOW_MS;
    return spoken.filter((l) => l.t >= cutoff).map((l) => l.text).join(" ");
  };

  let prepTimer: ReturnType<typeof setTimeout> | null = null;
  let prepRun = 0;

  /** Builds the ready-made slides from the heads-up. Runs before the talk, never during a line. */
  async function prepare(): Promise<void> {
    const run = (prepRun += 1);
    const brief = snap.brief.trim();
    if (brief.length < 15) {
      emit({ prepared: [], preparing: false });
      return;
    }
    emit({ preparing: true });
    try {
      const res = await fetch("/api/prep", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brief }) });
      const { moments } = (await res.json()) as { moments: PreparedMoment[] };
      const prepared: PreparedSlide[] = [];
      for (const m of moments) {
        const slide = normalizeSlide(m.slide);
        await resolveVisuals(slide, snap.visualMode, snap.imageSource);
        prepared.push({ id: m.id, cues: m.cues, strong: m.strong, slide, used: false });
      }
      // The heads-up changed again while this ran: the newer run wins.
      if (run !== prepRun) return;
      emit({ prepared, preparing: false });
      // Scenes are placeholders: each of those moments now gets a slide drawn for it, in the style guide's
      // colours, while the speaker is still getting ready. On cue it is already finished.
      moments.forEach((m, i) => {
        if (prepared[i]?.slide.layout === "SCENE") void drawPrepared(run, m.id, m.say);
      });
    } catch {
      if (run === prepRun) emit({ prepared: [], preparing: false });
    }
  }

  async function drawPrepared(run: number, id: string, say: string): Promise<void> {
    const palette = nextPalette();
    // Before the talk there is time: if the first choice does not answer, the fast model draws it.
    // Before the talk there is time: each model gets its turn until one has drawn it.
    let raw: string | null = null;
    const usable = (text: string | null): boolean => Boolean(text) && (parseDrawing(text ?? "").ui !== undefined || parseDrawing(text ?? "").html.length >= DRAW_MIN_CHARS);
    for (let tier = 0; tier < DRAW_TIERS && !usable(raw); tier += 1) {
      raw = await requestDrawing(say, palette, [], new AbortController(), () => true, tier, true);
    }
    const { label, html, ui } = parseDrawing(raw ?? "");
    if (run !== prepRun || !label || label === "none" || (!ui && html.length < DRAW_MIN_CHARS)) return;
    const slide = normalizeSlide(ui ? { layout: "UI_HERO", headline: label, ui } : { layout: "LIVE_UI", headline: label });
    if (!ui) setLive(slide.id, { html, done: true, palette });
    emit({ prepared: snap.prepared.map((p) => (p.id === id && !p.used ? { ...p, slide } : p)) });
  }

  /** A prepared slide whose cue was just spoken goes up at once: no model call, no guessing. */
  function firePrepared(thoughtSoFar: string): boolean {
    // The whole thought, not its tail: in a real session "700 people" opened a 26-word sentence.
    // Staleness is not a risk, since the thought resets with every slide and each one fires once.
    const recent = thoughtSoFar;
    const hit = matchPrepared(recent, snap.prepared.filter((p) => !p.used));
    if (!hit) return false;
    emit({ prepared: snap.prepared.map((p) => (p.id === hit.id ? { ...p, used: true } : p)) });
    log(`prepared: ${hit.strong}`);
    record({ kind: "prepared", strong: hit.strong, cues: hit.cues, said: recent, layout: hit.slide.layout });
    madeFrom.set(hit.slide.id, recent);
    enqueue({ ...hit.slide }, false, `prepared: ${hit.strong}`, true);
    return true;
  }

  /** The colours a drawing may use: one field of the speaker's style guide. */
  function nextPalette(): DrawPalette {
    const theme = parseTheme(localStorage.getItem(THEME_KEY));
    const field = theme.fields[DRAW_FIELDS[drawCount % DRAW_FIELDS.length]];
    drawCount += 1;
    return { bg: field.bg, fg: field.fg, alt: field.alt };
  }

  /** Asks the drawing model for one slide and returns its answer as it grows. Null when it failed or stalled. */
  async function requestDrawing(line: string, palette: DrawPalette, shown: string[], controller: AbortController, onText: (raw: string) => boolean, tier = 0, prepared = false): Promise<string | null> {
    const onScreen = snap.next ?? snap.current;
    const current = !prepared && onScreen && !snap.blank ? { label: onScreen.scene ?? (onScreen.headline || onScreen.number), line: madeFrom.get(onScreen.id) ?? "" } : null;
    let stall = setTimeout(() => controller.abort(), DRAW_FIRST_MS);
    let raw = "";
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ line, palette, shown, current, tier, prepared }),
      });
      if (!res.ok || !res.body) return null;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return raw;
        clearTimeout(stall);
        stall = setTimeout(() => controller.abort(), DRAW_STALL_MS);
        raw += decoder.decode(value, { stream: true });
        if (!onText(raw)) {
          controller.abort();
          return raw;
        }
      }
    } catch {
      // Stopped on purpose (a newer slide took over) or stuck: what arrived so far is what there is.
      return raw || null;
    } finally {
      clearTimeout(stall);
    }
  }

  const sameLabel = (a: string, b: string): boolean => {
    const x = a.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    const y = b.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    return x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x));
  };

  /**
   * The director's scene for a moment the drawing gave nothing for: always when the drawing could not be
   * reached or its card was refused for variety, after "nothing to show" only once the screen has stood
   * still a while, and never when the drawing found that the picture up still fits.
   */
  function standInScene(scene: Slide, settled: DrawOutcome): void {
    const onScreen = snap.next ?? snap.current;
    const wanted = settled === "failed" || settled === "refused" || (settled === "declined" && Date.now() - shownAt >= STILL_MS);
    if (!wanted || (onScreen?.scene && onScreen.scene === scene.scene)) {
      note(`scene ${scene.scene ?? ""} unused: drawing ${settled}`);
      return;
    }
    enqueue(scene, false, `stand-in scene: drawing ${settled}`);
  }

  /**
   * Has a slide drawn for what was just said, at the same moment the director is asked. The model answers
   * "none" within half a second when the words have no point; otherwise the slide goes up as soon as it
   * has a name and builds on screen while the rest is written.
   */
  async function drawLive(line: string, decision: number, mySeq: number): Promise<void> {
    const palette = nextPalette();
    // What is up or queued, newest last: the drawing must not repeat it, in subject or in look.
    const lineup = [...snap.history, ...(snap.next ? [snap.next] : [])];
    const shown = lineup.slice(-4).map((h) => h.scene ?? h.headline).filter(Boolean);
    const looks = lineup.slice(-4).flatMap((h) => {
      const name = h.scene ?? h.headline;
      // A card's other look keeps its spec, but on screen it was not a card.
      const look = h.layout === "UI_HERO" && h.ui ? h.ui.kind : h.layout === "LIVE_UI" ? "drawing" : h.layout.toLowerCase();
      return name ? [`${name} [${look}]`] : [];
    });
    // Variety: interface cards look alike whatever they say. In one take 16 of 22 slides were cards,
    // because a card is the quickest answer and the quickest answer won. So no card right after a card,
    // and no kind that is already among the last few slides.
    const lastWasCard = lineup.at(-1)?.layout === "UI_HERO";
    const tired = (kind: string): boolean => lastWasCard || lineup.slice(-UI_KIND_COOLDOWN).some((h) => h.ui?.kind === kind);
    const t0 = performance.now();
    const asked = Date.now();
    // "Still on the picture that is up" means nothing while nothing is up (seen from the second model).
    const pictureUp = Boolean(snap.next ?? snap.current) && !snap.blank;
    let slide: Slide | null = null;
    let firstMs = 0;
    let lastPost = 0;
    let winner = -1;
    // Why no slide came of it, when none did. Kept in an object because it is set inside the stream callback.
    const outcome: { verdict: "declined" | "late" | "repeat" | "tired" | ""; same: boolean } = { verdict: "", same: false };
    // What a model that took itself out said, for when nobody else finds a picture either.
    const held: { decline: { same: boolean } | null; repeat: boolean; tired: boolean } = { decline: null, repeat: false, tired: false };
    // Each model's own answer is kept for the log: "none" from the fast one and "stopped" on the best one
    // reads very differently from "none" from the best one.
    const contenders = Array.from({ length: DRAW_TIERS }, () => ({ controller: new AbortController(), startedAt: 0, namedAt: 0, verdict: "", out: false, finished: false, done: null as Promise<string | null> | null }));
    type Contender = (typeof contenders)[number];
    const stopOthers = (keep: number): void =>
      contenders.forEach((c, i) => {
        if (i === keep) return;
        if (c.startedAt && !c.verdict) c.verdict = "stopped";
        c.controller.abort();
      });
    const stillDrawing = (c: Contender): boolean => c.startedAt > 0 && !c.finished && !c.out && !c.controller.signal.aborted;
    // This model is done with this line; the others go on.
    const out = (me: Contender): false => {
      me.out = true;
      return false;
    };
    const reader = (tier: number) => (text: string): boolean => {
      if (outcome.verdict || (winner !== -1 && winner !== tier)) return false;
      const me = contenders[tier];
      const { label, html, same, ui } = parseDrawing(text);
      if (label === null) return true;
      if (!me.namedAt) me.namedAt = performance.now();
      if (label === "none") {
        me.verdict = same ? "same" : "none";
        if (same && !pictureUp) return out(me);
        // The last model's "nothing to show" is never binding: it says so to almost anything.
        if (tier >= TRUSTED_JUDGES) return out(me);
        // Neither is the second model's while the best one is still at work: its quick "none" cut the best
        // one off 26 times in one 80 s take. It holds only if nobody finds a picture.
        if (contenders.slice(0, tier).some(stillDrawing)) {
          held.decline ??= { same: same === true };
          return out(me);
        }
        outcome.verdict = "declined";
        outcome.same = same === true;
        stopOthers(-1);
        return false;
      }
      // Normally the stage follows a short style block; a model that writes it differently still gets shown.
      const stageAt = html.search(/class=["']?stage/);
      // An interface element is complete the moment it is named.
      const visible = ui !== undefined || (stageAt === -1 ? html.length > 900 : html.length - stageAt >= DRAW_VISIBLE_CHARS);
      if (!slide && !visible) return true;
      if (!slide) {
        // Something else took the screen while the model was starting up: a prepared slide, a figure,
        // the speaker's own GIF, or a drawing for newer words.
        if (mySeq !== seq) {
          outcome.verdict = "late";
          me.verdict = "late";
          stopOthers(-1);
          return false;
        }
        // A picture of what was just shown, or one more card of a look the audience just saw: this model
        // is out, and another may still find something else.
        if (shown.some((s) => sameLabel(s, label))) {
          me.verdict = "repeat";
          held.repeat = true;
          return out(me);
        }
        let look: Slide | null = null;
        if (ui && tired(ui.kind)) {
          // One card too many: the same point in another look, unless every one fitting it was just shown too.
          const other = looksFor(ui, line).find((l) => !lineup.slice(-LOOK_COOLDOWN).some((h) => h.layout === l.layout));
          if (!other) {
            me.verdict = `tired:${ui.kind}`;
            held.tired = true;
            return out(me);
          }
          look = normalizeSlide(other);
        }
        winner = tier;
        me.verdict = look ? `${look.layout.toLowerCase()} for ${ui?.kind ?? ""}` : ui ? `ui:${ui.kind}` : "draw";
        stopOthers(tier);
        // A drawing for older words that is still being written stops where it is.
        activeDraw?.abort();
        activeDraw = me.controller;
        slide = look ?? normalizeSlide(ui ? { layout: "UI_HERO", headline: label, ui } : { layout: "LIVE_UI", headline: label });
        madeFrom.set(slide.id, line);
        askedAt.set(slide.id, asked);
        firstMs = Math.round(performance.now() - t0);
        if (!ui) setLive(slide.id, { html, done: false, palette });
        drawOutcome.set(decision, "drawn");
        pictureOf = decision;
        acceptLate(line, slide, false, look ? `${look.layout} instead of a ${ui?.kind ?? ""} card` : ui ? `interface: ${ui.kind}` : "drawn live");
        // Nothing more to wait for: the rest of the answer, if any, is not needed.
        return !ui;
      }
      setLive(slide.id, { html, done: false, palette });
      // The audience window gets the growing drawing a few times a second, not on every token.
      if (performance.now() - lastPost > 150) {
        lastPost = performance.now();
        postLive(slide.id);
      }
      return true;
    };
    const start = (tier: number): void => {
      const me = contenders[tier];
      if (!me || me.done || slide || outcome.verdict || mySeq !== seq) return;
      me.startedAt = performance.now();
      me.done = requestDrawing(line, palette, looks, me.controller, reader(tier), tier).finally(() => {
        me.finished = true;
      });
    };
    const startNext = (): void => {
      // Only when nobody still in the race has named a picture yet.
      if (contenders.some((c) => c.namedAt && !c.out)) return;
      start(contenders.findIndex((c) => !c.done));
    };
    // The best model always runs. A model that has been slow lately gets company at once.
    start(0);
    for (let tier = 0; tier < DRAW_TIERS - 1 && slowStreak[tier] >= SLOW_STREAK; tier += 1) start(tier + 1);
    // Named but nothing to see yet: slow writing, seen at 6 s for a dog. The next model joins anyway.
    const joinAnyway = (): void => start(contenders.findIndex((c) => !c.done));
    const timers = [setTimeout(startNext, NEXT_TIER_MS), setTimeout(joinAnyway, NEXT_TIER_MS * 2), setTimeout(joinAnyway, NEXT_TIER_MS * 3)];
    // Wait for everyone who is in the race, including those who join while we wait.
    for (;;) {
      const running = contenders.filter((c) => c.done);
      await Promise.all(running.map((c) => c.done));
      if (slide || outcome.verdict) break;
      startNext();
      // Nobody new joined, by the timers or just now: the race is over.
      if (contenders.filter((c) => c.done).length === running.length) break;
    }
    timers.forEach(clearTimeout);
    // A held "none" can only come from the second model while the best one was drawing; a refused card
    // means some model did find a point to show, so that counts first.
    if (!slide && !outcome.verdict) {
      if (held.tired) outcome.verdict = "tired";
      else if (held.decline) {
        outcome.verdict = "declined";
        outcome.same = held.decline.same;
      } else if (held.repeat) outcome.verdict = "repeat";
    }
    contenders.forEach((c, tier) => {
      // A model cut off by the winner before it said anything tells nothing about its speed. Counted as
      // slow, the best model got the fast one beside it on every line and was cut off by it ever after.
      if (!c.startedAt || (!c.namedAt && c.verdict === "stopped")) return;
      const quick = c.namedAt > 0 && c.namedAt - c.startedAt <= NEXT_TIER_MS;
      slowStreak[tier] = quick ? 0 : slowStreak[tier] + 1;
    });
    const raw = slide || outcome.verdict ? "" : null;
    const by = winner === -1 ? "" : `model ${winner + 1}`;
    if (contenders.some((c) => c.controller === activeDraw)) activeDraw = null;
    const { verdict } = outcome;
    const made = slide as Slide | null;
    const html = made ? (getLive(made.id)?.html ?? "") : "";
    const ok = made !== null && (made.layout !== "LIVE_UI" || html.length >= DRAW_MIN_CHARS);
    // "m2 none 0-450ms": model 2 started at once and said "nothing to show" after 450 ms.
    const race = contenders.flatMap((c, i) => (c.startedAt ? [`m${i + 1} ${c.verdict || (c.controller.signal.aborted ? "stalled" : "nothing")} ${Math.round(c.startedAt - t0)}-${c.namedAt ? Math.round(c.namedAt - t0) : "?"}ms`] : []));
    record({ kind: "draw", said: line, label: made?.headline, ui: made?.ui?.kind ?? null, ok, by, declined: verdict === "declined", same: outcome.same, skipped: verdict, stalled: raw === null && !made, firstMs, ms: Math.round(performance.now() - t0), chars: html.length, race });
    note(`draw ${verdict || (ok ? "ok" : "failed")}${made ? ` "${made.headline}"` : ""} [${race.join(", ")}]`);
    log(`draw: ${verdict || (ok ? `"${made?.headline}" in ${((performance.now() - t0) / 1000).toFixed(1)}s` : "failed")}`);
    if (made && ok) {
      if (made.layout === "LIVE_UI") {
        setLive(made.id, { html, done: true, palette });
        postLive(made.id);
      }
      return;
    }
    if (!made) {
      const settled = verdict === "tired" ? "refused" : verdict === "repeat" || (verdict === "declined" && outcome.same) ? "same" : verdict === "declined" ? "declined" : "failed";
      drawOutcome.set(decision, settled);
      if (settled === "same" && mySeq === seq) spendOnCurrent(line);
      const fallback = standIn.get(decision);
      if (fallback && mySeq === seq) standInScene(fallback, settled);
      return;
    }
    // The slide went up but the drawing never became a picture: take it back.
    if (snap.next?.id === made.id) {
      if (timer) clearTimeout(timer);
      timer = null;
      emit({ next: null, nextMs: 0 });
    } else if (snap.current?.id === made.id && !snap.next) step(-1);
  }

  /**
   * A figure the speaker says out loud needs no model: it goes up the moment the recogniser shows it.
   * In a real test the same ring took 4.4 s when it waited for the director.
   */
  function showFigure(said: string): boolean {
    const share = percentFromLine(said);
    const count = share === null ? countFromLine(said) : null;
    if (share === null && !count) return false;
    const slide = normalizeSlide(
      share !== null
        ? { layout: "CHART", chart: { kind: "ring", values: [share], labels: [] }, headline: `${share}%` }
        : { layout: "BIG_NUMBER", number: count?.number, headline: count?.label, mood: "hype" },
    );
    const figure = (h: Slide): string => `${h.chart?.values.join(",") ?? ""}|${h.number}`;
    if ([...snap.history.slice(-6), ...(snap.next ? [snap.next] : [])].some((h) => (h.chart || h.number) && figure(h) === figure(slide))) return false;
    record({ kind: "figure", said, layout: slide.layout, value: share !== null ? `${share}%` : `${count?.number} ${count?.label}` });
    log(`figure: ${share !== null ? `${share}%` : `${count?.number} ${count?.label}`}`);
    madeFrom.set(slide.id, said);
    if (madeFrom.size > 40) madeFrom.delete(madeFrom.keys().next().value as string);
    enqueue(slide, false, "spoken figure");
    return true;
  }

  /** What has been said since the last slide, newest last, plus the phrase still being spoken. */
  function thoughtText(extra = ""): string {
    const cutoff = Date.now() - THOUGHT_MS;
    const said = [...thought.filter((seg) => seg.t >= cutoff).map((seg) => seg.text), extra].join(" ");
    return said.trim().split(/\s+/).filter(Boolean).slice(-THOUGHT_WORDS).join(" ");
  }

  /** The part of the phrase still being spoken that no slide has covered yet. */
  const unseenInterim = (): string => (slideFromInterim ? liveInterim.trim().split(/\s+/).slice(interimCut).join(" ") : liveInterim);

  function decide(extra = ""): void {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = null;
    lastDecisionAt = Date.now();
    undecidedWords = 0;
    const said = thoughtText(extra);
    if (countWords(said) === 0) return;
    // In order of how sure they are: the speaker's own plan, a figure they just said, then a picture.
    if (firePrepared(said)) return;
    if (showFigure(said)) return;
    // Judged on the newest words only: once the items follow, the whole thought is no longer an announcement.
    // (Checked on the full thought, "there are three things... ship fast, share everything" was held for 13 s.)
    if (isAnnouncement(said.split(/\s+/).slice(-8).join(" "))) {
      log("announcement: waiting for the items");
      return;
    }
    decisionCount += 1;
    const decision = decisionCount;
    drawOutcome.delete(decision - 30);
    standIn.delete(decision - 30);
    // Both are asked at once. The drawing answers in under a second; waiting for the director first
    // cost three to five seconds per slide in a real test.
    void drawLive(said, decision, seq);
    void runDirector("", false, said, decision);
  }

  async function runDirector(request = "", addressed = false, latest = "", decision = 0): Promise<void> {
    if (addressed) seq += 1;
    const mySeq = seq;
    if (!addressed) {
      if (inFlight) {
        dirty = true;
        return;
      }
      inFlight = true;
      emit({ busy: true });
    }
    const t0 = performance.now();
    const asked = Date.now();
    try {
      const res = await fetch("/api/director", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: addressed ? undefined : AbortSignal.timeout(DIRECTOR_TIMEOUT_MS),
        body: JSON.stringify({
          transcript: windowText(),
          request,
          profile: PROFILE,
          history: snap.history.slice(-6).map((s) => `${s.scene ?? s.headline} [${s.layout === "LIVE_UI" ? "PICTURE" : s.layout}]`),
          latest: request ? "" : latest,
          visualMode: snap.visualMode,
          imageSource: snap.imageSource,
          minFit: snap.bold ? 3 : 4,
          brief: snap.brief,
          recentScenes: snap.history.slice(-3).flatMap((s) => (s.scene ? [s.scene] : [])),
          onScreenScene: (snap.next ?? snap.history.at(-1))?.scene ?? undefined,
          onScreenMs: shownAt && !snap.next ? Date.now() - shownAt : 0,
          canDraw: true,
          recentGifIds: snap.history.slice(-8).flatMap((s) => (s.libraryId ? [s.libraryId] : [])),
        }),
      });
      const out = (await res.json()) as DirectorResult & { error?: string };
      if (!res.ok) throw new Error(out.error ?? String(res.status));
      emit({ lastMs: Math.round(performance.now() - t0), model: out.model ?? snap.model });
      // The meter on the hosted demo: every answer carries what is left.
      if (out.budget) emit({ status: { ...snap.status, budget: out.budget } });
      // Out of minutes mid-talk: the mic stops, so the speech service stops costing too.
      if (out.budget && closedFor(out.budget) && snap.listening) {
        log("no minutes left: the mic is off");
        stopListening();
      }
      log(`${out.action}${out.mock ? " (mock)" : ""}: ${out.reason ?? ""}`);
      const made = out.slide as { headline?: string; layout?: string; scene?: string; library_id?: string } | undefined;
      record({
        kind: "director",
        said: request || latest,
        addressed,
        action: out.action,
        reason: out.reason,
        layout: made?.layout,
        headline: made?.headline,
        scene: made?.scene,
        libraryId: made?.library_id,
        wish: out.wish,
        debug: out.debug,
        ms: Math.round(performance.now() - t0),
        model: out.model,
      });
      note(`director ${out.action}${made?.layout ? ` ${made.layout}` : ""}${made?.scene ? ` ${made.scene} fit ${String(out.debug?.sceneFit ?? "?")}` : made?.headline ? ` "${made.headline}"` : ""}${out.draw ? " (drawing)" : ""}`);
      // No library picture went on screen for this line: remember what Bill wished for.
      const usedLibrary = Boolean((out.slide as { library_id?: string } | undefined)?.library_id);
      const said = request || latest;
      if (out.wish && !usedLibrary && said && !snap.wishes.some((w) => w.wish.toLowerCase() === out.wish?.toLowerCase())) {
        emit({ wishes: [...snap.wishes, { line: said, wish: out.wish }].slice(-40) });
        record({ kind: "wish", line: said, wish: out.wish });
      }
      // The speaker's own picture is the one answer that may still take over from the drawing made for the same words.
      const ownMedia = !addressed && usedLibrary && out.action !== "hold" && !out.draw;
      const overDrawing = ownMedia && pictureOf === decision && drawOutcome.get(decision) === "drawn";
      if (!addressed && mySeq !== seq && !overDrawing) return; // something else took this moment
      if (!addressed && (out.draw || made?.layout === "SCENE")) {
        // Nothing concrete from the director: its scene only stands in when the drawing gives nothing (see
        // standInScene). Only a scene the classifier is sure of (5): loose ones looked random on stage.
        if (out.slide && Number(out.debug?.sceneFit ?? 0) >= 5) {
          const scene = normalizeSlide(out.slide);
          askedAt.set(scene.id, asked);
          const settled = drawOutcome.get(decision);
          if (settled === undefined) standIn.set(decision, scene);
          else standInScene(scene, settled);
        }
        return;
      }
      if (out.action === "hold" || !out.slide) return;
      if (!addressed && drawOutcome.get(decision) === "drawn" && !overDrawing) return;
      const slide = normalizeSlide(out.slide);
      // A slide that lost its picture on the way falls back to plain words. With words switched off
      // that is not a slide: in a test a broken scene went up as the text "Do it live".
      if (!addressed && snap.visualMode === "pure" && slide.layout === "BIG_WORD") {
        log("dropped: the slide had no picture left");
        record({ kind: "dropped", said: latest, wanted: made?.layout });
        return;
      }
      // A scene is the same scene whatever label the model gave it.
      // A ring is the same ring whatever the label says: compare the figures.
      const key = (h: Slide): string => `${h.layout}|${(h.scene ?? (h.chart?.values.join(",") || h.number || h.headline)).toLowerCase()}|${h.items.join(",").toLowerCase()}`;
      // The director decides when a scene may come back; here only the one on screen is refused.
      const recent = snap.history.slice(slide.layout === "SCENE" ? -1 : -6).map(key);
      if (!addressed && recent.includes(key(slide))) {
        log(`skipped repeat: ${slide.headline}`);
        return;
      }
      await resolveVisuals(slide, snap.visualMode, snap.imageSource);
      madeFrom.set(slide.id, request || latest);
      askedAt.set(slide.id, asked);
      if (overDrawing) activeDraw?.abort();
      if (addressed) enqueue(slide, true, out.reason ?? "");
      else acceptLate(latest, slide, overDrawing, out.reason ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`error: ${message}`);
      record({ kind: "error", said: request || latest, message });
      // A direct order that fails is part of the show. A failed guess on free speech is not:
      // the slide on screen stays and the next thought gets a new try.
      if (addressed) {
        enqueue(normalizeSlide({ layout: "BIG_WORD", headline: "Oops", body: "Live means live.", mood: "funny", failed: true }), true, "director failed");
      }
    } finally {
      if (!addressed) {
        inFlight = false;
        emit({ busy: false });
        if (dirty) {
          dirty = false;
          // More was said while the director was thinking: decide again on the thought as it is now.
          // Not on an empty one: the director would fall back to old lines and illustrate them twice.
          if (countWords(thoughtText(unseenInterim())) >= MIN_WORDS) decide(unseenInterim());
        }
      }
    }
  }

  function handleCommand(request: string): boolean {
    const r = request.toLowerCase().replace(/[.!?]/g, "").trim();
    if (/^(back|previous|go back)$/.test(r)) {
      step(-1);
      return true;
    }
    if (/^(next|forward|skip)$/.test(r)) {
      step(1);
      return true;
    }
    if (/^(blank|black|blackout|go dark)$/.test(r)) {
      setBlank(true);
      return true;
    }
    if (/^(show|unblank|back on)$/.test(r)) {
      setBlank(false);
      return true;
    }
    if (/^(source|sources|where is that from)\??$/.test(r)) {
      const src = snap.current?.source;
      emit({ heard: src ? `Source: ${hostOf(src)}` : "No source on this slide." });
      return true;
    }
    return false;
  }

  function onFinal(text: string): void {
    const clean = text.trim();
    if (!clean) return;
    const wake = clean.match(WAKE);
    const line: TranscriptLine = { id: (lineId += 1), text: clean, addressed: Boolean(wake) };
    emit({ lines: [...snap.lines, line].slice(-60) });
    spoken.push({ t: Date.now(), text: clean });
    const now = Date.now();
    record({
      kind: "line",
      text: clean,
      addressed: Boolean(wake),
      words: clean.split(/\s+/).length,
      // How long the recogniser sat on this phrase before calling it final, and the gap since the last one.
      phraseMs: phraseStartedAt ? now - phraseStartedAt : null,
      sinceLastFinalMs: lastFinalAt ? now - lastFinalAt : null,
    });
    phraseStartedAt = 0;
    lastFinalAt = now;
    if (spoken.length > 200) spoken.shift();

    if (wake) {
      const request = wake[1].trim();
      emit({ heard: `Heard Bill: ${request || "..."}` });
      if (!request || handleCommand(request)) return;
      void runDirector(request, true);
      return;
    }
    if (snap.mode === "manual") return;
    if (snap.mode === "hybrid") {
      const t = clean.toLowerCase();
      const anchor = ANCHORS.find((a) => a.keywords.some((k) => t.includes(k)));
      if (anchor) {
        log(`anchor: ${anchor.id}`);
        return enqueue(normalizeSlide(anchor.slide), false, `anchor ${anchor.id}`);
      }
    }

    // A slide already went up on this phrase while it was being spoken: only its new tail is unseen.
    const fresh = phraseSpent ? "" : slideFromInterim ? clean.split(/\s+/).slice(interimCut).join(" ") : clean;
    if (fresh) thought.push({ t: now, text: fresh });
    undecidedWords += phraseSpent ? 0 : Math.max(0, countWords(clean) - interimSeen);
    phraseSpent = false;
    signpostSeen = false;
    interimSeen = 0;
    liveInterim = "";
    slideFromInterim = false;
    interimCut = 0;

    if (undecidedWords >= MIN_WORDS) {
      decide();
      return;
    }
    // A fragment on its own ("and", "that", "we"): wait for more, but not forever.
    if (settleTimer) clearTimeout(settleTimer);
    // A fragment alone ("and", "so") waits for more. Two or three words after a pause are often
    // the punchline ("he just blinked"): they get their decision, and the drawing model drops filler.
    settleTimer = setTimeout(() => {
      if (undecidedWords >= 2) decide();
    }, SETTLE_MS);
  }

  /**
   * The level meter, fed by the stream the preflight opened. It does three jobs now: the ring on the
   * button, a dead-input warning, and a level summary in the session log every few seconds so a
   * silent take can be told apart from a quiet one afterwards.
   */
  function startMeter(stream: MediaStream): void {
    const ctx = new AudioContext();
    // Created after an await, outside the click: make sure it is not left suspended, or the meter
    // reads all zeros and reports a dead input that is not dead.
    void ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const freq = new Uint8Array(analyser.frequencyBinCount);
    // Float samples, not bytes: a quiet built-in mic sits below one byte step and would read as
    // exact silence, but its float samples are never exactly zero.
    const wave = new Float32Array(analyser.fftSize);
    const bucket = { frames: 0, sum: 0, max: 0, silent: 0 };
    let floor = Number.POSITIVE_INFINITY;
    let silentSince = 0;
    let stuckReported = false;
    let raf = 0;
    const tick = (): void => {
      analyser.getByteFrequencyData(freq);
      analyser.getFloatTimeDomainData(wave);
      const level = freq.reduce((a, b) => a + b, 0) / freq.length / 255;
      levelListener?.(level);
      levelStats.frames += 1;
      levelStats.sum += level;
      levelStats.max = Math.max(levelStats.max, level);
      bucket.frames += 1;
      bucket.sum += level;
      bucket.max = Math.max(bucket.max, level);
      if (ctx.state === "running") {
        const dead = wave.every((v) => v === 0);
        if (dead) bucket.silent += 1;
        const now = Date.now();
        if (!dead) {
          silentSince = 0;
          if (snap.micSilent) emit({ micSilent: false });
        } else if (silentSince === 0) {
          silentSince = now;
        } else if (now - silentSince >= DEAD_INPUT_MS && !snap.micSilent) {
          // A message, never a restart: restarting cannot bring a muted headset back.
          emit({ micSilent: true });
          record({ kind: "mic", event: "input is exact silence", device: snap.micDevice, ms: now - silentSince });
          log(`no sound at all from ${snap.micDevice ?? "the microphone"}: muted, or the wrong input`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const summary = setInterval(() => {
      if (bucket.frames === 0) return;
      const mean = bucket.sum / bucket.frames;
      record({
        kind: "level",
        mean: Number(mean.toFixed(3)),
        max: Number(bucket.max.toFixed(3)),
        silentShare: Number((bucket.silent / bucket.frames).toFixed(2)),
      });
      // Sound clearly above this take's own quietest stretch, yet no word for a while: the
      // recogniser has stopped listening while the mic has not. Logged only — a forced restart
      // mid-sentence, on applause or a noisy room, would cost more than it saves.
      const loud = Number.isFinite(floor) && mean > Math.max(floor * 3, 0.02);
      const wordless = Date.now() - lastHeardAt > STUCK_MS && !liveInterim;
      if (loud && wordless && !stuckReported) {
        stuckReported = true;
        record({ kind: "mic", event: "sound but no words", mean: Number(mean.toFixed(3)), floor: Number(floor.toFixed(3)), sinceWordsMs: Date.now() - lastHeardAt });
        log("the mic hears sound but no words are coming back");
      } else if (!wordless) {
        stuckReported = false;
      }
      if (resultCount === 0 && errorCount === 0 && mean > DEAF_LEVEL && Date.now() - listenStartedAt >= DEAF_MS && !snap.micDeaf) {
        record({ kind: "mic", event: "sound but not one word or error since the start: this browser does not transcribe", mean: Number(mean.toFixed(3)) });
        log("this browser hears you but turns nothing into words");
        emit({ micDeaf: true });
      }
      floor = Math.min(floor, mean);
      Object.assign(bucket, { frames: 0, sum: 0, max: 0, silent: 0 });
    }, LEVEL_SUMMARY_MS);
    tick();
    stopMeter = () => {
      cancelAnimationFrame(raf);
      clearInterval(summary);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      levelListener?.(0);
      if (snap.micSilent) emit({ micSilent: false });
    };
  }

  /**
   * Whether the site may use the microphone, watched for the whole visit. A refusal from an earlier
   * visit shows before the speaker presses anything, and allowing it in the browser's settings clears
   * the warning at once, without a reload.
   */
  async function watchMicPermission(): Promise<void> {
    try {
      const state = await navigator.permissions.query({ name: "microphone" as PermissionName });
      state.onchange = () => {
        if (state.state === "denied") emit({ micBlocked: true, micBlockedBy: "site", micAllowedNow: false });
        else if (state.state === "granted" && snap.micBlocked) {
          emit({ micBlocked: false, micBlockedBy: null, micAllowedNow: true });
          void readMicDevice();
        }
      };
      if (state.state === "denied") emit({ micBlocked: true, micBlockedBy: "site" });
    } catch {
      // Firefox does not answer for the microphone: a refusal shows when the mic is pressed instead.
    }
  }

  /** Which input the browser will use, read without opening it. Only possible once the mic is allowed. */
  async function readMicDevice(): Promise<void> {
    try {
      const state = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (state.state !== "granted") return;
      const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
      const chosen = inputs.find((d) => d.deviceId === "default") ?? inputs[0];
      if (chosen?.label) emit({ micDevice: chosen.label.replace(/^(?:default|standard)\s*[-–]\s*/i, "") });
    } catch {
      // Not every browser answers these: the name appears once listening starts instead.
    }
  }

  /**
   * Opens the microphone before the recogniser does. The recogniser fails vaguely or not at all; this
   * fails with a named reason, tells us which device and at what rate, and settles a Bluetooth
   * headset's switch into call mode before recognition starts rather than in the middle of it.
   */
  async function startListening(): Promise<void> {
    if (starting || snap.listening) return;
    // With an AssemblyAI key on the server, speech becomes text there in every browser; the browser's own
    // recogniser is the fallback.
    const Ctor: RecognitionCtor | null = snap.status.assemblyai ? StreamRecognition : recognitionCtor();
    if (!Ctor) {
      log("Web Speech API missing. Use Chrome, or type below.");
      return;
    }
    starting = true;
    recordingOff = false;
    try {
      // On a phone the recogniser and a capture of our own fight over the one microphone, and iOS may
      // refuse a start that is not inside the tap: any await before it moves it out. So a phone skips
      // the tab lock, the preflight and the meter and starts at once; the recogniser asks for the mic
      // itself, and a refusal still arrives through onerror.
      if (onPhone()) {
        record({ kind: "mic", event: "phone: recogniser opens the mic itself, no meter" });
        beginRecognition(Ctor);
        return;
      }
      await lockFree;
      const release = await acquireMicLock();
      if (!release) {
        record({ kind: "mic", event: "another tab already owns the microphone" });
        log("the show is already listening in another tab");
        emit({ micBusy: true });
        return;
      }
      let stream: MediaStream;
      // The browser's own question takes as long as the speaker does: the page says where to look.
      const asked = await navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((p) => p.state === "prompt")
        .catch(() => false);
      if (asked) emit({ micAsking: true });
      try {
        // Raw capture for the meter, so a live mic's noise floor is never processed down to zero.
        // The recogniser opens its own capture with its own processing; this one only measures.
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (err) {
        lockFree = release();
        const name = err instanceof DOMException ? err.name : "Error";
        record({ kind: "mic", event: "preflight failed", error: name });
        log(`the microphone would not open: ${name}`);
        emit({ micAsking: false });
        // Chrome says "Permission denied by system" when macOS or Windows keeps the whole browser
        // from the mic: the site's own setting is fine then, and changing it would not help.
        const bySystem = err instanceof Error && /system/i.test(err.message);
        if (name === "NotAllowedError" || name === "SecurityError") emit({ micBlocked: true, micBlockedBy: bySystem ? "system" : "site" });
        else if (name === "NotFoundError" || name === "OverconstrainedError") emit({ micMissing: true });
        else emit({ micBusy: true });
        return;
      }
      releaseMicLock = release;
      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings() ?? {};
      const device = track?.label || null;
      const permission = await navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((p) => p.state)
        .catch(() => "unknown");
      emit({ micDevice: device, micRate: settings.sampleRate ?? null, micBlocked: false, micBlockedBy: null, micAsking: false, micAllowedNow: false, micBusy: false, micMissing: false, micSilent: false, micDeaf: false });
      record({ kind: "mic", event: "preflight", device, sampleRate: settings.sampleRate ?? null, channels: settings.channelCount ?? null, permission });
      if ((settings.sampleRate ?? 48000) <= 16000) log(`${device ?? "this input"} runs at ${settings.sampleRate} Hz: a Bluetooth headset in call mode garbles names`);
      startMeter(stream);
      // The recogniser is handed this very track instead of opening the mic on its own. On 27 Oct the
      // meter heard clear speech for a minute on this stream while the recogniser's own capture got
      // nothing, cloud and on-device alike, with dictation apps (Wispr Flow, Goldfish) on the same mic.
      // A browser without track input ignores the argument and opens the mic as before.
      beginRecognition(Ctor, track);
    } finally {
      starting = false;
    }
  }

  function beginRecognition(Ctor: RecognitionCtor, track?: MediaStreamTrack): void {
    holdScreenAwake();
    const rec = new Ctor();
    const begin = (): void => (track?.readyState === "live" ? rec.start(track) : rec.start());
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = snap.lang;
    listenStartedAt = Date.now();
    resultCount = 0;
    maxResultGap = 0;
    errorCount = 0;
    finalCount = 0;
    Object.assign(levelStats, { frames: 0, sum: 0, max: 0 });
    rec.onresult = (e) => {
      // The longest wait between two answers from the recogniser: a caption that freezes mid-sentence shows here.
      if (resultCount > 0) maxResultGap = Math.max(maxResultGap, Date.now() - lastHeardAt);
      lastHeardAt = Date.now();
      resultCount += 1;
      watchDeadAir();
      if (snap.micDeaf) emit({ micDeaf: false });
      if (snap.micNoWords) emit({ micNoWords: false });
      if (phraseStartedAt === 0) phraseStartedAt = lastHeardAt;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) {
          finalCount += 1;
          onFinal(r[0].transcript);
        } else interim += r[0].transcript;
      }
      emit({ interim });
      liveInterim = interim;
      const heard = countWords(interim);
      if (pauseTimer) clearTimeout(pauseTimer);
      if (!interim || snap.mode === "manual" || WAKE.test(interim)) return;
      // A figure is shown the instant the recogniser writes it, mid-sentence.
      if (phraseSpent) {
        interimSeen = heard;
        return;
      }
      const seenBefore = interimSeen;
      interimSeen = heard;
      // The speaker's own prepared slide goes first, on the very word that cues it. Checked on every
      // new word: waiting for the next decision let the plain figure rule take "700" from the prepared slide.
      if (firePrepared(thoughtText(unseenInterim()))) {
        // A prepared figure owns the rest of its phrase, like a spoken one: "700 builders right now"
        // must not get a second slide for "right now".
        const fired = snap.next ?? snap.current;
        phraseSpent = fired?.layout === "BIG_NUMBER" || fired?.layout === "CHART";
        return;
      }
      if (showFigure(thoughtText(unseenInterim()))) {
        // "80% of those messages are from bots": the ring is the slide for the whole phrase.
        phraseSpent = true;
        return;
      }
      interimSeen = seenBefore;
      // "but here's the problem", "and the crazy part is": the speaker has announced what the next
      // clause will be, so the full gate would always arrive after the payload. Costs no model call.
      const signpost = detectSignpost(unseenInterim());
      // The marker's own words count towards the shortened gate, so "let me give you an example"
      // (six words) could reach it alone and draw a slide from the announcement. Wait for payload.
      const hurry = signpost !== null && signpost.strength === "strong" && signpost.wordsAfter >= PAYLOAD_WORDS;
      if (hurry && !signpostSeen) {
        signpostSeen = true;
        record({ kind: "signpost", marker: signpost.marker, expect: signpost.expect });
        log(`signpost: "${signpost.marker}" -> ${signpost.expect} coming`);
      }
      const steps = hurry ? SIGNPOST_STEP_WORDS : INTERIM_STEP_WORDS;
      const gap = hurry ? SIGNPOST_GAP_MS : INTERIM_GAP_MS;
      const ready = heard - interimSeen >= steps && Date.now() - lastDecisionAt > gap;
      if (ready) {
        interimSeen = heard;
        decide(unseenInterim());
        return;
      }
      pauseTimer = setTimeout(() => {
        const now = countWords(liveInterim);
        if (!snap.listening || now - interimSeen < 2) return;
        interimSeen = now;
        decide(unseenInterim());
      }, PAUSE_MS);
    };
    if (rec instanceof StreamRecognition) {
      // The service is told the heads-up's names, the words the browser kept mishearing ("open sorry").
      rec.keyterms = namesIn(snap.brief);
      record({ kind: "mic", event: `recognition: AssemblyAI streaming${rec.keyterms.length > 0 ? `, expecting ${rec.keyterms.join(", ")}` : ""}` });
      emit({ micMode: "assemblyai" });
      // The log says which language each stretch of the talk was heard in, once per change.
      let heardLanguage = "";
      rec.onlanguage = (code, confidence) => {
        if (code === heardLanguage) return;
        heardLanguage = code;
        record({ kind: "mic", event: `language: ${code}`, confidence: Number(confidence.toFixed(2)) });
      };
    } else {
      // On-device recognition when the browser has it: no round trip to a server, and the only mode that
      // takes a list of names. Otherwise the model is fetched in the background for next time, and this
      // talk uses the cloud.
      const support = Ctor as unknown as OnDeviceSupport;
      if (onDevice === "available") rec.processLocally = true;
      else if (onDevice === "downloadable" && typeof support.install === "function") {
        void support
          .install({ langs: [snap.lang], processLocally: true })
          .then((ok) => {
            onDevice = ok ? "available" : onDevice;
            record({ kind: "mic", event: `on-device model download ${ok ? "finished: used from the next start" : "refused"}` });
          })
          .catch(() => undefined);
      }
      record({ kind: "mic", event: `recognition: ${rec.processLocally ? "on-device" : "cloud"} (on-device model: ${onDevice})` });
      emit({ micMode: rec.processLocally ? "on-device" : "cloud" });
      // Where the browser supports it, the recogniser is told which names to expect.
      const Phrase = (window as unknown as { SpeechRecognitionPhrase?: PhraseCtor }).SpeechRecognitionPhrase;
      const names = namesIn(snap.brief);
      if (NAME_HINTS && Phrase && "phrases" in rec && rec.processLocally && names.length > 0) {
        try {
          rec.phrases = names.map((name) => new Phrase(name, 6));
          record({ kind: "mic", event: `listening for names: ${names.join(", ")}` });
        } catch {
          // An older or stricter implementation: recognition works as before, just without the hint.
        }
      }
    }
    rec.onerror = (e) => {
      errorCount += 1;
      log(`mic error: ${e.error}`);
      record({ kind: "mic", event: "error", error: e.error });
      // This recogniser cannot take a list of names: drop the list, the restart below carries on without it.
      if (e.error === "phrases-not-supported") {
        rec.phrases = [];
        return;
      }
      // The on-device model cannot handle this (a language it lacks, for one): the cloud takes over.
      if (rec.processLocally && (e.error === "language-not-supported" || e.error === "service-not-allowed")) {
        rec.processLocally = false;
        rec.phrases = [];
        onDevice = "unavailable";
        record({ kind: "mic", event: "on-device recognition failed: switched to cloud" });
        emit({ micMode: "cloud" });
        return;
      }
      // A refused microphone never recovers by itself. Restarting on it looped about 300 times a second
      // in a real session (a browser without mic access), so stop and say so instead.
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        stopListening();
        emit({ micBlocked: true, micBlockedBy: "site" });
      }
      // The speech service refused a socket because this visitor has no minutes left: retrying cannot help.
      if (e.error.includes("token 429")) {
        log("no minutes left: the mic is off");
        stopListening();
        return;
      }
      // "aborted" means something took the microphone away: a second tab running the show is the
      // usual culprit. It arrived once a second in a real session, each abort answered by a restart
      // answered by another abort, so the button never settled. Four in a row is a fight, not a blip.
      if (e.error === "aborted") {
        aborts = Date.now() - lastAbortAt < ABORT_FIGHT_MS ? aborts + 1 : 1;
        lastAbortAt = Date.now();
        if (aborts >= 4) {
          record({ kind: "mic", event: "aborted four times in a row: something else is holding the microphone" });
          log("the mic is being taken by something else: close any other tab running the show");
          stopListening();
          emit({ micBusy: true });
        }
        return;
      }
      aborts = 0;
    };
    // Recognition normally ends after a pause and is restarted. But when something else holds the
    // microphone — the same show open in a second tab is the usual one — it ends the instant it
    // starts, and restarting as fast as the browser allows makes the button flicker and fills the
    // log. Each immediate end backs the next attempt off, and a run of them gives up and says so.
    let startedAt = 0;
    let instantEnds = 0;
    let aborts = 0;
    let lastAbortAt = 0;
    rec.onend = () => {
      if (!snap.listening) return;
      const instant = Date.now() - startedAt < 500;
      instantEnds = instant ? instantEnds + 1 : 0;
      if (instantEnds >= 6) {
        record({ kind: "mic", event: "recognition ended at once six times: another tab is probably holding the microphone" });
        log("the mic cannot start: close any other tab running the show");
        stopListening();
        emit({ micBusy: true });
        return;
      }
      record({ kind: "mic", event: instant ? `restart (ended at once, attempt ${instantEnds})` : "restart" });
      const again = (): void => {
        if (!snap.listening) return;
        try {
          startedAt = Date.now();
          begin();
        } catch {
          // Already restarting.
        }
      };
      if (instant) setTimeout(again, 400);
      else again();
    };
    recognition = rec;
    lastHeardAt = Date.now();
    emit({ listening: true, quietSec: 0, micBlocked: false, micBlockedBy: null, micAllowedNow: false, micNoWords: false, micBusy: false });
    watchdog = setInterval(() => {
      emit({ quietSec: Math.round((Date.now() - lastHeardAt) / 1000) });
      if (resultCount === 0 && !snap.micNoWords && Date.now() - listenStartedAt >= FIRST_WORDS_MS) emit({ micNoWords: true });
      // Only while the speaker is talking: a pause is not dead air.
      if (Date.now() - lastHeardAt < 2000) watchDeadAir();
    }, 1000);
    record({ kind: "mic", event: track ? "recogniser fed the checked mic track" : "recogniser opens the mic itself" });
    startedAt = Date.now();
    begin();
  }

  function stopListening(): void {
    // The record that says how a take went, whatever ended it: the button, a failure, or the page.
    if (listenStartedAt) {
      record({
        kind: "mic",
        event: "stop",
        ms: Date.now() - listenStartedAt,
        results: resultCount,
        finals: finalCount,
        maxGapMs: maxResultGap,
        mode: snap.micMode,
        device: snap.micDevice,
        levelMean: levelStats.frames ? Number((levelStats.sum / levelStats.frames).toFixed(3)) : null,
        levelMax: Number(levelStats.max.toFixed(3)),
      });
      listenStartedAt = 0;
    }
    emit({ listening: false, interim: "", quietSec: 0, micNoWords: false });
    if (watchdog) clearInterval(watchdog);
    watchdog = null;
    recognition?.stop();
    recognition = null;
    stopMeter?.();
    stopMeter = null;
    if (releaseMicLock) lockFree = releaseMicLock();
    releaseMicLock = null;
    void wakeLock?.release().catch(() => undefined);
    wakeLock = null;
  }

  // A phone that dims its screen mid-talk ends recognition, so the screen stays on while listening.
  function holdScreenAwake(): void {
    if (wakeLock || !("wakeLock" in navigator)) return;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLock = lock;
      })
      .catch(() => undefined);
  }

  function stopReplay(): void {
    replayTimers.splice(0).forEach(clearTimeout);
    // A demo stopped mid-line leaves no half sentence in the caption; a live mic's words are not ours to clear.
    emit(replaying ? { replaying: false, interim: "" } : { replaying: false });
    replaying = false;
  }

  /**
   * Plays a script as if it were heard: each line's words appear in the caption one by one, the way
   * the recogniser's interim text does, then land as a final line. Only the caption sees the words
   * early; the show decides on the final line, as it always has for a replay.
   */
  function replay(lines: { t: number; text: string }[], speed: number): void {
    stopReplay();
    replaying = true;
    recordingOff = true;
    emit({ replaying: true, replayDone: 0, replayTotal: lines.length });
    lines.forEach((l, i) => {
      const start = l.t / speed;
      const next = i + 1 < lines.length ? lines[i + 1].t / speed : Infinity;
      const words = l.text.split(/\s+/).filter(Boolean);
      // Typed within the gap to the next line, so two lines never type over each other.
      const step = Math.min(REPLAY_WORD_MS, ((next - start) * 0.85) / Math.max(1, words.length));
      words.forEach((_, w) => {
        replayTimers.push(setTimeout(() => emit({ interim: words.slice(0, w + 1).join(" ") }), start + w * step));
      });
      replayTimers.push(
        setTimeout(() => {
          onFinal(l.text);
          emit({ interim: "", replayDone: i + 1 });
          if (i === lines.length - 1) stopReplay();
        }, start + words.length * step),
      );
    });
  }

  return {
    replay,
    stopReplay,
    subscribe(cb: () => void): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot: (): StageSnapshot => snap,
    getServerSnapshot: (): StageSnapshot => INITIAL,
    setLevelListener(fn: ((level: number) => void) | null): void {
      levelListener = fn;
    },
    async init(): Promise<() => void> {
      channel ??= new BroadcastChannel(CHANNEL);
      const ch = channel;
      ch.onmessage = (e: MessageEvent<{ type: string }>) => {
        if (e.data.type === "hello") post();
      };
      emit(loadSettings());
      // Another page (the style guide) may change a setting while the show is open.
      const onStorage = (e: StorageEvent): void => {
        if (e.key === SETTINGS_KEY) emit(loadSettings());
      };
      window.addEventListener("storage", onStorage);
      if (snap.brief.trim()) void prepare();
      // The input's name on screen before the speaker presses anything: a wrong headset is caught
      // before the talk, not halfway into it.
      void readMicDevice();
      void watchMicPermission();
      const support = recognitionCtor() as unknown as OnDeviceSupport | null;
      if (support && typeof support.available === "function") {
        support
          .available({ langs: [snap.lang], processLocally: true })
          .then((status) => {
            onDevice = status;
          })
          .catch(() => undefined);
      }
      try {
        const status = (await (await fetch("/api/status")).json()) as ProviderStatus;
        emit({ status, model: status.model });
        if (!status.nebius) log("No NEBIUS_API_KEY: mock director (headline = longest word).");
      } catch {
        log("Server not answering /api/status");
      }
      return () => {
        ch.onmessage = null;
        window.removeEventListener("storage", onStorage);
        stopListening();
      };
    },
    setVisualMode(visualMode: VisualMode): void {
      emit({ visualMode });
      persist();
      log(`visual mode: ${visualMode}`);
    },
    setImageSource(imageSource: ImageSource): void {
      emit({ imageSource });
      persist();
      log(`image source: ${imageSource}`);
    },
    setBrief(brief: string): void {
      emit({ brief });
      persist();
      // Wait until the speaker stops typing before building slides from it.
      if (prepTimer) clearTimeout(prepTimer);
      prepTimer = setTimeout(() => void prepare(), 1400);
    },
    prepare,
    removePrepared(id: string): void {
      emit({ prepared: snap.prepared.filter((p) => p.id !== id) });
    },
    setBold(bold: boolean): void {
      emit({ bold });
      persist();
    },
    clearWishes(): void {
      emit({ wishes: [] });
    },
    setDwell(dwellMs: number): void {
      emit({ dwellMs });
      persist();
    },
    submit(text: string): void {
      recordingOff = false;
      onFinal(text);
    },
    toggleListening: (): void => (snap.listening ? stopListening() : void startListening()),
    setMode: (mode: Mode): void => {
      emit({ mode });
      log(`mode: ${mode}`);
    },
    setLang(lang: string): void {
      emit({ lang });
      if (snap.listening) {
        stopListening();
        void startListening();
      }
    },
    step,
    setBlank,
    jump(i: number): void {
      const target = snap.history[i];
      if (target) {
        show(target, false);
        emit({ idx: i });
      }
    },
    showSlide: (slide: Slide): void => show(slide),
    showAnchor(id: string): void {
      const a = ANCHORS.find((x) => x.id === id);
      if (a) show(normalizeSlide(a.slide));
    },
  };
}

export type Stage = ReturnType<typeof createStage>;
