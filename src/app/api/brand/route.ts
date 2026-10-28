import { readBrand } from "@/lib/brand";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!url.trim()) return Response.json({ error: "Paste a web address first." }, { status: 400 });
  try {
    return Response.json(await readBrand(url));
  } catch (err) {
    const message = err instanceof Error && !/fetch failed|aborted|timeout/i.test(err.message) ? err.message : "Could not reach that site. Check the address, or drop a screenshot instead.";
    return Response.json({ error: message }, { status: 422 });
  }
}
