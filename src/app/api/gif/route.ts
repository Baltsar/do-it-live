import { gifFor } from "@/lib/director";


export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json({ url: await gifFor(q).catch(() => null) });
}
