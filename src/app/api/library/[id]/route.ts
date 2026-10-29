import { readFile } from "node:fs/promises";
import { filePath, loadIndex, mimeOf, removeItem, updateItem } from "@/lib/library";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const item = (await loadIndex()).find((i) => i.id === id);
  if (!item) return new Response("not found", { status: 404 });
  const bytes = await readFile(filePath(item));
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": mimeOf(item.file), "cache-control": "public, max-age=31536000, immutable" },
  });
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
