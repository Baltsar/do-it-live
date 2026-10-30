"use client";

import type { Ref } from "react";
import { ArrowUp, Check, Mic, MicOff } from "lucide-react";
import type { MicHelp } from "@/lib/mic-help";
import { cn } from "@/lib/utils";

const TONE = {
  problem: { box: "border-[#ff4fa3]/45 bg-[#ff4fa3]/[0.08]", title: "text-[#ff4fa3]", dot: "bg-[#ff4fa3] text-black" },
  waiting: { box: "border-white/15 bg-white/[0.05]", title: "text-white", dot: "bg-white/15 text-white" },
  good: { box: "border-[#ffd60a]/45 bg-[#ffd60a]/10", title: "text-[#ffd60a]", dot: "bg-[#ffd60a] text-black" },
} as const;

interface Props {
  help: MicHelp;
  /** The bar's fill: the page moves it with the same level that scales the mic's ring. */
  barRef?: Ref<HTMLSpanElement>;
  onRetry?: () => void;
  retryLabel?: string;
  /** The browser's own question sits above the page: an arrow points the speaker there. */
  pointUp?: boolean;
}

/** One problem with the mic, said plainly, with the fix for this browser and a way to try again. */
export function MicHelpCard({ help, barRef, onRetry, retryLabel = "Try again", pointUp = false }: Props) {
  const tone = TONE[help.tone];
  const Icon = pointUp ? ArrowUp : help.tone === "good" ? Check : help.tone === "problem" ? MicOff : Mic;
  return (
    <div role={help.tone === "problem" ? "alert" : "status"} className={cn("w-full max-w-xl rounded-2xl border px-5 py-4 text-left", tone.box)}>
      <p className={cn("flex items-center gap-2.5 text-lg font-black leading-tight", tone.title)}>
        <Icon className={cn("size-5 shrink-0", pointUp && "motion-safe:animate-bounce")} strokeWidth={2.6} aria-hidden />
        {help.title}
      </p>
      {help.steps.length > 0 ? (
        <ol className="mt-3 flex flex-col gap-2">
          {help.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm font-semibold leading-snug text-white/75">
              <span className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-black", tone.dot)}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {help.meter ? (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Your mic</span>
          <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <span ref={barRef} className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 rounded-full bg-[#ffd60a]" style={{ transition: "transform 80ms linear" }} />
          </span>
        </div>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full bg-[#ffd60a] px-4 py-2 text-sm font-bold text-black outline-none transition-transform hover:scale-[1.03] active:scale-95 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
