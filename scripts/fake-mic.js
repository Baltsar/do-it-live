// Replays a recorded session through the real microphone path, word by word, at the pace it was spoken.
// Unlike the replay in /lab (finished phrases only) this exercises interim decisions, the dwell queue
// and prepared slides, so it shows what would really reach the screen.
//
// Usage: open http://localhost:3000/, paste this file into the browser console BEFORE pressing the mic,
// press the mic, then run:  await fakeMic("s-2026-10-13T18-03-17-172Z")
// The run is recorded as a new session: read it with `node scripts/session-report.mjs`.
class FakeRecognition {
  constructor() {
    window.fakeRecognition = this;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  start() {}
  stop() {}
}
window.webkitSpeechRecognition = FakeRecognition;
window.SpeechRecognition = FakeRecognition;

window.fakeMic = async (sessionId) => {
  const { entries } = await (await fetch(`/api/session?id=${sessionId}`)).json();
  const lines = entries.filter((e) => e.kind === "line");
  const say = (text, isFinal) => window.fakeRecognition?.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] });
  let previous = 0;
  for (const line of lines) {
    // The recogniser sat on the phrase for phraseMs before calling it final: grow it word by word over that time.
    const start = Math.max(previous + 150, line.t - (line.phraseMs || 800));
    const words = line.text.split(/\s+/);
    words.forEach((_, i) => setTimeout(() => say(words.slice(0, i + 1).join(" "), false), start + ((line.t - start) * (i + 1)) / (words.length + 1)));
    setTimeout(() => say(line.text, true), line.t);
    previous = line.t;
  }
  return `${lines.length} phrases, ${Math.round(previous / 1000)}s`;
};
