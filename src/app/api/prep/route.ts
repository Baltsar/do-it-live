import { providers } from "@/lib/director";
import { prepareMoments, prepDropped } from "@/lib/prep";

export async function POST(req: Request): Promise<Response> {
  const { brief } = (await req.json()) as { brief?: string };
  if (!providers.nebius()) return Response.json({ moments: [] });
  try {
    const moments = await prepareMoments(brief ?? "");
    return Response.json({ moments, dropped: [...prepDropped] });
  } catch (err) {
    return Response.json({ moments: [], error: err instanceof Error ? err.message : "prep failed" }, { status: 500 });
  }
}
