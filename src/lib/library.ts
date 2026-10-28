// The speaker's own GIF library. Files live on disk, a vision model describes them,
// so file names never matter. Server-only.
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
  embedding?: number[];
}

const EXT_MIME: Record<string, string> = {
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
export const mimeOf = (file: string): string => EXT_MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
/** GIFs and clips move; everything else is a still photo. */
export const isMotion = (item: Pick<LibraryItem, "mime">): boolean => item.mime === "image/gif" || item.mime.startsWith("video/");

export const isSupported = (name: string): boolean => path.extname(name).toLowerCase() in EXT_MIME;

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

/** Describe a GIF from its frames. Falls back to file-name words so the flow works without a key. */
export interface Description {
  caption: string;
  tags: string[];
  emotion: string;
  useWhen: string;
  source: "vision" | "filename";
}

const VISION_SYSTEM = `You catalogue a presenter's own media: photos, GIFs and short clips they may show full screen during a live talk. You see up to three frames from one file, in order. Output ONLY JSON:
{"caption": "what is shown, one sentence, english", "tags": ["6-10 lowercase english words: subject, action, setting, emotion, meme or film name if you recognise it"], "emotion": "one word", "use_when": "three short ideas or moments this could amplify as a visual metaphor or reaction, comma separated, e.g. 'a plan fails, everyone stays silent, starting from nothing'", "safe": true | false}
Think beyond the literal subject: what could this picture stand for in a talk?
"safe" is false for nudity, graphic violence or hate. Do not guess names of real people.`;

export async function describe(
  name: string,
  frames: string[],
  chat: (system: string, user: unknown, role: "vision") => Promise<unknown>,
  hasVision: boolean,
): Promise<Description & { safe: boolean }> {
  const base = name.replace(/\.[^.]+$/, "");
  const fallback = {
    caption: base.replace(/[-_]+/g, " "),
    tags: tokens(base),
    emotion: "",
    useWhen: "",
    source: "filename" as const,
    safe: true,
  };
  if (!hasVision || frames.length === 0) return fallback;
  try {
    const content = [
      { type: "text", text: `File name (may be meaningless): ${name}` },
      ...frames.slice(0, 3).map((url) => ({ type: "image_url", image_url: { url } })),
    ];
    const json = (await chat(VISION_SYSTEM, content, "vision")) as {
      caption?: string; tags?: string[]; emotion?: string; use_when?: string; safe?: boolean;
    };
    // The model will not name people or films, but the file name often does: keep both.
    const modelTags = (json.tags ?? []).map((t) => String(t).toLowerCase()).slice(0, 12);
    return {
      caption: String(json.caption ?? fallback.caption).slice(0, 200),
      tags: [...new Set([...modelTags, ...tokens(base)])],
      emotion: String(json.emotion ?? "").slice(0, 30),
      useWhen: String(json.use_when ?? "").slice(0, 120),
      source: "vision",
      safe: json.safe !== false,
    };
  } catch {
    return fallback;
  }
}

export async function addItem(
  fileName: string,
  bytes: Buffer,
  description: Description,
  embedding?: number[],
): Promise<LibraryItem> {
  const { caption, tags, emotion, useWhen, source } = description;
  return mutateIndex(async (items) => {
    const id = `g${Date.now().toString(36)}${items.length.toString(36)}`;
    const ext = path.extname(fileName).toLowerCase();
    const file = `${id}${ext}`;
    await mkdir(FILES, { recursive: true });
    await writeFile(path.join(FILES, file), bytes);
    const item: LibraryItem = { id, file, name: fileName, mime: mimeOf(file), caption, tags, emotion, useWhen, source, embedding };
    return { items: [...items, item], result: item };
  });
}

export async function updateItem(id: string, patch: Partial<Pick<LibraryItem, "caption" | "tags" | "useWhen">>): Promise<LibraryItem | null> {
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

export const itemText = (i: Pick<LibraryItem, "caption" | "tags" | "emotion" | "useWhen">): string =>
  `${i.caption ?? ""}. ${(i.tags ?? []).join(", ")}. ${i.emotion ?? ""}. ${i.useWhen ?? ""}`;

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
    const own = new Set(tokens(`${item.name.replace(/\.\w+$/, "")} ${item.tags.join(" ")}`).map(stem));
    const score = [...said].filter((w) => own.has(w)).length;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

/** A GIF the speaker called by name: every meaningful word of the request appears in its tags or name. */
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
    const have = new Set([...i.tags, ...tokens(i.name), ...tokens(i.useWhen)]);
    if (want.every((w) => have.has(w))) return true;
    return [...i.tags, ...tokens(i.name)].some((t) => squash(t).length >= 4 && forms.has(squash(t)));
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
