// How many talks the hosted demo has seen, read from the budget's own day files: no new tracking,
// no ids, no words. Old days are reduced to their totals on the way. Server-only.
import { get, list, put } from "@vercel/blob";
import { budgetOn, dayOf, PER_MINUTE, USAGE_PREFIX } from "@/lib/budget";

/** A visitor's day counts as a talk past about half a minute of stage time; an upload alone costs 6. */
const TALK_UNITS = 23;
/**
 * Per-visitor counts are kept two days, then only the day's totals remain. Not one: an instance still
 * flushing yesterday's counts just after midnight would otherwise write the visitors back.
 */
const KEEP_VISITORS_DAYS = 2;
const FRESH_MS = 60_000;

export interface TalkCount {
  /** Visitor-days with a real talk in them: one person talking twice in a day counts once. */
  talks: number;
  /** Minutes of stage time run on the models, from the same spend the budget counts. */
  minutes: number;
}

interface StoredDay {
  visitors?: Record<string, number>;
  total?: number;
  /** The judges' part of total: kept when the day is reduced, so their share stays counted. */
  jury?: number;
  /** Present once the day has been reduced to its totals. */
  talks?: number;
}

let cached: { at: number; value: TalkCount } | null = null;
let counting: Promise<TalkCount | null> | null = null;

const ageInDays = (pathname: string): number => {
  const day = pathname.slice(USAGE_PREFIX.length, USAGE_PREFIX.length + 10);
  return Math.floor((Date.now() - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
};

const talksIn = (day: StoredDay): number => day.talks ?? Object.values(day.visitors ?? {}).filter((n) => n >= TALK_UNITS).length;

async function countDay(pathname: string): Promise<{ talks: number; units: number }> {
  const res = await get(pathname, { access: "private", useCache: false });
  if (res?.statusCode !== 200) return { talks: 0, units: 0 };
  const day = JSON.parse(await new Response(res.stream).text()) as StoredDay;
  const talks = talksIn(day);
  const units = day.total ?? 0;
  if (day.visitors && ageInDays(pathname) >= KEEP_VISITORS_DAYS) {
    // Forget who, keep how much. Conditional, so a write that lands in between is never lost blind.
    await put(pathname, JSON.stringify({ total: units, jury: day.jury ?? 0, talks }), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      ifMatch: res.blob.etag.replace(/^W\//, ""),
    }).catch(() => undefined);
  }
  return { talks, units };
}

async function countAll(): Promise<TalkCount> {
  let talks = 0;
  let units = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: USAGE_PREFIX, cursor });
    const days = page.blobs.filter((b) => dayOf(b.pathname) !== null);
    for (const day of await Promise.all(days.map((b) => countDay(b.pathname).catch(() => ({ talks: 0, units: 0 }))))) {
      talks += day.talks;
      units += day.units;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return { talks, minutes: Math.floor(units / PER_MINUTE) };
}

/** The count, at most a minute old; null on a laptop, where there is no budget to count from. */
export function talkCount(): Promise<TalkCount | null> {
  if (!budgetOn()) return Promise.resolve(null);
  if (cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.value);
  counting ??= countAll()
    .then((value) => {
      cached = { at: Date.now(), value };
      return value;
    })
    .catch(() => cached?.value ?? null)
    .finally(() => {
      counting = null;
    });
  return counting;
}
