// Run: node --test src/lib/budget-rules.test.mjs (Node 22.18 or later strips the types itself).
import assert from "node:assert/strict";
import { test } from "node:test";
import { affords, closedFor, PER_MINUTE, viewOf } from "./budget-rules.ts";

const m = (minutes) => minutes * PER_MINUTE;
const caps = { visitorDay: m(15), siteDay: m(180), publicEver: m(600), juryEver: m(240), judgeDay: m(30), publicClosed: false };
const fresh = { visitorToday: 0, publicToday: 0, publicEver: 0, juryEver: 0 };

test("a new visitor can talk and sees the public share left", () => {
  assert.equal(affords(fresh, caps, false, 1), true);
  const view = viewOf(fresh, caps, false);
  assert.deepEqual(view, { minutesLeft: 15, minutesPerDay: 15, siteClosed: false, soldOut: false, publicLeft: 600, judge: false });
});

test("the public share spent closes the public for good, and the judges still talk", () => {
  const spent = { ...fresh, publicEver: m(600) };
  assert.equal(affords(spent, caps, false, 1), false);
  assert.equal(viewOf(spent, caps, false).soldOut, true);
  assert.equal(closedFor(viewOf(spent, caps, false)), true);
  assert.equal(affords(spent, caps, true, 1), true);
  assert.equal(closedFor(viewOf(spent, caps, true)), false);
});

test("a public share one call short refuses the call that would cross it", () => {
  const spent = { ...fresh, publicEver: m(600) - 1 };
  assert.equal(affords(spent, caps, false, 1), true);
  assert.equal(affords(spent, caps, false, 6), false);
});

test("closing by hand stops the public at once, never the judges", () => {
  const shut = { ...caps, publicClosed: true };
  assert.equal(affords(fresh, shut, false, 1), false);
  assert.equal(viewOf(fresh, shut, false).soldOut, true);
  assert.equal(affords(fresh, shut, true, 1), true);
});

test("the judges answer to their own share, not the site's day", () => {
  const busyDay = { ...fresh, publicToday: m(180), publicEver: m(600) };
  assert.equal(affords(busyDay, caps, true, 1), true);
  const juryDone = { ...fresh, juryEver: m(240) };
  assert.equal(affords(juryDone, caps, true, 1), false);
  const view = viewOf(juryDone, caps, true);
  assert.equal(view.siteClosed, true);
  assert.equal(closedFor(view), true);
});

test("a judge's day is thirty minutes, and the last of the jury share caps it", () => {
  assert.equal(viewOf({ ...fresh, visitorToday: m(10) }, caps, true).minutesLeft, 20);
  assert.equal(viewOf({ ...fresh, juryEver: m(235) }, caps, true).minutesLeft, 5);
  assert.equal(affords({ ...fresh, visitorToday: m(30) }, caps, true, 1), false);
});

test("the daily ceilings still hold for the public", () => {
  assert.equal(affords({ ...fresh, visitorToday: m(15) }, caps, false, 1), false);
  assert.equal(affords({ ...fresh, publicToday: m(180) }, caps, false, 1), false);
  assert.equal(viewOf({ ...fresh, publicToday: m(180) }, caps, false).siteClosed, true);
});

test("no end set means no public share to run out", () => {
  const open = { ...caps, publicEver: Number.POSITIVE_INFINITY };
  const view = viewOf({ ...fresh, publicEver: m(100000) }, open, false);
  assert.equal(view.soldOut, false);
  assert.equal(view.publicLeft, null);
});
