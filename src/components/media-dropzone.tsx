"use client";

import Link from "next/link";
import { ArrowUp } from "lucide-react";
import type { MediaDrop } from "@/hooks/use-media-drop";
import { cn } from "@/lib/utils";

const README = "https://github.com/Baltsar/do-it-live#run-it-yourself";

/** Three little files fanned out like a hand of cards. They spread further while the zone is pointed at. */
function Fan({ off }: { off: boolean }) {
  const card = "absolute top-2 grid h-14 w-11 origin-bottom place-items-center rounded-lg text-[10px] font-black tracking-wide shadow-lg shadow-black/40 transition-transform duration-300 ease-out";
  return (
    <div className="relative mr-2 h-[4.5rem] w-28 shrink-0" aria-hidden>
      <span className={cn(card, "left-1 -rotate-[16deg] items-start pt-1.5 group-hover:-translate-x-1.5 group-hover:-rotate-[26deg] group-focus-visible:-rotate-[26deg]", off ? "bg-white/15 text-white/40" : "bg-[#ff4fa3] text-black")}>GIF</span>
      <span className={cn(card, "right-1 rotate-[16deg] items-start pt-1.5 group-hover:translate-x-1.5 group-hover:rotate-[26deg] group-focus-visible:rotate-[26deg]", off ? "bg-white/15 text-white/40" : "bg-[#8cf5c9] text-black")}>MP4</span>
      <span className={cn(card, "left-1/2 z-10 -translate-x-1/2 group-hover:-translate-y-2", off ? "bg-white/25 text-white/50" : "bg-[#ffd60a] text-black")}>
        <ArrowUp className="size-5" strokeWidth={3} />
      </span>
    </div>
  );
}

/**
 * The speaker's own GIFs, photos and clips: drop them anywhere on the page, or press the zone to pick
 * them. On a host with no disk to keep them on it says so, instead of taking files it cannot keep.
 */
export function MediaDropzone({ media, enabled, onBrowse }: { media: MediaDrop; enabled: boolean; onBrowse: () => void }) {
  const status = media.progress
    ? null
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
        ? `${media.count} of your own ${media.count === 1 ? "file" : "files"} ready`
        : null;

  if (!enabled) {
    return (
      <div className="flex w-full max-w-2xl items-center gap-4 rounded-2xl border-2 border-dashed border-white/15 px-5 py-4 text-left">
        <Fan off />
        <div className="min-w-0">
          <p className="font-semibold text-white/70">Bring your own GIFs, photos and clips</p>
          <p className="mt-0.5 text-sm text-white/40">
            They need a disk to live on, so they work when you{" "}
            <a href={README} className="font-semibold text-white/70 underline underline-offset-4 outline-none hover:text-[#ffd60a] focus-visible:ring-2 focus-visible:ring-white/60">
              run Do it live yourself
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <button
        type="button"
        onClick={onBrowse}
        aria-describedby="dropzone-hint"
        className="group flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-white/25 bg-white/[0.03] px-5 py-4 text-left outline-none transition-colors hover:border-[#ffd60a]/80 hover:bg-[#ffd60a]/[0.06] focus-visible:border-[#ffd60a] focus-visible:bg-[#ffd60a]/[0.06]"
      >
        <Fan off={false} />
        <span className="min-w-0">
          {/* Nothing is dragged on a phone: there the whole zone is one button to pick files. */}
          <span className="block font-semibold text-white">
            <span className="sm:hidden">Add your GIFs, photos and clips</span>
            <span className="max-sm:hidden">
              Drop your GIFs, photos and clips, or <span className="text-[#ffd60a] underline underline-offset-4">browse</span>
            </span>
          </span>
          <span id="dropzone-hint" className="mt-0.5 block text-sm text-white/45">
            <span className="max-sm:hidden">GIF, JPG, PNG, MP4 or whole folders. </span>They go up when they fit what you say.
          </span>
        </span>
      </button>
      {media.progress ? (
        <div className="mt-3 flex items-center gap-3 px-1 text-sm text-white/70" aria-live="polite">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#ffd60a] transition-[width] duration-300" style={{ width: `${Math.round((media.progress.done / Math.max(1, media.progress.total)) * 100)}%` }} />
          </div>
          <span className="shrink-0 tabular-nums">
            Reading {media.progress.done} of {media.progress.total}
          </span>
        </div>
      ) : status ? (
        <p className="mt-3 flex items-center justify-between gap-3 px-1 text-sm text-white/55" aria-live="polite">
          <span>{status}</span>
          <Link href="/library" className="shrink-0 font-semibold text-white/70 outline-none hover:text-[#ffd60a] focus-visible:ring-2 focus-visible:ring-white/60">
            Open library →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
