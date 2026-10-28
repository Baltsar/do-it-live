// Client-side media dump: take whatever the speaker drops (files or whole folders), keep what
// can be shown on a slide, and send each file with a few frames for the vision model.

const SUPPORTED = /\.(gif|webp|png|jpe?g|mp4|webm)$/i;
const MAX_BYTES = 80 * 1024 * 1024;
const MAX_FRAME = 384;
const PARALLEL = 3;

export interface UploadReport {
  added: number;
  /** Already in the library under the same name. */
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

/** Up to three JPEG frames (start, middle, end) so the vision model sees the motion, not just frame one. */
async function extractFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.muted = true;
      video.src = url;
      await new Promise<void>((res, rej) => {
        video.onloadeddata = () => res();
        video.onerror = () => rej(new Error("video decode failed"));
      });
      const frames: string[] = [];
      for (const f of [0.1, 0.5, 0.9]) {
        video.currentTime = video.duration * f;
        await new Promise<void>((res) => {
          video.onseeked = () => res();
        });
        frames.push(frameFromSource(video, video.videoWidth, video.videoHeight));
      }
      return frames;
    }
    if (file.type === "image/gif" && "ImageDecoder" in window) {
      const Decoder = (window as unknown as { ImageDecoder: new (init: { data: ArrayBuffer; type: string }) => GifDecoder }).ImageDecoder;
      const decoder = new Decoder({ data: await file.arrayBuffer(), type: file.type });
      await decoder.tracks.ready;
      const count = decoder.tracks.selectedTrack.frameCount;
      const frames: string[] = [];
      for (const i of [...new Set([0, Math.floor(count / 2), count - 1])]) {
        const { image } = await decoder.decode({ frameIndex: i });
        frames.push(frameFromSource(image, image.displayWidth, image.displayHeight));
        image.close();
      }
      return frames;
    }
    const img = new Image();
    img.src = url;
    await img.decode();
    return [frameFromSource(img, img.naturalWidth, img.naturalHeight)];
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

/** Uploads a dump of files to the speaker's library. Anything that cannot go on a slide is skipped, not failed. */
export async function uploadMedia(files: File[], onProgress?: (done: number, total: number) => void): Promise<UploadReport> {
  const report: UploadReport = { added: 0, duplicates: 0, skipped: [], failed: [] };
  let existing = new Set<string>();
  try {
    const d = (await (await fetch("/api/library")).json()) as { items: { name: string }[] };
    existing = new Set(d.items.map((i) => i.name));
  } catch {
    // Cannot list the library: upload everything rather than block the speaker.
  }

  const queue: File[] = [];
  for (const file of files) {
    if (file.name.startsWith(".")) continue; // .DS_Store and friends: not worth mentioning
    if (!SUPPORTED.test(file.name) || file.size > MAX_BYTES || file.size === 0) report.skipped.push(file.name);
    else if (existing.has(file.name) || queue.some((q) => q.name === file.name)) report.duplicates += 1;
    else queue.push(file);
  }

  const total = queue.length;
  let done = 0;
  onProgress?.(0, total);
  const worker = async (): Promise<void> => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("frames", JSON.stringify(await extractFrames(file).catch(() => [] as string[])));
        const res = await fetch("/api/library", { method: "POST", body: form });
        if (res.ok) report.added += 1;
        else report.failed.push(`${file.name}: ${((await res.json().catch(() => ({}))) as { error?: string }).error ?? res.status}`);
      } catch (err) {
        report.failed.push(`${file.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
      done += 1;
      onProgress?.(done, total);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return report;
}
