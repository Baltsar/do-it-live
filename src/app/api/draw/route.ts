import { drawStream, safePalette, type DrawPalette, type OnScreen } from "@/lib/draw";

/** Streams a slide drawn for one spoken line: "LABEL: ..." first, then HTML and CSS. */
export async function POST(req: Request): Promise<Response> {
  const { line, palette, shown, current, tier, prepared } = (await req.json()) as { line?: string; palette?: Partial<DrawPalette>; shown?: string[]; current?: OnScreen | null; tier?: number; prepared?: boolean };
  if (!line?.trim() || !process.env.NEBIUS_API_KEY) return new Response("LABEL: none", { status: 200 });
  try {
    const stream = await drawStream(line, safePalette(palette), Array.isArray(shown) ? shown : [], current ?? null, req.signal, typeof tier === "number" ? tier : 0, prepared === true);
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "draw failed", { status: 502 });
  }
}
