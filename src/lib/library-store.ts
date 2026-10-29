// Where the speaker's library lives. On a laptop: one folder on disk. Hosted on Vercel there is no disk
// to keep files on, so each visitor gets a private library in Vercel Blob, found by a random cookie the
// password gate hands out. Server-only.
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobError, BlobPreconditionFailedError, del, get, put } from "@vercel/blob";
import type { LibraryItem } from "@/lib/library";

const ROOT = path.join(process.cwd(), "library");
const FILES = path.join(ROOT, "files");
const INDEX = path.join(ROOT, "index.json");

export const LIBRARY_COOKIE = "dil_lib";

/** Blob when a store is connected and the app runs hosted, or a developer asks for it to test. */
export const inBlob = (): boolean =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN) && (Boolean(process.env.VERCEL) || process.env.LIBRARY_STORE === "blob");

/** Uploads work on a laptop, and hosted only with a Blob store connected. */
export const canUpload = (): boolean => !process.env.VERCEL || inBlob();

const visitor = new AsyncLocalStorage<string>();

const cookieOf = (req: Request): string | null =>
  (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${LIBRARY_COOKIE}=([a-z0-9-]{8,64})`, "i"))?.[1] ?? null;

/** Runs a request with the visitor's own library in scope. A local Blob test shares one library. */
export function withLibrary<T>(req: Request, run: () => Promise<T>): Promise<T> {
  return visitor.run(cookieOf(req) ?? (process.env.VERCEL ? "" : "local"), run);
}

/** The visitor's folder in the Blob store, or null without a visitor (no cookie yet). */
export const libraryPrefix = (): string | null => {
  const id = visitor.getStore();
  return id ? `libraries/${id}` : null;
};

// ---- The index ----

interface Stored {
  items: LibraryItem[];
  etag: string | null;
}

// The director reads the index several times per spoken line: a few seconds of trust saves a round trip,
// and an unchanged index costs only a 304 after that.
const FRESH_MS = 3000;
const recent = new Map<string, { at: number; stored: Stored }>();

async function readBlob(prefix: string, fresh: boolean): Promise<Stored> {
  const hit = recent.get(prefix);
  if (!fresh && hit && Date.now() - hit.at < FRESH_MS) return hit.stored;
  const res = await get(`${prefix}/index.json`, { access: "private", useCache: false, ifNoneMatch: hit?.stored.etag ?? undefined });
  let stored: Stored;
  if (!res) stored = { items: [], etag: null };
  else if (res.statusCode === 304 && hit) stored = hit.stored;
  // A compressed read carries a weak ETag (W/"..."); a conditional write only takes the strong one.
  else if (res.statusCode === 200) stored = { items: JSON.parse(await new Response(res.stream).text()) as LibraryItem[], etag: res.blob.etag.replace(/^W\//, "") };
  else throw new Error("unexpected answer from the Blob store");
  recent.set(prefix, { at: Date.now(), stored });
  return stored;
}

export async function readIndex(): Promise<LibraryItem[]> {
  if (!inBlob()) {
    try {
      return JSON.parse(await readFile(INDEX, "utf8")) as LibraryItem[];
    } catch {
      return [];
    }
  }
  const prefix = libraryPrefix();
  return prefix ? (await readBlob(prefix, false)).items : [];
}

// On disk, changes run one at a time or one of two overlapping uploads is silently lost. In Blob the
// requests may run on different instances, so a write only lands on the version it read (ETag), and
// a change that lost the race is made again on the newer index.
let diskQueue: Promise<unknown> = Promise.resolve();

export function changeIndex<T>(change: (items: LibraryItem[]) => { items: LibraryItem[]; result: T }): Promise<T> {
  if (!inBlob()) {
    const run = diskQueue.then(async () => {
      const { items, result } = change(await readIndex());
      await mkdir(ROOT, { recursive: true });
      // Atomic: a crash mid-write must never leave a truncated index.
      await writeFile(`${INDEX}.tmp`, JSON.stringify(items));
      await rename(`${INDEX}.tmp`, INDEX);
      return result;
    });
    diskQueue = run.catch(() => undefined);
    return run;
  }
  return changeBlob(change);
}

async function changeBlob<T>(change: (items: LibraryItem[]) => { items: LibraryItem[]; result: T }): Promise<T> {
  const prefix = libraryPrefix();
  if (!prefix) throw new Error("No library for this visitor yet: open /library first.");
  for (let attempt = 0; ; attempt += 1) {
    const { items, etag } = await readBlob(prefix, true);
    const { items: next, result } = change(structuredClone(items));
    try {
      const saved = await put(`${prefix}/index.json`, JSON.stringify(next), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
        // The first write may only create the index: two uploads into an empty library both find none.
        ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      });
      recent.set(prefix, { at: Date.now(), stored: { items: next, etag: saved.etag } });
      return result;
    } catch (err) {
      // Under load the store reports a lost race as a plain BlobError ("ETag mismatch"), not always as
      // BlobPreconditionFailedError; creating an index that now exists fails the same way.
      const lostRace = err instanceof BlobPreconditionFailedError || (err instanceof BlobError && (!etag || /precondition|etag/i.test(err.message)));
      if (!lostRace || attempt >= 7) throw err;
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (attempt + 1)));
    }
  }
}

// ---- The files ----

/** Disk: the file name in the library folder. Blob: the pathname the browser uploaded it to. */
export async function readBytes(file: string): Promise<Uint8Array> {
  if (!inBlob()) return new Uint8Array(await readFile(path.join(FILES, file)));
  const res = await get(file, { access: "private" });
  if (!res || res.statusCode !== 200) throw new Error("file not found");
  return new Uint8Array(await new Response(res.stream).arrayBuffer());
}

/** A file as a response body, streamed straight from the store. */
export async function fileBody(file: string): Promise<BodyInit | null> {
  if (!inBlob()) return new Uint8Array(await readFile(path.join(FILES, file)));
  const res = await get(file, { access: "private" });
  return res && res.statusCode === 200 ? res.stream : null;
}

/** Disk only: Blob files arrive from the browser before the server sees them. */
export async function writeBytes(file: string, bytes: Uint8Array): Promise<void> {
  await mkdir(FILES, { recursive: true });
  await writeFile(path.join(FILES, file), bytes);
}

export async function removeFile(file: string): Promise<void> {
  if (!inBlob()) await unlink(path.join(FILES, file)).catch(() => undefined);
  else await del(file).catch(() => undefined);
}

/** A Blob pathname the browser says it uploaded: only accepted inside this visitor's own folder. */
export const ownUpload = (pathname: string): boolean => {
  const prefix = libraryPrefix();
  return Boolean(prefix) && pathname.startsWith(`${prefix}/uploads/`) && !pathname.includes("..");
};
