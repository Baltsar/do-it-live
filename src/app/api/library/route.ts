import { chatJson, embed, modelFor, providers } from "@/lib/director";
import { addItem, describe, isSupported, itemText, loadIndex, setEmbedder, type LibraryItem } from "@/lib/library";

setEmbedder(embed);

const withoutEmbedding = (item: LibraryItem): Omit<LibraryItem, "embedding"> => {
  const copy: LibraryItem = { ...item };
  delete copy.embedding;
  return copy;
};

export async function GET(): Promise<Response> {
  const items = await loadIndex();
  return Response.json({ items: items.map(withoutEmbedding) });
}

/** Upload one file plus up to three JPEG frames (data URLs) for the vision model. */
export async function POST(req: Request): Promise<Response> {
  // No disk to keep the file on: refuse before the vision model is paid to describe it.
  if (process.env.VERCEL) return Response.json({ error: "Your own media works when you run Do it live yourself." }, { status: 503 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !isSupported(file.name)) {
    return Response.json({ error: "Unsupported file. Use gif, webp, png, jpg, mp4 or webm." }, { status: 400 });
  }
  const frames = JSON.parse(String(form.get("frames") ?? "[]")) as string[];
  const hasVision = providers.nebius() && Boolean(await modelFor("vision").catch(() => null));
  const description = await describe(
    file.name,
    frames.filter((f) => f.startsWith("data:image/")),
    async (system, user, role) => (await chatJson(system, user as never, 400, role)).json,
    hasVision,
  );
  if (!description.safe) {
    return Response.json({ error: "The vision model flagged this file as unsafe for a stage." }, { status: 422 });
  }
  const vectors = await embed([itemText(description)]);
  const item = await addItem(file.name, Buffer.from(await file.arrayBuffer()), description, vectors?.[0]);
  return Response.json({ item: withoutEmbedding(item) });
}
