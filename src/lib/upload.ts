// Client-side media dump: take whatever the speaker drops (files or whole folders), keep what
// can be shown on a slide, and send each file with a few frames for the vision model.
import { upload as toBlob } from "@vercel/blob/client";
import { sniffFile } from "@/lib/sniff";

const MAX_BYTES = 80 * 1024 * 1024;
const MAX_FRAME = 384;
const PARALLEL = 3;
/** Where in a file the frames are taken, as a share of its length. */
const SPREAD = [0.02, 0.2, 0.4, 0.6, 0.8, 0.98];

export interface UploadReport {
  added: number;
  /** The same bytes are already in the library, whatever either file is called. */
  duplicates: number;
  /** Not something a slide can show (documents, huge files, system files). */
  skipped: string[];
  failed: string[];
}

function frameFromSource(source: CanvasImageSource, w: number, h: number): string {
  const scale = Math.min(1, MAX_FRAME / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

interface GifDecoder {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } };
  decode(opts: { frameIndex: number }): Promise<{ image: VideoFrame }>;
}

interface Frames {
  frames: string[];
  /** From the decoder for GIF and WebP; 0 when nothing counted them. */
  frameCount: number;
}

/**
 * Up to six JPEG frames spread over the file so the vision model sees the motion: a blink or a
 * head turn lasts a fraction of a GIF and three frames missed it.
 * `mime` is what the bytes say: the browser guesses from the extension, and a GIF named .jpg would
 * decode as one still frame.
 */
async function extractFrames(file: Blob, mime: string): Promise<Frames> {
  const url = URL.createObjectURL(file);
  try {
    if (mime.startsWith("video/")) {
      const video = document.createElement("video");
      video.muted = true;
      video.src = url;
      await new Promise<void>((res, rej) => {
        video.onloadeddata = () => res();
        video.onerror = () => rej(new Error("video decode failed"));
      });
      const frames: string[] = [];
      for (const f of SPREAD) {
        video.currentTime = video.duration * f;
        await new Promise<void>((res) => {
          video.onseeked = () => res();
        });
        frames.push(frameFromSource(video, video.videoWidth, video.videoHeight));
      }
      return { frames, frameCount: 0 };
    }
    if ((mime === "image/gif" || mime === "image/webp") && "ImageDecoder" in window) {
      const Decoder = (window as unknown as { ImageDecoder: new (init: { data: ArrayBuffer; type: string }) => GifDecoder }).ImageDecoder;
      const decoder = new Decoder({ data: await file.arrayBuffer(), type: mime });
      await decoder.tracks.ready;
      const count = decoder.tracks.selectedTrack.frameCount;
      const frames: string[] = [];
      for (const i of [...new Set(SPREAD.map((f) => Math.round(f * (count - 1))))]) {
        const { image } = await decoder.decode({ frameIndex: i });
        frames.push(frameFromSource(image, image.displayWidth, image.displayHeight));
        image.close();
      }
      return { frames, frameCount: count };
    }
    const img = new Image();
    img.src = url;
    await img.decode();
    return { frames: [frameFromSource(img, img.naturalWidth, img.naturalHeight)], frameCount: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const readEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject));

async function walk(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    out.push(await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)));
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns the folder in batches: keep asking until it is empty.
  for (let batch = await readEntries(reader); batch.length > 0; batch = await readEntries(reader)) {
    for (const child of batch) await walk(child, out);
  }
}

/** Every file in a drop, including the contents of dropped folders. */
export async function filesFromDrop(data: DataTransfer): Promise<File[]> {
  // Entries must be taken before the first await: the browser empties the list after the event.
  const entries = [...data.items].map((item) => item.webkitGetAsEntry?.() ?? null);
  const loose = [...data.files];
  if (entries.every((e) => e === null)) return loose;
  const out: File[] = [];
  for (const entry of entries) {
    if (entry) await walk(entry, out).catch(() => undefined);
  }
  return out.length > 0 ? out : loose;
}

/** Sends one file with its frames; the server answers with the item or tells it was a duplicate. */
async function send(url: string, file: Blob, mime: string, name?: string): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const { frames, frameCount } = await extractFrames(file, mime).catch(() => ({ frames: [] as string[], frameCount: 0 }));
  const form = new FormData();
  if (name) form.append("file", file, name);
  form.append("frames", JSON.stringify(frames));
  form.append("frameCount", String(frameCount));
  const res = await fetch(url, { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as { duplicate?: boolean; error?: string };
  return { ok: res.ok, duplicate: body.duplicate, error: body.error ?? (res.ok ? undefined : String(res.status)) };
}

async function pool<T>(queue: T[], work: (item: T) => Promise<void>, onProgress?: (done: number, total: number) => void): Promise<void> {
  const total = queue.length;
  let done = 0;
  onProgress?.(0, total);
  const worker = async (): Promise<void> => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await work(item);
      done += 1;
      onProgress?.(done, total);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

/** Where the library keeps files: disk (the file goes to our server) or Blob (straight from here, signed by it). */
interface Store {
  store: "disk" | "blob";
  prefix: string | null;
}

/** Hosted: the file goes to this visitor's Blob folder first, then the server reads it from there. */
async function sendViaBlob(prefix: string, file: File, mime: string): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const { frames, frameCount } = await extractFrames(file, mime).catch(() => ({ frames: [] as string[], frameCount: 0 }));
  const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "file";
  const blob = await toBlob(`${prefix}/uploads/${safe}`, file, {
    access: "private",
    handleUploadUrl: "/api/library/upload",
    contentType: mime,
    multipart: file.size > 8 * 1024 * 1024,
  });
  const res = await fetch("/api/library", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ blob: blob.pathname, name: file.name, frames, frameCount }),
  });
  const body = (await res.json().catch(() => ({}))) as { duplicate?: boolean; error?: string };
  return { ok: res.ok, duplicate: body.duplicate, error: body.error ?? (res.ok ? undefined : String(res.status)) };
}

/**
 * Uploads a dump of files to the speaker's library. What a file is comes from its bytes, never its
 * name: a GIF called "invoice.jpg" or "download" still goes in. Anything a slide cannot show is skipped.
 */
export async function uploadMedia(files: File[], onProgress?: (done: number, total: number) => void): Promise<UploadReport> {
  const report: UploadReport = { added: 0, duplicates: 0, skipped: [], failed: [] };
  const where = (await fetch("/api/library")
    .then((r) => r.json())
    .catch(() => ({ store: "disk", prefix: null }))) as Store;
  const queue: { file: File; mime: string }[] = [];
  for (const file of files) {
    if (file.name.startsWith(".")) continue; // .DS_Store and friends: not worth mentioning
    const kind = file.size > 0 && file.size <= MAX_BYTES ? await sniffFile(file).catch(() => null) : null;
    if (kind) queue.push({ file, mime: kind.mime });
    else report.skipped.push(file.name);
  }
  await pool(
    queue,
    async ({ file, mime }) => {
      try {
        const res = where.store === "blob" && where.prefix ? await sendViaBlob(where.prefix, file, mime) : await send("/api/library", file, mime, file.name);
        if (res.duplicate) report.duplicates += 1;
        else if (res.ok) report.added += 1;
        else report.failed.push(`${file.name}: ${res.error}`);
      } catch (err) {
        report.failed.push(`${file.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    },
    onProgress,
  );
  return report;
}

/** Reads every item again with the current engine: fresh frames here, the culture desk on the server. */
export async function rereadMedia(items: { id: string; name: string }[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const failed: string[] = [];
  await pool(
    [...items],
    async (item) => {
      try {
        const blob = await (await fetch(`/api/library/${item.id}`, { cache: "no-store" })).blob();
        const kind = await sniffFile(blob);
        const res = await send(`/api/library/${item.id}`, blob, kind?.mime ?? blob.type);
        if (!res.ok) failed.push(`${item.name}: ${res.error}`);
      } catch (err) {
        failed.push(`${item.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    },
    onProgress,
  );
  return failed;
}
