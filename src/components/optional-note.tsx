"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// The point of the product is not preparing. Everything under this line can be skipped, and the
// copy says so with the same attitude as the tagline.
const SNARK = [
  "Prep kind of defeats the point.",
  "We'll do it live, remember?",
  "Real ones just press the mic.",
  "Homework. Skip it.",
  "Rehearsing is for decks.",
];

const LINE_MS = 3200;

function Snark() {
  const still = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (still) return;
    const id = setInterval(() => setI((n) => (n + 1) % SNARK.length), LINE_MS);
    return () => clearInterval(id);
  }, [still]);

  return (
    // Changing text is decorative: a screen reader hears the plain sentence below instead.
    <span className="relative block h-5 min-w-0 overflow-hidden" aria-hidden>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          className="block truncate"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {SNARK[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A marker-highlighted OPTIONAL over the brief and the speaker's own media. */
export function OptionalNote() {
  const still = useReducedMotion();
  return (
    <p className="flex w-full max-w-2xl items-center gap-3 px-1 text-left text-sm font-semibold text-white/45">
      <span className="relative shrink-0 px-1.5 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-black">
        <motion.span
          className="absolute inset-0 origin-left -rotate-1 -skew-x-6 rounded-[3px] bg-[#ff4fa3]"
          initial={still ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.45, delay: 0.6, ease: [0.65, 0, 0.35, 1] }}
          aria-hidden
        />
        <span className="relative">Optional</span>
      </span>
      <Snark />
      <span className="sr-only">: everything here can be skipped. Just talk.</span>
    </p>
  );
}
