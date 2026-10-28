import { findImage } from "@/lib/images";

export async function GET(req: Request): Promise<Response> {
  const p = new URL(req.url).searchParams;
  const alts = (p.get("alts") ?? "").split("|").filter(Boolean);
  return Response.json({ hit: await findImage({ query: p.get("q") ?? "", alts, intent: p.get("intent") ?? "" }).catch(() => null) });
}
