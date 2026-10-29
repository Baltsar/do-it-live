// The engine's own visual vocabulary: wordless animated metaphors it can always draw.
// One catalog feeds the renderer, the classifier prompt and the preview page.

export const SCENES = [
  "surge", "hush", "swarm", "collapse", "spark", "wait", "clash", "climb", "scatter", "focus",
  "orbit", "pulse", "grow", "lock", "drain", "stack", "wave", "echo", "outlier", "balance", "loop", "launch",
  "earth", "deal", "money", "clock", "idea", "trophy", "speed", "team", "heart", "question", "journey", "fire",
  "shield", "magnet", "puzzle", "key",
] as const;

export type SceneName = (typeof SCENES)[number];
export const isScene = (v: unknown): v is SceneName => SCENES.some((x) => x === v);

interface SceneInfo {
  /** What the audience sees. */
  shows: string;
  /** What a spoken line must be about for this scene to fit. */
  means: string;
}

export const SCENE_CATALOG: Record<SceneName, SceneInfo> = {
  surge: { shows: "Small bars creep along, then one shoots out of the frame", means: "a slow start that suddenly explodes: fast growth, a breakthrough, going viral, 'then boom'" },
  hush: { shows: "A still row of dots where one almost speaks", means: "silence where someone should speak: politeness, awkwardness, nobody dares, holding back an opinion" },
  swarm: { shows: "Scattered dots pull together into a ring", means: "people coming together: a community, gathering, joining, a movement forming" },
  collapse: { shows: "A neat stack of blocks tumbles down", means: "something breaks or is lost: failure, a crash, deleting, things falling apart" },
  spark: { shows: "One dot lights up, then all the others in a wave", means: "one thing ignites many: an idea catching on, inspiration, excitement spreading through a group" },
  wait: { shows: "A loading spinner that never stops", means: "waiting, delays, patience, slow processes, bureaucracy, something still not done" },
  clash: { shows: "Two blocks slam into each other", means: "conflict: disagreement, arguments, a head-on competition, two sides fighting" },
  climb: { shows: "A dot hops up a staircase, step by step", means: "hard work step by step: persistence, a learning curve, progress through effort" },
  scatter: { shows: "A tight cluster bursts apart in every direction", means: "chaos: confusion, losing control, everyone going different ways, a mess" },
  focus: { shows: "A ring closes in on one dot among many dim ones", means: "one priority among many: clarity, finding what matters, attention, the one key thing" },
  orbit: { shows: "Dots circle around one core", means: "everything revolves around one thing: an ecosystem, a platform, the centre of it all" },
  pulse: { shows: "A heartbeat line draws itself across the screen", means: "being alive: energy, rhythm, a heartbeat, keeping something going" },
  grow: { shows: "A stem rises, leaves unfold and it blooms", means: "steady organic growth: nurturing, planting a seed, something maturing over time" },
  lock: { shows: "A padlock snaps shut", means: "security and trust: safety, protection, keeping something safe, commitment" },
  drain: { shows: "A battery runs down to empty and blinks", means: "losing money, time or energy: waste, burnout, resources running out" },
  stack: { shows: "Blocks drop into place, one on top of another", means: "building up piece by piece: foundations, layers, assembling something" },
  wave: { shows: "A line rides up and down like a rollercoaster", means: "ups and downs: trends, hype cycles, momentum that comes and goes" },
  echo: { shows: "Rings spread outward from one point", means: "a message travelling outward: reach, influence, word of mouth, being heard far away" },
  outlier: { shows: "One bouncing circle in a grid of still squares", means: "being different: standing out, the odd one, not fitting in, originality" },
  balance: { shows: "A seesaw tips between two weights", means: "a trade-off: weighing two things, fairness, risk versus reward" },
  loop: { shows: "An arrow chases its own tail around a circle", means: "repetition: iterating, feedback loops, being stuck in a cycle, doing it again and again" },
  launch: { shows: "A rocket lifts off and leaves the frame", means: "starting: shipping, going live, kicking off, taking the leap" },
  earth: { shows: "A globe, and one dot on it lights up, then another, until it is covered", means: "the whole world: global reach, international, every country, going worldwide, users everywhere" },
  deal: { shows: "A signature writes itself across a document and a stamp slams down", means: "a deal is done: sold, signed, closed, agreed, a sale, a contract, shaking hands on it" },
  money: { shows: "Coins drop into three stacks, the tallest topped in the accent colour", means: "money: revenue, price, cost, funding, paying, getting paid, profit, cash" },
  clock: { shows: "A clock face whose minute hand races round", means: "time: a deadline, running out of time, hours and days, how long something takes, waiting for the clock" },
  idea: { shows: "A lightbulb switches on and rays burst out of it", means: "an idea: the lightbulb moment, an insight, realising something, a plan, a concept, a solution" },
  trophy: { shows: "A trophy rises into the frame and sparkles pop around it", means: "winning: first place, a prize, the champion, the best, victory, an award, success" },
  speed: { shows: "A dot shoots across the screen with motion lines behind it", means: "fast: speed, instant, quick, real time, in seconds, no waiting, rapid" },
  team: { shows: "Four figures slide in from the sides and stand together", means: "a team: colleagues, working together, collaboration, a group of people, co-founders, the crew" },
  heart: { shows: "A big heart beats and small ones float up from it", means: "love: passion, caring, users love it, a favourite, kindness, emotion" },
  question: { shows: "A question mark draws itself and its dot drops in", means: "a question: not knowing, uncertainty, what if, why, a mystery, asking the audience" },
  journey: { shows: "A route draws itself from a dot to a map pin that drops in", means: "a journey: from A to B, the route, where we are heading, a destination, travel, the road ahead, a roadmap" },
  fire: { shows: "A flame flickers and embers rise", means: "something hot: on fire, trending, hype, burning, intense, a hot topic" },
  shield: { shows: "Dots fly at a shield and bounce off", means: "defence: protecting, safety, resilience, privacy, blocking attacks, insurance, keeping harm out" },
  magnet: { shows: "Dots get pulled into the poles of a magnet", means: "attraction: pulling people in, attracting customers or talent, traffic, demand, people keep coming back" },
  puzzle: { shows: "Three puzzle pieces wait and the fourth slides into place", means: "the missing piece: things fitting together, integration, solving it, compatibility, it clicks into place" },
  key: { shows: "A key slides into a keyhole and the keyhole lights up", means: "access: the key to something, unlocking, opening up, permission, getting in, the secret ingredient" },
};
