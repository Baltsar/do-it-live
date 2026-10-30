// Run: node --test src/lib/mic-help.test.mjs (Node 22.18 or later strips the types itself).
import assert from "node:assert/strict";
import { test } from "node:test";
import { micHelp, whereFrom } from "./mic-help.ts";

const UA = {
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  chromeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1",
  firefoxMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:144.0) Gecko/20100101 Firefox/144.0",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
};

test("the browser and system come out of the user agent", () => {
  assert.deepEqual(whereFrom(UA.chromeMac), { browser: "chrome", platform: "mac", app: "Chrome" });
  assert.deepEqual(whereFrom(UA.edgeWin), { browser: "edge", platform: "windows", app: "Edge" });
  assert.deepEqual(whereFrom(UA.safariMac), { browser: "safari", platform: "mac", app: "Safari" });
  assert.equal(whereFrom(UA.safariIphone).platform, "ios");
  assert.equal(whereFrom(UA.chromeIphone).browser, "chrome");
  assert.equal(whereFrom(UA.firefoxMac).browser, "firefox");
  assert.equal(whereFrom(UA.chromeAndroid).platform, "android");
});

test("an iPad asking for the desktop site is still an iPad", () => {
  assert.equal(whereFrom(UA.safariMac, 5).platform, "ios");
});

test("a blocked site gets the steps for its own browser", () => {
  assert.match(micHelp("site", whereFrom(UA.chromeMac)).steps[0], /left end of the address bar/);
  assert.match(micHelp("site", whereFrom(UA.safariMac)).steps[0], /Safari → Settings for doitlive\.app/);
  assert.match(micHelp("site", whereFrom(UA.safariIphone)).steps[0], /aA/);
  assert.match(micHelp("site", whereFrom(UA.firefoxMac)).steps[0], /crossed-out mic/);
});

test("a block by the system names the app and the settings path", () => {
  const help = micHelp("system", whereFrom(UA.chromeMac));
  assert.match(help.title, /Chrome/);
  assert.match(help.steps[0], /Privacy & Security → Microphone/);
  assert.equal(help.tone, "problem");
});

test("no words yet shows the level bar only where there is a meter", () => {
  assert.equal(micHelp("no-words", whereFrom(UA.chromeMac), { meter: true }).meter, true);
  const phone = micHelp("no-words", whereFrom(UA.safariIphone), { meter: false });
  assert.equal(phone.meter, false);
  assert.match(phone.steps.join(" "), /Safari → Microphone/);
});

test("waiting and good news are not dressed as errors", () => {
  assert.equal(micHelp("asking", whereFrom(UA.chromeMac)).tone, "waiting");
  assert.equal(micHelp("allowed", whereFrom(UA.chromeMac)).tone, "good");
});
