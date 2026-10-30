// What to tell a speaker whose microphone is not getting through, in the words of the browser and
// system they are on. Plain text only, so `node --test` runs its tests without a build.

export type Browser = "chrome" | "edge" | "safari" | "firefox" | "other";
export type Platform = "mac" | "windows" | "ios" | "android" | "other";

export interface Where {
  browser: Browser;
  platform: Platform;
  /** The browser's name as the speaker knows it, for "turn on Chrome". */
  app: string;
}

export type MicProblem = "asking" | "allowed" | "site" | "system" | "missing" | "busy" | "deaf" | "silent" | "no-words" | "call";

export interface MicHelp {
  title: string;
  steps: string[];
  /** Red when something is broken, quiet when the page is only waiting or reporting good news. */
  tone: "problem" | "waiting" | "good";
  /** The level bar belongs here: a working mic makes it jump, a dead one leaves it flat. */
  meter: boolean;
}

/** Reads the browser and system from the user agent. An iPad asks for the desktop site, so touch points tell it apart. */
export function whereFrom(ua: string, touchPoints = 0): Where {
  const platform: Platform = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1) ? "ios" : /Android/.test(ua) ? "android" : /Macintosh|Mac OS X/.test(ua) ? "mac" : /Windows/.test(ua) ? "windows" : "other";
  // Order matters: Edge and Chrome on iOS both say Safari too, and Edge says Chrome.
  const browser: Browser = /Edg(e|A|iOS)?\//.test(ua) ? "edge" : /Firefox|FxiOS/.test(ua) ? "firefox" : /Chrome|CriOS/.test(ua) ? "chrome" : /Safari/.test(ua) ? "safari" : "other";
  const app = { chrome: "Chrome", edge: "Edge", safari: "Safari", firefox: "Firefox", other: "your browser" }[browser];
  return { browser, platform, app };
}

const SOUND_INPUT: Record<Platform, string> = {
  mac: "System Settings → Sound → Input: pick the mic you talk into.",
  windows: "Settings → System → Sound → Input: pick the mic you talk into.",
  ios: "Unplug headphones you are not using, so the phone's own mic is used.",
  android: "Unplug headphones you are not using, so the phone's own mic is used.",
  other: "In the system's sound settings, pick the mic you talk into as the input.",
};

function siteSteps(where: Where): string[] {
  if (where.platform === "ios") return ["Tap aA in the address bar, then Website Settings.", "Set Microphone to Allow.", "Press the mic again."];
  if (where.platform === "android") return ["Tap the icon at the left end of the address bar, then Permissions.", "Turn on Microphone.", "Press the mic again."];
  if (where.browser === "safari") return ["In the menu bar: Safari → Settings for doitlive.app.", "Set Microphone to Allow.", "Press the mic again."];
  if (where.browser === "firefox") return ["Click the crossed-out mic in the address bar.", "Remove the block.", "Press the mic again."];
  if (where.browser === "chrome" || where.browser === "edge") return ["Click the icon at the left end of the address bar.", "Switch Microphone to Allow.", `Press the mic again. If ${where.app} offers to reload, reload.`];
  return ["Open this site's settings from the address bar.", "Allow the microphone.", "Press the mic again."];
}

function systemSteps(where: Where): string[] {
  if (where.platform === "mac") return ["Apple menu → System Settings → Privacy & Security → Microphone.", `Turn on ${where.app}.`, `Quit ${where.app} and open it again, then come back here.`];
  if (where.platform === "windows") return ["Start → Settings → Privacy & security → Microphone.", "Turn on microphone access, and let desktop apps use it.", "Press the mic again."];
  return [`In the system's privacy settings, let ${where.app} use the microphone.`, "Press the mic again."];
}

export function micHelp(problem: MicProblem, where: Where, opts: { device?: string | null; rateKHz?: number; meter?: boolean } = {}): MicHelp {
  const device = opts.device ?? "the microphone";
  const meter = Boolean(opts.meter);
  const askedWhere = where.platform === "ios" || where.platform === "android" ? "Tap Allow." : where.browser === "safari" ? "Click Allow in the box under the address bar." : "Click Allow in the box at the top left of the window.";
  switch (problem) {
    case "asking":
      return { title: "Your browser is asking for the mic.", steps: [askedWhere, "The mic only listens while the button is pink."], tone: "waiting", meter: false };
    case "allowed":
      return { title: "Mic allowed. Press it again.", steps: [], tone: "good", meter: false };
    case "site":
      return { title: "The mic is blocked for this site.", steps: siteSteps(where), tone: "problem", meter: false };
    case "system":
      return { title: `Your computer keeps ${where.app} away from the mic.`, steps: systemSteps(where), tone: "problem", meter: false };
    case "missing":
      return { title: "No microphone found.", steps: ["Plug one in, or turn on the one you have.", SOUND_INPUT[where.platform], "Press the mic again."], tone: "problem", meter: false };
    case "busy":
      return { title: "Something else has the mic.", steps: ["Close any other tab running Do it live.", "End a call, or quit a dictation app, that holds the mic.", "Press the mic again."], tone: "problem", meter: false };
    case "deaf":
      return { title: "This browser hears you but writes nothing down.", steps: ["Open doitlive.app in Google Chrome, Edge or Safari.", "Brave, Arc, Opera and Comet have the speech button without the service behind it."], tone: "problem", meter };
    case "silent":
      return { title: `No sound at all from ${device}.`, steps: ["Check the mute switch on the headset or mic.", SOUND_INPUT[where.platform], "Press stop, then the mic again."], tone: "problem", meter };
    case "no-words":
      return meter
        ? {
            title: "Not a word yet.",
            steps: ["Say something out loud. The bar below should jump.", "It jumps: keep talking, the first words can take a few seconds.", `It stays flat: muted, or the wrong mic. ${SOUND_INPUT[where.platform]}`],
            tone: "waiting",
            meter,
          }
        : {
            title: "Not a word yet.",
            steps: ["Say something out loud, close to the phone.", "Still nothing: press stop, then the mic again.", where.platform === "ios" ? "Check Settings → Apps → Safari → Microphone." : "Check that the browser may use the microphone."],
            tone: "waiting",
            meter,
          };
    case "call":
      return {
        title: `${device} is in call mode.`,
        steps: [`Bluetooth headsets drop to ${opts.rateKHz ?? 16} kHz while their mic is on, and names come out garbled.`, SOUND_INPUT[where.platform].replace("the mic you talk into", "the built-in mic")],
        tone: "waiting",
        meter: false,
      };
  }
}
