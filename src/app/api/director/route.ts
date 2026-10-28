import { direct, embed, type DirectorInput } from "@/lib/director";
import { setEmbedder } from "@/lib/library";

setEmbedder(embed);


export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as DirectorInput;
    return Response.json(await direct(body));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
