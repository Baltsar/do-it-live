"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Bell,
  Check,
  CheckCheck,
  Cloud,
  CloudRain,
  Cookie,
  CreditCard,
  Flame,
  GitBranch,
  GitPullRequest,
  Heart,
  Languages,
  Link as LinkIcon,
  Lock,
  LockOpen,
  MapPin,
  MessageCircle,
  MicOff,
  Moon,
  MousePointer2,
  Package,
  Phone,
  PhoneOff,
  Plane,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Snowflake,
  Star,
  Sun,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
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
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(id);
  }, [ms, still]);
  // Read on every render: a gallery learns it is showing stills only after it has mounted.
  return still || done;
}

const SHORT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const compactNumber = (n: number): string => SHORT.format(n);

/**
 * A number that counts up, then shows the exact figure. The spring behind the ticker can come to rest
 * a hair short of a big target, and "$999,999" is not "a million".
 */
function Count({ value, delay, still, compact = false }: { value: number; delay: number; still: boolean; compact?: boolean }) {
  const settled = useLater((delay + 2.2) * 1000, still);
  if (settled) return <>{compact ? SHORT.format(value) : Math.round(value).toLocaleString("en")}</>;
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

    case "timeline": {
      const marks = spec.items.length >= 2 ? spec.items.slice(0, 4) : ["", "", ""];
      const last = marks.length - 1;
      // Each moment sits in a 90 px column, so the track runs between the first and last dot centres.
      const column = "flex w-[90px] justify-center";
      return (
        <motion.div {...enter(still)} className="space-y-3" style={{ width: marks.length * 100 + 40 }}>
          <div className="flex justify-between">
            {marks.map((mark, i) => (
              <motion.div key={i} {...enter(still, 0.3 + i * 0.35, { y: 12 })} className={`${column} text-center text-3xl leading-none font-black`} style={i === last ? { color: "var(--alt)" } : undefined}>
                {mark || <Bar w={56} className="h-4" />}
              </motion.div>
            ))}
          </div>
          <div className="relative flex h-9 items-center justify-between">
            <div className="absolute inset-x-[45px] h-2 rounded-full" style={{ background: "var(--muted)" }} />
            <motion.div
              className="absolute inset-x-[45px] h-2 origin-left rounded-full"
              style={{ background: "var(--alt)" }}
              initial={still ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.35 * marks.length + 0.4, ease: "easeInOut", delay: 0.2 }}
            />
            {marks.map((_, i) => (
              <div key={i} className={column}>
                <motion.span
                  {...enter(still, 0.3 + i * 0.35, { scale: 0.2 })}
                  className="relative block size-9 rounded-full ring-[6px] ring-[var(--bg)]"
                  style={{ background: i === last ? "var(--alt)" : "var(--fg)" }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {marks.map((_, i) => (
              <div key={i} className={column}>
                <Bar w={64} className="opacity-50" />
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    case "terminal": {
      const command = text || "deploy";
      const failed = spec.state === "error";
      const running = spec.state === "loading";
      const typed = still ? command : command.slice(0, Math.max(1, Math.round(command.length * (later ? 1 : 0.35))));
      return (
        <motion.div {...enter(still)}>
          <Card className="min-w-[380px] gap-4 rounded-2xl px-6 py-5 font-mono" style={{ background: "var(--fg)", color: "var(--bg)" }}>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => <span key={i} className="size-3.5 rounded-full" style={{ background: "var(--bg)", opacity: 0.35 }} />)}
            </div>
            <div className="flex items-center gap-3 text-3xl font-bold whitespace-nowrap">
              <span style={{ color: "var(--alt)" }}>$</span>
              <span>{typed}</span>
              {!still && !later ? <motion.span className="h-8 w-3" style={{ background: "var(--bg)" }} animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} /> : null}
            </div>
            <motion.div {...enter(still, 1.2, { y: 6 })} className="flex items-center gap-3 text-3xl font-bold" style={failed ? { color: "var(--alt)" } : undefined}>
              {running ? (
                <motion.span className="flex gap-2" animate={still ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}>
                  {[0, 1, 2].map((i) => <span key={i} className="size-3 rounded-full" style={{ background: "var(--bg)" }} />)}
                </motion.span>
              ) : failed ? (
                <>
                  <X className="size-8" strokeWidth={3} /> failed
                </>
              ) : (
                <>
                  <Check className="size-8" strokeWidth={3} /> done
                </>
              )}
            </motion.div>
          </Card>
        </motion.div>
      );
    }

    case "error": {
      const code = count ? Math.round(count) : 404;
      return (
        <motion.div {...enter(still, 0, { scale: 0.9 })}>
          <Card className="w-[380px] gap-0 overflow-hidden rounded-2xl p-0">
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--secondary)" }}>
              {[0, 1, 2].map((i) => <span key={i} className="size-3 rounded-full" style={{ background: "var(--muted)" }} />)}
              <Bar w={170} className="ml-3" />
            </div>
            <div className="flex flex-col items-center gap-3 px-6 py-8">
              <motion.div
                className="text-8xl leading-none font-black tabular-nums"
                style={{ color: "var(--alt)" }}
                animate={!still && later ? { x: [0, -10, 10, -6, 6, 0], rotate: [0, -3, 3, -1, 0] } : undefined}
                transition={{ duration: 0.55 }}
              >
                {code}
              </motion.div>
              {text ? <div className="text-center text-3xl leading-tight font-black">{text}</div> : <Bar w={170} className="h-4" />}
              <Bar w={120} className="opacity-50" />
            </div>
          </Card>
        </motion.div>
      );
    }

    case "message": {
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[340px] gap-5 rounded-[32px] px-5 py-5">
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: "var(--border)" }}>
              <Avatar className="size-11">
                <AvatarFallback className="text-transparent" style={{ background: "var(--alt)" }}>.</AvatarFallback>
              </Avatar>
              <Bar w={110} className="h-3" />
            </div>
            <div className="flex min-h-[64px] items-end">
              {!still && !later ? (
                <motion.span className="flex gap-1.5 rounded-3xl rounded-bl-md px-5 py-4" style={{ background: "var(--muted)" }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity }}>
                  {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full" style={{ background: "var(--fg)" }} />)}
                </motion.span>
              ) : (
                <motion.div {...enter(still, 0, { scale: 0.5 })} className="max-w-[270px] origin-bottom-left rounded-3xl rounded-bl-md px-5 py-3 text-3xl leading-tight font-black" style={{ background: "var(--muted)" }}>
                  {text || <Bar w={140} className="h-4" />}
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "battery": {
      const pct = Math.max(1, Math.min(100, Math.round(count ?? 2)));
      const low = pct <= 20;
      const charging = spec.state === "loading" || spec.state === "on";
      return (
        <motion.div {...enter(still)} className="flex flex-col items-center gap-5">
          <div className="flex items-center">
            <div className="relative h-[120px] w-[260px] rounded-[28px] border-[8px] p-2" style={{ borderColor: "var(--fg)" }}>
              <motion.div
                className="h-full rounded-[14px]"
                style={{ background: low ? "var(--alt)" : "var(--fg)" }}
                initial={still ? false : { width: charging ? "4%" : "100%" }}
                animate={{ width: `${pct}%`, opacity: low && !still && !charging ? [1, 0.25, 1] : 1 }}
                transition={{ width: { duration: 1.2, ease: "easeInOut" }, opacity: { duration: 0.9, repeat: Infinity, delay: 1.2 } }}
              />
              {charging ? (
                <span className="absolute inset-0 grid place-items-center">
                  <Zap className="size-14" strokeWidth={2.2} style={{ fill: "var(--bg)", color: "var(--fg)" }} />
                </span>
              ) : null}
            </div>
            <span className="ml-1.5 h-12 w-4 rounded-r-lg" style={{ background: "var(--fg)" }} />
          </div>
          <span className="text-6xl font-black tabular-nums" style={low ? { color: "var(--alt)" } : undefined}>{pct}%</span>
        </motion.div>
      );
    }

    case "trend": {
      const down = spec.state === "off" || spec.state === "error" || spec.state === "crossed";
      const pct = Math.round(count ?? 0);
      const line = down ? "M10 30 L70 44 L120 36 L180 86 L230 74 L290 128 L340 152" : "M10 150 L70 128 L120 138 L180 92 L230 104 L290 46 L340 20";
      const end = down ? { cx: 340, cy: 152 } : { cx: 340, cy: 20 };
      const Arrow = down ? ArrowDownRight : ArrowUpRight;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[400px] gap-4 rounded-3xl px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <span className="space-y-2">
                {text ? <span className="block text-3xl leading-tight font-black">{text}</span> : <Bar w={120} className="h-4" />}
                <Bar w={80} className="opacity-50" />
              </span>
              <span className="flex items-center gap-1 text-4xl font-black whitespace-nowrap tabular-nums" style={{ color: "var(--alt)" }}>
                <Arrow className="size-9" strokeWidth={3} />
                {pct ? (
                  <>
                    {down ? "-" : "+"}
                    <Count value={pct} delay={0.4} still={still} />%
                  </>
                ) : null}
              </span>
            </div>
            <svg viewBox="0 0 350 170" className="h-[150px] w-full overflow-visible" aria-hidden>
              {[40, 90, 140].map((y) => <line key={y} x1="0" x2="350" y1={y} y2={y} stroke="var(--muted)" strokeWidth="2" strokeDasharray="6 8" />)}
              <motion.path d={line} fill="none" stroke="var(--alt)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: "easeInOut", delay: 0.2 }} />
              <motion.circle {...end} r="13" fill="var(--alt)" initial={still ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 16, delay: 1.45 }} />
            </svg>
          </Card>
        </motion.div>
      );
    }

    case "leaderboard": {
      const names = spec.items.length ? spec.items.slice(0, 4) : ["", "", ""];
      return (
        <Card className="w-[340px] gap-2.5 rounded-3xl px-5 py-5">
          {names.map((name, i) => (
            // From the bottom up: the winner is revealed last.
            <motion.div
              key={i}
              {...enter(still, 0.2 + (names.length - 1 - i) * 0.3, { x: -40 })}
              className="flex h-14 items-center gap-4 rounded-2xl px-4"
              style={i === 0 ? { background: "var(--alt)", color: "var(--bg)" } : { background: "var(--muted)" }}
            >
              <span className="w-6 text-2xl font-black tabular-nums">{i + 1}</span>
              {name ? <span className="flex-1 truncate text-2xl font-black">{name}</span> : <Bar w={150 - i * 22} className={i === 0 ? "bg-[var(--bg)] opacity-60" : ""} />}
              {i === 0 ? <Trophy className="ml-auto size-7" strokeWidth={2.4} /> : null}
            </motion.div>
          ))}
        </Card>
      );
    }

    case "timer": {
      const n = Math.max(1, Math.round(count ?? 60));
      const up = spec.state === "done" || spec.state === "error" || spec.state === "empty";
      return (
        <motion.div {...enter(still)} className="relative grid size-[250px] place-items-center">
          <svg viewBox="0 0 220 220" className="absolute inset-0 size-full -rotate-90" aria-hidden>
            <circle cx="110" cy="110" r="92" fill="none" stroke="var(--muted)" strokeWidth="18" />
            <motion.circle
              cx="110"
              cy="110"
              r="92"
              fill="none"
              stroke="var(--alt)"
              strokeWidth="18"
              strokeLinecap="round"
              initial={still ? false : { pathLength: 1 }}
              animate={{ pathLength: up ? 0 : 0.2 }}
              transition={{ duration: 2.6, ease: "linear", delay: 0.3 }}
            />
          </svg>
          <div className="relative text-center">
            <motion.div
              className="text-7xl leading-none font-black tabular-nums"
              style={up ? { color: "var(--alt)" } : undefined}
              animate={up && !still && later ? { scale: [1, 1.14, 1] } : undefined}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
            >
              {up ? 0 : n}
            </motion.div>
            {text ? <div className="mt-1 text-2xl font-black">{text}</div> : null}
          </div>
        </motion.div>
      );
    }

    case "signal": {
      const lost = spec.state === "off" || spec.state === "error" || spec.state === "empty" || spec.state === "crossed";
      // Arcs of radius 120, 80 and 40 around the dot, 45 degrees either side of straight up.
      const arcs = ["M25.1 85.1 A120 120 0 0 1 194.9 85.1", "M53.4 113.4 A80 80 0 0 1 166.6 113.4", "M81.7 141.7 A40 40 0 0 1 138.3 141.7"];
      return (
        <motion.div {...enter(still)} className="flex flex-col items-center gap-4">
          <svg viewBox="0 0 220 200" className="h-[200px] w-[220px] overflow-visible" aria-hidden>
            {arcs.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="none"
                strokeWidth="20"
                strokeLinecap="round"
                stroke={lost ? "var(--muted)" : "var(--fg)"}
                initial={still ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.15 + (arcs.length - 1 - i) * 0.22 }}
              />
            ))}
            <circle cx="110" cy="170" r="15" fill={lost ? "var(--muted)" : "var(--fg)"} />
            {lost ? (
              <motion.path d="M28 28 L192 192" stroke="var(--alt)" strokeWidth="20" strokeLinecap="round" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.95 }} />
            ) : null}
          </svg>
          {text ? <span className="text-4xl font-black">{text}</span> : null}
        </motion.div>
      );
    }

    case "post": {
      const n = count ?? 12_400;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[360px] gap-4 rounded-3xl px-6 py-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-11">
                <AvatarFallback className="text-transparent" style={{ background: "var(--alt)" }}>.</AvatarFallback>
              </Avatar>
              <span className="space-y-1.5">
                <Bar w={110} className="h-3" />
                <Bar w={70} className="opacity-50" />
              </span>
            </div>
            {text ? (
              <div className="text-3xl leading-tight font-black">{text}</div>
            ) : (
              <span className="space-y-2.5">
                <Bar w={270} className="h-3.5" />
                <Bar w={200} className="h-3.5" />
              </span>
            )}
            <div className="flex items-center gap-6 text-2xl font-black">
              <span className="flex items-center gap-2 tabular-nums" style={{ color: "var(--alt)" }}>
                <Heart className="size-7" style={{ fill: "var(--alt)" }} />
                <Count value={n} delay={0.5} still={still} compact />
              </span>
              <span className="flex items-center gap-2 opacity-60"><Repeat2 className="size-7" /><Bar w={34} /></span>
              <span className="flex items-center gap-2 opacity-60"><MessageCircle className="size-7" /><Bar w={28} /></span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "pricing": {
      const tiers = spec.items.length >= 2 ? spec.items.slice(0, 3) : ["Free", "Pro", "Team"];
      const pick = Math.min(1, tiers.length - 1);
      return (
        <div className="flex items-end gap-3">
          {tiers.map((tier, i) => (
            <motion.div key={i} {...enter(still, 0.15 + i * 0.2, { y: 30 })}>
              <Card className={`items-center gap-3 rounded-2xl px-5 ${i === pick ? "w-[150px] py-6" : "w-[120px] py-4"}`} style={i === pick ? { boxShadow: "0 0 0 3px var(--alt)" } : undefined}>
                <span className={`text-center leading-tight font-black ${i === pick ? "text-2xl" : "text-lg"}`}>{tier}</span>
                {i === pick && count ? <span className="text-4xl font-black tabular-nums whitespace-nowrap">${compactNumber(count)}</span> : <Bar w={54} className="h-3.5" />}
                <Bar w={70} className="opacity-50" />
                <Bar w={60} className="opacity-50" />
                {i === pick ? <Button className="mt-1 h-9 w-full rounded-lg text-sm font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>Pick</Button> : <Bar w={80} className="mt-1 h-7 rounded-lg opacity-40" />}
              </Card>
            </motion.div>
          ))}
        </div>
      );
    }

    case "merge": {
      const merged = spec.state !== "error" && spec.state !== "crossed";
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[360px] gap-4 rounded-2xl px-6 py-5">
            <div className="flex items-center gap-3">
              <GitPullRequest className="size-7 shrink-0" strokeWidth={2.4} style={{ color: merged ? "var(--alt)" : "var(--muted-foreground)" }} />
              <span className="space-y-1.5">
                {text ? <span className="block text-2xl leading-tight font-black">{text}</span> : <Bar w={190} className="h-4" />}
                <Bar w={110} className="opacity-50" />
              </span>
            </div>
            <svg viewBox="0 0 300 60" className="h-[60px] w-full" aria-hidden>
              <line x1="20" y1="48" x2="280" y2="48" stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" />
              <motion.path d="M20 12 H150 C 200 12, 200 48, 250 48" fill="none" stroke="var(--alt)" strokeWidth="6" strokeLinecap="round" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: merged ? 1 : 0.55 }} transition={{ duration: 0.9, delay: 0.3, ease: "easeInOut" }} />
              <circle cx="20" cy="12" r="9" fill="var(--alt)" />
              <circle cx="20" cy="48" r="9" fill="var(--muted-foreground)" />
              <motion.circle cx="250" cy="48" r="11" fill={merged ? "var(--alt)" : "var(--muted)"} initial={still ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 16, delay: 1.1 }} />
            </svg>
            <motion.div {...enter(still, 1.2, { y: 6 })}>
              <Badge className="h-9 rounded-full px-4 text-base font-black" style={merged ? { background: "var(--alt)", color: "var(--bg)" } : { background: "var(--muted)", color: "var(--fg)" }}>
                {merged ? <><Check className="size-4" strokeWidth={3} /> Merged</> : <><X className="size-4" strokeWidth={3} /> Changes requested</>}
              </Badge>
            </motion.div>
          </Card>
        </motion.div>
      );
    }

    case "stars": {
      const n = count ?? 10_000;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[360px] gap-4 rounded-2xl px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg" style={{ background: "var(--muted)" }}><GitBranch className="size-5" /></span>
              {text ? <span className="truncate text-2xl font-black">{text}</span> : <Bar w={170} className="h-4" />}
            </div>
            <Bar w={240} className="opacity-50" />
            <div className="flex items-center gap-3">
              <motion.span animate={!still && later ? { scale: [1, 1.25, 1], rotate: [0, -12, 0] } : undefined} transition={{ duration: 0.5 }}>
                <Button className="h-12 rounded-xl px-4 text-xl font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>
                  <Star className="size-6" style={{ fill: "var(--bg)" }} /> Star
                </Button>
              </motion.span>
              <span className="text-4xl font-black tabular-nums"><Count value={n} delay={0.5} still={still} compact /></span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "call": {
      const declined = spec.state === "crossed" || spec.state === "off";
      return (
        <motion.div {...enter(still, 0, { y: 40 })} animate={!still && !later ? { opacity: 1, y: 0, x: [0, -3, 3, -3, 3, 0] } : { opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.5, repeat: still || later ? 0 : Infinity, repeatDelay: 0.3 }}>
          <Card className="w-[300px] items-center gap-5 rounded-[32px] px-6 py-7">
            <Avatar className="size-20">
              <AvatarFallback className="text-3xl font-black" style={{ background: "var(--muted)" }}>{(text || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-center">
              {text ? <span className="block text-3xl leading-tight font-black">{text}</span> : <Bar w={120} className="h-4" />}
              <span className="mt-1 block text-base font-bold opacity-60">{declined && later ? "Declined" : "Incoming call"}</span>
            </span>
            <div className="flex gap-8">
              <span className="grid size-16 place-items-center rounded-full" style={{ background: declined ? "var(--alt)" : "var(--muted)", color: declined ? "var(--bg)" : "var(--fg)" }}><PhoneOff className="size-7" /></span>
              <span className="grid size-16 place-items-center rounded-full" style={{ background: declined ? "var(--muted)" : "var(--alt)", color: declined ? "var(--fg)" : "var(--bg)", opacity: declined && later ? 0.3 : 1 }}><Phone className="size-7" /></span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "playing": {
      const bars = [18, 34, 26, 44, 30, 50, 22, 40, 28, 46, 20, 36, 24, 42, 32, 48, 26, 38, 22, 30];
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[360px] gap-4 rounded-3xl px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: "var(--alt)", color: "var(--bg)" }}><Play className="size-6" style={{ fill: "currentColor" }} /></span>
              <span className="min-w-0 space-y-1.5">
                {text ? <span className="block truncate text-2xl leading-tight font-black">{text}</span> : <Bar w={170} className="h-4" />}
                <Bar w={90} className="opacity-50" />
              </span>
            </div>
            <div className="flex h-14 items-center gap-1">
              {bars.map((h, i) => (
                <motion.span
                  key={i}
                  className="w-2.5 rounded-full"
                  style={{ background: i < 9 ? "var(--alt)" : "var(--muted)", height: h }}
                  animate={still ? undefined : { scaleY: [1, 0.5 + ((i * 7) % 5) / 5, 1] }}
                  transition={{ duration: 0.8 + (i % 3) * 0.2, repeat: Infinity, delay: i * 0.05 }}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "video": {
      const n = count ?? 0;
      return (
        <motion.div {...enter(still)} className="w-[380px] space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-2xl" style={{ background: "var(--fg)" }}>
            <div className="absolute inset-0 opacity-25" style={{ background: "repeating-linear-gradient(135deg, var(--bg) 0 14px, transparent 14px 28px)" }} />
            <motion.span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full" style={{ background: "var(--alt)", color: "var(--bg)" }} animate={!still && later ? { scale: [1, 1.15, 1] } : undefined} transition={{ duration: 0.5 }}>
              <Play className="ml-1 size-9" style={{ fill: "currentColor" }} />
            </motion.span>
            <div className="absolute inset-x-4 bottom-3 h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
              <motion.div className="h-full rounded-full" style={{ background: "var(--alt)" }} initial={still ? false : { width: "0%" }} animate={{ width: "38%" }} transition={{ duration: 1.4, delay: 0.4 }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-1">
            {text ? <span className="truncate text-2xl font-black">{text}</span> : <Bar w={180} className="h-4" />}
            {n ? <span className="shrink-0 text-xl font-black tabular-nums"><Count value={n} delay={0.6} still={still} compact /> views</span> : null}
          </div>
        </motion.div>
      );
    }

    case "tabs": {
      const n = Math.max(2, Math.round(count ?? 47));
      const shown = Math.min(n, 14);
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[400px] gap-0 overflow-hidden rounded-2xl p-0">
            <div className="flex items-end gap-0.5 px-3 pt-3" style={{ background: "var(--secondary)" }}>
              {Array.from({ length: shown }, (_, i) => (
                <motion.span key={i} {...enter(still, 0.1 + i * 0.05, { y: 10 })} className="h-8 rounded-t-lg" style={{ width: Math.max(14, 160 / Math.sqrt(shown)), background: i === 2 ? "var(--card)" : "var(--muted)", opacity: i === 2 ? 1 : 0.7 }} />
              ))}
            </div>
            <div className="flex items-center gap-3 px-5 py-5">
              <span className="text-6xl font-black tabular-nums" style={{ color: "var(--alt)" }}><Count value={n} delay={0.4} still={still} /></span>
              <span className="text-2xl leading-tight font-black">{text || "tabs open"}</span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "cookie": {
      return (
        <motion.div {...enter(still, 0, { y: 60 })}>
          <Card className="w-[400px] gap-4 rounded-2xl px-6 py-5">
            <div className="flex items-center gap-3">
              <Cookie className="size-8 shrink-0" style={{ color: "var(--alt)" }} />
              <span className="text-2xl leading-tight font-black">{text || "We use cookies"}</span>
            </div>
            <Bar w={300} className="opacity-50" />
            <Bar w={220} className="opacity-50" />
            <div className="flex gap-3">
              <Button variant="secondary" className="h-11 flex-1 rounded-xl text-base font-black opacity-50">Manage</Button>
              <motion.div className="flex-1" animate={!still && later ? { scale: [1, 1.06, 1] } : undefined} transition={{ duration: 0.4 }}>
                <Button className="h-11 w-full rounded-xl text-base font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>Accept all</Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "captcha": {
      const failed = spec.state === "error" || spec.state === "crossed";
      return (
        <motion.div {...enter(still)} animate={failed && later && !still ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] } : { opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="w-[360px] gap-4 rounded-2xl px-6 py-5">
            <div className="flex items-center gap-4">
              <motion.span className="grid size-12 shrink-0 place-items-center rounded-lg border-2" style={{ borderColor: failed ? "var(--alt)" : "var(--fg)" }} animate={!still && later && !failed ? { scale: [1, 0.9, 1] } : undefined}>
                {later || still ? (failed ? <X className="size-8" strokeWidth={3} style={{ color: "var(--alt)" }} /> : <Check className="size-8" strokeWidth={3} style={{ color: "var(--alt)" }} />) : null}
              </motion.span>
              <span className="text-2xl leading-tight font-black">{text || "I am not a robot"}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="h-12 rounded-md" style={{ background: "var(--muted)", opacity: [1, 4, 6].includes(i) ? 1 : 0.45 }} />
              ))}
            </div>
            <Bar w={160} className="opacity-50" />
          </Card>
        </motion.div>
      );
    }

    case "update": {
      return (
        <motion.div {...enter(still, 0, { scale: 0.9 })}>
          <Card className="w-[340px] items-center gap-4 rounded-3xl px-6 py-7 text-center">
            <motion.span animate={still ? undefined : { rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}>
              <RefreshCw className="size-14" strokeWidth={2.4} style={{ color: "var(--alt)" }} />
            </motion.span>
            <span className="text-3xl leading-tight font-black">{text || "Update available"}</span>
            <Bar w={180} className="opacity-50" />
            <div className="flex w-full gap-3">
              <Button variant="secondary" className="h-11 flex-1 rounded-xl text-base font-black opacity-60">Later</Button>
              <Button className="h-11 flex-1 rounded-xl text-base font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>Restart now</Button>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "dial": {
      const level = Math.max(0, Math.min(11, Math.round(count ?? 11)));
      const angle = -135 + (level / 11) * 270;
      return (
        <motion.div {...enter(still)} className="flex items-center gap-6">
          <div className="relative size-[200px]">
            <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => {
                const a = ((-135 + (i / 11) * 270) * Math.PI) / 180;
                const lit = i <= level;
                return <circle key={i} cx={100 + Math.sin(a) * 90} cy={100 - Math.cos(a) * 90} r={lit ? 7 : 4.5} fill={lit ? "var(--alt)" : "var(--muted)"} />;
              })}
              <circle cx="100" cy="100" r="62" fill="var(--card)" stroke="var(--fg)" strokeWidth="6" />
            </svg>
            {/* The needle is a plain element turned about its foot: an SVG line and a transform origin do not agree. */}
            <motion.span
              className="absolute left-1/2 top-1/2 block h-[56px] w-2.5 rounded-full"
              style={{ background: "var(--alt)", translate: "-50% -100%", transformOrigin: "50% 100%" }}
              initial={still ? false : { rotate: -135 }}
              animate={{ rotate: angle }}
              transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.3 }}
            />
            <span className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "var(--fg)" }} />
          </div>
          <div>
            <div className="text-7xl font-black tabular-nums leading-none">{level}</div>
            {text ? <div className="mt-2 text-2xl font-black opacity-70">{text}</div> : null}
          </div>
        </motion.div>
      );
    }

    case "table": {
      const n = count ?? 10_000;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[400px] gap-0 overflow-hidden rounded-2xl p-0">
            <div className="grid grid-cols-4 gap-px p-px" style={{ background: "var(--border)" }}>
              {Array.from({ length: 24 }, (_, i) => (
                <motion.span key={i} {...enter(still, 0.05 + Math.floor(i / 4) * 0.08, { y: 4 })} className="flex h-9 items-center px-2" style={{ background: i < 4 ? "var(--secondary)" : "var(--card)" }}>
                  <Bar w={i % 4 === 0 ? 22 : 40 + ((i * 13) % 30)} className={i < 4 ? "" : "opacity-50"} />
                </motion.span>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "var(--secondary)" }}>
              <span className="text-2xl font-black">{text || "rows"}</span>
              <span className="text-4xl font-black tabular-nums" style={{ color: "var(--alt)" }}><Count value={n} delay={0.5} still={still} compact /></span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "kanban": {
      const done = spec.state === "done" || spec.state === "on";
      const columns = ["To do", "Doing", "Done"];
      const target = done ? 2 : 1;
      return (
        <div className="flex gap-3">
          {columns.map((name, c) => (
            <motion.div key={c} {...enter(still, 0.1 + c * 0.12, { y: 20 })}>
              <Card className="min-h-[220px] w-[130px] gap-2 rounded-2xl px-3 py-3" style={{ background: "var(--secondary)" }}>
                <span className="px-1 text-sm font-black uppercase opacity-60">{name}</span>
                {c === 0 ? [0, 1].map((i) => <span key={i} className="h-10 rounded-lg" style={{ background: "var(--card)" }} />) : null}
                {c === target ? (
                  <motion.span layoutId="kanban-card" initial={still ? false : { x: -140, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.8 }} className="flex min-h-12 items-center rounded-lg px-2 text-base leading-tight font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>
                    {text || <Bar w={70} className="bg-[var(--bg)] opacity-60" />}
                  </motion.span>
                ) : null}
                {c === 2 && !done ? <span className="h-10 rounded-lg" style={{ background: "var(--card)" }} /> : null}
              </Card>
            </motion.div>
          ))}
        </div>
      );
    }

    case "receipt": {
      const n = count ?? 0;
      return (
        <motion.div {...enter(still, 0, { y: -40 })}>
          <div className="w-[300px] px-6 py-6 font-mono" style={{ background: "#fff", color: "#111", clipPath: "polygon(0 0, 100% 0, 100% 96%, 95% 100%, 90% 96%, 85% 100%, 80% 96%, 75% 100%, 70% 96%, 65% 100%, 60% 96%, 55% 100%, 50% 96%, 45% 100%, 40% 96%, 35% 100%, 30% 96%, 25% 100%, 20% 96%, 15% 100%, 10% 96%, 5% 100%, 0 96%)" }}>
            <div className="mb-4 text-center text-lg font-black uppercase tracking-widest">{text || "Receipt"}</div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mb-2 flex justify-between gap-3">
                <Bar w={80 + ((i * 29) % 50)} className="bg-[#111] opacity-30" />
                <Bar w={34} className="bg-[#111] opacity-30" />
              </div>
            ))}
            <div className="my-3 border-t-2 border-dashed border-[#111]" />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-black uppercase">Total</span>
              <span className="text-4xl font-black tabular-nums">${n ? <Count value={n} delay={0.4} still={still} /> : "---"}</span>
            </div>
          </div>
        </motion.div>
      );
    }

    case "ticket": {
      return (
        <motion.div {...enter(still, 0, { y: 30 })} className="rotate-[-3deg]">
          <Card className="w-[400px] flex-row gap-0 overflow-hidden rounded-2xl p-0">
            <div className="flex flex-1 flex-col gap-3 px-5 py-5">
              <span className="text-xs font-black uppercase tracking-widest opacity-50">Boarding pass</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black">{spec.items[0] || "HERE"}</span>
                <Plane className="size-7 shrink-0" style={{ color: "var(--alt)" }} />
                <span className="text-3xl font-black">{text || spec.items[1] || "THERE"}</span>
              </div>
              <div className="flex gap-6">
                <span className="space-y-1"><Bar w={40} className="opacity-40" /><Bar w={56} /></span>
                <span className="space-y-1"><Bar w={40} className="opacity-40" /><Bar w={44} /></span>
                <span className="space-y-1"><Bar w={40} className="opacity-40" /><Bar w={30} /></span>
              </div>
            </div>
            <div className="flex w-[110px] flex-col items-center justify-center gap-2 border-l-2 border-dashed px-3" style={{ borderColor: "var(--border)", background: "var(--alt)", color: "var(--bg)" }}>
              <span className="text-xs font-black uppercase">Gate</span>
              <span className="text-4xl font-black tabular-nums">{count ? Math.round(count) : "7"}</span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "weather": {
      const word = text.toLowerCase();
      const kind = /rain|regn|wet|storm|pour/.test(word) ? "rain" : /snow|snö|cold|ice/.test(word) ? "snow" : /cloud|grey|gray|moln/.test(word) ? "cloud" : "sun";
      const Icon = kind === "rain" ? CloudRain : kind === "snow" ? Snowflake : kind === "cloud" ? Cloud : Sun;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[320px] items-center gap-3 rounded-3xl px-6 py-7">
            <motion.span animate={still ? undefined : kind === "sun" ? { rotate: 360 } : { y: [0, -6, 0] }} transition={kind === "sun" ? { duration: 12, repeat: Infinity, ease: "linear" } : { duration: 2.2, repeat: Infinity }}>
              <Icon className="size-24" strokeWidth={1.8} style={{ color: "var(--alt)", fill: kind === "sun" ? "var(--alt)" : "none" }} />
            </motion.span>
            <span className="text-4xl font-black">{text || "Sunny"}</span>
            {count ? <span className="text-6xl font-black tabular-nums">{Math.round(count)}°</span> : <Bar w={120} className="opacity-50" />}
          </Card>
        </motion.div>
      );
    }

    case "clock": {
      const hour = count ? Math.round(count) % 24 : 3;
      const pm = /pm|kväll|evening|night|natt/i.test(text) || hour >= 12;
      const h12 = hour % 12 || 12;
      const night = hour >= 21 || hour < 6;
      return (
        <motion.div {...enter(still)} className="flex items-center gap-6">
          <div className="relative size-[200px] rounded-full border-[10px]" style={{ borderColor: "var(--fg)", background: "var(--card)" }}>
            <motion.span className="absolute left-1/2 top-1/2 h-[64px] w-2.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full" style={{ background: "var(--fg)" }} initial={still ? false : { rotate: 0 }} animate={{ rotate: (h12 % 12) * 30 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
            <span className="absolute left-1/2 top-1/2 h-[80px] w-1.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full" style={{ background: "var(--alt)" }} />
            <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "var(--alt)" }} />
          </div>
          <div>
            <div className="text-6xl font-black tabular-nums leading-none">{h12}:00</div>
            <div className="mt-2 flex items-center gap-2 text-2xl font-black opacity-70">{night ? <Moon className="size-6" /> : <Sun className="size-6" />} {pm ? "pm" : "am"}</div>
          </div>
        </motion.div>
      );
    }

    case "lock": {
      const open = spec.state === "crossed" || spec.state === "off" || spec.state === "error";
      const Icon = open ? LockOpen : Lock;
      return (
        <motion.div {...enter(still)} className="flex flex-col items-center gap-4">
          <motion.span className="grid size-36 place-items-center rounded-[36px]" style={{ background: open ? "var(--alt)" : "var(--card)", color: open ? "var(--bg)" : "var(--fg)" }} animate={!still && later && open ? { rotate: [0, -6, 6, -4, 4, 0] } : undefined} transition={{ duration: 0.5 }}>
            <Icon className="size-20" strokeWidth={2.2} />
          </motion.span>
          <span className="text-4xl font-black">{text || (open ? "Open" : "Locked")}</span>
        </motion.div>
      );
    }

    case "link": {
      return (
        <motion.div {...enter(still, 0, { scale: 0.9 })}>
          <Card className="w-[380px] flex-row items-center gap-5 rounded-3xl px-6 py-6">
            <div className="grid shrink-0 grid-cols-7 gap-0.5 rounded-lg p-2" style={{ background: "#fff" }}>
              {Array.from({ length: 49 }, (_, i) => (
                <span key={i} className="size-2.5" style={{ background: (i * 7919) % 11 < 5 || [0, 1, 2, 7, 14, 4, 5, 6, 13, 20, 28, 35, 42, 43, 44].includes(i) ? "#111" : "#fff" }} />
              ))}
            </div>
            <span className="min-w-0 space-y-2">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60"><LinkIcon className="size-4" /> Link</span>
              {text ? <span className="block break-words text-2xl leading-tight font-black" style={{ color: "var(--alt)" }}>{text}</span> : <Bar w={160} className="h-4" />}
            </span>
          </Card>
        </motion.div>
      );
    }

    case "temperature": {
      const deg = Math.round(count ?? 40);
      const hot = deg >= 30;
      const fill = Math.max(8, Math.min(100, ((deg + 20) / 70) * 100));
      return (
        <motion.div {...enter(still)} className="flex items-center gap-6">
          <div className="relative flex h-[220px] w-14 flex-col items-center">
            <div className="relative h-[170px] w-6 overflow-hidden rounded-full border-[5px]" style={{ borderColor: "var(--fg)", background: "var(--card)" }}>
              <motion.div className="absolute inset-x-0 bottom-0" style={{ background: hot ? "var(--alt)" : "var(--fg)" }} initial={still ? false : { height: "8%" }} animate={{ height: `${fill}%` }} transition={{ duration: 1.3, ease: "easeOut", delay: 0.2 }} />
            </div>
            <span className="-mt-3 size-14 rounded-full border-[5px]" style={{ borderColor: "var(--fg)", background: hot ? "var(--alt)" : "var(--fg)" }} />
          </div>
          <div>
            <div className="text-7xl font-black tabular-nums leading-none" style={hot ? { color: "var(--alt)" } : undefined}><Count value={deg} delay={0.3} still={still} />°</div>
            {text ? <div className="mt-2 text-2xl font-black opacity-70">{text}</div> : null}
          </div>
        </motion.div>
      );
    }

    case "mute": {
      return (
        <motion.div {...enter(still)} className="flex flex-col items-center gap-4">
          <motion.span className="relative grid size-36 place-items-center rounded-full" style={{ background: "var(--card)" }} animate={!still && later ? { scale: [1, 1.08, 1] } : undefined} transition={{ duration: 0.4 }}>
            <MicOff className="size-20" strokeWidth={2.2} style={{ color: later || still ? "var(--alt)" : "var(--fg)" }} />
          </motion.span>
          <span className="text-4xl font-black">{text || "You're on mute"}</span>
        </motion.div>
      );
    }

    case "meeting": {
      const n = Math.max(1, Math.round(count ?? 4));
      const waiting = spec.state === "loading" || spec.state === "empty";
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[380px] gap-3 rounded-2xl px-4 py-4" style={{ background: "var(--fg)", color: "var(--bg)" }}>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <motion.div key={i} {...enter(still, 0.1 + i * 0.12, { scale: 0.8 })} className="relative grid aspect-video place-items-center rounded-lg" style={{ background: "color-mix(in srgb, var(--bg) 18%, var(--fg))" }}>
                  {i < Math.min(n, 4) && !(waiting && i > 0) ? (
                    <Avatar className="size-12"><AvatarFallback className="text-transparent" style={{ background: i % 2 ? "var(--alt)" : "var(--bg)" }}>.</AvatarFallback></Avatar>
                  ) : (
                    <span className="size-12 rounded-full" style={{ background: "color-mix(in srgb, var(--bg) 30%, var(--fg))" }} />
                  )}
                  {i === 0 ? <span className="absolute right-1.5 top-1.5 size-3 rounded-full" style={{ background: "var(--alt)" }} /> : null}
                </motion.div>
              ))}
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-xl font-black">{waiting ? text || "Waiting for the host" : text || "Meeting"}</span>
              {waiting ? (
                <motion.span className="flex gap-1" animate={still ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full" style={{ background: "var(--bg)" }} />)}
                </motion.span>
              ) : (
                <span className="text-xl font-black tabular-nums" style={{ color: "var(--alt)" }}><Count value={n} delay={0.5} still={still} /> here</span>
              )}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "streak": {
      const n = Math.max(1, Math.round(count ?? 47));
      return (
        <motion.div {...enter(still)} className="flex items-center gap-5">
          <motion.span animate={still ? undefined : { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }} transition={{ duration: 1.1, repeat: Infinity }}>
            <Flame className="size-28" strokeWidth={2} style={{ color: "var(--alt)", fill: "var(--alt)" }} />
          </motion.span>
          <span>
            <span className="block text-7xl font-black tabular-nums leading-none"><Count value={n} delay={0.3} still={still} /></span>
            <span className="mt-1 block text-2xl font-black opacity-70">{text || "day streak"}</span>
          </span>
        </motion.div>
      );
    }

    case "badge": {
      return (
        <motion.div {...enter(still, 0, { scale: 0.6 })}>
          <Card className="w-[340px] items-center gap-3 rounded-3xl px-6 py-7 text-center">
            <motion.span className="grid size-24 place-items-center rounded-full" style={{ background: "var(--alt)", color: "var(--bg)" }} animate={!still && later ? { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] } : undefined} transition={{ duration: 0.6 }}>
              <Award className="size-14" strokeWidth={2.2} />
            </motion.span>
            <span className="text-xs font-black uppercase tracking-widest opacity-60">Unlocked</span>
            <span className="text-3xl leading-tight font-black">{text || "Achievement"}</span>
            <Bar w={150} className="opacity-50" />
          </Card>
        </motion.div>
      );
    }

    case "declined": {
      const ok = spec.state === "done" || spec.state === "on";
      return (
        <motion.div {...enter(still, 0, { y: 30 })} animate={!ok && later && !still ? { opacity: 1, y: 0, x: [0, -9, 9, -6, 6, 0] } : { opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative h-[210px] w-[340px] rounded-3xl p-6" style={{ background: "var(--fg)", color: "var(--bg)" }}>
            <div className="flex items-start justify-between">
              <CreditCard className="size-9" />
              <Bar w={60} className="bg-[var(--bg)] opacity-40" />
            </div>
            <div className="mt-9 flex gap-3 text-xl font-black tracking-widest opacity-70">
              <span>••••</span><span>••••</span><span>••••</span><span>4242</span>
            </div>
            <div className="mt-5 text-lg font-black">{text || "Card"}</div>
            <motion.span
              className="absolute right-5 top-14 rounded-lg border-4 px-3 py-1 text-3xl font-black uppercase tracking-wide"
              style={{ borderColor: "var(--alt)", color: "var(--alt)", rotate: "-12deg", background: "var(--fg)" }}
              initial={still ? false : { opacity: 0, scale: 1.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.7 }}
            >
              {ok ? "Approved" : "Declined"}
            </motion.span>
          </div>
        </motion.div>
      );
    }

    case "waitlist": {
      const n = Math.max(1, Math.round(count ?? 4021));
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[380px] gap-4 rounded-2xl px-6 py-6">
            <span className="text-xs font-black uppercase tracking-widest opacity-60">{text || "Waitlist"}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black opacity-60">#</span>
              <span className="text-6xl font-black tabular-nums leading-none" style={{ color: "var(--alt)" }}><Count value={n} delay={0.3} still={still} /></span>
              <span className="text-2xl font-black opacity-60">in line</span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 14 }, (_, i) => (
                <motion.span key={i} {...enter(still, 0.4 + i * 0.05, { scale: 0.3 })} className="size-4 rounded-full" style={{ background: i === 13 ? "var(--alt)" : "var(--muted)" }} />
              ))}
              <span className="ml-1 text-sm font-black opacity-60">you</span>
            </div>
          </Card>
        </motion.div>
      );
    }

    case "soldout": {
      return (
        <motion.div {...enter(still, 0, { y: 30 })}>
          <Card className="relative w-[320px] gap-3 overflow-hidden rounded-2xl px-6 py-6">
            <div className="h-28 rounded-xl" style={{ background: "var(--muted)" }} />
            <span className="text-2xl leading-tight font-black">{text || "Tickets"}</span>
            <div className="flex items-center justify-between">
              {count ? <span className="text-2xl font-black tabular-nums line-through opacity-50">${compactNumber(count)}</span> : <Bar w={70} className="h-4" />}
              <Bar w={90} className="h-8 rounded-lg opacity-30" />
            </div>
            <motion.span
              className="absolute left-1/2 top-1/2 rounded-lg border-[5px] px-4 py-1 text-4xl font-black uppercase tracking-widest"
              style={{ borderColor: "var(--alt)", color: "var(--alt)", background: "var(--card)", translate: "-50% -50%", rotate: "-14deg" }}
              initial={still ? false : { opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.6 }}
            >
              Sold out
            </motion.span>
          </Card>
        </motion.div>
      );
    }

    case "delivery": {
      const delivered = spec.state === "done" || spec.state === "on";
      const steps = ["Ordered", "On its way", "Delivered"];
      const at = delivered ? 2 : 1;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[400px] gap-5 rounded-2xl px-6 py-6">
            <div className="flex items-center gap-3">
              <Package className="size-8 shrink-0" style={{ color: "var(--alt)" }} />
              {text ? <span className="truncate text-2xl font-black">{text}</span> : <Bar w={180} className="h-4" />}
            </div>
            <div className="relative h-2 rounded-full" style={{ background: "var(--muted)" }}>
              <motion.div className="h-full rounded-full" style={{ background: "var(--alt)" }} initial={still ? false : { width: "0%" }} animate={{ width: `${(at / 2) * 100}%` }} transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }} />
              <motion.span className="absolute top-1/2 -translate-y-1/2" initial={still ? false : { left: "0%" }} animate={{ left: `${(at / 2) * 100}%` }} transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}>
                <span className="grid size-10 -translate-x-1/2 place-items-center rounded-full" style={{ background: "var(--alt)", color: "var(--bg)" }}>
                  {delivered ? <Check className="size-5" strokeWidth={3} /> : <Truck className="size-5" />}
                </span>
              </motion.span>
            </div>
            <div className="flex justify-between text-sm font-black">
              {steps.map((s, i) => <span key={s} style={{ opacity: i <= at ? 1 : 0.35, color: i === at ? "var(--alt)" : undefined }}>{s}</span>)}
            </div>
          </Card>
        </motion.div>
      );
    }

    case "followers": {
      const n = count ?? 10_000;
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[340px] items-center gap-3 rounded-3xl px-6 py-6">
            <Avatar className="size-20 ring-4 ring-[var(--alt)]">
              <AvatarFallback className="text-3xl font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>{(text || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            {text ? <span className="text-2xl font-black">{text}</span> : <Bar w={120} className="h-4" />}
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums leading-none"><Count value={n} delay={0.4} still={still} compact /></span>
              <span className="pb-1 text-lg font-black opacity-60">followers</span>
            </div>
            <motion.div {...enter(still, 1.2, { y: 8 })}>
              <Badge className="h-8 rounded-full px-3 text-base font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}><UserPlus className="size-4" /> +{compactNumber(Math.max(1, Math.round(n / 20)))} today</Badge>
            </motion.div>
          </Card>
        </motion.div>
      );
    }

    case "translate": {
      const [from, to] = [spec.items[0] || text || "Hej", spec.items[1] || (spec.items[0] ? text : "") || "Hello"];
      return (
        <motion.div {...enter(still)}>
          <Card className="w-[380px] gap-4 rounded-2xl px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60"><Languages className="size-4" /> Translate</div>
            <div className="rounded-xl px-4 py-3 text-3xl font-black" style={{ background: "var(--muted)" }}>{from}</div>
            <div className="flex justify-center"><ArrowDownRight className="size-6 opacity-50" /></div>
            <motion.div {...enter(still, 0.8, { y: 8 })} className="rounded-xl px-4 py-3 text-3xl font-black" style={{ background: "var(--alt)", color: "var(--bg)" }}>{to}</motion.div>
          </Card>
        </motion.div>
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
