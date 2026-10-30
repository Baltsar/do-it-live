import { after } from "next/server";
import { budgetOn, flushBudget, spend } from "@/lib/budget";
import { drawStream, safePalette, type DrawPalette, type OnScreen } from "@/lib/draw";
import { DEFAULT_THEME, isLookKey, LOOK_COOKIE, type LookKey } from "@/lib/theme";

/** The speaker's look, from the cookie the app keeps in step with the style guide. */
function lookOf(req: Request): LookKey {
  const value = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${LOOK_COOKIE}=([\\w-]+)`))?.[1];
  return isLookKey(value) ? value : DEFAULT_THEME.look;
}

/** Streams a slide drawn for one spoken line: "LABEL: ..." first, then HTML and CSS. */
export async function POST(req: Request): Promise<Response> {
  const { line, palette, shown, current, tier, prepared } = (await req.json()) as { line?: string; palette?: Partial<DrawPalette>; shown?: string[]; current?: OnScreen | null; tier?: number; prepared?: boolean };
  if (!line?.trim() || !process.env.NEBIUS_API_KEY) return new Response("LABEL: none", { status: 200 });
  // Out of minutes: a quiet "nothing to draw", so the stage keeps running on what it has.
  const { ok } = await spend(req, "draw");
  if (budgetOn()) after(flushBudget);
  if (!ok) return new Response("LABEL: none", { status: 200 });
  try {
    const stream = await drawStream(line, safePalette(palette, lookOf(req)), Array.isArray(shown) ? shown : [], current ?? null, req.signal, typeof tier === "number" ? tier : 0, prepared === true);
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "draw failed", { status: 502 });
  }
}
