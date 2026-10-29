// The engine that reads a dropped file: its real type from the bytes, then the eyes (vision model),
// the web (Tavily on meme and GIF sites) and the culture desk (a text model) decide what it is. Server-only.
import { chatJson, embed, modelFor, providers, tavilySearch } from "@/lib/director";
import { describe, hashOf, itemText, type Description, type FileFacts, type LibraryItem } from "@/lib/library";
import { sniff, stillContainerMoves } from "@/lib/sniff";

// Pages that title a GIF with the name people know it by.
const MEME_SITES = ["knowyourmeme.com", "giphy.com", "tenor.com", "imdb.com", "wikipedia.org", "reddit.com"];

/**
 * Type, motion and fingerprint of a file. `frameCount` comes from the browser's decoder (0 when it
 * had none): exact for GIF and WebP, where a byte scan can be fooled by compressed data.
 */
export function factsOf(bytes: Uint8Array, frameCount: number): FileFacts | null {
  const kind = sniff(bytes.subarray(0, 16));
  if (!kind) return null;
  const motion = kind.mime.startsWith("video/")
    ? true
    : frameCount > 0
      ? frameCount > 1
      : kind.mime === "image/gif" || stillContainerMoves(bytes, kind.mime);
  return { ...kind, motion, hash: hashOf(bytes) };
}

export async function readMedia(name: string, frames: string[], motion: boolean): Promise<Description & { safe: boolean }> {
  const hasVision = providers.nebius() && Boolean(await modelFor("vision").catch(() => null));
  const read = await describe(
    name,
    frames.filter((f) => f.startsWith("data:image/")),
    {
      hasVision,
      chat: async (system, user, role, maxTokens) => (await chatJson(system, user, maxTokens, role)).json,
      search: async (query) => (providers.tavily() ? ((await tavilySearch(query, MEME_SITES)).results ?? []) : []),
    },
  );
  // The bytes know whether it moves; the model only saw frames.
  if (motion && read.category === "picture") read.category = "scene";
  if (!motion && read.category === "scene") read.category = "picture";
  return read;
}

export const embedDescription = async (description: Description): Promise<number[] | undefined> =>
  (await embed([itemText(description)]))?.[0];

export const withoutEmbedding = (item: LibraryItem): Omit<LibraryItem, "embedding"> => {
  const copy: LibraryItem = { ...item };
  delete copy.embedding;
  return copy;
};

/** Frames the browser sent, as a form field (JSON text) or in a JSON body: up to six JPEG data URLs. */
export const framesOf = (raw: unknown): string[] => {
  try {
    const frames = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return Array.isArray(frames) ? frames.map(String).slice(0, 6) : [];
  } catch {
    return [];
  }
};
