"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Mic, Square, X } from "lucide-react";
import { LANGUAGES, LanguageSelect } from "@/components/language-select";
import { MediaDropzone } from "@/components/media-dropzone";
import { MicHelpCard } from "@/components/mic-help-card";
import { MinutesNote, SoldOut } from "@/components/minutes-note";
import { OptionalNote } from "@/components/optional-note";
import { PoweredBy } from "@/components/powered-by";
import { TalkCounter } from "@/components/talk-counter";
import { TalkGlow } from "@/components/talk-glow";
import { SlideView } from "@/components/slide/slide-view";
import { Textarea } from "@/components/ui/textarea";
import { useMediaDrop } from "@/hooks/use-media-drop";
import { useStage } from "@/hooks/use-stage";
import { closedFor } from "@/lib/budget-rules";
import { micHelp, type MicProblem, type Where, whereFrom } from "@/lib/mic-help";
import { SAMPLES } from "@/lib/samples";
import { AUTHOR_X_HANDLE, AUTHOR_X_URL, SITE_AUTHOR } from "@/lib/site";
import { MAX_BRIEF } from "@/lib/settings";
import { cn } from "@/lib/utils";

const LANG_KEY = "doitlive-lang";

const quiet = "rounded-full px-4 py-2 text-sm font-semibold max-[400px]:px-2.5 text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60";
const credit = "font-semibold text-white/60 underline-offset-4 outline-none transition-colors hover:text-[#ffd60a] hover:underline focus-visible:text-white";

/**
 * The whole product on one screen. Three things: talk, the audience screen, your look.
 * Everything else lives in /lab.
 */
export function ShowPage() {
  const { stage, snap } = useStage();
  // Unknown until the status arrives: assume a disk, the server refuses the upload quickly if there is none.
  const uploads = snap.status.uploads !== false;
  const media = useMediaDrop(uploads);
  const picker = useRef<HTMLInputElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [voice, setVoice] = useState(true);
  const [phone, setPhone] = useState(false);
  const [onStage, setOnStage] = useState(false);
  // Chromium browsers other than Chrome and Edge (Comet, Brave, Opera) ship the speech API without the
  // service behind it: they take the audio and never answer. Said before the speaker wastes a take.
  const [hollowVoice, setHollowVoice] = useState(false);
  // Which browser and system, so a mic problem comes with the fix for this one. Read after mount.
  const [where, setWhere] = useState<Where>({ browser: "other", platform: "other", app: "your browser" });

  useEffect(() => {
    // Checked after mount so the server and the first client render agree.
    const id = setTimeout(() => {
      setVoice("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
      setPhone(window.matchMedia("(pointer: coarse)").matches);
      const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.map((b) => b.brand) ?? [];
      setHollowVoice(brands.includes("Chromium") && !brands.some((b) => b === "Google Chrome" || b === "Microsoft Edge"));
      setWhere(whereFrom(navigator.userAgent, navigator.maxTouchPoints));
      try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved && LANGUAGES.some((l) => l.ready && l.code === saved)) stage.setLang(saved);
      } catch {
        // No storage (private window): the default language stands.
      }
    }, 0);
    stage.setLevelListener((level) => {
      if (ring.current) ring.current.style.transform = `scale(${1 + level * 1.6})`;
      // Speech sits around 0.05 to 0.25 on this meter: stretched so a normal voice fills most of the bar.
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, level * 4)})`;
    });
    return () => {
      clearTimeout(id);
      stage.setLevelListener(null);
    };
  }, [stage]);

  // With AssemblyAI on the server any browser that gives us the microphone can talk, Firefox included.
  const canTalk = voice || Boolean(snap.status.assemblyai);
  // The hosted demo runs on our credits: a few free minutes a day each, a share for the whole run, and
  // a plain word when they are gone. With none left the mic stays off, so listening costs nothing either.
  const budget = snap.status.budget ?? null;
  const closed = budget ? closedFor(budget) : false;
  const soldOut = Boolean(budget?.soldOut);
  const live = snap.listening || snap.replaying || snap.current !== null;

  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Space") {
        e.preventDefault();
        stage.setBlank();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, stage]);

  // A phone plugged into a TV mirrors its own screen; a page cannot draw something else on the TV.
  // So on a phone "Screen" turns this screen into the audience screen: the slide alone, full screen.
  const enterStage = (): void => {
    setOnStage(true);
    void document.documentElement
      .requestFullscreen?.()
      .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
      .catch(() => undefined);
  };
  const leaveStage = (): void => {
    setOnStage(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  // Slides are drawn for a wide screen: held sideways the slide fills the phone, held upright it keeps
  // 16:9 instead of being cropped to a tall strip.
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (!onStage) return;
    // Leaving full screen with the system back gesture leaves the stage too.
    const onChange = (): void => {
      if (!document.fullscreenElement) setOnStage(false);
    };
    const upright = window.matchMedia("(orientation: portrait)");
    const onTurn = (): void => setPortrait(upright.matches);
    onTurn();
    document.addEventListener("fullscreenchange", onChange);
    upright.addEventListener("change", onTurn);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      upright.removeEventListener("change", onTurn);
    };
  }, [onStage]);

  const lastLine = snap.lines.at(-1)?.text ?? "";
  const stalled = snap.listening && snap.quietSec >= 25;

  const mediaStatus = media.progress
    ? `Reading your files: ${media.progress.done} of ${media.progress.total}`
    : media.report
      ? [
          `Added ${media.report.added}.`,
          media.report.duplicates ? `${media.report.duplicates} already there.` : "",
          media.report.skipped.length ? `${media.report.skipped.length} skipped: not a picture, GIF or clip.` : "",
          media.report.failed.length ? `${media.report.failed.length} failed.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : media.count > 0
        ? `${media.count} of your own files ready`
        : "";

  // One problem at a time, the one that blocks the most, with the fix for this browser. Shown in both
  // layouts: before, these only appeared on the start screen, so a mic that failed mid-talk failed silently.
  const callMode = snap.micRate !== null && snap.micRate <= 16000;
  const problem: MicProblem | null = snap.micAsking
    ? "asking"
    : snap.micBlocked
      ? snap.micBlockedBy === "system"
        ? "system"
        : "site"
      : snap.micMissing
        ? "missing"
        : snap.micBusy
          ? "busy"
          : snap.micDeaf
            ? "deaf"
            : snap.micSilent
              ? "silent"
              : snap.micNoWords
                ? "no-words"
                : callMode
                  ? "call"
                  : snap.micAllowedNow
                    ? "allowed"
                    : null;
  // A phone has no level meter: its recogniser opens the mic itself.
  const help = problem && !closed ? micHelp(problem, where, { device: snap.micDevice, rateKHz: (snap.micRate ?? 16000) / 1000, meter: !phone && snap.listening }) : null;
  const micWarning = help?.tone === "problem" ? help.title : null;
  // Pressing again is the fix once the setting is changed; a mic that hears nothing gets a clean restart.
  // A block by the system needs the browser restarted first, so it gets no button.
  const retry = !help
    ? null
    : snap.listening
      ? problem === "silent" || problem === "no-words"
        ? {
            label: "Restart the mic",
            run: () => {
              stage.toggleListening();
              stage.toggleListening();
            },
          }
        : null
      : problem === "allowed"
        ? { label: "Start talking", run: () => stage.toggleListening() }
        : problem === "site"
          ? { label: "I allowed it. Try again", run: () => stage.toggleListening() }
          : problem === "missing" || problem === "busy"
            ? { label: "Try again", run: () => stage.toggleListening() }
            : null;

  const micStatus = (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3 text-center">
      {budget ? <MinutesNote budget={budget} /> : null}
      {snap.micDevice ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-white/45">
          <span className={cn("size-2 shrink-0 rounded-full", micWarning ? "bg-[#ff4fa3]" : snap.listening ? "bg-white" : "bg-white/25")} />
          {snap.micDevice}
          {snap.micMode ? <span className="text-white/30">· {snap.micMode}</span> : null}
        </p>
      ) : null}
      {help ? (
        <MicHelpCard help={help} barRef={bar} pointUp={problem === "asking"} onRetry={retry?.run} retryLabel={retry?.label} />
      ) : hollowVoice && !snap.status.assemblyai ? (
        <p className="text-sm font-semibold text-white/55">Use Google Chrome, Edge or Safari: this browser may hear you without turning speech into words.</p>
      ) : null}
    </div>
  );

  const chooseLanguage = (code: string): void => {
    stage.setLang(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      // Remembering is a convenience; the choice holds for this visit either way.
    }
  };

  const micButton = (size: "hero" | "small") => (
    <button
      type="button"
      onClick={() => stage.toggleListening()}
      disabled={!canTalk || (closed && !snap.listening)}
      aria-pressed={snap.listening}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full outline-none transition-transform focus-visible:ring-4 focus-visible:ring-white/70 enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-40",
        size === "hero" ? "size-44 sm:size-52" : "size-20",
      )}
    >
      <span ref={ring} className={cn("absolute inset-0 rounded-full transition-colors", snap.listening ? "bg-[#ff4fa3]" : "bg-[#ffd60a]")} style={{ transition: "transform 80ms linear, background-color 200ms" }} />
      <span className="relative text-black">{snap.listening ? <Square className={size === "hero" ? "size-14" : "size-7"} fill="currentColor" /> : <Mic className={size === "hero" ? "size-16" : "size-8"} strokeWidth={2.4} />}</span>
      <span className="sr-only">{snap.listening ? "Stop listening" : "Start talking"}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center gap-2 px-5 py-4 max-[400px]:px-3">
        <span className="whitespace-nowrap text-lg font-black uppercase tracking-tight [font-stretch:125%] max-[400px]:text-base">Do it live</span>
        <span className="text-sm font-semibold text-white/40 max-sm:hidden">#vibepresenting</span>
        <nav className="ml-auto flex items-center gap-1">
          {/* "Be talk #2" on a sold-out page would invite a talk nobody can give. */}
          {soldOut ? null : <TalkCounter />}
          <button type="button" className={quiet} onClick={() => (phone ? enterStage() : window.open("/screen", "doitlive-audience", "width=1280,height=720"))}>
            Screen
          </button>
          <Link href="/style" className={quiet}>
            Look
          </Link>
        </nav>
      </header>

      {live ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-8">
          {/* The height reserve keeps the caption and buttons on screen; the 55vw floor stops a phone
              held sideways from shrinking the slide to a stamp. */}
          <div className="w-full" style={{ maxWidth: "min(100%, max((100dvh - 330px) * 16 / 9, 55vw))" }}>
            <div className="overflow-hidden rounded-2xl">
              <SlideView slide={snap.current} blank={snap.blank} idleTitle="Talk." />
            </div>
          </div>
          {/* This line used to blink. Two causes, both from how the recogniser hands over a phrase:
              the whole line flipped grey to white on every handover, and the text collapsed from a
              finished sentence to the single first word of the next one. Now the finished sentence
              stays put and the words still being heard are appended in grey, so the caption only
              ever grows. */}
          <p className="min-h-[2.4em] max-w-4xl text-center text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            {stalled ? (
              "I have not heard anything for a while. Is the mic on?"
            ) : (
              <>
                {lastLine}
                {snap.interim ? <span className="text-white/60 transition-colors duration-300">{lastLine ? ` ${snap.interim}` : snap.interim}</span> : null}
              </>
            )}
          </p>
          <div className="flex items-center gap-4">
            {snap.replaying ? (
              <button type="button" className={cn(quiet, "bg-white/10")} onClick={() => stage.stopReplay()}>
                Stop the demo
              </button>
            ) : (
              micButton("small")
            )}
            <button type="button" className={cn(quiet, snap.blank ? "bg-white text-black hover:bg-white hover:text-black" : "bg-white/10")} onClick={() => stage.setBlank()}>
              {snap.blank ? "Show slides" : "Blank"}
            </button>
          </div>
          {micStatus}
        </main>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-5 pb-12 text-center">
          {soldOut ? (
            <SoldOut />
          ) : (
            <>
            <div>
              <p className="mb-5 text-lg font-black uppercase tracking-wide text-[#ffd60a] sm:text-xl">F*ck it, we&apos;ll do it live.</p>
              <h1 className="text-[clamp(96px,22vw,340px)] font-black leading-[0.8] tracking-[-0.06em] [font-stretch:125%]">Talk.</h1>
              <p className="mt-6 text-xl font-semibold text-white/60 sm:text-2xl">The slides make themselves.</p>
            </div>
            <TalkGlow active={canTalk && !closed && !snap.listening}>{micButton("hero")}</TalkGlow>
            <LanguageSelect lang={snap.lang} onChange={chooseLanguage} />
            {/* Said only where it is true: a laptop records its own shows for review, the hosted demo does not. */}
            {snap.status.record === false ? (
              <p className="-mt-5 flex items-center gap-1.5 text-xs font-semibold text-white/40">
                <Lock className="size-3" strokeWidth={2.6} aria-hidden />
                We draw what you say. We don&apos;t keep it.
              </p>
            ) : null}
            {micStatus}
            <OptionalNote />
            {/* Dimmed until pointed at or typed in: the mic is the product, this is the extra. */}
            <div className="-mt-5 flex w-full flex-col items-center gap-8 opacity-60 transition-opacity duration-300 focus-within:opacity-100 hover:opacity-100">
              <label className="block w-full max-w-2xl text-left">
                <span className="mb-2 block px-1 text-sm font-semibold text-white/80">What will you talk about?</span>
                <Textarea
                  value={snap.brief}
                  onChange={(e) => stage.setBrief(e.target.value.slice(0, MAX_BRIEF))}
                  placeholder="A few sentences, and I get slides ready before you start. For example: how our meetup grew from 12 to 700 builders in a year."
                  className="min-h-24 resize-none rounded-2xl border-white/15 bg-white/[0.04] px-4 py-3 text-base leading-snug text-white placeholder:text-white/35 hover:border-white/25 focus-visible:border-[#ffd60a] focus-visible:ring-[#ffd60a]/20 md:text-base dark:bg-white/[0.04]"
                />
              </label>
              {snap.preparing || snap.prepared.length > 0 ? (
                <div className="w-full max-w-3xl">
                  <p className="mb-2 text-sm text-white/50">
                    {snap.preparing ? "Getting ready" : `${snap.prepared.length} ${snap.prepared.length === 1 ? "slide" : "slides"} ready. Each one appears when you get there.`}
                  </p>
                  <div className="flex justify-center gap-2 overflow-x-auto pb-1">
                    {snap.prepared.map((p) => (
                      <button key={p.id} type="button" onClick={() => stage.removePrepared(p.id)} title={`Appears when you say: ${p.strong}. Click to remove.`} className="w-28 shrink-0 overflow-hidden rounded-lg outline-none transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-white/70">
                        <SlideView slide={p.slide} still />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <MediaDropzone media={media} enabled={uploads} onBrowse={() => picker.current?.click()} />
            </div>
            {/* The demo talk runs on the same models as a live one: with no minutes left it would play to no slides. */}
            {closed ? null : (
              <p className="text-sm leading-relaxed text-white/50">
                {canTalk ? "No mic right now? " : "Voice needs Chrome, or Safari on an iPhone. "}
                <button type="button" className="font-semibold text-white underline underline-offset-4 outline-none hover:text-[#ffd60a] focus-visible:ring-2 focus-visible:ring-white/60" onClick={() => stage.replay(SAMPLES[0].lines, 1.6)}>
                  Play the demo talk
                </button>
              </p>
            )}
            </>
          )}
          <PoweredBy />
        </main>
      )}

      <footer className="flex items-end gap-4 px-5 pb-3 text-xs text-white/25">
        <Link href="/lab" className="outline-none hover:text-white/60 focus-visible:text-white/80">
          Lab
        </Link>
        <span className="max-sm:hidden">Mac app with your own keys: coming soon</span>
        {/* On the start screen the drop zone shows this itself. */}
        {live && mediaStatus ? (
          <Link href="/library" className={cn("ml-auto outline-none hover:text-white focus-visible:text-white", media.progress || media.report ? "text-white/80" : "text-white/40")} aria-live="polite">
            {mediaStatus}
          </Link>
        ) : null}
        {/* The credit gives way once the show runs: then the corner belongs to the media status. */}
        {live ? null : (
          <p className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-white/40">
            <span>Made by {SITE_AUTHOR.name}</span>
            <a href={SITE_AUTHOR.url} target="_blank" rel="me noopener" className={credit}>
              headless.design
            </a>
            <a href={AUTHOR_X_URL} target="_blank" rel="me noopener" className={credit}>
              {AUTHOR_X_HANDLE} on X
            </a>
          </p>
        )}
      </footer>

      <input
        ref={picker}
        type="file"
        multiple
        hidden
        accept=".gif,.webp,.png,.jpg,.jpeg,.mp4,.webm"
        onChange={(e) => {
          void media.add([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />

      {onStage ? (
        // The audience screen on the phone itself. While not listening, a tap anywhere starts the mic,
        // inside the tap as iOS wants. While listening only the stop button stops it: a hand shifting
        // on the phone mid-talk must not cut the mic.
        <div
          className="fixed inset-0 z-40 touch-manipulation select-none bg-black"
          onClick={() => {
            if (!snap.listening && canTalk && !closed) stage.toggleListening();
          }}
        >
          {portrait ? (
            <div className="grid h-full place-items-center">
              <div className="w-full">
                <SlideView slide={snap.current} blank={snap.blank} idleTitle="Talk." />
              </div>
            </div>
          ) : (
            <SlideView slide={snap.current} blank={snap.blank} idleTitle="Talk." fill />
          )}
          <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex gap-2">
            {snap.listening ? (
              <button
                type="button"
                aria-label="Stop listening"
                onClick={(e) => {
                  e.stopPropagation();
                  stage.toggleListening();
                }}
                className="grid size-11 place-items-center rounded-full bg-[#ff4fa3] text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Square className="size-4" fill="currentColor" />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Leave full screen"
              onClick={(e) => {
                e.stopPropagation();
                leaveStage();
              }}
              className="grid size-11 place-items-center rounded-full bg-black/50 text-white/80 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="size-5" />
            </button>
          </div>
          {help || !snap.listening ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-6">
              <span className={cn("rounded-full bg-black/60 px-4 py-2 text-center text-sm font-semibold", micWarning ? "text-[#ff4fa3]" : "text-white/85")}>
                {help?.title ?? (closed ? "No minutes left." : canTalk ? (portrait ? "Tap to talk · turn the phone sideways" : "Tap to talk") : "Voice needs Chrome, or Safari on an iPhone.")}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {media.dragging ? (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-[#ffd60a] text-black">
          <div className="text-center">
            <p className="text-[clamp(72px,18vw,280px)] font-black leading-[0.8] tracking-[-0.06em] [font-stretch:125%]">Drop it.</p>
            <p className="mt-6 text-xl font-semibold">Photos, GIFs, clips, whole folders. They show up when they fit.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
