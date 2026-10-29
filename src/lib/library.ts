// The speaker's own GIF library. Files live on disk, a vision model describes them,
// so file names never matter. Server-only.
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "library");
const FILES = path.join(ROOT, "files");
const INDEX = path.join(ROOT, "index.json");

export interface LibraryItem {
  id: string;
  file: string;
  name: string;
  mime: string;
  caption: string;
  tags: string[];
  emotion: string;
  useWhen: string;
  /** "vision" when a model looked at it, "filename" when only the name was available. */
  source: "vision" | "filename";
  /** One of CATEGORIES: what the file says on a slide. */
  category?: string;
  /** The meme or famous moment it is, when the web confirmed it ("Blinking White Guy"). */
  knownAs?: string;
  /** Film, show or viral video it comes from. */
  origin?: string;
  /** What people use it to say. */
  meaning?: string;
  /** The web page that named it. */
  evidence?: string;
  /** False when the file name says nothing true about the file ("IMG_4411", "invoice"). */
  nameFits?: boolean;
  /** Read from the file itself: a one-frame GIF is a still, an animated WebP moves. */
  motion?: boolean;
  /** SHA-256 of the bytes: the same GIF under another name is a duplicate. */
  hash?: string;
  embedding?: number[];
}

/** What a library item can say on stage. Reactions first; "scene" moves without reacting, "picture" is a still. */
export const CATEGORIES = [
  "yes", "no", "applause", "celebrate", "hype", "mind blown", "shock", "scared", "awkward", "confused",
  "facepalm", "fail", "eye roll", "bored", "waiting", "thinking", "suspicious", "laughing", "sad", "angry",
  "love", "smug", "nervous", "mic drop", "hello", "goodbye", "chaos", "scene", "picture",
] as const;

/** Items saved before the bytes were read have no motion flag: GIFs and clips counted as moving. */
export const isMotion = (item: Pick<LibraryItem, "mime" | "motion">): boolean =>
  item.motion ?? (item.mime === "image/gif" || item.mime.startsWith("video/"));

export const hashOf = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

/** The file name only where it agrees with the frames: a wrong name must never match a spoken word. */
const trustedName = (item: Pick<LibraryItem, "name" | "nameFits">): string =>
  item.nameFits === false ? "" : item.name.replace(/\.\w+$/, "");

/** One line per item for a model prompt. Kept short: the director reads it on every spoken line. */
export const libraryLine = (i: LibraryItem): string =>
  [
    i.id,
    isMotion(i) ? "gif/clip" : "photo",
    i.knownAs ? `${i.knownAs}: ${i.caption}` : i.caption,
    i.meaning ? `says "${i.meaning.slice(0, 60)}"` : "",
    i.useWhen,
  ].filter(Boolean).join(" | ");

export async function loadIndex(): Promise<LibraryItem[]> {
  try {
    return JSON.parse(await readFile(INDEX, "utf8")) as LibraryItem[];
  } catch {
    return [];
  }
}

/** Atomic: a crash mid-write must never leave a truncated index. */
async function saveIndex(items: LibraryItem[]): Promise<void> {
  await mkdir(ROOT, { recursive: true });
  const tmp = `${INDEX}.tmp`;
  await writeFile(tmp, JSON.stringify(items));
  await rename(tmp, INDEX);
}

// Every change to the index is read-modify-write. Requests overlap (two uploads at once, a director
// call while a GIF is being edited), so changes run one at a time or one of them is silently lost.
let indexQueue: Promise<unknown> = Promise.resolve();
function mutateIndex<T>(change: (items: LibraryItem[]) => Promise<{ items: LibraryItem[]; result: T }>): Promise<T> {
  const run = indexQueue.then(async () => {
    const { items, result } = await change(await loadIndex());
    await saveIndex(items);
    return result;
  });
  indexQueue = run.catch(() => undefined);
  return run;
}

export const filePath = (item: LibraryItem): string => path.join(FILES, item.file);

const tokens = (text: string | undefined): string[] =>
  (text ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length > 2);

/** What the engine concluded a file is. Falls back to file-name words so the flow works without a key. */
export interface Description {
  caption: string;
  tags: string[];
  emotion: string;
  useWhen: string;
  source: "vision" | "filename";
  category?: string;
  knownAs?: string;
  origin?: string;
  meaning?: string;
  evidence?: string;
  nameFits?: boolean;
}

export interface WebResult {
  title: string;
  url: string;
  content: string;
}

/** The models and the web search the engine reads with, passed in so this module stays free of keys. */
export interface Readers {
  chat: (system: string, user: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[], role: "vision" | "quality", maxTokens: number) => Promise<unknown>;
  search: (query: string) => Promise<WebResult[]>;
  hasVision: boolean;
}

// Step 1: the eyes. Only what is in the frames; naming is left to evidence, never to a face.
const LOOK_SYSTEM = `You look at up to six frames, in order, from one file a speaker dropped into the media library of a live-talk tool. Describe only what you see. Output ONLY JSON:
{"what": "what happens across the frames, one concrete sentence in english: who or what, the action, how the expression or pose CHANGES from frame to frame",
 "text": "words written in the frames (captions, subtitles, signs) exactly, or empty",
 "look": "film | tv show | cartoon | anime | video game | sports | news | webcam or phone video | photo | screenshot | chart or map | illustration | logo",
 "feeling": "the one emotion it shows",
 "guess": "the meme, film or show, only if the scene itself is famous and you are sure, else empty",
 "safe": true | false}
"safe" is false for nudity, graphic violence or hate. Never name a person from their face.`;

// Step 3: the culture desk. Frames are the truth; the name and the web are witnesses that can lie.
const CULTURE_SYSTEM = `You are the culture desk of a live-talk tool. A speaker dropped a file into their library. You get what a vision model saw in its frames, the file name (it may be wrong or meaningless) and web results found for it. Decide what this file IS and what it MEANS to an audience that knows internet culture. Output ONLY JSON:
{"known_as": "the common name of this meme, GIF or famous moment (e.g. 'Blinking White Guy', 'This is fine'), ONLY when a web result names it AND that result matches what the frames show; else empty",
 "origin": "the film, show, stream or viral video it comes from, with year, only when a web result says so; else empty",
 "evidence": "url of the web result that names it, or empty",
 "meaning": "what people use it to say, under 12 words (e.g. 'disbelief at something absurd someone just said')",
 "category": "exactly one of: ${CATEGORIES.join(", ")}",
 "caption": "what is shown, one sentence in english",
 "tags": ["6-10 lowercase english words: subject, action, emotion; the meme, film or show name only when known_as or origin is set"],
 "emotion": "one word",
 "use_when": "three short moments in a talk this could amplify, comma separated",
 "name_fits": false ONLY when the file name is meaningless (numbers, IMG_1234, download, giphy, untitled) or clearly names something else than the frames show (a cat called "car"); a person, film, show or word the frames cannot confirm or deny still fits: true}
The frames are the truth. A file name or web result that disagrees with them is wrong: ignore it. An empty known_as is fine; a wrong one ruins a talk. "scene" is for something that moves without reacting, "picture" for a still that is not a reaction.`;

/** Name words worth a web search: not "IMG_4411", "download (3)" or "giphy". */
const nameHint = (base: string): string =>
  tokens(base)
    .filter((t) => !/^(img|image|download|giphy|tenor|gif|video|screenshot|untitled|copy|final|file|photo|scan|frame)$/.test(t) && !/\d{3,}/.test(t))
    .join(" ");

const text = (value: unknown, max: number): string => String(value ?? "").trim().slice(0, max);

export async function describe(name: string, frames: string[], readers: Readers): Promise<Description & { safe: boolean }> {
  const base = name.replace(/\.[^.]+$/, "");
  const fallback = {
    caption: base.replace(/[-_]+/g, " "),
    tags: tokens(base),
    emotion: "",
    useWhen: "",
    source: "filename" as const,
    safe: true,
  };
  if (!readers.hasVision || frames.length === 0) return fallback;

  let seen: { what?: string; text?: string; look?: string; feeling?: string; guess?: string; safe?: boolean };
  try {
    seen = (await readers.chat(LOOK_SYSTEM, frames.slice(0, 6).map((url) => ({ type: "image_url" as const, image_url: { url } })), "vision", 300)) as typeof seen;
  } catch {
    return fallback;
  }
  if (seen.safe === false) return { ...fallback, safe: false };
  const what = text(seen.what, 200);
  const look = { caption: what || fallback.caption, tags: tokens(`${what} ${seen.feeling ?? ""}`).slice(0, 10), emotion: text(seen.feeling, 30), useWhen: "", source: "vision" as const, safe: true };

  // Step 2: the web. A hinted search (what the frames say, the guess, a meaningful name) and a visual
  // one run side by side; reaction GIF sites title their pages with the name people know.
  const hint = [text(seen.text, 60), text(seen.guess, 60), nameHint(base)].filter(Boolean).join(" ");
  const queries = [hint && `${hint} gif`, `${what.slice(0, 120)} reaction gif meme`].filter(Boolean);
  const found = (await Promise.all(queries.map((q) => readers.search(q).catch(() => [] as WebResult[])))).flat();
  const web = found.filter((r, i) => found.findIndex((o) => o.url === r.url) === i).slice(0, 8);

  try {
    const brief = [
      `FRAMES: ${what}`,
      `TEXT IN FRAMES: ${text(seen.text, 120) || "none"}`,
      `LOOK: ${text(seen.look, 40)}`,
      `FEELING: ${look.emotion}`,
      `VISION GUESS (unconfirmed): ${text(seen.guess, 60) || "none"}`,
      `FILE NAME (may be wrong): ${name}`,
      `WEB RESULTS:\n${web.map((r) => `- ${r.url} | ${r.title} | ${r.content.slice(0, 220).replace(/\s+/g, " ")}`).join("\n") || "none"}`,
    ].join("\n");
    const json = (await readers.chat(CULTURE_SYSTEM, brief, "quality", 500)) as Record<string, unknown>;
    const nameFits = json.name_fits !== false;
    const knownAs = text(json.known_as, 60);
    const evidence = text(json.evidence, 300);
    // Names come from evidence, not from the model's memory: the meme name needs the page it cites,
    // and the film or show has to be named on that same page (or, without one, on any result).
    const page = web.find((r) => r.url === evidence);
    const onPage = (claim: string, pages: WebResult[]): boolean => {
      const words = tokens(claim.replace(/\(.*?\)/g, "")).filter((w) => w.length > 3);
      return words.length > 0 && pages.some((r) => words.every((w) => tokens(`${r.title} ${r.content} ${r.url}`).includes(w)));
    };
    const origin = text(json.origin, 80);
    const category = CATEGORIES.find((c) => c === text(json.category, 20).toLowerCase()) ?? (look.emotion ? "scene" : "picture");
    const modelTags = (Array.isArray(json.tags) ? json.tags : []).map((t) => String(t).toLowerCase()).slice(0, 12);
    return {
      caption: text(json.caption, 200) || look.caption,
      // A file name only becomes a tag when it agrees with the frames: "invoice.gif" must not answer to "invoice".
      tags: [...new Set([...modelTags, ...(page ? tokens(knownAs) : []), ...(nameFits ? tokens(base) : [])])],
      emotion: text(json.emotion, 30) || look.emotion,
      useWhen: text(json.use_when, 120),
      source: "vision",
      category,
      // A name without a page that says so is a guess: it stays out.
      knownAs: page ? knownAs : "",
      origin: origin && onPage(origin, page ? [page] : web) ? origin : "",
      meaning: text(json.meaning, 100),
      evidence: page ? evidence : "",
      nameFits,
      safe: true,
    };
  } catch {
    return look;
  }
}

export interface FileFacts {
  mime: string;
  ext: string;
  motion: boolean;
  hash: string;
}

export async function addItem(fileName: string, bytes: Uint8Array, description: Description, facts: FileFacts, embedding?: number[]): Promise<LibraryItem> {
  return mutateIndex(async (items) => {
    const id = `g${Date.now().toString(36)}${items.length.toString(36)}`;
    const file = `${id}${facts.ext}`;
    await mkdir(FILES, { recursive: true });
    await writeFile(path.join(FILES, file), bytes);
    const item: LibraryItem = { ...description, id, file, name: fileName, mime: facts.mime, motion: facts.motion, hash: facts.hash, embedding };
    return { items: [...items, item], result: item };
  });
}

/** The item already holding these exact bytes. Items saved before hashing get their hash read from disk. */
export async function findByHash(hash: string): Promise<LibraryItem | null> {
  for (const item of await loadIndex()) {
    const own = item.hash ?? (await readFile(filePath(item)).then((b) => hashOf(b), () => ""));
    if (own === hash) return item;
  }
  return null;
}

export async function updateItem(id: string, patch: Partial<Omit<LibraryItem, "id" | "file" | "embedding">>): Promise<LibraryItem | null> {
  return mutateIndex(async (items) => {
    const item = items.find((i) => i.id === id);
    if (!item) return { items, result: null };
    // Only defined fields: an undefined value would serialize away and erase the field.
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) Object.assign(item, { [key]: value });
    }
    delete item.embedding; // stale after an edit
    return { items, result: item };
  });
}

export async function removeItem(id: string): Promise<boolean> {
  return mutateIndex(async (items) => {
    const item = items.find((i) => i.id === id);
    if (!item) return { items, result: false };
    await unlink(filePath(item)).catch(() => undefined);
    return { items: items.filter((i) => i.id !== id), result: true };
  });
}

export const itemText = (i: Pick<LibraryItem, "caption" | "tags" | "emotion" | "useWhen" | "knownAs" | "origin" | "meaning" | "category">): string =>
  [i.knownAs, i.origin, i.caption, (i.tags ?? []).join(", "), i.category, i.emotion, i.meaning, i.useWhen].filter(Boolean).join(". ");

const cosine = (a: number[], b: number[]): number => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

type Embedder = (texts: string[]) => Promise<number[][] | null>;
let embedder: Embedder | null = null;
export const setEmbedder = (fn: Embedder): void => {
  embedder = fn;
};

export interface Scored {
  item: LibraryItem;
  /** Cosine similarity 0..1 when embeddings are available, otherwise a word-overlap count. */
  score: number;
  semantic: boolean;
}

/** Ranked library for a phrase, with scores. Always ranks, even for a tiny library. */
export async function rankedMatches(query: string, exclude: ReadonlySet<string> = new Set()): Promise<Scored[]> {
  // Filter only in memory, after loading: the saved index must always hold every item.
  const items = (await loadEmbedded()).filter((i) => !exclude.has(i.id));
  if (items.length === 0) return [];
  const q = embedder ? await embedder([query]) : null;
  if (q && items.every((i) => i.embedding)) {
    return items
      .map((item) => ({ item, score: cosine(q[0], item.embedding ?? []), semantic: true }))
      .sort((a, b) => b.score - a.score);
  }
  const qt = new Set(tokens(query));
  return items
    .map((item) => ({ item, score: tokens(itemText(item)).filter((t) => qt.has(t)).length, semantic: false }))
    .sort((a, b) => b.score - a.score);
}

/** Best single match for a phrase. */
export async function bestMatch(query: string, exclude: ReadonlySet<string> = new Set()): Promise<LibraryItem | null> {
  return (await rankedMatches(query, exclude))[0]?.item ?? null;
}

/** Fast word-overlap match, no network: used when the speaker orders something and the model picked nothing. */
export async function lexicalMatch(query: string, exclude: ReadonlySet<string> = new Set()): Promise<LibraryItem | null> {
  const want = new Set(tokens(query).filter((t) => !STOP.has(t)));
  if (want.size === 0) return null;
  let best: LibraryItem | null = null;
  let bestScore = 0;
  for (const item of await loadIndex()) {
    if (exclude.has(item.id)) continue;
    const score = tokens(itemText(item)).filter((t) => want.has(t)).length;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

const stem = (word: string): string => {
  const cut = word.replace(/(ing|ed|es|s)$/, "");
  return cut.length >= 4 ? cut : word;
};

/**
 * An item whose own name or tags contain a word the speaker just said ("he just blinked" and
 * blinking-eyes.gif). Captions are left out on purpose: this is for the obvious, literal hit only.
 */
export async function literalMatch(line: string, exclude: ReadonlySet<string> = new Set()): Promise<LibraryItem | null> {
  const said = new Set(tokens(line).filter((t) => t.length >= 5 && !STOP.has(t)).map(stem));
  if (said.size === 0) return null;
  let best: LibraryItem | null = null;
  let bestScore = 0;
  for (const item of await loadIndex()) {
    if (exclude.has(item.id)) continue;
    const own = new Set(tokens(`${trustedName(item)} ${item.knownAs ?? ""} ${item.tags.join(" ")}`).map(stem));
    const score = [...said].filter((w) => own.has(w)).length;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

/** A GIF the speaker called by name: every meaningful word of the request appears in its tags, name or meme name. */
export async function namedMatch(request: string): Promise<LibraryItem | null> {
  const want = tokens(request).filter((t) => !STOP.has(t));
  if (want.length === 0 || want.length > 3) return null;
  const items = await loadIndex();
  const squash = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Candidates: each word, plus adjacent words glued together ("hoo ah" -> "hooah").
  const raw = request.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const forms = new Set<string>(raw);
  for (let i = 0; i + 1 < raw.length; i += 1) forms.add(raw[i] + raw[i + 1]);
  for (let i = 0; i + 2 < raw.length; i += 1) forms.add(raw[i] + raw[i + 1] + raw[i + 2]);
  const hit = items.find((i) => {
    // A spoken order may use the file's own name, right or wrong: the speaker named their own file.
    const own = [...i.tags, ...tokens(i.name), ...tokens(i.knownAs)];
    const have = new Set([...own, ...tokens(i.useWhen)]);
    if (want.every((w) => have.has(w))) return true;
    return own.some((t) => squash(t).length >= 4 && forms.has(squash(t)));
  });
  return hit ?? null;
}

const STOP = new Set(["the", "show", "give", "gif", "that", "this", "some", "something", "with", "and", "please", "me", "a"]);

/**
 * The whole index, with embeddings filled in where they were missing. New vectors are merged into
 * the stored index by id, so a concurrent upload or edit is never overwritten.
 */
async function loadEmbedded(): Promise<LibraryItem[]> {
  const items = await loadIndex();
  const missing = items.filter((i) => !i.embedding);
  if (!embedder || missing.length === 0) return items;
  const vectors = await embedder(missing.map(itemText));
  if (!vectors) return items;
  const byId = new Map(missing.map((m, i) => [m.id, vectors[i]]));
  return mutateIndex(async (stored) => {
    for (const item of stored) {
      const vector = byId.get(item.id);
      if (vector && !item.embedding) item.embedding = vector;
    }
    return { items: stored, result: stored };
  });
}

/** The k library items most relevant to what is being said. Semantic when embeddings work, lexical otherwise. */
export async function libraryCandidates(query: string, k: number, exclude: ReadonlySet<string> = new Set()): Promise<LibraryItem[]> {
  const all = await loadIndex();
  const items = all.filter((i) => !exclude.has(i.id));
  if (items.length <= k) return items;
  return (await rankedMatches(query, exclude)).slice(0, k).map((r) => r.item);
}
