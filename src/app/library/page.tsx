"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Film, ImageIcon, RotateCw, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/lib/library";
import { filesFromDrop, rereadMedia, uploadMedia } from "@/lib/upload";

type Item = Omit<LibraryItem, "embedding">;

const isMotion = (item: Item): boolean => item.motion ?? (item.mime === "image/gif" || item.mime.startsWith("video/"));

/** The engine's category, or the older one-word emotion for items read before it existed. */
const labelOf = (item: Item): string => (item.category ?? item.emotion ?? "").trim().toLowerCase();

/** What the drop zone promises, in the speaker's words rather than in file extensions. */
const KINDS = [
  { label: "GIFs", hint: "gif, webp" },
  { label: "Photos", hint: "png, jpg" },
  { label: "Clips", hint: "mp4, webm" },
];

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<{ done: number; total: number; again?: boolean } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const d = (await (await fetch("/api/library")).json()) as { items: Item[] };
    setItems(d.items);
  }, []);

  useEffect(() => {
    // Deferred so the first paint is not blocked by the fetch.
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const upload = useCallback(
    async (files: File[]): Promise<void> => {
      setErrors([]);
      setBusy({ done: 0, total: files.length });
      const report = await uploadMedia(files, (done, total) => setBusy({ done, total }));
      setBusy(null);
      setErrors([
        ...report.failed,
        ...(report.skipped.length ? [`Could not use ${report.skipped.length}: ${report.skipped.slice(0, 3).join(", ")}${report.skipped.length > 3 ? " and more" : ""}`] : []),
        ...(report.duplicates ? [`${report.duplicates} were already here`] : []),
      ]);
      await refresh();
    },
    [refresh],
  );

  const reread = async (): Promise<void> => {
    setErrors([]);
    setBusy({ done: 0, total: items.length, again: true });
    const failed = await rereadMedia(items, (done, total) => setBusy({ done, total, again: true }));
    setBusy(null);
    setErrors(failed);
    await refresh();
  };

  const remove = async (id: string): Promise<void> => {
    await fetch(`/api/library/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const edit = async (item: Item, patch: Partial<Pick<Item, "caption" | "tags" | "useWhen">>): Promise<void> => {
    await fetch(`/api/library/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
  };

  // The model's own reading of the files, turned into the only filters worth having: what moves,
  // and what each one is for.
  const { motion, stills, moods } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const mood = labelOf(item);
      if (mood) counts.set(mood, (counts.get(mood) ?? 0) + 1);
    }
    return {
      motion: items.filter(isMotion).length,
      stills: items.filter((i) => !isMotion(i)).length,
      moods: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    };
  }, [items]);

  const shown = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "motion") return isMotion(item);
    if (filter === "stills") return !isMotion(item);
    return labelOf(item) === filter;
  });

  const chip = (value: string, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70",
        filter === value ? "bg-[#ffd60a] text-black" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
      )}
    >
      {label} <span className="tabular-nums opacity-60">{count}</span>
    </button>
  );

  return (
    <div
      className="min-h-screen bg-black text-white"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        // Only when the pointer leaves the window, not on every child it crosses.
        if (e.currentTarget === e.target) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void filesFromDrop(e.dataTransfer).then(upload);
      }}
    >
      <div className="mx-auto max-w-[1400px] space-y-8 px-5 py-6">
        <header className="flex items-center gap-3">
          <span className="text-lg font-black tracking-tight [font-stretch:125%]">Do it live</span>
          {items.length > 0 && !busy ? (
            <Button variant="ghost" className="ml-auto text-white/70 hover:text-white" onClick={() => void reread()}>
              <RotateCw /> Read all again
            </Button>
          ) : null}
          <Link href="/" className={buttonVariants({ variant: "outline", className: items.length > 0 && !busy ? "" : "ml-auto" })}>
            Back to the show
          </Link>
        </header>

        <div className="space-y-2">
          <h1 className="text-5xl font-black leading-[0.85] tracking-[-0.04em] [font-stretch:125%] sm:text-6xl lg:text-7xl">Drop it all here.</h1>
          <p className="max-w-2xl text-lg font-semibold text-white/60">
            A whole folder at once. Every file is looked at and described, so Bill knows what it shows and when to play it. Your file names never matter.
          </p>
        </div>

        {/* The drop zone is the page, not a box in it: the whole window takes a drop. This panel is
            where that promise is made visible, and where the reading is reported back. */}
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl border-2 border-dashed p-8 transition-colors sm:p-12",
            drag ? "border-[#ffd60a] bg-[#ffd60a]/10" : "border-white/15 bg-white/[0.03]",
          )}
        >
          {busy ? (
            <div className="space-y-4 text-center">
              <p className="text-2xl font-black tracking-tight sm:text-3xl">
                {busy.again ? "Reading again" : "Looking at your files"} <span className="tabular-nums text-[#ffd60a]">{busy.done}</span>
                <span className="text-white/40"> / {busy.total}</span>
              </p>
              <div className="mx-auto h-2 w-full max-w-lg overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#ffd60a] transition-[width] duration-300"
                  style={{ width: `${busy.total === 0 ? 0 : Math.round((busy.done / busy.total) * 100)}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-white/50">Vision watches each one. The web says what it is called. Nemotron decides what it means.</p>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <p className="text-2xl font-black tracking-tight sm:text-3xl">{drag ? "Let go." : "Drag a folder onto this page"}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {KINDS.map((k) => (
                  <span key={k.label} className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
                    {k.label} <span className="font-normal text-white/40">{k.hint}</span>
                  </span>
                ))}
              </div>
              <Button
                className="bg-[#ffd60a] font-bold text-black hover:bg-[#ffd60a]/90"
                onClick={() => input.current?.click()}
              >
                Choose files
              </Button>
            </div>
          )}
          <input
            ref={input}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void upload([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </section>

        {errors.length > 0 ? (
          <ul className="space-y-1 rounded-2xl border border-[#ff4fa3]/40 bg-[#ff4fa3]/5 p-4 text-sm font-semibold text-[#ff4fa3]">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        {items.length > 0 ? (
          <>
            {/* What the model made of the pile. These chips are the categories: nobody typed them. */}
            <div className="flex flex-wrap items-center gap-2">
              {chip("all", "Everything", items.length)}
              {motion > 0 ? chip("motion", "Moves", motion) : null}
              {stills > 0 ? chip("stills", "Stills", stills) : null}
              <span className="mx-1 h-5 w-px bg-white/15" />
              {moods.map(([mood, count]) => chip(mood, mood, count))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                  <div className="relative aspect-video bg-black">
                    {item.mime.startsWith("video/") ? (
                      <video src={`/api/library/${item.id}`} className="size-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded animated GIF
                      <img src={`/api/library/${item.id}`} alt={item.caption} className="size-full object-cover" />
                    )}
                    <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 text-white/80" title={isMotion(item) ? "Moves" : "Still"}>
                      {isMotion(item) ? <Film className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                    </span>
                    {labelOf(item) ? (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold lowercase text-[#ffd60a]">{labelOf(item)}</span>
                    ) : null}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
                      {item.knownAs ? <p className="truncate text-base font-black leading-tight text-[#ffd60a]">{item.knownAs}</p> : null}
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">
                        {item.meaning || item.caption || <span className="text-[#ff4fa3]">Not described — open and write one</span>}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(open === item.id ? null : item.id)}
                    aria-expanded={open === item.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white/50 outline-none transition-colors hover:text-white focus-visible:text-white"
                  >
                    {item.tags.length > 0 ? <span className="truncate">{item.tags.slice(0, 4).join(" · ")}</span> : <span>No tags</span>}
                    <ChevronDown className={cn("ml-auto size-4 shrink-0 transition-transform", open === item.id && "rotate-180")} />
                  </button>

                  {open === item.id ? (
                    <div className="space-y-2 border-t border-white/10 p-3">
                      {item.knownAs || item.origin ? (
                        <p className="text-xs font-semibold text-white/60">
                          {[item.knownAs, item.origin].filter(Boolean).join(" · ")}
                          {item.evidence ? (
                            <a href={item.evidence} target="_blank" rel="noreferrer" className="ml-2 text-[#ffd60a] underline-offset-2 hover:underline">
                              source
                            </a>
                          ) : null}
                        </p>
                      ) : null}
                      {item.nameFits === false ? <p className="text-xs text-white/40">The file name did not match what is in it, so it is ignored.</p> : null}
                      <input
                        defaultValue={item.caption}
                        onBlur={(e) => e.target.value !== item.caption && void edit(item, { caption: e.target.value })}
                        placeholder="What it shows"
                        className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#ffd60a]"
                        aria-label="Caption"
                      />
                      <input
                        defaultValue={item.useWhen}
                        placeholder="Could stand for… (a moment, in your own words)"
                        onBlur={(e) => e.target.value !== item.useWhen && void edit(item, { useWhen: e.target.value })}
                        className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/70 outline-none focus:ring-2 focus:ring-[#ffd60a]"
                        aria-label="Use when"
                      />
                      <input
                        defaultValue={item.tags.join(", ")}
                        placeholder="Tags: names, films, memes"
                        onBlur={(e) => {
                          const tags = e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
                          if (tags.join(",") !== item.tags.join(",")) void edit(item, { tags });
                        }}
                        className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#ffd60a]"
                        aria-label="Tags"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        {item.source === "filename" ? <p className="text-xs text-white/40">Read from the file name only — no vision model was available.</p> : null}
                        <Button size="icon-xs" variant="ghost" className="ml-auto text-white/50 hover:text-[#ff4fa3]" aria-label={`Delete ${item.name}`} onClick={() => void remove(item.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : busy ? null : (
          <p className="py-10 text-center text-lg font-semibold text-white/40">Nothing here yet. Drop a folder and watch it get sorted.</p>
        )}
      </div>
    </div>
  );
}
