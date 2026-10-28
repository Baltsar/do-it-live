"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/** A page that crashed says what broke, so a phone with no console can still tell us. */
export default function ShowError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => reportClientError("error.tsx", error), [error]);
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
      <h1 className="text-5xl font-black tracking-tight [font-stretch:125%]">Something broke.</h1>
      <p className="max-w-md break-words font-mono text-sm text-white/60">{message}</p>
      <button type="button" onClick={() => retry()} className="rounded-full bg-[#ffd60a] px-6 py-3 font-bold text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        Try again
      </button>
    </div>
  );
}
