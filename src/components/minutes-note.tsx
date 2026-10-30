"use client";

import { Laptop, Ticket } from "lucide-react";
import type { BudgetView } from "@/lib/budget-rules";
import { AUTHOR_X_HANDLE, AUTHOR_X_URL, REPO_URL } from "@/lib/site";

// Below this many public minutes the meter says the end is near.
const LOW_PUBLIC = 60;

const link = "text-[#ffd60a] underline underline-offset-4 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/60";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-[#ffd60a]/40 bg-[#ffd60a]/10 px-5 py-4 text-left">
      <p className="text-lg font-black leading-tight">{title}</p>
      <p className="mt-1 text-sm font-semibold text-white/70">{children}</p>
    </div>
  );
}

/** What the hosted demo has left for this visitor: a quiet line, a warning near the end, or a card once it is gone. */
export function MinutesNote({ budget }: { budget: BudgetView }) {
  if (budget.judge) {
    if (budget.siteClosed)
      return (
        <Card title="The judges' minutes are used up.">
          Message{" "}
          <a href={AUTHOR_X_URL} target="_blank" rel="noopener" className={link}>
            {AUTHOR_X_HANDLE} on X
          </a>{" "}
          and more are added.
        </Card>
      );
    if (budget.minutesLeft <= 0) return <Card title={`Your ${budget.minutesPerDay} judge minutes for today are used up.`}>Tomorrow there are {budget.minutesPerDay} more.</Card>;
    return (
      <p className="flex items-center gap-1.5 text-xs font-bold text-[#ffd60a]">
        <Ticket className="size-3.5" strokeWidth={2.6} aria-hidden />
        Judge&apos;s pass · {budget.minutesLeft} of {budget.minutesPerDay} minutes left today
      </p>
    );
  }
  if (budget.soldOut)
    return (
      <Card title="Sold out: every free minute is on stage.">
        What is left is saved for the judges. It runs on your own laptop:{" "}
        <a href={`${REPO_URL}#run-it-yourself`} className={link}>
          github.com/Baltsar/do-it-live
        </a>
      </Card>
    );
  if (budget.minutesLeft <= 0 || budget.siteClosed)
    return (
      <Card title={budget.siteClosed ? "The demo has used today's minutes." : `Your free ${budget.minutesPerDay} minutes for today are used up.`}>
        Tomorrow there are {budget.minutesPerDay} more. Buying minutes, and a Mac app that runs on your own keys, are coming. Until then it runs on your own laptop:{" "}
        <a href={`${REPO_URL}#run-it-yourself`} className={link}>
          github.com/Baltsar/do-it-live
        </a>
      </Card>
    );
  if (budget.publicLeft !== null && budget.publicLeft <= LOW_PUBLIC)
    return (
      <p className="text-xs font-bold text-[#ffd60a]">
        Last {budget.publicLeft} free {budget.publicLeft === 1 ? "minute" : "minutes"} on our credits. After that, only the judges talk.
      </p>
    );
  return (
    <p className="text-xs font-semibold text-white/40">
      {budget.minutesLeft} of {budget.minutesPerDay} free minutes left today
    </p>
  );
}

/** The start screen once the public share of the credits is spent: said loud, with where to go instead. */
export function SoldOut() {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-5 text-lg font-black uppercase tracking-wide text-[#ffd60a] sm:text-xl">F*ck it, we did it live.</p>
      <h1 className="text-[clamp(72px,16vw,250px)] font-black leading-[0.8] tracking-[-0.06em] [font-stretch:125%]">
        Sold <span className="relative inline-block">out.<span aria-hidden className="absolute inset-x-[-4%] top-1/2 h-[0.09em] -translate-y-1/2 -rotate-6 rounded-full bg-[#ff4fa3]" /></span>
      </h1>
      <p className="mt-6 max-w-2xl text-xl font-semibold text-white/60 sm:text-2xl">Every free minute on our hackathon credits went on stage. What is left is saved for the judges.</p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a
          href={`${REPO_URL}#run-it-yourself`}
          className="inline-flex items-center gap-2 rounded-full bg-[#ffd60a] px-5 py-3 text-base font-bold text-black outline-none transition-transform hover:scale-[1.03] active:scale-95 focus-visible:ring-4 focus-visible:ring-white/70"
        >
          <Laptop className="size-4" strokeWidth={2.6} aria-hidden />
          Run it on your own laptop
        </a>
        <a
          href={AUTHOR_X_URL}
          target="_blank"
          rel="noopener"
          className="rounded-full border border-white/20 px-5 py-3 text-base font-bold text-white/80 outline-none transition-colors hover:border-white/50 hover:text-white focus-visible:ring-4 focus-visible:ring-white/70"
        >
          Follow {AUTHOR_X_HANDLE}
          <span className="max-sm:hidden"> for the Mac app</span>
        </a>
      </div>
      <p className="mt-6 text-sm font-semibold text-white/40">Judging the Nebius × NVIDIA hackathon? Open the link in the Devpost testing instructions.</p>
    </div>
  );
}
