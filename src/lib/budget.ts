// What a visitor may spend on the hosted demo. Every spoken line costs model calls, and the site is
// open, so each visitor gets a few free minutes a day and the whole site has a daily ceiling. Counts
// are kept per instance and merged into one small file in Blob every few seconds: approximate, cheap,
// and bounded. On a laptop there is no budget. Server-only.
import { createHash } from "node:crypto";
import { BlobError, BlobPreconditionFailedError, get, put } from "@vercel/blob";

export const BUDGET_COOKIE = "dil_lib";

/** Minutes of stage time a visitor gets for free each day, and the whole site's daily ceiling. */
export const FREE_MINUTES = Number(process.env.FREE_MINUTES ?? 15);
const DAILY_MINUTES = Number(process.env.DAILY_STAGE_MINUTES ?? 180);

// One minute of talking costs about 12 director calls and 34 drawing requests (measured 29 Oct 2026).
export const PER_MINUTE = 46;
/** What each thing costs, in the same unit. An upload runs vision, a text model, two searches and an embedding. */
export const COST = { director: 1, draw: 1, upload: 6 } as const;
export type Spend = keyof typeof COST;

const visitorCap = (): number => Math.round(FREE_MINUTES * PER_MINUTE);
const siteCap = (): number => Math.round(DAILY_MINUTES * PER_MINUTE);

export interface BudgetView {
  /** Whole minutes this visitor still has today. */
  minutesLeft: number;
  minutesPerDay: number;
  /** True when the whole site has reached its daily ceiling, whatever this visitor has left. */
  siteClosed: boolean;
}

/** The budget runs only on the hosted demo, where the credits are ours and the door is open. */
export const budgetOn = (): boolean => Boolean(process.env.VERCEL) && Boolean(process.env.BLOB_READ_WRITE_TOKEN) && FREE_MINUTES > 0;

// A plain hash of an IPv4 address can be reversed by trying them all. Salted with a secret and the
// day, it holds one visitor together for one day's budget and links nothing across days.
const SALT = process.env.VISITOR_SALT ?? process.env.BLOB_READ_WRITE_TOKEN ?? "";

/** Who is asking: the library cookie, or a salted hash of the address for callers without one. */
export function visitorOf(req: Request): string {
  const cookie = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${BUDGET_COOKIE}=([a-z0-9-]{8,64})`, "i"))?.[1];
  if (cookie) return cookie;
  const address = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "nobody";
  return `ip-${createHash("sha256").update(`${today()}|${SALT}|${address}`).digest("hex").slice(0, 16)}`;
}

interface Day {
  visitors: Record<string, number>;
  total: number;
}

export const USAGE_PREFIX = "usage/";
const today = (): string => new Date().toISOString().slice(0, 10);
const blobPath = (day: string): string => `${USAGE_PREFIX}${day}.json`;

// This instance's view: what Blob said last, and what this instance has spent since.
let seenDay = "";
let remote: Day = { visitors: {}, total: 0 };
let remoteEtag: string | null = null;
let remoteAt = 0;
let pending: Day = { visitors: {}, total: 0 };
// What a flush has taken out of `pending` and not yet written: still spent, still counted.
let inFlight: Day = { visitors: {}, total: 0 };
let flushing: Promise<void> | null = null;

const REMOTE_FRESH_MS = 15_000;

function rollDay(): void {
  const day = today();
  if (day === seenDay) return;
  seenDay = day;
  remote = { visitors: {}, total: 0 };
  remoteEtag = null;
  remoteAt = 0;
  pending = { visitors: {}, total: 0 };
  inFlight = { visitors: {}, total: 0 };
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
      remote = { visitors: {}, total: 0 };
      remoteEtag = null;
    }
  } catch {
    // The store is out of reach: the last view stands, and this instance's own counts still apply.
  }
  remoteAt = Date.now();
}

const spentBy = (visitor: string): number => (remote.visitors[visitor] ?? 0) + (pending.visitors[visitor] ?? 0) + (inFlight.visitors[visitor] ?? 0);
const spentAll = (): number => remote.total + pending.total + inFlight.total;

/** What this visitor has left, for the client's meter. */
export async function budgetFor(visitor: string): Promise<BudgetView> {
  await readRemote();
  const left = Math.max(0, visitorCap() - spentBy(visitor));
  return { minutesLeft: Math.floor(left / PER_MINUTE), minutesPerDay: FREE_MINUTES, siteClosed: spentAll() >= siteCap() };
}

/**
 * Takes the cost when the visitor and the site can afford it, and says so. Nothing is reserved:
 * two requests at once may both pass; the ceiling is a few calls soft, never a few minutes.
 */
export async function spend(visitor: string, what: Spend): Promise<{ ok: boolean; view: BudgetView }> {
  if (!budgetOn()) return { ok: true, view: { minutesLeft: FREE_MINUTES, minutesPerDay: FREE_MINUTES, siteClosed: false } };
  await readRemote();
  const cost = COST[what];
  const ok = spentBy(visitor) + cost <= visitorCap() && spentAll() + cost <= siteCap();
  if (ok) {
    pending.visitors[visitor] = (pending.visitors[visitor] ?? 0) + cost;
    pending.total += cost;
  }
  return { ok, view: await budgetFor(visitor) };
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
    pending = { visitors: {}, total: 0 };
    inFlight = mine;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await readRemote(true);
      const merged: Day = { visitors: { ...remote.visitors }, total: remote.total + mine.total };
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
        inFlight = { visitors: {}, total: 0 };
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
    inFlight = { visitors: {}, total: 0 };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
