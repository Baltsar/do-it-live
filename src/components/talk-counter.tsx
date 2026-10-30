"use client";

import { useEffect, useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Below this the total looks lonely, so the counter offers the next number instead of the count.
const SMALL = 50;

interface Count {
  talks: number | null;
  minutes: number | null;
}

/** How many talks have been done live on the hosted demo. Anonymous: a number, nothing about who. */
export function TalkCounter() {
  const [count, setCount] = useState<Count | null>(null);

  useEffect(() => {
    // After the page is up and off the critical path: nothing on stage ever waits for the counter.
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch("/api/talks", { signal: ctl.signal })
        .then((r) => r.json() as Promise<Count>)
        .then(setCount)
        .catch(() => undefined);
    }, 400);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, []);

  // On a laptop there is nothing to count, and a failed count is not worth a placeholder.
  if (count?.talks == null) return null;
  const small = count.talks < SMALL;

  return (
    <Tooltip>
      <TooltipTrigger className="mr-1 inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] py-1.5 pl-2.5 pr-3 text-[13px] font-semibold text-white/60 outline-none transition-colors hover:border-white/30 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white/60 max-[400px]:mr-0 max-[400px]:px-2.5 max-[400px]:text-xs">
        <span className="relative flex size-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex size-full rounded-full bg-[#ff4fa3] opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-[#ff4fa3]" />
        </span>
        {small ? (
          <span>
            Be talk <span className="font-extrabold tabular-nums text-[#ffd60a]">#{count.talks + 1}</span>
          </span>
        ) : (
          <span>
            <NumberTicker value={count.talks} className="font-extrabold tabular-nums tracking-normal text-white" />{" "}
            <span className="max-[400px]:hidden">talks done live</span>
            <span className="min-[401px]:hidden">live</span>
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="flex-col items-start gap-1 text-left">
        <span className="block font-semibold">Mic hit, slides drawn. We count talks, not who or what.</span>
        {count.minutes ? (
          <span className="block opacity-70">
            {count.minutes.toLocaleString("en-US")} minutes on NVIDIA Nemotron via Nebius Token Factory
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
