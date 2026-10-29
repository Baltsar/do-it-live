import { embed } from "@/lib/director";
import { rankedMatches, setEmbedder } from "@/lib/library";

setEmbedder(embed);

/** Debug and tuning: how close is each library GIF to a phrase? */
export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const ranked = await rankedMatches(q);
  return Response.json({
    matches: ranked.slice(0, 5).map((r) => ({ name: r.item.name, score: Number(r.score.toFixed(3)), semantic: r.semantic })),
  });
}
