import { direct, embed, type DirectorInput } from "@/lib/director";
import { setEmbedder } from "@/lib/library";
import { withLibrary } from "@/lib/library-store";

setEmbedder(embed);


export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as DirectorInput;
    // The director picks from the speaker's own library: hosted, that is this visitor's.
    return Response.json(await withLibrary(req, () => direct(body)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
