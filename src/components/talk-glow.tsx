"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// How far the button leans toward the pointer, as a share of the pointer's distance from its centre.
const PULL = 0.16;
const MAX_PULL = 14;

const clamp = (n: number): number => Math.max(-MAX_PULL, Math.min(MAX_PULL, n));

/**
 * Pressing the big mic should feel like the one thing on the page worth touching: a breathing glow,
 * a glint that orbits the disc, a candy-like sheen, a glare that crosses it on hover, and a slight
 * pull toward the pointer. Idle only: once the show listens, the level ring has the stage.
 */
export function TalkGlow({ active, children }: { active: boolean; children: ReactNode }) {
  const still = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });

  if (!active) return <>{children}</>;

  const lean = (e: PointerEvent<HTMLDivElement>): void => {
    if (still || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(clamp((e.clientX - (r.left + r.width / 2)) * PULL));
    y.set(clamp((e.clientY - (r.top + r.height / 2)) * PULL));
  };
  const settle = (): void => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div className="group/talk relative grid place-items-center" style={{ x, y }} onPointerMove={lean} onPointerLeave={settle} initial="rest" animate="rest" whileHover="hover">
      <span className="pointer-events-none absolute -inset-10 opacity-60 transition-opacity duration-500 group-hover/talk:opacity-100" aria-hidden>
        <motion.span
          className="absolute inset-0 rounded-full bg-[#ffd60a] blur-3xl"
          initial={{ opacity: 0.22, scale: 0.94 }}
          animate={still ? undefined : { opacity: [0.22, 0.42, 0.22], scale: [0.94, 1.04, 0.94] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>

      {/* A faint track with a bright glint running round it, just outside the disc. */}
      <span className="pointer-events-none absolute -inset-[7px] rounded-full ring-1 ring-white/10" aria-hidden />
      {still ? null : (
        <motion.span
          className="pointer-events-none absolute -inset-[8px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,rgba(255,255,255,0.15)_300deg,#fff_345deg,transparent_360deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-2.5px),#000_calc(100%-2px))]"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      )}

      {children}

      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-transform group-hover/talk:scale-105 group-active/talk:scale-95" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.5),rgba(255,255,255,0)_42%)]" />
        <span className="absolute inset-0 rounded-full shadow-[inset_0_-10px_24px_rgba(160,110,0,0.35)]" />
        {still ? null : (
          <motion.span
            className="absolute inset-y-[-10%] left-[-45%] w-[45%] -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            variants={{ rest: { x: "0%", transition: { duration: 0 } }, hover: { x: "330%", transition: { duration: 0.75, ease: "easeInOut" } } }}
          />
        )}
      </span>
    </motion.div>
  );
}
