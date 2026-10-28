import { digitsForSpokenAmounts } from "@/lib/grounding";
import type { RecognitionEvent, RecognitionLike } from "@/lib/stage-engine";

const SOCKET = "wss://streaming.assemblyai.com/v3/ws";
// Measured on 28 Oct with the same recordings: against universal-streaming-english it gave its first
// words sooner (0.9 s vs 1.4 s), got all three English sentences right where the English model mangled
// two, and wrote Swedish as Swedish ("Vi är 700 byggare") where the English model wrote nonsense.
const MODEL = "universal-3-6-pro";
const TARGET_RATE = 16000;
// AssemblyAI takes 50 to 1000 ms of audio per message.
const CHUNK_MS = 100;
// A finished turn arrives twice: as said, then formatted ("seven hundred" becomes "700"). The figure
// rule needs the digits, so the plain copy waits this long for the formatted one before it is used.
const FORMAT_WAIT_MS = 700;
// Hands the microphone's samples from the audio thread to the page.
const TAP = `class Tap extends AudioWorkletProcessor { process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; } } registerProcessor("doitlive-tap", Tap);`;

interface TurnMessage {
  type?: string;
  transcript?: string;
  end_of_turn?: boolean;
  turn_is_formatted?: boolean;
  turn_order?: number;
  /** Only on a finished turn, with language detection on. */
  language_code?: string;
  language_confidence?: number;
}

/**
 * Speech to text on AssemblyAI's streaming service, shaped like the browser's SpeechRecognition so the
 * stage engine runs it unchanged. Some browsers ship the speech API with no service behind it and
 * return nothing (a minute of clear speech, not one word, on 27 Oct); this hears what the microphone
 * delivers in any browser, phones included. The API key stays on the server: the page gets a
 * single-use token from /api/stt-token.
 */
export class StreamRecognition implements RecognitionLike {
  continuous = true;
  interimResults = true;
  lang = "en-US";
  /** Names from the heads-up that the service is told to expect. */
  keyterms: string[] = [];
  onresult: ((e: RecognitionEvent) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  /** The language of each finished turn, as the service detected it. */
  onlanguage: ((code: string, confidence: number) => void) | null = null;

  private running = false;
  private ended = false;
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private ownStream: MediaStream | null = null;
  private pending: { order: number; text: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private finishedOrder = -1;

  start(track?: MediaStreamTrack): void {
    if (this.running) throw new DOMException("already started", "InvalidStateError");
    this.running = true;
    this.ended = false;
    this.finishedOrder = -1;
    // Created inside the tap, before any await: iOS only lets audio start from a user gesture.
    this.ctx = new AudioContext();
    void this.open(track).catch((err: unknown) => {
      const refused = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      this.fail(refused ? "not-allowed" : `network (${err instanceof Error ? err.message : String(err)})`);
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.pending) this.finish(this.pending.order, this.pending.text);
    const ws = this.ws;
    this.stopAudio();
    if (ws?.readyState === WebSocket.OPEN) {
      // Terminate makes the service send the open turn as final before it closes the socket.
      ws.send(JSON.stringify({ type: "Terminate" }));
      setTimeout(() => ws.close(1000), 1500);
    } else {
      ws?.close(1000);
      this.end();
    }
  }

  private async open(track?: MediaStreamTrack): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    let stream: MediaStream;
    if (track?.readyState === "live") stream = new MediaStream([track]);
    else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      this.ownStream = stream;
    }
    const res = await fetch("/api/stt-token", { method: "POST" });
    if (!res.ok) throw new Error(`token ${res.status}`);
    const { token } = (await res.json()) as { token?: string };
    if (!token) throw new Error("no token");
    if (!this.running) return;

    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP], { type: "application/javascript" })));
    // Down to 16 kHz by averaging when the device rate is a multiple of it (48 kHz on most machines),
    // which cuts the upload to a third; any other rate is sent as it is.
    const factor = ctx.sampleRate % TARGET_RATE === 0 ? ctx.sampleRate / TARGET_RATE : 1;
    const rate = ctx.sampleRate / factor;
    // The speaker's chosen language is the only one allowed: left open, the model once heard a Swedish
    // pause as Chinese ("哦。") in the middle of a Swedish talk.
    const language = this.lang.slice(0, 2).toLowerCase();
    const params = new URLSearchParams({ sample_rate: String(rate), encoding: "pcm_s16le", format_turns: "true", speech_model: MODEL, language_codes: JSON.stringify([language]), language_detection: "true", token });
    if (this.keyterms.length > 0) params.set("keyterms_prompt", JSON.stringify(this.keyterms));

    const ws = new WebSocket(`${SOCKET}?${params.toString()}`);
    this.ws = ws;
    ws.onmessage = (e: MessageEvent) => {
      if (typeof e.data === "string") this.message(JSON.parse(e.data) as TurnMessage);
    };
    ws.onclose = (e: CloseEvent) => this.closed(e);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("close", (e) => reject(new Error(`closed ${e.code} ${e.reason}`.trim())), { once: true });
    });

    const source = ctx.createMediaStreamSource(stream);
    const tap = new AudioWorkletNode(ctx, "doitlive-tap");
    // The worklet only runs while connected towards the speakers; a zero gain keeps it silent.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(tap);
    tap.connect(mute);
    mute.connect(ctx.destination);
    const perChunk = Math.round((rate * CHUNK_MS) / 1000);
    let chunk = new Int16Array(perChunk);
    let filled = 0;
    let sum = 0;
    let summed = 0;
    tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
      for (const sample of e.data) {
        sum += sample;
        summed += 1;
        if (summed < factor) continue;
        const v = Math.max(-1, Math.min(1, sum / factor));
        sum = 0;
        summed = 0;
        chunk[filled] = v < 0 ? v * 0x8000 : v * 0x7fff;
        filled += 1;
        if (filled === perChunk) {
          if (ws.readyState === WebSocket.OPEN) ws.send(chunk.buffer);
          chunk = new Int16Array(perChunk);
          filled = 0;
        }
      }
    };
    await ctx.resume();
  }

  private message(m: TurnMessage): void {
    if (m.type !== "Turn" || typeof m.turn_order !== "number") return;
    const order = m.turn_order;
    const text = (m.transcript ?? "").trim();
    if (order <= this.finishedOrder) return;
    if (!m.end_of_turn) {
      // The next turn has begun: the previous one is final now, formatted or not.
      if (this.pending && order > this.pending.order) this.finish(this.pending.order, this.pending.text);
      if (text) this.result(text, false);
      return;
    }
    if (m.language_code) this.onlanguage?.(m.language_code, m.language_confidence ?? 0);
    if (m.turn_is_formatted) {
      this.finish(order, text);
      return;
    }
    if (!this.pending) this.pending = { order, text, timer: setTimeout(() => this.finish(order, text), FORMAT_WAIT_MS) };
  }

  private finish(order: number, text: string): void {
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = null;
    if (order <= this.finishedOrder) return;
    this.finishedOrder = order;
    if (text) this.result(text, true);
  }

  private result(transcript: string, isFinal: boolean): void {
    // English and Swedish are written in Latin letters: a turn with none is noise read as another script.
    if (!/[a-z0-9à-öø-ÿ]/i.test(transcript)) return;
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript: digitsForSpokenAmounts(transcript) } }] });
  }

  private closed(e: CloseEvent): void {
    const unexpected = this.running;
    this.running = false;
    this.stopAudio();
    this.ws = null;
    if (unexpected) this.onerror?.({ error: `network (closed ${e.code}${e.reason ? ` ${e.reason}` : ""})` });
    this.end();
  }

  private fail(error: string): void {
    const wasRunning = this.running;
    this.running = false;
    this.stopAudio();
    this.ws?.close(1000);
    this.ws = null;
    if (wasRunning) this.onerror?.({ error });
    this.end();
  }

  private stopAudio(): void {
    this.ownStream?.getTracks().forEach((t) => t.stop());
    this.ownStream = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  /** Like the browser's recogniser, onend fires exactly once per start. */
  private end(): void {
    if (this.ended) return;
    this.ended = true;
    this.onend?.();
  }
}
