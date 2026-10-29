import { readFile } from "node:fs/promises";
import { filePath, loadIndex, removeItem, updateItem } from "@/lib/library";
import { factsOf, framesOf, readMedia, withoutEmbedding } from "@/lib/library-read";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const item = (await loadIndex()).find((i) => i.id === id);
  if (!item) return new Response("not found", { status: 404 });
  const bytes = await readFile(filePath(item));
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": item.mime, "cache-control": "public, max-age=31536000, immutable" },
  });
}

/** Read an item again with the current engine: real type from its bytes, fresh frames from the browser. */
export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  if (process.env.VERCEL) return Response.json({ error: "Your own media works when you run Do it live yourself." }, { status: 503 });
  const { id } = await params;
  const item = (await loadIndex()).find((i) => i.id === id);
  if (!item) return new Response("not found", { status: 404 });
  const form = await req.formData();
  const facts = factsOf(new Uint8Array(await readFile(filePath(item))), Number(form.get("frameCount") ?? 0));
  if (!facts) return Response.json({ error: "Not a picture or a clip." }, { status: 422 });
  const { safe, ...description } = await readMedia(item.name, framesOf(form), facts.motion);
  const updated = await updateItem(id, { ...description, mime: facts.mime, motion: facts.motion, hash: facts.hash });
  return updated ? Response.json({ item: withoutEmbedding(updated), safe }) : new Response("not found", { status: 404 });
}

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const body = (await req.json()) as { caption?: string; tags?: string[]; useWhen?: string };
  const item = await updateItem(id, { caption: body.caption, tags: body.tags, useWhen: body.useWhen });
  return item ? Response.json({ ok: true }) : new Response("not found", { status: 404 });
}

export async function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  return (await removeItem(id)) ? Response.json({ ok: true }) : new Response("not found", { status: 404 });
}
