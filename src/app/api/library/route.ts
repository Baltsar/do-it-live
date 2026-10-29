import { embed } from "@/lib/director";
import { addItem, findByHash, loadIndex, setEmbedder } from "@/lib/library";
import { embedDescription, factsOf, framesOf, readMedia, withoutEmbedding } from "@/lib/library-read";

setEmbedder(embed);

export async function GET(): Promise<Response> {
  const items = await loadIndex();
  return Response.json({ items: items.map(withoutEmbedding) });
}

/** Upload one file plus up to three JPEG frames (data URLs) and the decoder's frame count. */
export async function POST(req: Request): Promise<Response> {
  // No disk to keep the file on: refuse before the vision model is paid to describe it.
  if (process.env.VERCEL) return Response.json({ error: "Your own media works when you run Do it live yourself." }, { status: 503 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  // The bytes decide what a file is, never its name: Giphy "gifs" are often WebP or MP4.
  const facts = factsOf(bytes, Number(form.get("frameCount") ?? 0));
  if (!facts) {
    return Response.json({ error: "Not a picture or a clip. GIF, WebP, PNG, JPG, MP4 and WebM work, whatever the file is called." }, { status: 400 });
  }
  const twin = await findByHash(facts.hash);
  if (twin) return Response.json({ item: withoutEmbedding(twin), duplicate: true });
  const { safe, ...description } = await readMedia(file.name, framesOf(form), facts.motion);
  if (!safe) {
    return Response.json({ error: "The vision model flagged this file as unsafe for a stage." }, { status: 422 });
  }
  const item = await addItem(file.name, bytes, description, facts, await embedDescription(description));
  return Response.json({ item: withoutEmbedding(item) });
}
