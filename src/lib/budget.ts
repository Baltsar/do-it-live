// What a visitor may spend on the hosted demo. Every spoken line costs model calls, and the site is
// open, so each visitor gets a few free minutes a day and the whole site has a daily ceiling. The
// credits themselves are finite, so the public also has a share for the whole run, and a separate
// share is kept for the judges, who come in through a link of their own. Counts are kept per instance
// and merged into one small file in Blob every few seconds: approximate, cheap, and bounded. On a
// laptop there is no budget. Server-only.
import { createHash } from "node:crypto";
import { BlobError, BlobPreconditionFailedError, get, list, put } from "@vercel/blob";
import { affords, type BudgetView, type Caps, PER_MINUTE, type Spent, viewOf } from "@/lib/budget-rules";

export { PER_MINUTE, type BudgetView };

export const BUDGET_COOKIE = "dil_lib";
/** Set by the jury link (proxy.ts) to a hash of the jury code, never the code itself. */
export const JURY_COOKIE = "dil_jury";

/** Minutes of stage time a visitor gets for free each day, and the whole site's daily ceiling. */
export const FREE_MINUTES = Number(process.env.FREE_MINUTES ?? 15);
const DAILY_MINUTES = Number(process.env.DAILY_STAGE_MINUTES ?? 180);
// The public's share of the credits for the whole run, and the share kept for the judges. Minutes of
// stage time, so they read like the rest; PUBLIC_MINUTES=0 means no end, PUBLIC_CLOSED=1 stops it now.
const PUBLIC_MINUTES = Number(process.env.PUBLIC_MINUTES ?? 600);
const JURY_MINUTES = Number(process.env.JURY_MINUTES ?? 240);
// A judge gets twice a visitor's day: enough for a real talk and a second try.
const JUDGE_DAY_MINUTES = 30;

/** What each thing costs, in the same unit. An upload runs vision, a text model, two searches and an embedding. */
export const COST = { director: 1, draw: 1, upload: 6 } as const;
export type Spend = keyof typeof COST;

const caps = (): Caps => ({
  visitorDay: Math.round(FREE_MINUTES * PER_MINUTE),
  siteDay: Math.round(DAILY_MINUTES * PER_MINUTE),
  publicEver: PUBLIC_MINUTES > 0 ? Math.round(PUBLIC_MINUTES * PER_MINUTE) : Number.POSITIVE_INFINITY,
  juryEver: Math.round(JURY_MINUTES * PER_MINUTE),
  judgeDay: Math.round(JUDGE_DAY_MINUTES * PER_MINUTE),
  publicClosed: process.env.PUBLIC_CLOSED === "1",
});

/** The budget runs only on the hosted demo, where the credits are ours and the door is open. */
export const budgetOn = (): boolean => Boolean(process.env.VERCEL) && Boolean(process.env.BLOB_READ_WRITE_TOKEN) && FREE_MINUTES > 0;

// A plain hash of an IPv4 address can be reversed by trying them all. Salted with a secret and the
// day, it holds one visitor together for one day's budget and links nothing across days.
const SALT = process.env.VISITOR_SALT ?? process.env.BLOB_READ_WRITE_TOKEN ?? "";

/** The cookie value the jury link sets: proxy.ts computes the same hash with Web Crypto. */
export const juryToken = (code: string): string => createHash("sha256").update(`do-it-live-jury:${code}`).digest("hex");

/** True when the request carries the jury cookie for the current code. No code set, no judges. */
export function isJudge(req: Request): boolean {
  const code = process.env.JURY_CODE;
  if (!code) return false;
  const cookie = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${JURY_COOKIE}=([a-f0-9]{64})`))?.[1];
  return cookie === juryToken(code);
}

/** Who is asking: the library cookie, or a salted hash of the address for callers without one. */
export function visitorOf(req: Request): string {
  const cookie = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${BUDGET_COOKIE}=([a-z0-9-]{8,64})`, "i"))?.[1];
  if (cookie) return cookie;
  const address = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "nobody";
  return `ip-${createHash("sha256").update(`${today()}|${SALT}|${address}`).digest("hex").slice(0, 16)}`;
}

interface Day {
  visitors: Record<string, number>;
  /** Every unit spent that day, the judges' included. */
  total: number;
  /** The part of total spent by judges. */
  jury?: number;
}

const empty = (): Day => ({ visitors: {}, total: 0, jury: 0 });

export const USAGE_PREFIX = "usage/";
const today = (): string => new Date().toISOString().slice(0, 10);
const blobPath = (day: string): string => `${USAGE_PREFIX}${day}.json`;
/** The day a usage file is for, or null for anything else under the prefix. */
export const dayOf = (pathname: string): string | null => pathname.match(/^usage\/(\d{4}-\d{2}-\d{2})\.json$/)?.[1] ?? null;

// This instance's view: what Blob said last, and what this instance has spent since.
let seenDay = "";
let remote: Day = empty();
let remoteEtag: string | null = null;
let remoteAt = 0;
let pending: Day = empty();
// What a flush has taken out of `pending` and not yet written: still spent, still counted.
let inFlight: Day = empty();
let flushing: Promise<void> | null = null;

const REMOTE_FRESH_MS = 15_000;

function rollDay(): void {
  const day = today();
  if (day === seenDay) return;
  seenDay = day;
  remote = empty();
  remoteEtag = null;
  remoteAt = 0;
  pending = empty();
  inFlight = empty();
  pastAt = 0;
}

async function readRemote(force = false): Promise<void> {
  rollDay();
  if (!force && Date.now() - remoteAt < REMOTE_FRESH_MS) return;
  try {
    const res = await get(blobPath(seenDay), { access: "private", useCache: false });
    if (res?.statusCode === 200) {
      remote = JSON.parse(await new Response(res.stream).text()) as Day;
      remoteEtag = res.blob.etag.replace(/^W\//, "");
    } else if (!res) {
      remote = empty();
      remoteEtag = null;
    }
  } catch {
    // The store is out of reach: the last view stands, and this instance's own counts still apply.
  }
  remoteAt = Date.now();
}

// Every earlier day's totals, public and jury. Earlier days no longer change, so this is read once per
// instance and refreshed in the background now and then; a talk never waits for the listing.
let past = { public: 0, jury: 0 };
let pastAt = 0;
let pastReading: Promise<void> | null = null;
const PAST_FRESH_MS = 10 * 60_000;

function readPast(): Promise<void> {
  pastReading ??= (async () => {
    const day = today();
    const sum = { public: 0, jury: 0 };
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: USAGE_PREFIX, cursor });
      const earlier = page.blobs.filter((b) => {
        const d = dayOf(b.pathname);
        return d !== null && d < day;
      });
      for (const stored of await Promise.all(
        earlier.map(async (b) => {
          const res = await get(b.pathname, { access: "private", useCache: false });
          return res?.statusCode === 200 ? (JSON.parse(await new Response(res.stream).text()) as Partial<Day>) : null;
        }),
      )) {
        const jury = stored?.jury ?? 0;
        sum.public += (stored?.total ?? 0) - jury;
        sum.jury += jury;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    past = sum;
    pastAt = Date.now();
  })()
    .catch(() => {
      // The store is out of reach: the last sums stand, today's own counts still apply, and the next
      // try waits its turn instead of holding up every call while the store is down.
      pastAt = Date.now();
    })
    .finally(() => {
      pastReading = null;
    });
  return pastReading;
}

/** The first read on an instance is waited for, so a fresh instance cannot open a closed demo; later ones are not. */
async function knowPast(): Promise<void> {
  if (pastAt === 0) await readPast();
  else if (Date.now() - pastAt > PAST_FRESH_MS) void readPast();
}

const juryOf = (d: Day): number => d.jury ?? 0;

function spentNow(visitor: string): Spent {
  const days = [remote, pending, inFlight];
  const total = days.reduce((n, d) => n + d.total, 0);
  const jury = days.reduce((n, d) => n + juryOf(d), 0);
  return {
    visitorToday: days.reduce((n, d) => n + (d.visitors[visitor] ?? 0), 0),
    publicToday: total - jury,
    publicEver: past.public + total - jury,
    juryEver: past.jury + jury,
  };
}

const OPEN: BudgetView = { minutesLeft: FREE_MINUTES, minutesPerDay: FREE_MINUTES, siteClosed: false, soldOut: false, publicLeft: null, judge: false };

/** What this visitor has left, for the client's meter. */
export async function budgetFor(req: Request): Promise<BudgetView> {
  if (!budgetOn()) return OPEN;
  await Promise.all([readRemote(), knowPast()]);
  return viewOf(spentNow(visitorOf(req)), caps(), isJudge(req));
}

/**
 * Takes the cost when the visitor and every share that applies can afford it, and says so. Nothing
 * is reserved: two requests at once may both pass; a ceiling is a few calls soft, never a few minutes.
 */
export async function spend(req: Request, what: Spend): Promise<{ ok: boolean; view: BudgetView }> {
  if (!budgetOn()) return { ok: true, view: OPEN };
  await Promise.all([readRemote(), knowPast()]);
  const visitor = visitorOf(req);
  const judge = isJudge(req);
  const cost = COST[what];
  const ok = affords(spentNow(visitor), caps(), judge, cost);
  if (ok) {
    pending.visitors[visitor] = (pending.visitors[visitor] ?? 0) + cost;
    pending.total += cost;
    if (judge) pending.jury = juryOf(pending) + cost;
  }
  return { ok, view: viewOf(spentNow(visitor), caps(), judge) };
}

/**
 * Merges this instance's counts into the day's file. Call after a response (next/server `after`),
 * so a visitor never waits for it. One merge at a time; a lost race re-reads and adds again.
 */
export function flushBudget(): Promise<void> {
  if (!budgetOn() || pending.total === 0) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    const mine = pending;
    pending = empty();
    inFlight = mine;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await readRemote(true);
      const merged: Day = { visitors: { ...remote.visitors }, total: remote.total + mine.total, jury: juryOf(remote) + juryOf(mine) };
      for (const [visitor, n] of Object.entries(mine.visitors)) merged.visitors[visitor] = (merged.visitors[visitor] ?? 0) + n;
      try {
        const saved = await put(blobPath(seenDay), JSON.stringify(merged), {
          access: "private",
          contentType: "application/json",
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
          ...(remoteEtag ? { ifMatch: remoteEtag } : { allowOverwrite: false }),
        });
        remote = merged;
        remoteEtag = saved.etag;
        remoteAt = Date.now();
        inFlight = empty();
        return;
      } catch (err) {
        const lostRace = err instanceof BlobPreconditionFailedError || (err instanceof BlobError && (!remoteEtag || /precondition|etag/i.test(err.message)));
        if (!lostRace) break;
        await new Promise((r) => setTimeout(r, 50 + Math.random() * 150 * (attempt + 1)));
      }
    }
    // Could not be written: keep the counts so the next flush carries them.
    for (const [visitor, n] of Object.entries(mine.visitors)) pending.visitors[visitor] = (pending.visitors[visitor] ?? 0) + n;
    pending.total += mine.total;
    pending.jury = juryOf(pending) + juryOf(mine);
    inFlight = empty();
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
