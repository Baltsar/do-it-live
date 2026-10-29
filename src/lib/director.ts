// Server-only: keys never reach the browser.
import { ICON_NAMES } from "@/lib/icons";
import { SCENES, SCENE_CATALOG } from "@/lib/scene-catalog";
import { areBareOrdinals, checklistFromLine, countFromLine, figureFromLine, groundSlide, hasUngroundedNumbers, isAbstractPhotoQuery, isAnnouncement, isQuestion, itemsFromEnumeration, percentFromLine, processFromLine } from "@/lib/grounding";
import { isMotion, lexicalMatch, libraryCandidates, libraryLine, literalMatch, loadIndex, namedMatch, type LibraryItem } from "@/lib/library";
import { isScene, type DirectorResult, type ImageSource, type VisualMode } from "@/lib/slide";

const NEBIUS_BASE = "https://api.tokenfactory.nebius.com/v1";

export const providers = {
  nebius: () => Boolean(process.env.NEBIUS_API_KEY),
  tavily: () => Boolean(process.env.TAVILY_API_KEY),
  pexels: () => Boolean(process.env.PEXELS_API_KEY),
};

export type Role = "fast" | "quality" | "vision" | "embed";

// Role -> model id patterns, most specific first. Env vars NEBIUS_MODEL_<ROLE> override.
const ROLE_PATTERNS: Record<Role, RegExp[]> = {
  fast: [/nemotron.*lightning/i, /nemotron.*nano(?!.*(vl|omni))/i, /nemotron/i],
  quality: [/nemotron.*ultra/i, /nemotron.*super/i, /nemotron/i],
  vision: [/nemotron.*nano.*vl/i, /nemotron.*omni/i, /nemotron.*vl/i, /minicpm-v|llava|vision|-vl\b/i],
  embed: [/qwen3-embedding/i, /embed/i],
};

const roleCache = new Map<Role, string | null>();
let modelIds: string[] | null = null;

export const currentModel = (): string | null => roleCache.get("fast") ?? process.env.NEBIUS_MODEL ?? null;

interface ModelList {
  data?: { id: string }[];
}
interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

async function nebiusFetch<T>(route: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${NEBIUS_BASE}${route}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Nebius ${route} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export async function listModels(): Promise<string[]> {
  const data = await nebiusFetch<ModelList>("/models");
  return (data.data ?? []).map((m) => m.id);
}

export async function modelFor(role: Role): Promise<string | null> {
  const override = process.env[`NEBIUS_MODEL_${role.toUpperCase()}`] ?? (role === "fast" ? process.env.NEBIUS_MODEL : undefined);
  if (override) return override;
  if (roleCache.has(role)) return roleCache.get(role) ?? null;
  modelIds ??= await listModels();
  const found = ROLE_PATTERNS[role].map((re) => modelIds?.find((id) => re.test(id))).find(Boolean) ?? null;
  roleCache.set(role, found);
  return found;
}

export async function pickModel(role: Role = "fast"): Promise<string> {
  const model = await modelFor(role);
  if (!model) {
    throw new Error(`No ${role} model found on Nebius. Models: ${(modelIds ?? []).slice(0, 40).join(", ")}`);
  }
  return model;
}

export async function rolesStatus(): Promise<Record<Role, string | null>> {
  const out: Record<Role, string | null> = { fast: null, quality: null, vision: null, embed: null };
  if (!providers.nebius()) return out;
  for (const role of Object.keys(out) as Role[]) out[role] = await modelFor(role).catch(() => null);
  return out;
}

/** Last balanced top-level JSON object in the text; reasoning models may emit prose or braces before it. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  let found: string | null = null;
  for (let start = cleaned.indexOf("{"); start >= 0; start = cleaned.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < cleaned.length; i += 1) {
      const c = cleaned[i];
      if (inString) {
        if (c === "\\") i += 1;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === "{") depth += 1;
      else if (c === "}" && --depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        try {
          JSON.parse(candidate);
          found = candidate;
        } catch {
          // Not valid JSON: keep scanning.
        }
        start = i;
        break;
      }
    }
  }
  if (!found) throw new Error(`No JSON in model output: ${cleaned.slice(0, 200)}`);
  return JSON.parse(found);
}

export type UserContent = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

export async function chatJson(
  system: string,
  user: UserContent,
  maxTokens = 600,
  role: Role = "fast",
): Promise<{ json: unknown; ms: number; model: string }> {
  const model = await pickModel(role);
  const body = {
    model,
    temperature: 0.35,
    max_tokens: maxTokens,
    // Nemotron reasons out loud by default: 0.6 s and 31 tokens with this off vs 2.4 s and no answer with it on.
    chat_template_kwargs: { enable_thinking: false },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  const t0 = Date.now();
  let data: ChatResponse;
  try {
    data = await nebiusFetch<ChatResponse>("/chat/completions", {
      method: "POST",
      body: JSON.stringify({ ...body, response_format: { type: "json_object" } }),
    });
  } catch (err) {
    // Some models reject response_format; retry once without it.
    if (!(err instanceof Error) || !err.message.includes(" 400")) throw err;
    data = await nebiusFetch<ChatResponse>("/chat/completions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  const content = data.choices?.[0]?.message?.content ?? "";
  return { json: extractJson(content), ms: Date.now() - t0, model };
}

const DIRECTOR_SYSTEM = `You are BILL, the stage director of a live talk. A confident speaker is improvising on stage. You decide what the audience SEES, like an improv-theatre stage manager: timing is everything.

The audience should NOT read. The slide must SHOW what is being said: a photo, a GIF, a big icon, a chart. Words are only a label of at most 3 words. Plain text slides are the last resort, only for abstract statements.

Output ONLY one JSON object, no prose:
{
 "action": "show" | "hold" | "fact_lookup",
 "reason": "short why",
 "wish": "a picture that is NOT in the speaker's library and that you wish it had for THIS line: one concrete, photographable scene in under 10 words, invented for this exact idea. Different for every line. Never describe a library item. Empty string for filler, greetings and announcements.",
 "search_query": "only for fact_lookup: a web search query",
 "slide": {
   "layout": "SCENE" | "PHOTO" | "GIF_REACTION" | "ICON" | "ICON_GRID" | "CHART" | "BIG_NUMBER" | "DELTA" | "PICTOGRAM" | "STAT_ROW" | "SPLIT_STAT" | "VERSUS" | "REVEAL_3" | "PROCESS" | "CHECKLIST" | "WORDS" | "TITLE_CARD" | "QUOTE" | "QUESTION" | "BIG_WORD",
   "headline": "max 3 words for PHOTO/GIF_REACTION/ICON/CHART, max 5 otherwise, sentence case",
   "body": "optional, max 12 words, usually empty",
   "metaphor": "one sentence: what the picture shows and why it AMPLIFIES the line (a visual metaphor, not the literal words)",
   "image_query": "PHOTO: 2-4 plain english nouns describing a real, photographable scene (e.g. 'lighthouse in storm')",
   "alt_queries": ["PHOTO: three OTHER photographable scenes, simple and concrete, for the same metaphor"],
   "library_id": "PHOTO or GIF_REACTION: id of an item from the speaker's media library, when one truly fits. GIF_REACTION is never valid without it",
   "scene": "one scene name from the SCENES list, ONLY when the NEW LINE is really about that feeling. Leave it out otherwise: most lines fit no scene.",
   "icon": "ICON: one name from the icon list",
   "chart": {"kind": "ring" | "bars", "values": [numbers], "labels": ["short"]},
   "number": "BIG_NUMBER only, e.g. 42%. PICTOGRAM: the share as a fraction, e.g. 1/5",
   "items": ["REVEAL_3: exactly three very short items. PROCESS: 2-4 steps. CHECKLIST: 2-5 items. ICON_GRID: 3-4 items. STAT_ROW: 2-3 figures each with its word, as said. WORDS: 5-8 single words"],
   "icons": ["ICON_GRID only: one icon name per item, same order"],
   "versus": ["VERSUS: the two sides. DELTA: the two figures, before and after, as said"],
   "mood": "hype" | "funny" | "calm" | "serious" | "chaos",
   "motif": "rings" | "stripes" | "dots" | "burst" | "grid",
   "claims_fact": true | false
 }
}

ART DIRECTION. The audience listens to the speaker; they must not read. A picture does not repeat the words, it AMPLIFIES them: show what the idea LOOKS or FEELS like, as a symbol, an analogy, an emotion or a scene. Never illustrate the literal word. Ask: what image would make a stranger FEEL the point without hearing it?
Technique: take the abstract idea, find its tension (speed, fragility, scale, patience, conflict, warmth), then find a physical scene with the same tension. Two examples from a different talk, for the TECHNIQUE only. Never output these scenes: "the project is delicate" -> a soap bubble resting on a fingertip; "we outlasted everyone" -> one tree standing after a forest fire.
Prefer ONE strong, simple subject with space around it. Photographable scenes only: animals, nature, weather, objects, rooms, hands, vehicles, light. Avoid generic stock people shaking hands, laptops, charts-on-screens, and anything with text or logos.

SCENES are wordless animated metaphors the engine draws itself, always available, no media needed:
${SCENES.map((n) => `  ${n} = ${SCENE_CATALOG[n].means}`).join("\n")}
Use layout SCENE only when the NEW LINE is clearly about that feeling and no library item is a clear fit. A scene that does not fit is worse than no slide.

Choosing the visual:
- PHOTO is ONLY for something you could literally photograph: food, an animal, a vehicle, a building or room, a landscape, an object, a crowd or stage. Never for organisations, communities, brands, software, Discord, AI, agents, ideas, verbs or feelings: a photo search finds random unrelated pictures for those. Use ICON or BIG_WORD for them instead.
- A joke, a feeling, a reaction, awkwardness: GIF_REACTION ONLY when the speaker's own library below has a clip that fits the moment, with its library_id. There is no GIF search: without a library clip, use ICON or hold.
- An abstract idea that has a clear symbol (growth, idea, money, speed, security): ICON.
- A quantity or share that you KNOW from the speaker or a source: CHART (ring for one percentage, bars for 2-5 values) or BIG_NUMBER.
- A flow or sequence with an order ("first X, then Y, then Z", "from A to B"): PROCESS with the steps in order. A list of what is needed, done, or promised: CHECKLIST. Three or four parallel concepts that each have a clear symbol: ICON_GRID with one icon per item.
- ONLY a pure topic change with no items ("now let's talk about the money"): TITLE_CARD with the topic in 1-3 words. A line that also lists things is a CHECKLIST, PROCESS or ICON_GRID, never a TITLE_CARD.
- A number that comes with a thing it measures: SPLIT_STAT (number plus icon or image_query). A number alone: BIG_NUMBER.
- A change from one figure to another ("from 12 to 700", "three became forty"): DELTA with versus = [the first figure, the second] and headline = what was counted.
- A share said as a fraction of a group ("one in five", "9 out of 10"): PICTOGRAM with number = "1/5" and headline = who or what.
- Two or three figures in one breath ("40 customers, 12 people, 2 million in revenue"): STAT_ROW with items = each figure with its word.
- A question the speaker asks the room and leaves hanging ("what if slides made themselves?"): QUESTION with the question as headline.
- Five to eight things named in one go (languages, cities, tools): WORDS with items = the words.
- A comparison ("X versus Y", "X or Y", "X vs Y"): ALWAYS VERSUS with versus ["X","Y"], never a GIF or photo, even if the speaker orders it. A list or sequence of exactly three things: REVEAL_3 (always, never a photo).

Icon list: ${ICON_NAMES.join(", ")}.

HOW TO READ THE TRANSCRIPT. You get EARLIER CONTEXT and a NEW LINE. Only the NEW LINE can trigger a slide; the context just explains it. Never react again to something a RECENT SLIDE already covers: if the NEW LINE adds no new visual idea, hold.

HOLD is a normal, frequent decision, not a failure. Return "hold" (no slide) when:
- the line is unfinished, or the setup of a joke or story ("I put...", "And then...", "Imagine..."). The punchline gets the slide, never the setup.
- the line only announces something still to come ("I will tell you <N> things", "here is the problem", "let me explain"). Wait for the content.
- the line is a rhetorical question the speaker is about to answer, filler, a greeting, thanks, or checking notes.
- a RECENT SLIDE already covers what is being said.
Patterns (the angle-bracket words are placeholders, never copy them):
  NEW LINE ends in "...and then I put" -> hold, joke setup
  NEW LINE "So, um, let me check my notes" -> hold, filler
  NEW LINE "Today I will give you <number> points" -> hold, announcement
  NEW LINE lists exactly three things, "<A>, <B> and <C>" -> REVEAL_3 with those three words, taken from the speaker
  NEW LINE says "<number> percent of <group> do <thing>" -> CHART ring with that exact number
  NEW LINE "First <A>, then <B>, and then <C>" (an order of steps) -> PROCESS with items ["<A>","<B>","<C>"], never REVEAL_3
  NEW LINE "You get <A>, <B>, <C> and <D>" (what is included or promised, 2-5 things) -> CHECKLIST with those items
  NEW LINE "<A>, <B>, <C> and <D>" naming four parallel tools or parts -> ICON_GRID with one icon each

NUMBERS. A CHART or BIG_NUMBER may only contain numbers the speaker actually said or a fact_lookup returned. Never make up a figure, a year or a count. If the speaker gestures at a shape without numbers ("slow, slow, then boom"), a CHART with a rough shape is fine; it will be flagged as illustrative automatically.

PHOTO needs a backup: always also give an "icon" in case no photo is found. image_query must be 2-3 plain nouns that describe a real photo (good: "taco bar", "concert crowd", "coffee shop interior"; bad: "OpenSverige community", "AI agents", "build things").

Rules:
- One idea per slide. No bullets. No emojis. Never a text wall.
- Write everything in English: labels, search queries, and the reason. The talk is in English.
- "hold" when the speaker is mid-setup of a joke or story, is rambling filler, or nothing new deserves a slide. Do not cut a setup off from its punchline. When you hold, omit "slide".
- Do not repeat a recent slide. Do not use the same layout three times in a row. Vary: photo, icon, chart, versus, reveal.
- NEVER invent facts, statistics, names or dates. If a slide would state a number or claim you cannot know, use "fact_lookup" and give a search_query. If the slide only sets a mood or a joke, set claims_fact false.
- If an audience QUESTION was asked, prefer an answer slide; use fact_lookup when it needs data.
- If the speaker addressed you directly ("Bill, <request>"), always return "show" (or fact_lookup) for that request.
- Prefer the funniest or most striking visual that is still true to the speaker's point.`;

export interface DirectorInput {
  transcript: string;
  request?: string;
  profile?: Record<string, string>;
  history?: string[];
  /** The newest final line: the only thing that may trigger a slide. */
  latest?: string;
  /** Library GIFs shown recently: on cooldown so the same reaction does not repeat. */
  recentGifIds?: string[];
  /** How much text the audience may see. */
  visualMode?: VisualMode;
  /** Whether photos may come from the web or only from the speaker's own library. */
  imageSource?: ImageSource;
  /** Lowest judge score (1-5) a library pick needs to be shown. 4 is careful, 3 is bold. */
  minFit?: number;
  /** Scenes on the last few slides: one of these may only come back on a clear fit. */
  recentScenes?: string[];
  /** The scene on screen right now: never shown twice in a row. */
  onScreenScene?: string;
  /** How long the current slide has been up. */
  onScreenMs?: number;
  /** The client can have a picture drawn on demand: a line that deserves one no longer has to go without. */
  canDraw?: boolean;
  /** The speaker's own heads-up about the talk. */
  brief?: string;
}

const MODE_BRIEF: Record<VisualMode, string> = {
  pure: "VISUAL MODE: PURE IMAGE. No text on screen. Every slide is a full-screen photo metaphor (PHOTO, or GIF_REACTION with one of the speaker's own clips), or a CHART/BIG_NUMBER only for a number the speaker said. NEVER BIG_WORD, QUOTE, TITLE_CARD or any list. Always give metaphor, image_query and alt_queries. The headline is never shown: keep it to 1-2 words.",
  minimal: "VISUAL MODE: MINIMAL TEXT. Image first: PHOTO full screen (or the speaker's own clip) with a 1-2 word label. Use text templates (REVEAL_3, PROCESS, CHECKLIST, VERSUS) only when the speaker clearly lists or compares. Avoid BIG_WORD, QUOTE and TITLE_CARD. Always give metaphor, image_query and alt_queries.",
  balanced: "VISUAL MODE: BALANCED. Use any template, but prefer a picture whenever the idea can be shown.",
};

const SOURCE_BRIEF: Record<ImageSource, string> = {
  library:
    "MEDIA SOURCE: THE SPEAKER'S LIBRARY ONLY. A photo, GIF or clip may ONLY come from the media library listed below, by library_id. Never write an image_query. Pick an item only when it truly amplifies the NEW LINE as a metaphor or reaction: a weak match is worse than no slide. If nothing fits, use a graphic the speaker's own words support (CHART, BIG_NUMBER, VERSUS, REVEAL_3, PROCESS, CHECKLIST) or hold.",
  web: "MEDIA SOURCE: the speaker's library first (library_id). If nothing there fits, a web photo search is allowed through image_query.",
};

const briefBlock = (brief: string | undefined): string => {
  const text = (brief ?? "").trim().slice(0, 600);
  return text
    ? `THE SPEAKER'S HEADS-UP about this talk (their own words):\n${text}\nSpeech recognition mishears names and jargon. When a word in the NEW LINE sounds like a name or term from the heads-up, read it as that term. Use the heads-up to understand the line, never as something to illustrate on its own.`
    : "";
};

const userPrompt = ({ transcript, history, profile, request, latest, visualMode, imageSource, brief }: DirectorInput, libraryBlock: string): string => {
  const newLine = request ? `Bill, ${request}` : (latest ?? "").trim() || transcript.slice(-200);
  const earlier = latest && transcript.endsWith(latest) ? transcript.slice(0, transcript.length - latest.length).trim() : transcript;
  return [
    MODE_BRIEF[visualMode ?? "balanced"],
    SOURCE_BRIEF[imageSource ?? "library"],
    `CONTEXT PROFILE: ${JSON.stringify(profile ?? {})}`,
    briefBlock(brief),
    `RECENT SLIDES, oldest first (do not repeat or re-cover): ${JSON.stringify(history ?? [])}`,
    `EARLIER CONTEXT (do not react to this):\n${earlier || "(none)"}`,
    libraryBlock,
    `NEW LINE (react to this only):\n${newLine}`,
    request ? "This is a direct order to Bill: always show something for it." : "Decide: show or hold.",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const MIN_LIBRARY_FIT = 4;
// Scenes are abstract and low risk, so a looser match than for the speaker's own pictures is fine.
// Tuned on a real voice session: "we are kind of disorganized" scored scatter=3 and showed nothing at 4.
const MIN_SCENE_FIT = 3;
// A runner-up scene, or one the audience saw a moment ago, needs a clear fit:
// staying on a slide that still works beats swapping it for a weaker idea.
// Tuned on a real session: "why is no one at the Discord" scored hush=5 and was dropped because hush was two slides back.
const MIN_REPEAT_FIT = 4;
// After this long the slide on screen is old news. In a real session one scene stayed up for 35 s
// because the classifier kept voting for it while the speaker had moved on: then a looser runner-up may take over.
const STALE_MS = 12_000;
// Two signals must agree before a slide goes up. When the director also wants a picture, a loose
// scene (3) is enough. When the director wants to hold, only a clear scene (4) overrules it:
// replaying a real session, every "hold + scene 3" slide was noise ("so that's my talk bye" -> launch).
const MIN_OUTVOTE_FIT = 4;
const TEXT_TEMPLATES_PURE = ["BIG_WORD", "QUOTE", "TITLE_CARD", "REVEAL_3", "PROCESS", "CHECKLIST", "ICON_GRID", "VERSUS", "ICON", "QUESTION", "WORDS"];
const TEXT_TEMPLATES_MINIMAL = ["BIG_WORD", "QUOTE", "TITLE_CARD", "ICON", "QUESTION"];

const MOCK_ICONS: [RegExp, string][] = [
  [/rocket|space|launch|ship it/i, "Rocket"],
  [/money|cash|price|cost|budget|revenue/i, "Banknote"],
  [/idea|think|insight|realize/i, "Lightbulb"],
  [/future|ai\b|magic/i, "Sparkles"],
  [/code|dev|bug|engineer/i, "Code"],
  [/love|heart|care/i, "Heart"],
  [/chaos|fire|hot|burn/i, "Flame"],
  [/time|clock|deadline|hours/i, "Clock"],
  [/crowd|people|audience|team|everyone/i, "Users"],
  [/click|mouse|fast|instant/i, "Zap"],
];

function mockDirector(request: string, transcript: string): DirectorResult {
  const source = request || transcript.split(/[.!?]/).filter(Boolean).pop() || transcript;
  const words = source.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter((w) => w.length > 3);
  const key = [...words].sort((a, b) => b.length - a.length)[0] ?? "Do it live";
  const icon = MOCK_ICONS.find(([re]) => re.test(source))?.[1];
  const slide = icon
    ? { layout: "ICON", headline: key, icon, mood: "hype" }
    : { layout: "PHOTO", headline: key, image_query: key, mood: "funny" };
  return { action: "show", reason: "mock director (no NEBIUS_API_KEY)", slide, mock: true };
}

interface TavilyResponse {
  answer?: string;
  results?: { url: string; title: string; content: string }[];
}

export async function tavilySearch(query: string, domains?: string[]): Promise<TavilyResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify(
      domains ? { query, max_results: 5, search_depth: "basic", include_domains: domains } : { query, max_results: 4, include_answer: true, search_depth: "basic" },
    ),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as TavilyResponse;
}

const FACT_SYSTEM = `You turn web search results into ONE slide for a live talk. Output ONLY the JSON object {"slide": {...}} using the same slide schema as before (layout, headline max 5 words, body max 12 words, number, items, versus, mood, claims_fact). No emojis.
Use ONLY the supplied search results. If they contain no reliable number or answer, say so honestly in the headline (for example "No reliable number"). Set "source" to the single best result URL. Write in English.`;

async function factSlide(question: string, searchQuery: string): Promise<{ slide: unknown; ms: number }> {
  const results = await tavilySearch(searchQuery);
  const digest = {
    answer: results.answer,
    results: (results.results ?? []).slice(0, 4).map((r) => ({
      url: r.url,
      title: r.title,
      content: String(r.content).slice(0, 500),
    })),
  };
  const { json, ms } = await chatJson(
    FACT_SYSTEM,
    `QUESTION: ${question}\nSEARCH RESULTS: ${JSON.stringify(digest)}`,
    500,
    "quality",
  );
  const wrapped = (json ?? {}) as { slide?: Record<string, unknown> };
  const slide: Record<string, unknown> = { ...(wrapped.slide ?? (json as Record<string, unknown>)) };
  slide.source = slide.source ?? digest.results[0]?.url ?? null;
  slide.claims_fact = true;
  return { slide, ms };
}

export async function embed(texts: string[]): Promise<number[][] | null> {
  if (!providers.nebius() || texts.length === 0) return null;
  try {
    const model = await modelFor("embed");
    if (!model) return null;
    const data = await nebiusFetch<{ data?: { embedding: number[] }[] }>("/embeddings", {
      method: "POST",
      body: JSON.stringify({ model, input: texts }),
      // Ranking is a nicety: if embeddings are slow, the caller falls back to word matching.
      signal: AbortSignal.timeout(2500),
    });
    const vectors = (data.data ?? []).map((d) => d.embedding);
    return vectors.length === texts.length ? vectors : null;
  } catch {
    return null;
  }
}

const SCENE_SYSTEM = `You match one spoken line from a live talk to an animated metaphor, or to none.
Scenes:
${SCENES.map((n) => `  ${n} = ${SCENE_CATALOG[n].means}`).join("\n")}
Pick the single scene whose meaning the line is really about. Score the fit: 5 = the line is plainly about this, 4 = clearly this feeling, 3 = loosely, 1-2 = no.
Filler, greetings, names, questions and plain facts fit nothing. Most lines fit nothing.
Then name a second, different scene the line could also be about, with its own honest score.
Reply ONLY JSON: {"scene": "<name or none>", "fit": <1-5>, "second": "<name or none>", "second_fit": <1-5>}`;

interface SceneVote {
  scene: string;
  fit: number;
}

/** Which wordless scene, if any, this line is about. Runs beside the director, so it costs no extra time. */
// Deliberately blind to the speaker's heads-up: when it saw the talk's themes it started
// showing those themes on unrelated lines (tested on a real session: 11 slides, most of them wrong).
// Returns the best scene and a runner-up, best first: the runner-up is used when the best one is already on screen.
async function classifyScene(line: string): Promise<SceneVote[]> {
  try {
    const { json } = await chatJson(SCENE_SYSTEM, `LINE: ${line}`, 50);
    const r = json as { scene?: unknown; fit?: unknown; second?: unknown; second_fit?: unknown };
    const vote = (name: unknown, score: unknown): SceneVote | null => {
      const scene = String(name ?? "").toLowerCase();
      const fit = Number(score);
      return isScene(scene) && Number.isFinite(fit) ? { scene, fit } : null;
    };
    const first = vote(r.scene, r.fit);
    const second = vote(r.second, r.second_fit);
    return [first, second && second.scene !== first?.scene ? second : null].filter((v): v is SceneVote => v !== null);
  } catch {
    return [];
  }
}

const JUDGE_SYSTEM = `You are a strict picture editor for a live talk. Decide if a picture amplifies what the speaker just said: as a visual metaphor, or as a reaction whose emotion is exactly the emotion of the moment.
Score 1-5. 5 = obvious and striking. 4 = clearly fits. 3 = a stretch that needs explaining. 2 = only loosely related. 1 = unrelated.
Sharing a single word is not a fit. If the connection needs explaining, it is 3 or lower.
Reply ONLY JSON: {"fit": <1-5>}`;

/** Independent check of a library pick. Returns 0 when the judge cannot be reached (treated as no fit). */
async function judgeFit(line: string, item: Pick<LibraryItem, "caption" | "emotion" | "useWhen" | "knownAs" | "origin" | "meaning">): Promise<number> {
  try {
    // The culture is what makes a reaction land: the judge has to know "Blinking White Guy" means disbelief.
    const known = item.knownAs ? `The "${item.knownAs}" GIF${item.origin ? ` from ${item.origin}` : ""}. ` : "";
    const says = item.meaning ? ` People use it to say: ${item.meaning}.` : "";
    const picture = `${known}${item.caption} Emotion: ${item.emotion || "unknown"}.${says} The speaker says it could stand for: ${item.useWhen || "nothing noted"}.`;
    const { json } = await chatJson(JUDGE_SYSTEM, `SPEAKER SAID: ${line}\nPICTURE: ${picture}`, 20);
    const fit = Number((json as { fit?: unknown }).fit);
    return Number.isFinite(fit) ? fit : 0;
  } catch {
    return 0;
  }
}

export async function direct(input: DirectorInput): Promise<DirectorResult> {
  const { transcript, request = "" } = input;
  if (!providers.nebius()) return mockDirector(request, transcript);
  if (!request && input.latest && isAnnouncement(input.latest)) {
    return { action: "hold", reason: "announcement: wait for the items" };
  }

  const exclude = new Set(input.recentGifIds ?? []);
  const candidates = await libraryCandidates(`${request} ${input.latest ?? transcript.slice(-300)}`, 24, exclude);
  const libraryBlock = candidates.length
    ? `THE SPEAKER'S MEDIA LIBRARY (id | kind | what it shows | what people use it to say | could stand for). Return the id as "library_id":\n${candidates
        .map(libraryLine)
        .join("\n")}`
    : "THE SPEAKER'S MEDIA LIBRARY is empty.";
  const scenePromise: Promise<SceneVote[]> = !request && input.latest ? classifyScene(input.latest) : Promise.resolve([]);
  const { json, ms, model } = await chatJson(DIRECTOR_SYSTEM, userPrompt(input, libraryBlock));
  const votes = await scenePromise;
  const topVote: SceneVote = votes[0] ?? { scene: "", fit: 0 };
  const recentScenes = new Set(input.recentScenes ?? []);
  const stale = topVote.scene === input.onScreenScene && (input.onScreenMs ?? 0) > STALE_MS;
  const needed = (v: SceneVote, i: number): number => (recentScenes.has(v.scene) || (i > 0 && !stale) ? MIN_REPEAT_FIT : MIN_SCENE_FIT);
  const sceneChoice: SceneVote = votes.find((v, i) => v.scene !== input.onScreenScene && v.fit >= needed(v, i)) ?? { scene: "", fit: 0 };
  // Why no picture went up, in words a session log can be read by.
  const noPicture = (): string => {
    if (topVote.fit < MIN_SCENE_FIT) return "no picture for this line: the library has none and no scene fits";
    return topVote.scene === input.onScreenScene
      ? `no new picture: scene ${topVote.scene} still fits and is on screen`
      : `no picture for this line: scene ${topVote.scene} was shown a moment ago and fits only loosely (${topVote.fit})`;
  };
  // The director wants a picture and none is ready: with drawing on, that is an order for the drawing model.
  const noPictureResult = (base: DirectorResult): DirectorResult =>
    input.canDraw && !request
      ? { ...base, action: "show", slide: undefined, draw: true, reason: "no ready picture for this line: drawing one" }
      : { ...base, action: "hold", slide: undefined, reason: noPicture() };
  // Everything that shaped the decision, so a session log can explain a silence.
  const debug: Record<string, unknown> = { scene: topVote.scene || "none", sceneFit: topVote.fit, alt: votes[1]?.scene, altFit: votes[1]?.fit, sceneUsed: sceneChoice.scene || undefined, modelAction: (json as { action?: string }).action, modelLayout: ((json as { slide?: { layout?: string } }).slide ?? {}).layout, mode: input.visualMode, source: input.imageSource };
  const sceneFits = sceneChoice.scene !== "";
  const parsed = json as DirectorResult & { search_query?: string };
  const out: DirectorResult = { ...parsed, ms, model, debug, wish: typeof parsed.wish === "string" ? parsed.wish.slice(0, 120) : undefined };

  // The director model holds far too often on real, rambling speech ("that is just a setup").
  // When the scene classifier sees a clear feeling in the thought, that outvotes the hold.
  const thoughtWords = (input.latest ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (!request && (parsed.action === "hold" || !parsed.slide) && sceneFits && sceneChoice.fit >= MIN_OUTVOTE_FIT && thoughtWords >= 4) {
    parsed.slide = { layout: "SCENE", scene: sceneChoice.scene, headline: sceneChoice.scene };
    parsed.action = "show";
    out.slide = parsed.slide;
    out.action = "show";
    out.reason = `scene ${sceneChoice.scene} fits (${sceneChoice.fit}); the director wanted to hold`;
  }

  // Figures the speaker states are the slides that are never a guess: a change ("from 12 to 700"), a share
  // of a group ("one in five"), several figures in one breath, or one count. Each is read from the line itself.
  const figure = !request && input.latest ? figureFromLine(input.latest) : null;
  if (figure && !(input.history ?? []).includes(figure.key)) {
    parsed.slide = figure.slide;
    parsed.action = "show";
    out.slide = parsed.slide;
    out.action = "show";
    out.reason = figure.reason;
    debug.count = figure.key;
  }
  // In a real session "we are right now 700 people" was held three times while the model looked for a photo.
  const count = !figure && !request && input.latest && percentFromLine(input.latest) === null ? countFromLine(input.latest) : null;
  if (count && !(input.history ?? []).includes(`${count.label} [BIG_NUMBER]`)) {
    parsed.slide = { layout: "BIG_NUMBER", number: count.number, headline: count.label, mood: "hype" };
    parsed.action = "show";
    out.slide = parsed.slide;
    out.action = "show";
    out.reason = `the speaker said a figure: ${count.number} ${count.label}`;
    debug.count = `${count.number} ${count.label}`;
  }

  // A direct order always gets a slide, even if the model wanted to hold.
  if (request && (!parsed.slide || parsed.action === "hold")) {
    parsed.slide = { layout: "BIG_WORD", headline: request };
    parsed.action = "show";
    out.slide = parsed.slide;
    out.action = "show";
  }

  const index = await loadIndex();
  // A wish that just describes something already in the library is not a wish.
  if (out.wish) {
    const words = out.wish.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const inLibrary = index.some((item) => {
      const caption = `${item.caption} ${item.tags.join(" ")}`.toLowerCase();
      return words.length > 0 && words.filter((w) => caption.includes(w)).length / words.length >= 0.5;
    });
    if (inLibrary || words.length === 0) out.wish = undefined;
  }
  const assignItem = (slide: Record<string, unknown>, item: { id: string; mime: string }): void => {
    slide.library_id = item.id;
    slide.layout = isMotion(item) ? "GIF_REACTION" : "PHOTO";
  };

  // Naming an item out loud always wins over the model's judgement ("Bill, Pacino").
  const named = request ? await namedMatch(request) : null;
  if (named) {
    const forced: Record<string, unknown> = { ...(parsed.slide as Record<string, unknown> | undefined) };
    assignItem(forced, named);
    forced.headline = forced.headline ?? request;
    out.slide = forced;
    out.action = "show";
    out.reason = `named item: ${named.name}`;
    parsed.slide = forced;
    parsed.action = "show";
  }

  // The director held, but the speaker just said a word that is the name or a tag of one of their own
  // files ("he just blinked"): that file still gets its hearing from the judge below.
  if (!request && !parsed.slide && input.latest && (await literalMatch(input.latest, exclude))) {
    parsed.slide = { layout: "GIF_REACTION", headline: "" };
    debug.literalOnly = true;
  }

  // The model's own pick is a proposal. A separate strict judge decides whether it really fits,
  // because a model always rates its own choice highly.
  const slideObj = parsed.slide as Record<string, unknown> | undefined;
  if (slideObj && !named) {
    const proposed = index.find((i) => i.id === slideObj.library_id);
    slideObj.library_id = undefined;
    if (request) {
      // A direct order: the speaker's own words pick the item, then the model's proposal.
      const ordered = (await lexicalMatch(request, exclude)) ?? proposed;
      if (ordered) assignItem(slideObj, ordered);
    } else {
      // Besides the model's own pick, an item whose name or tags contain a word the speaker just said
      // gets a hearing: "he just blinked" must be able to find the blinking GIF. The judge scores both.
      const line = input.latest || transcript.slice(-200);
      const literal = input.latest ? await literalMatch(input.latest, exclude) : null;
      const picks = [proposed, literal].filter((p, i, all): p is NonNullable<typeof p> => Boolean(p) && all.findIndex((q) => q?.id === p?.id) === i);
      const fits = await Promise.all(picks.map((p) => judgeFit(line, p)));
      const best = fits.indexOf(Math.max(...fits, 0));
      if (picks.length > 0 && best >= 0) {
        debug.proposed = picks[best].name;
        debug.judgeFit = fits[best];
        if (fits[best] >= (input.minFit ?? MIN_LIBRARY_FIT)) {
          assignItem(slideObj, picks[best]);
          out.slide = slideObj;
          out.action = "show";
          parsed.action = "show";
        } else out.reason = `${out.reason ?? ""} (library pick ${picks[best].name} rejected, fit ${fits[best]})`.trim();
      }
    }
  }

  // The literal check found nothing the judge would show: back to the director's hold.
  if (debug.literalOnly && !(parsed.slide as Record<string, unknown> | undefined)?.library_id) parsed.slide = undefined;

  // A question whose answer carries a number nobody said is looked up, never guessed.
  const asked = request || input.latest || "";
  const guessedNumber =
    Boolean(request) && isQuestion(asked) && Boolean(parsed.slide) && hasUngroundedNumbers(parsed.slide as Record<string, unknown>, `${transcript} ${request}`);

  // "Bill, how many people live in Sweden?" is an order for a fact, whatever the model made of it.
  const factualOrder = /^(how (many|much|long|old|big|far|fast|tall)|what (percent|percentage|year|is the (population|price|cost|size))|when (did|was|is|were))\b/i.test(request);

  if (parsed.action === "fact_lookup" || guessedNumber || factualOrder) {
    const query = parsed.search_query || request || input.latest || transcript.slice(-200);
    if (providers.tavily()) {
      const fact = await factSlide(request || transcript.slice(-300), query);
      out.slide = fact.slide;
      out.action = "show";
      out.ms = (out.ms ?? 0) + fact.ms;
    } else {
      out.slide = { ...((parsed.slide as object) ?? { layout: "BIG_WORD", headline: "Fact check", mood: "serious" }), claims_fact: true };
      out.action = "show";
      out.reason = `${out.reason ?? ""} (no TAVILY_API_KEY: unsourced)`;
    }
  }
  // The model sometimes returns only the ordinals ("One", "Two"): take the content from the speaker's own words.
  if (out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    if (String(slide.layout ?? "").toUpperCase() === "REVEAL_3" && areBareOrdinals(slide.items)) {
      const items = itemsFromEnumeration(input.latest ?? "");
      if (items) slide.items = items;
      else {
        out.action = "hold";
        out.slide = undefined;
        out.reason = "list items not spoken yet";
      }
    }
  }

  // Ordered steps and promised items are templates, read straight from the speaker's words.
  if (!request && input.latest && out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    const steps = processFromLine(input.latest);
    const checks = steps ? null : checklistFromLine(input.latest);
    if (steps) {
      slide.layout = "PROCESS";
      slide.items = steps;
    } else if (checks) {
      slide.layout = "CHECKLIST";
      slide.items = checks;
    }
    if (steps || checks) out.action = "show";
  }

  // "Bill, cats or dogs" / "tabs vs spaces" is always a duel slide.
  const duel = request.match(/^(?:show me |give me )?(.{2,30}?)\s+(?:versus|vs\.?|or)\s+(.{2,30})$/i);
  if (duel && out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    slide.layout = "VERSUS";
    slide.versus = [duel[1].trim(), duel[2].trim()];
    out.action = "show";
  }

  // A share the speaker states ("eighty percent", "half of") is always drawn as a ring.
  const share = !request && input.latest ? percentFromLine(input.latest) : null;
  if (share !== null && out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    if (!["CHART", "VERSUS", "REVEAL_3", "GIF_REACTION", "DELTA", "PICTOGRAM", "STAT_ROW"].includes(String(slide.layout ?? "").toUpperCase())) {
      slide.layout = "CHART";
      slide.chart = { kind: "ring", values: [share], labels: [] };
      slide.number = undefined;
    }
  }
  if (out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    if (!slide.library_id && String(slide.layout ?? "").toUpperCase() === "PHOTO" && isAbstractPhotoQuery(String(slide.image_query ?? slide.headline ?? ""))) {
      slide.layout = slide.icon ? "ICON" : "BIG_WORD";
    }
  }
  if (out.slide && typeof out.slide === "object") {
    // The thought includes words still being spoken; the transcript only has finished phrases.
    groundSlide(out.slide as Record<string, unknown>, `${transcript} ${input.latest ?? ""} ${request}`);
    // The schema's own hint is not a headline.
    const slide = out.slide as Record<string, unknown>;
    if (/^(max )?\d+(-\d+)? words/i.test(String(slide.headline ?? ""))) slide.headline = "";
  }
  // Image-first modes and the library-only rule are enforced here, whatever the model chose.
  const mode = input.visualMode ?? "balanced";
  const source = input.imageSource ?? "library";
  const wantsText = /^(write|text|say|spell|quote)\b/i.test(request);
  if (out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    const hasItem = Boolean(slide.library_id);
    let layout = String(slide.layout ?? "").toUpperCase();
    const textual = mode === "pure" ? TEXT_TEMPLATES_PURE : mode === "minimal" ? TEXT_TEMPLATES_MINIMAL : [];
    if (!wantsText && !hasItem && textual.includes(layout)) {
      const brief = String(slide.image_query || slide.metaphor || slide.headline || "").trim();
      if (source === "web" && brief) {
        slide.layout = "PHOTO";
        slide.image_query = String(slide.image_query || brief);
      } else if (sceneFits) {
        slide.layout = "SCENE";
        slide.scene = sceneChoice.scene;
        slide.headline = sceneChoice.scene;
      } else if (mode === "minimal" && slide.icon) {
        slide.layout = "ICON";
      } else if (!request) {
        return noPictureResult(out);
      }
      layout = String(slide.layout).toUpperCase();
    }
    // Library only: a photo or clip the speaker did not upload is never shown.
    // A clip without a library item has nowhere to come from, whatever the source setting.
    if (!hasItem && (layout === "GIF_REACTION" || (source === "library" && layout === "PHOTO"))) {
      if (sceneFits) {
        slide.layout = "SCENE";
        slide.scene = sceneChoice.scene;
        slide.headline = sceneChoice.scene;
      } else if (mode === "balanced") slide.layout = slide.icon ? "ICON" : "BIG_WORD";
      else if (mode === "minimal" && slide.icon) slide.layout = "ICON";
      else if (request) slide.layout = slide.icon ? "ICON" : "BIG_WORD";
      else return noPictureResult(out);
    }
  }

  if (out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    const layout = String(slide.layout ?? "").toUpperCase();
    const visual = ["VERSUS", "REVEAL_3", "CHART", "ICON", "GIF_REACTION", "SCENE", "PHOTO", "DELTA", "PICTOGRAM", "STAT_ROW", "WORDS"].includes(layout);
    if (!visual && !String(slide.headline ?? "").trim() && !slide.number) {
      return { ...out, action: "hold", slide: undefined, reason: `${out.reason ?? ""} (empty slide dropped)`.trim() };
    }
  }
  // A scene has to earn its place like any picture. The classifier decides, not the director's own choice.
  if (out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    if (String(slide.layout ?? "").toUpperCase() === "SCENE") {
      if (request) {
        if (!isScene(String(slide.scene ?? "").toLowerCase())) slide.layout = slide.icon ? "ICON" : "BIG_WORD";
      } else if (sceneFits) {
        slide.scene = sceneChoice.scene;
      } else {
        return noPictureResult(out);
      }
    }
  }
  if (out.slide && typeof out.slide === "object") {
    const slide = out.slide as Record<string, unknown>;
    if (!["PHOTO", "GIF_REACTION"].includes(String(slide.layout ?? "").toUpperCase())) slide.library_id = undefined;
    // A scene is a stand-in from a fixed kit. When a picture can be drawn for the line itself, the scene is only the fallback.
    if (input.canDraw && !request && String(slide.layout ?? "").toUpperCase() === "SCENE") out.draw = true;
    // The lone icon slide looked weak on stage (speaker's review): the drawing model or an interface element does it better.
    if (input.canDraw && !request && String(slide.layout ?? "").toUpperCase() === "ICON") {
      out.draw = true;
      out.slide = undefined;
    }
  }
  return out;
}
