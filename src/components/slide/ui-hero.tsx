"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { Bell, Check, CheckCheck, Heart, MapPin, MousePointer2, Plus, Search, Star, TrendingUp, TriangleAlert, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Skeleton } from "@/components/ui/skeleton";
import type { UiSpec } from "@/lib/ui-spec";

// The element is laid out at the components' own small size and then scaled up until it fills most of the
// slide, so the shadcn components keep their proportions at projector size whatever their shape.
const FILL_W = 0.72;
const FILL_H = 0.74;

// shadcn reads its colours from these tokens: here they come from the slide's colour field instead.
const TOKENS = {
  "--primary": "var(--fg)",
  "--primary-foreground": "var(--bg)",
  "--background": "var(--bg)",
  "--foreground": "var(--fg)",
  "--card": "color-mix(in srgb, var(--fg) 9%, var(--bg))",
  "--card-foreground": "var(--fg)",
  "--muted": "color-mix(in srgb, var(--fg) 24%, transparent)",
  "--muted-foreground": "color-mix(in srgb, var(--fg) 65%, transparent)",
  "--border": "color-mix(in srgb, var(--fg) 22%, transparent)",
  "--input": "color-mix(in srgb, var(--fg) 26%, transparent)",
  "--ring": "var(--alt)",
  "--secondary": "color-mix(in srgb, var(--fg) 14%, var(--bg))",
  "--secondary-foreground": "var(--fg)",
} as CSSProperties;

/** A placeholder line where text would be: the audience is not meant to read it. */
function Bar({ w, className = "" }: { w: number; className?: string }) {
  return <Skeleton className={`h-2.5 animate-none rounded-full ${className}`} style={{ width: w }} />;
}

/** Flips to true after `ms`, for elements that change state on screen. Thumbnails start in the end state. */
function useLater(ms: number, still: boolean): boolean {
  const [done, setDone] = useState(still);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(id);
  }, [ms, still]);
  return done;
}

/**
 * A number that counts up, then shows the exact figure. The spring behind the ticker can come to rest
 * a hair short of a big target, and "$999,999" is not "a million".
 */
function Count({ value, delay, still }: { value: number; delay: number; still: boolean }) {
  const settled = useLater((delay + 2.2) * 1000, still);
  if (settled) return <>{Math.round(value).toLocaleString("en")}</>;
  return <NumberTicker value={value} delay={delay} className="text-inherit" />;
}

const enter = (still: boolean, delay = 0, from: { y?: number; scale?: number; x?: number } = { y: 18 }) => ({
  initial: still ? false : { opacity: 0, ...from },
  animate: { opacity: 1, y: 0, x: 0, scale: 1 },
  transition: { type: "spring" as const, stiffness: 320, damping: 24, delay },
});

/** A form field. "Not needed" is shown by the field folding away, never by a line through it. */
function Field({ gone, delay, still }: { gone: boolean; delay: number; still: boolean }) {
  return (
    <motion.div
      className="space-y-1.5 overflow-hidden"
      initial={false}
      animate={gone ? { opacity: 0, height: 0, marginTop: 0 } : { opacity: 1, height: "auto" }}
      transition={still ? { duration: 0 } : { duration: 0.45, delay, ease: "easeInOut" }}
    >
      <Bar w={56} />
      <div className="relative flex h-10 items-center rounded-lg border border-input px-3">
        <Bar w={120} className="opacity-60" />
      </div>
    </motion.div>
  );
}

function Hero({ spec, still }: { spec: UiSpec; still: boolean }): ReactNode {
  const later = useLater(900, still);
  const text = spec.text;
  const count = spec.count;

  switch (spec.kind) {
    case "button": {
      const crossed = spec.state === "crossed";
      return (
        <div className="relative grid place-items-center">
          <motion.div {...enter(still, 0.05, { scale: 0.6 })} className="relative">
            <motion.div
              animate={!still && later ? (crossed ? { scale: 0.86, opacity: 0.3 } : { scale: [1, 0.9, 1.04, 1] }) : undefined}
              transition={{ duration: crossed ? 0.6 : 0.4 }}
            >
              <Button className="h-20 rounded-3xl px-14 text-4xl font-black">{text || "Go"}</Button>
            </motion.div>
          </motion.div>
          {!crossed ? (
            <motion.div
              className="absolute"
              initial={still ? false : { x: 140, y: 110, opacity: 0 }}
              animate={{ x: 70, y: 44, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            >
              <MousePointer2 className="size-12 fill-[var(--fg)] text-[var(--bg)]" strokeWidth={1.5} />
            </motion.div>
          ) : null}
        </div>
      );
    }

    case "form": {
      const crossed = spec.state === "crossed";
      const failed = spec.state === "error";
      return (
        <motion.div {...enter(still)} animate={failed && later && !still ? { opacity: 1, y: 0, x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
          <Card className="w-[290px] gap-5 rounded-2xl px-6 py-6" style={failed ? { boxShadow: "0 0 0 3px var(--alt)" } : undefined}>
            <Bar w={110} className="h-4" />
            <Field gone={crossed && later} delay={0} still={still} />
            <Field gone={crossed && later} delay={0.15} still={still} />
            <motion.div animate={crossed && !still && later ? { scale: [1, 1.07, 1] } : undefined} transition={{ duration: 0.5 }}>
              <Button className="h-11 w-full rounded-xl text-lg font-black" style={crossed ? { background: "var(--alt)", color: "var(--bg)" } : undefined}>
                {text || (crossed ? "Join" : "Sign in")}
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      );
    }

    case "toggle": {
      const on = later ? spec.state !== "off" : spec.state === "off";
      return (
        <motion.div {...enter(still)} className="flex flex-col items-center gap-5">
          <div
            className="relative h-[92px] w-[176px] rounded-full p-2 transition-colors duration-300"
            style={{ background: on ? "var(--alt)" : "var(--input)" }}
          >
            <motion.span
              className="block size-[76px] rounded-full shadow-md"
              style={{ background: on ? "var(--bg)" : "var(--fg)" }}
              initial={false}
              animate={{ x: on ? 84 : 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            />
          </div>
          {text ? <span className="text-5xl font-black">{text}</span> : null}
        </motion.div>
      );
    }

    case "notifications": {
      const n = count ?? 99;
      return (
        <div className="relative w-[300px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div key={i} {...enter(still, 0.08 + i * 0.12, { y: -60 })} className="mb-2" style={{ marginLeft: i * 4 }}>
              <Card className="flex-row items-center gap-3 rounded-2xl px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: "var(--alt)", color: "var(--bg)" }}>
                  <Bell className="size-4" />
                </span>
                <span className="space-y-1.5">
                  <Bar w={150 - i * 12} />
                  <Bar w={90 + i * 9} className="opacity-50" />
                </span>
              </Card>
            </motion.div>
          ))}
          <motion.div {...enter(still, 0.7, { scale: 0.3 })} className="absolute -top-5 -right-8">
            <Badge className="h-12 rounded-full px-4 text-3xl font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>
              <Count value={n} delay={0.7} still={still} />
            </Badge>
          </motion.div>
        </div>
      );
    }

    case "progress": {
      const stuck = spec.state === "loading";
      const pct = Math.min(100, count ?? (stuck ? 92 : 100));
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[340px] gap-5 rounded-2xl px-6 py-6">
            <div className="flex items-end justify-between">
              <Bar w={130} className="h-3.5" />
              <span className="text-4xl font-black"><Count value={pct} delay={0.2} still={still} />%</span>
            </div>
            <div className="h-5 overflow-hidden rounded-full" style={{ background: "var(--muted)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--alt)" }}
                initial={still ? false : { width: "0%" }}
                animate={stuck && !still ? { width: [`0%`, `${pct}%`, `${pct}%`], opacity: [1, 1, 0.55, 1] } : { width: `${pct}%` }}
                transition={stuck ? { duration: 2.4, times: [0, 0.45, 1], repeat: Infinity, repeatType: "reverse" as const } : { duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </Card>
        </motion.div>
      );
    }

    case "chat": {
      const silent = spec.state === "empty";
      const rows: [boolean, number][] = [[false, 150], [true, 120], [false, 180], [true, 90]];
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[320px] gap-2.5 rounded-2xl px-5 py-5">
            {rows.slice(0, silent ? 3 : 4).map(([mine, w], i) => (
              <motion.div key={i} {...enter(still, 0.15 + i * 0.25, { y: 10 })} className={`flex ${mine ? "justify-end" : ""}`}>
                <span className="rounded-2xl px-3.5 py-2.5" style={{ background: mine ? "var(--fg)" : "var(--muted)" }}>
                  <Bar w={w} className={mine ? "bg-[var(--bg)] opacity-40" : ""} />
                </span>
              </motion.div>
            ))}
            {silent ? (
              <motion.div {...enter(still, 1, { y: 4 })} className="flex items-center justify-end gap-1 text-sm font-bold opacity-70">
                <CheckCheck className="size-4" /> {text || "Seen"}
              </motion.div>
            ) : (
              <motion.div className="flex gap-1.5 px-1" animate={still ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>
                {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full" style={{ background: "var(--fg)" }} />)}
              </motion.div>
            )}
          </Card>
        </motion.div>
      );
    }

    case "people": {
      const n = count ?? 12;
      return (
        <div className="flex items-center">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div key={i} {...enter(still, i * 0.1, { scale: 0.2 })} style={{ marginLeft: i ? -22 : 0, zIndex: 10 - i }}>
              <Avatar className="size-20 ring-4 ring-[var(--bg)]">
                <AvatarFallback className="text-transparent" style={{ background: i % 2 ? "var(--alt)" : "color-mix(in srgb, var(--fg) 70%, var(--bg))" }}>.</AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
          <motion.div {...enter(still, 0.75, { scale: 0.3 })} className="ml-5">
            <Badge className="h-14 rounded-full px-5 text-4xl font-black">+<Count value={n} delay={0.75} still={still} /></Badge>
          </motion.div>
        </div>
      );
    }

    case "search": {
      const none = spec.state === "empty";
      const query = text || "search";
      const typed = still ? query : query.slice(0, Math.max(1, Math.round(query.length * (later ? 1 : 0.4))));
      return (
        <motion.div {...enter(still)} className="w-[360px] space-y-3">
          <div className="flex h-14 items-center gap-3 rounded-2xl border-2 border-[var(--fg)] px-4" style={{ background: "var(--card)" }}>
            <Search className="size-6" />
            <span className="text-2xl font-black">{typed}</span>
            {!still ? <motion.span className="h-7 w-0.5" style={{ background: "var(--fg)" }} animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} /> : null}
          </div>
          {none ? (
            <motion.div {...enter(still, 1.1, { y: 6 })} className="px-2 text-2xl font-black" style={{ color: "var(--alt)" }}>0 results</motion.div>
          ) : (
            [0, 1, 2].map((i) => (
              <motion.div key={i} {...enter(still, 1 + i * 0.12, { y: 8 })}>
                <Card className="gap-2 rounded-xl px-4 py-3"><Bar w={200 - i * 30} /><Bar w={140} className="opacity-50" /></Card>
              </motion.div>
            ))
          )}
        </motion.div>
      );
    }

    case "balance": {
      const n = count ?? 1_000_000;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[340px] gap-4 rounded-3xl px-7 py-7">
            <div className="flex items-center justify-between">
              <Bar w={90} />
              <TrendingUp className="size-6" style={{ color: "var(--alt)" }} />
            </div>
            <div className="text-5xl font-black whitespace-nowrap tabular-nums">
              $<Count value={n} delay={0.25} still={still} />
            </div>
            <Bar w={150} className="opacity-50" />
          </Card>
        </motion.div>
      );
    }

    case "dialog": {
      const refused = spec.state === "crossed";
      return (
        <motion.div {...enter(still, 0, { scale: 0.85 })}>
          <Card className="w-[330px] gap-5 rounded-3xl px-6 py-6">
            <div className="text-3xl leading-tight font-black">{text || "Are you sure?"}</div>
            <Bar w={210} className="opacity-50" />
            <div className="relative flex justify-end gap-3">
              <motion.div animate={refused && later && !still ? { scale: [1, 0.88, 1.06, 1] } : undefined} transition={{ duration: 0.45 }}>
                <Button variant="secondary" className="h-11 rounded-xl px-5 text-lg font-black" style={refused && later ? { background: "var(--alt)", color: "var(--bg)" } : undefined}>No</Button>
              </motion.div>
              <Button className="h-11 rounded-xl px-5 text-lg font-black transition-opacity duration-300" style={refused && later ? { opacity: 0.25 } : undefined}>Yes</Button>
              {refused ? (
                <motion.div
                  className="pointer-events-none absolute"
                  style={{ right: 96, top: 22 }}
                  initial={still ? false : { x: 90, y: 70, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                >
                  <MousePointer2 className="size-9 fill-[var(--fg)] text-[var(--bg)]" strokeWidth={1.5} />
                </motion.div>
              ) : null}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "rating": {
      const stars = Math.max(1, Math.min(5, Math.round(count ?? 5)));
      return (
        <motion.div {...enter(still)}>
          <Card className="items-center gap-4 rounded-3xl px-8 py-7">
            {text ? <div className="text-4xl font-black">{text}</div> : <Bar w={140} className="h-4" />}
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span key={i} {...enter(still, 0.3 + i * 0.14, { scale: 0.2 })}>
                  <Star className="size-12" strokeWidth={1.8} style={i < stars ? { fill: "var(--alt)", color: "var(--alt)" } : { color: "var(--muted)" }} />
                </motion.span>
              ))}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "poll": {
      const options = spec.items.length >= 2 ? spec.items.slice(0, 3) : ["", "", ""];
      const top = Math.min(96, count ?? 64);
      const shares = [top, Math.round((100 - top) * 0.62), Math.round((100 - top) * 0.38)];
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[340px] gap-4 rounded-2xl px-6 py-6">
            {text ? <div className="text-2xl leading-tight font-black">{text}</div> : <Bar w={200} className="h-4" />}
            {options.map((option, i) => (
              <div key={i} className="relative h-11 overflow-hidden rounded-xl" style={{ background: "var(--muted)" }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-xl"
                  style={{ background: i === 0 ? "var(--alt)" : "color-mix(in srgb, var(--fg) 30%, transparent)" }}
                  initial={still ? false : { width: "0%" }}
                  animate={{ width: `${shares[i]}%` }}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.15, ease: "easeOut" }}
                />
                <div className="relative flex h-full items-center justify-between px-4 text-lg font-black">
                  {option ? <span style={i === 0 ? { color: "var(--bg)" } : undefined}>{option}</span> : <Bar w={90 - i * 15} />}
                  {i === 0 && count ? <span>{Math.round(top)}%</span> : null}
                </div>
              </div>
            ))}
          </Card>
        </motion.div>
      );
    }

    case "calendar": {
      const day = Math.max(1, Math.min(31, Math.round(count ?? 0))) || null;
      const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      const column = weekdays.findIndex((d) => text.toLowerCase().startsWith(d));
      return (
        <motion.div {...enter(still)}>
          <Card className="gap-4 rounded-2xl px-6 py-6">
            <div className="flex items-center justify-between">
              {text ? <span className="text-3xl font-black">{text}</span> : <Bar w={120} className="h-4" />}
              <Bar w={50} className="opacity-50" />
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }, (_, i) => {
                const hit = day ? i + 1 === day : column >= 0 ? i % 7 === column : i === 17;
                return (
                  <motion.div
                    key={i}
                    className="grid size-9 place-items-center rounded-lg text-sm font-black"
                    style={hit ? { background: "var(--alt)", color: "var(--bg)" } : { background: "var(--muted)", opacity: i > 30 ? 0.35 : 1 }}
                    {...(hit ? enter(still, 0.5 + (i % 7) * 0.05, { scale: 0.2 }) : {})}
                  >
                    {hit && day ? day : ""}
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "map": {
      return (
        <motion.div {...enter(still)} className="relative">
          <div className="relative h-[230px] w-[360px] overflow-hidden rounded-3xl" style={{ background: "var(--card)" }}>
            <svg className="absolute inset-0 size-full" viewBox="0 0 360 230" aria-hidden>
              <path d="M-10 160 C 80 120 140 190 230 130 S 330 70 380 90" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
              <path d="M90 -10 C 110 70 70 140 120 240" fill="none" stroke="var(--muted)" strokeWidth="9" strokeLinecap="round" />
              <path d="M260 -10 C 250 60 300 120 280 240" fill="none" stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" />
              <ellipse cx="300" cy="190" rx="70" ry="38" fill="var(--muted)" opacity="0.6" />
            </svg>
            <motion.div className="absolute left-[150px] top-[40px]" initial={still ? false : { y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}>
              <MapPin className="size-20" strokeWidth={1.8} style={{ fill: "var(--alt)", color: "var(--bg)" }} />
            </motion.div>
            <motion.span className="absolute left-[170px] top-[118px] size-6 rounded-full" style={{ background: "var(--alt)", opacity: 0.35 }} initial={still ? false : { scale: 0 }} animate={{ scale: [0, 2.4, 1.6] }} transition={{ duration: 0.8, delay: 0.75 }} />
          </div>
          {text ? (
            <motion.div {...enter(still, 0.8)} className="absolute -bottom-6 left-1/2 -translate-x-1/2">
              <Badge className="h-12 rounded-full px-6 text-2xl font-black">{text}</Badge>
            </motion.div>
          ) : null}
        </motion.div>
      );
    }

    case "compare": {
      const [good, bad] = [spec.items[0] ?? "", spec.items[1] ?? ""];
      const trap = spec.state === "crossed";
      return (
        <div className="flex gap-5">
          {[good, bad].map((name, i) => (
            <motion.div key={i} {...enter(still, 0.15 + i * 0.25, { y: 30 })} animate={i === 1 && trap && later && !still ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] } : { opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
              <Card className="w-[190px] items-center gap-4 rounded-3xl px-5 py-6" style={i === 1 ? { opacity: later || still ? 0.6 : 1 } : { boxShadow: "0 0 0 3px var(--alt)" }}>
                <span className="grid size-14 place-items-center rounded-full" style={i === 0 ? { background: "var(--alt)", color: "var(--bg)" } : { background: "var(--muted)" }}>
                  {i === 0 ? <Check className="size-8" strokeWidth={3} /> : <X className="size-8" strokeWidth={3} />}
                </span>
                {name ? <span className="text-center text-2xl leading-tight font-black">{name}</span> : <Bar w={110} className="h-4" />}
                <Bar w={120} className="opacity-50" />
              </Card>
            </motion.div>
          ))}
        </div>
      );
    }

    case "tags": {
      const tags = spec.items.length ? spec.items : ["", "", ""];
      return (
        <div className="flex max-w-[380px] flex-wrap justify-center gap-3">
          {tags.map((tag, i) => (
            <motion.div key={i} {...enter(still, 0.15 + i * 0.18, { scale: 0.3 })}>
              <Badge className="h-14 rounded-full px-6 text-3xl font-black" style={i === 0 ? { background: "var(--alt)", color: "var(--bg)" } : { background: "var(--secondary)", color: "var(--fg)" }}>
                {tag || <Bar w={70} />}
              </Badge>
            </motion.div>
          ))}
        </div>
      );
    }

    case "profile": {
      const name = text || "";
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[320px] items-center gap-4 rounded-3xl px-6 py-7">
            <Avatar className="size-24 ring-4 ring-[var(--alt)]">
              <AvatarFallback className="text-4xl font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>{name.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            {name ? <div className="text-center text-3xl leading-tight font-black">{name}</div> : <Bar w={150} className="h-4" />}
            <div className="flex flex-wrap justify-center gap-2">
              {(spec.items.length ? spec.items : ["", ""]).map((trait, i) => (
                <motion.span key={i} {...enter(still, 0.5 + i * 0.12, { scale: 0.4 })}>
                  <Badge variant="secondary" className="h-8 rounded-full px-3 text-base font-black">{trait || <Bar w={50} />}</Badge>
                </motion.span>
              ))}
            </div>
            <motion.div {...enter(still, 0.9, { y: 8 })}>
              <Button className="h-11 rounded-xl px-6 text-lg font-black"><Plus className="size-5" /> Follow</Button>
            </motion.div>
          </Card>
        </motion.div>
      );
    }

    case "alert": {
      return (
        <motion.div {...enter(still, 0, { scale: 0.85 })} animate={!still && later ? { opacity: 1, scale: 1, x: [0, -9, 9, -6, 6, 0] } : { opacity: 1, scale: 1 }} transition={{ duration: 0.55, ease: "easeOut" }}>
          <Card className="w-[340px] flex-row items-center gap-5 rounded-3xl px-6 py-6" style={{ boxShadow: "0 0 0 4px var(--alt)" }}>
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--alt)", color: "var(--bg)" }}>
              <TriangleAlert className="size-9" strokeWidth={2.4} />
            </span>
            <span className="space-y-2">
              {text ? <span className="block text-3xl leading-tight font-black">{text}</span> : <Bar w={150} className="h-4" />}
              <Bar w={130} className="opacity-50" />
            </span>
          </Card>
        </motion.div>
      );
    }

    case "like": {
      const n = count ?? 0;
      return (
        <div className="relative flex items-center gap-6">
          <motion.div {...enter(still, 0.1, { scale: 0.4 })} animate={!still && later ? { opacity: 1, scale: [1, 1.25, 1] } : { opacity: 1, scale: 1 }} transition={{ duration: 0.55, ease: "easeOut" }}>
            <span className="grid size-32 place-items-center rounded-full" style={{ background: "var(--card)" }}>
              <Heart className="size-16" strokeWidth={2} style={later || still ? { fill: "var(--alt)", color: "var(--alt)" } : undefined} />
            </span>
          </motion.div>
          {n ? <span className="text-6xl font-black tabular-nums"><Count value={n} delay={0.6} still={still} /></span> : null}
          {!still
            ? [0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="absolute left-12 top-6"
                  initial={{ y: 0, opacity: 0, scale: 0.6 }}
                  animate={{ y: -110 - i * 18, x: (i % 2 ? 1 : -1) * (14 + i * 9), opacity: [0, 1, 0], scale: 1 }}
                  transition={{ duration: 1.8, delay: 1 + i * 0.25, repeat: Infinity, repeatDelay: 0.6 }}
                >
                  <Heart className="size-6" style={{ fill: "var(--alt)", color: "var(--alt)" }} />
                </motion.span>
              ))
            : null}
        </div>
      );
    }

    case "checklist":
    default: {
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[300px] gap-4 rounded-2xl px-6 py-6">
            {[0, 1, 2, 3].map((i) => (
              <Tick key={i} index={i} still={still} all={spec.state === "done"} />
            ))}
          </Card>
        </motion.div>
      );
    }
  }
}

function Tick({ index, still, all }: { index: number; still: boolean; all: boolean }) {
  const ticked = useLater(500 + index * 380, still);
  const on = ticked && (all || index < 3);
  return (
    <div className="flex items-center gap-3">
      <Checkbox checked={on} className="size-6 rounded-md [&_svg]:size-5" />
      <Bar w={170 - index * 18} className={on ? "opacity-40" : ""} />
      {on && index === 3 ? <Check className="size-5" /> : null}
    </div>
  );
}

/** One big, simplified interface element, staged with motion on the slide's own colours. */
export function UiHero({ spec, still }: { spec: UiSpec; still: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const frame = wrap.current;
    const inner = content.current;
    if (!frame || !inner) return;
    // offsetWidth and offsetHeight ignore the transform, so this is the element's own size.
    const measure = (): void => {
      if (!inner.offsetWidth || !inner.offsetHeight) return;
      setScale(Math.min((frame.clientWidth * FILL_W) / inner.offsetWidth, (frame.clientHeight * FILL_H) / inner.offsetHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrap} className="ui-hero" style={TOKENS}>
      <div
        ref={content}
        className="ui-hero-stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
      >
        <Hero spec={spec} still={still} />
      </div>
    </div>
  );
}
