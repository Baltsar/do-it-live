"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SlideView } from "@/components/slide/slide-view";
import { useStage } from "@/hooks/use-stage";
import { ANCHORS } from "@/lib/anchors";
import { SAMPLES, type ReplayLine } from "@/lib/samples";
import type { ImageSource, VisualMode } from "@/lib/slide";
import type { Mode, Stage, StageSnapshot } from "@/lib/stage-engine";
import { cn } from "@/lib/utils";

function Panel({ title, aside, className, children }: { title: string; aside?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function MicButton({ stage, listening }: { stage: Stage; listening: boolean }) {
  const orb = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    stage.setLevelListener((level) => {
      if (orb.current) orb.current.style.transform = `scale(${1 + level * 2.4})`;
    });
    return () => stage.setLevelListener(null);
  }, [stage]);

  return (
    <button
      type="button"
      onClick={() => stage.toggleListening()}
      aria-pressed={listening}
      className="relative grid size-20 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      <span
        ref={orb}
        className={cn(
          "absolute inset-2 rounded-full transition-colors duration-200",
          listening ? "bg-primary" : "bg-muted",
        )}
        style={{ transition: "transform 80ms linear, background-color 200ms" }}
      />
      <span className={cn("relative", listening ? "text-primary-foreground" : "text-muted-foreground")}>
        {listening ? <Mic className="size-6" /> : <MicOff className="size-6" />}
      </span>
      <span className="sr-only">{listening ? "Stop listening" : "Start listening"}</span>
    </button>
  );
}

interface SessionEntry {
  t: number;
  kind: string;
  text?: string;
}

/** Test the whole show without speaking: scripted or recorded transcripts play through the same pipeline. */
function ReplayPanel({ stage, snap }: { stage: Stage; snap: StageSnapshot }) {
  const [source, setSource] = useState(SAMPLES[0].id);
  const [speed, setSpeed] = useState(1);
  const [sessions, setSessions] = useState<string[]>([]);

  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json() as Promise<{ sessions: string[] }>)
      .then((d) => setSessions(d.sessions))
      .catch(() => undefined);
  }, [snap.sessionId]);

  const play = async (): Promise<void> => {
    const sample = SAMPLES.find((x) => x.id === source);
    let lines: ReplayLine[];
    if (sample) {
      lines = sample.lines;
      stage.setLang(sample.lang);
    } else {
      const d = (await (await fetch(`/api/session?id=${encodeURIComponent(source)}`)).json()) as { entries: SessionEntry[] };
      lines = d.entries.filter((e) => e.kind === "line" && e.text).map((e) => ({ t: e.t, text: e.text ?? "" }));
    }
    stage.replay(lines, speed);
  };

  return (
    <Panel
      title="Replay (no voice needed)"
      aside={<span className="text-xs text-muted-foreground">{snap.replaying ? `${snap.replayDone} / ${snap.replayTotal}` : snap.sessionId ? "Recording this session" : ""}</span>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 text-sm"
          aria-label="Replay source"
        >
          {SAMPLES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
          {sessions.map((id) => (
            <option key={id} value={id}>
              Recorded: {id.replace(/^s-/, "")}
            </option>
          ))}
        </select>
        <ToggleGroup value={[String(speed)]} onValueChange={(v) => v[0] && setSpeed(Number(v[0]))} variant="outline" spacing={0} aria-label="Replay speed">
          <ToggleGroupItem value="1">1x</ToggleGroupItem>
          <ToggleGroupItem value="2">2x</ToggleGroupItem>
          <ToggleGroupItem value="4">4x</ToggleGroupItem>
        </ToggleGroup>
        {snap.replaying ? (
          <Button variant="outline" onClick={() => stage.stopReplay()}>
            Stop
          </Button>
        ) : (
          <Button onClick={() => void play()}>Play</Button>
        )}
      </div>
    </Panel>
  );
}

const VISUAL_COPY: Record<VisualMode, string> = {
  pure: "Drawings, scenes and your own media only. No words on screen except numbers you say.",
  minimal: "Full-screen picture with a tiny label. Lists and duels still get a template.",
  balanced: "Every template, with text, when the idea needs it.",
};

/** What the audience sees: how much text, and how long each slide stays. */
function SettingsPanel({ stage, snap }: { stage: Stage; snap: StageSnapshot }) {
  return (
    <Panel title="Settings">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold">Visual style</p>
          <ToggleGroup
            value={[snap.visualMode]}
            onValueChange={(v) => v[0] && stage.setVisualMode(v[0] as VisualMode)}
            variant="outline"
            spacing={0}
            aria-label="Visual style"
          >
            <ToggleGroupItem value="pure">Pure image</ToggleGroupItem>
            <ToggleGroupItem value="minimal">Minimal text</ToggleGroupItem>
            <ToggleGroupItem value="balanced">Balanced</ToggleGroupItem>
          </ToggleGroup>
          <p className="mt-2 text-xs text-muted-foreground">{VISUAL_COPY[snap.visualMode]}</p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Pictures come from</p>
          <ToggleGroup
            value={[snap.imageSource]}
            onValueChange={(v) => v[0] && stage.setImageSource(v[0] as ImageSource)}
            variant="outline"
            spacing={0}
            aria-label="Pictures come from"
          >
            <ToggleGroupItem value="library">My library only</ToggleGroupItem>
            <ToggleGroupItem value="web">Library, then web</ToggleGroupItem>
          </ToggleGroup>
          <p className="mt-2 text-xs text-muted-foreground">
            {snap.imageSource === "library"
              ? "Bill only shows photos, GIFs and clips you uploaded. He still draws charts and numbers from what you say."
              : "Your library first. If nothing fits, Bill searches free photo sites, which is slower and less reliable."}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">How bold is Bill with your pictures</p>
          <ToggleGroup
            value={[snap.bold ? "bold" : "careful"]}
            onValueChange={(v) => v[0] && stage.setBold(v[0] === "bold")}
            variant="outline"
            spacing={0}
            aria-label="How bold is Bill with your pictures"
          >
            <ToggleGroupItem value="careful">Careful</ToggleGroupItem>
            <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
          </ToggleGroup>
          <p className="mt-2 text-xs text-muted-foreground">
            {snap.bold ? "A picture goes up even when the link to your words is a stretch. More slides, more risk." : "A picture only goes up when it clearly fits. Fewer slides, each one lands."}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Minimum time per slide</p>
          <ToggleGroup
            value={[String(snap.dwellMs)]}
            onValueChange={(v) => v[0] && stage.setDwell(Number(v[0]))}
            variant="outline"
            spacing={0}
            aria-label="Minimum time per slide"
          >
            {[2000, 3000, 4000, 6000, 8000].map((ms) => (
              <ToggleGroupItem key={ms} value={String(ms)}>
                {ms / 1000} s
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </Panel>
  );
}

function MicStatus({ snap }: { snap: StageSnapshot }) {
  if (!snap.listening) return <span>Mic off</span>;
  if (snap.quietSec < 8) return <span className="text-primary">Hearing you</span>;
  if (snap.quietSec < 25) return <span>Quiet for {snap.quietSec} s</span>;
  return <span className="font-semibold text-destructive">Heard nothing for {snap.quietSec} s. Mic may have stalled.</span>;
}

export default function LabPage() {
  const { stage, snap } = useStage();
  const [typed, setTyped] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [snap.lines.length, snap.interim]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        stage.setBlank();
      }
      if (e.key === "ArrowLeft") stage.step(-1);
      if (e.key === "ArrowRight") stage.step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  const submit = (): void => {
    if (!typed.trim()) return;
    stage.submit(typed);
    setTyped("");
  };

  const lastLine = snap.lines.at(-1);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-black tracking-tight [font-stretch:125%]">Lab</h1>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to the show
        </Link>
        <ToggleGroup
          value={[snap.mode]}
          onValueChange={(v) => v[0] && stage.setMode(v[0] as Mode)}
          variant="outline"
          spacing={0}
          aria-label="Mode"
        >
          <ToggleGroupItem value="hybrid">Hybrid</ToggleGroupItem>
          <ToggleGroupItem value="yolo">YOLO</ToggleGroupItem>
          <ToggleGroupItem value="manual">Manual</ToggleGroupItem>
        </ToggleGroup>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(["nebius", "tavily"] as const).map((k) => (
            <Badge key={k} variant={snap.status[k] ? "secondary" : "outline"} className={snap.status[k] ? "" : "text-muted-foreground"}>
              {k === "nebius" ? "Nemotron" : "Tavily"} {snap.status[k] ? "on" : "off"}
            </Badge>
          ))}
          {snap.model ? <Badge variant="outline">{snap.model.split("/").pop()}</Badge> : null}
          {snap.lastMs !== null ? <Badge variant="outline">{snap.lastMs} ms</Badge> : null}
          <Link href="/style" className={buttonVariants({ variant: "outline" })}>
            Style guide
          </Link>
          <Link href="/library" className={buttonVariants({ variant: "outline" })}>
            Media library
          </Link>
          <Button variant="outline" onClick={() => window.open("/screen", "doitlive-audience", "width=1280,height=720")}>
            <MonitorUp /> Open audience screen
          </Button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel
            title="What you said"
            className="flex min-h-[420px] flex-1 flex-col"
            aside={<span className="text-xs text-muted-foreground">{snap.heard}</span>}
          >
            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-2" style={{ maxHeight: "52vh" }}>
              {snap.lines.length === 0 ? (
                <p className="text-3xl font-bold leading-tight tracking-tight text-muted-foreground/60">
                  Start the mic and talk. Say &ldquo;Bill, a rocket launch&rdquo; to order a slide.
                </p>
              ) : null}
              {snap.lines.map((l) => (
                <p
                  key={l.id}
                  className={cn(
                    "font-bold leading-tight tracking-tight",
                    l === lastLine ? "text-3xl" : "text-xl text-muted-foreground",
                    l.addressed && "text-primary",
                  )}
                >
                  {l.text}
                </p>
              ))}
              {snap.interim ? <p className="text-3xl font-bold italic leading-tight tracking-tight text-muted-foreground/70">{snap.interim}</p> : null}
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
              <MicButton stage={stage} listening={snap.listening} />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={'Type instead of talking, e.g. "Bill, raket"'}
                    className="h-9"
                  />
                  <Button onClick={submit} disabled={!typed.trim()}>
                    Send
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <select
                    value={snap.lang}
                    onChange={(e) => stage.setLang(e.target.value)}
                    className="h-7 rounded-md border border-border bg-transparent px-2"
                    aria-label="Speech language"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="sv-SE">Svenska</option>
                  </select>
                  <MicStatus snap={snap} />
                  <span>{snap.busy ? "The director is thinking" : "The director is listening"}</span>
                </div>
              </div>
            </div>
          </Panel>
          <SettingsPanel stage={stage} snap={snap} />
          <ReplayPanel stage={stage} snap={snap} />
        </div>

        <div className="flex flex-col gap-4">
          <Panel
            title="On air"
            aside={
              <Button size="sm" variant={snap.blank ? "default" : "outline"} onClick={() => stage.setBlank()}>
                {snap.blank ? <Eye /> : <EyeOff />} {snap.blank ? "Show again" : "Blank screen"}
              </Button>
            }
          >
            <div className="overflow-hidden rounded-xl">
              <SlideView slide={snap.current} blank={snap.blank} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => stage.step(-1)} aria-label="Previous slide">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" onClick={() => stage.step(1)} aria-label="Next slide">
                <ChevronRight />
              </Button>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Kbd>Space</Kbd> blank <Kbd>←</Kbd>
                <Kbd>→</Kbd> step
              </span>
            </div>
          </Panel>

          <Panel title="Up next" aside={<span className="text-xs text-muted-foreground">Each slide holds for {snap.dwellMs / 1000} s</span>}>
            {snap.next ? (
              <div key={snap.next.id} className="flex gap-3">
                <div className="w-44 shrink-0 overflow-hidden rounded-lg">
                  <SlideView slide={snap.next} still />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold tracking-tight">{snap.next.headline}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{snap.nextReason || snap.next.layout}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full origin-left bg-primary"
                      style={{ animation: `dwell ${snap.nextMs}ms linear forwards` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing queued. The director waits for the right moment.</p>
            )}
          </Panel>

          <Panel title="Backstage shelf" aside={<span className="text-xs text-muted-foreground">{snap.shelf.length} ready</span>}>
            {snap.shelf.length === 0 ? (
              <p className="text-sm text-muted-foreground">Slides the director made but did not use wait here. Click one to put it on air.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {snap.shelf.map((item) => (
                  <button
                    key={item.slide.id}
                    type="button"
                    onClick={() => stage.showSlide(item.slide)}
                    className="overflow-hidden rounded-lg text-left outline-none ring-offset-2 ring-offset-card transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring"
                    title={item.reason}
                  >
                    <SlideView slide={item.slide} still />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {ANCHORS.map((a) => (
                <Button key={a.id} size="sm" variant="secondary" onClick={() => stage.showAnchor(a.id)}>
                  {String(a.slide.headline)}
                </Button>
              ))}
            </div>
          </Panel>

          <Panel title="History">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {snap.history.length === 0 ? <p className="text-sm text-muted-foreground">No slides yet.</p> : null}
              {snap.history.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => stage.jump(i)}
                  className={cn(
                    "w-28 shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    i === snap.idx ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
                  )}
                >
                  <SlideView slide={s} still />
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="Pictures Bill wished he had"
            aside={
              snap.wishes.length > 0 ? (
                <Button size="xs" variant="ghost" onClick={() => stage.clearWishes()}>
                  Clear
                </Button>
              ) : null
            }
          >
            {snap.wishes.length === 0 ? (
              <p className="text-sm text-muted-foreground">When nothing in your library fits a line, Bill notes the picture he wanted. Upload those and he will use them next time.</p>
            ) : (
              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1 text-sm">
                {snap.wishes.map((w) => (
                  <li key={w.wish}>
                    <span className="font-semibold">{w.wish}</span>
                    <span className="block text-xs text-muted-foreground">for: {w.line}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <details className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">Director log</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">{snap.log.join("\n") || "Empty"}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
