import { after } from "next/server";
import { budgetOn, flushBudget, spend } from "@/lib/budget";
import { direct, embed, type DirectorInput } from "@/lib/director";
import { setEmbedder } from "@/lib/library";
import { withLibrary } from "@/lib/library-store";

setEmbedder(embed);


export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as DirectorInput;
    // Every line costs model calls: on the hosted demo each visitor has a few free minutes a day.
    const { ok, view } = await spend(req, "director");
    if (budgetOn()) after(flushBudget);
    if (!ok) {
      const reason = view.soldOut ? "the public minutes are used up" : view.siteClosed ? "the site's minutes for today are used up" : "your free minutes for today are used up";
      return Response.json({ action: "hold", reason, budget: view });
    }
    // The director picks from the speaker's own library: hosted, that is this visitor's.
    const result = await withLibrary(req, () => direct(body));
    return Response.json(budgetOn() ? { ...result, budget: view } : result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
