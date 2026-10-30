// Who may spend what on the hosted demo, as plain arithmetic: budget.ts gathers the counts, this
// decides. No imports, so `node --test` runs its tests without a build.

// One minute of talking costs about 12 director calls and 34 drawing requests (measured 29 Oct 2026).
export const PER_MINUTE = 46;

export interface BudgetView {
  /** Whole minutes this visitor still has today. */
  minutesLeft: number;
  minutesPerDay: number;
  /** True when today's pool is spent, whatever this visitor has left: the site's daily ceiling, or a judge's whole share. */
  siteClosed: boolean;
  /** The public share of the credits is spent, or closed by hand: only judges can talk now. */
  soldOut: boolean;
  /** Whole minutes left in the public share before it closes; null when it has no end. */
  publicLeft: number | null;
  /** This visitor came in through the jury link and talks on the share kept for the judges. */
  judge: boolean;
}

/** What has been spent, in units. "Ever" counts from the first day file, today included. */
export interface Spent {
  visitorToday: number;
  publicToday: number;
  publicEver: number;
  juryEver: number;
}

/** The ceilings, in units. publicEver is Infinity when no end is set. */
export interface Caps {
  visitorDay: number;
  siteDay: number;
  publicEver: number;
  juryEver: number;
  judgeDay: number;
  /** Set by hand to stop the public at once, whatever is left. */
  publicClosed: boolean;
}

const minutes = (units: number): number => Math.floor(Math.max(0, units) / PER_MINUTE);

export function viewOf(spent: Spent, caps: Caps, judge: boolean): BudgetView {
  if (judge) {
    const left = Math.min(caps.judgeDay - spent.visitorToday, caps.juryEver - spent.juryEver);
    return {
      minutesLeft: minutes(left),
      minutesPerDay: minutes(caps.judgeDay),
      siteClosed: spent.juryEver >= caps.juryEver,
      soldOut: false,
      publicLeft: null,
      judge: true,
    };
  }
  const ends = Number.isFinite(caps.publicEver);
  return {
    minutesLeft: minutes(caps.visitorDay - spent.visitorToday),
    minutesPerDay: minutes(caps.visitorDay),
    siteClosed: spent.publicToday >= caps.siteDay,
    soldOut: caps.publicClosed || (ends && spent.publicEver >= caps.publicEver),
    publicLeft: ends ? minutes(caps.publicEver - spent.publicEver) : null,
    judge: false,
  };
}

/** Whether this cost fits every ceiling that applies. A judge answers only to the jury's share. */
export function affords(spent: Spent, caps: Caps, judge: boolean, cost: number): boolean {
  if (judge) return spent.visitorToday + cost <= caps.judgeDay && spent.juryEver + cost <= caps.juryEver;
  if (caps.publicClosed) return false;
  return spent.visitorToday + cost <= caps.visitorDay && spent.publicToday + cost <= caps.siteDay && spent.publicEver + cost <= caps.publicEver;
}

/** A visitor who cannot start a talk at all: the meter, the mic and the speech service all stop here. */
export const closedFor = (view: BudgetView): boolean => view.minutesLeft <= 0 || view.siteClosed || view.soldOut;
