"use client";

import { Globe } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Language {
  code: string;
  /** In the language itself. */
  label: string;
  english: string;
  ready: boolean;
}

// The languages the show is tested in, then the world's most spoken ones it does not speak yet. Speech to
// text is held to the one picked, so a Swedish talk is never read as English nonsense (or a pause as Chinese).
export const LANGUAGES: readonly Language[] = [
  { code: "en-US", label: "English", english: "English", ready: true },
  { code: "sv-SE", label: "Svenska", english: "Swedish", ready: true },
  { code: "zh-CN", label: "中文", english: "Mandarin", ready: false },
  { code: "hi-IN", label: "हिन्दी", english: "Hindi", ready: false },
  { code: "es-ES", label: "Español", english: "Spanish", ready: false },
  { code: "fr-FR", label: "Français", english: "French", ready: false },
  { code: "ar", label: "العربية", english: "Arabic", ready: false },
];

const READY = LANGUAGES.filter((l) => l.ready);
const SOON = LANGUAGES.filter((l) => !l.ready);
const LABELS: Record<string, string> = Object.fromEntries(READY.map((l) => [l.code, l.label]));

/** The language the speaker will talk in, picked before the mic is pressed. */
export function LanguageSelect({ lang, onChange }: { lang: string; onChange: (code: string) => void }) {
  const current = READY.find((l) => l.code.slice(0, 2) === lang.slice(0, 2))?.code ?? READY[0].code;
  return (
    <Select
      value={current}
      items={LABELS}
      onValueChange={(code) => {
        if (typeof code === "string" && LABELS[code]) onChange(code);
      }}
    >
      <SelectTrigger
        aria-label="The language you will speak"
        className="h-11 min-w-44 gap-2.5 rounded-full border-white/12 bg-white/[0.06] pr-3 pl-4 text-sm font-semibold text-white hover:bg-white/10 focus-visible:border-[#ffd60a] focus-visible:ring-[#ffd60a]/25 dark:bg-white/[0.06] dark:hover:bg-white/10"
      >
        <Globe className="size-4 text-white/55" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-60 rounded-2xl border border-white/10 bg-[#141414] p-1.5 text-white shadow-2xl ring-0">
        <SelectGroup>
          <SelectLabel className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">Speak in</SelectLabel>
          {READY.map((l) => (
            <SelectItem key={l.code} value={l.code} className="rounded-xl py-2 pl-2.5 text-sm font-semibold focus:bg-white/10 focus:text-white">
              {l.label}
              {l.english !== l.label ? <span className="font-normal text-white/40">{l.english}</span> : null}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator className="mx-1 my-1.5 bg-white/10" />
        <SelectGroup>
          <SelectLabel className="px-2.5 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">Coming soon</SelectLabel>
          {SOON.map((l) => (
            <SelectItem key={l.code} value={l.code} disabled className="rounded-xl py-2 pl-2.5 text-sm font-semibold data-disabled:opacity-100">
              <span className="text-white/45">{l.label}</span>
              <span className="font-normal text-white/30">{l.english}</span>
              <span className="ml-auto rounded-full bg-[#ffd60a]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ffd60a]/80">Soon</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
