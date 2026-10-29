import { embed } from "@/lib/director";
import { addItem, findByHash, loadIndex, setEmbedder, type Upload } from "@/lib/library";
import { embedDescription, factsOf, framesOf, readMedia, withoutEmbedding } from "@/lib/library-read";
import { canUpload, inBlob, libraryPrefix, ownUpload, readBytes, removeFile, withLibrary } from "@/lib/library-store";

setEmbedder(embed);

export async function GET(req: Request): Promise<Response> {
  return withLibrary(req, async () => {
    const items = await loadIndex();
    // Hosted, the browser uploads straight to Blob, into this visitor's own folder.
    return Response.json({ items: items.map(withoutEmbedding), store: inBlob() ? "blob" : "disk", uploads: canUpload(), prefix: inBlob() ? libraryPrefix() : null });
  });
}

interface Received {
  name: string;
  upload: Upload;
  bytes: Uint8Array;
  frames: string[];
  frameCount: number;
}

/** On a laptop the file comes in the form. Hosted, the browser has put it in Blob already and says where. */
async function receive(req: Request): Promise<Received | null> {
  if (!inBlob()) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { name: file.name, upload: { bytes }, bytes, frames: framesOf(form.get("frames")), frameCount: Number(form.get("frameCount") ?? 0) };
  }
  const body = (await req.json()) as { blob?: unknown; name?: unknown; frames?: unknown; frameCount?: unknown };
  const pathname = String(body.blob ?? "");
  if (!ownUpload(pathname)) return null;
  return {
    name: String(body.name ?? "").slice(0, 200) || pathname.split("/").pop() || "file",
    upload: { file: pathname },
    bytes: await readBytes(pathname),
    frames: framesOf(body.frames),
    frameCount: Number(body.frameCount ?? 0),
  };
}

/** Adds one file, with up to six JPEG frames and the decoder's frame count. */
export async function POST(req: Request): Promise<Response> {
  if (!canUpload()) return Response.json({ error: "Your own media works when you run Do it live yourself." }, { status: 503 });
  return withLibrary(req, async () => {
    const got = await receive(req);
    if (!got) return Response.json({ error: "No file." }, { status: 400 });
    // A file the library turns down must not stay behind in the store.
    const discard = async (): Promise<void> => {
      if ("file" in got.upload) await removeFile(got.upload.file);
    };
    try {
      return await admit(got, discard);
    } catch (err) {
      await discard();
      throw err;
    }
  });
}

/** Checks a received file and describes it. Anything turned down leaves nothing behind. */
async function admit(got: Received, discard: () => Promise<void>): Promise<Response> {
  // The bytes decide what a file is, never its name: Giphy "gifs" are often WebP or MP4.
  const facts = factsOf(got.bytes, got.frameCount);
  if (!facts) {
    await discard();
    return Response.json({ error: "Not a picture or a clip. GIF, WebP, PNG, JPG, MP4 and WebM work, whatever the file is called." }, { status: 400 });
  }
  const twin = await findByHash(facts.hash);
  if (twin) {
    await discard();
    return Response.json({ item: withoutEmbedding(twin), duplicate: true });
  }
  const { safe, ...description } = await readMedia(got.name, got.frames, facts.motion);
  if (!safe) {
    await discard();
    return Response.json({ error: "The vision model flagged this file as unsafe for a stage." }, { status: 422 });
  }
  const item = await addItem(got.name, got.upload, description, facts, await embedDescription(description));
  return Response.json({ item: withoutEmbedding(item) });
}
