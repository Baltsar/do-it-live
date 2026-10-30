import { connection } from "next/server";
import { budgetFor, budgetOn } from "@/lib/budget";
import { currentModel, providers, rolesStatus } from "@/lib/director";
import { canUpload } from "@/lib/library-store";

export async function GET(req: Request): Promise<Response> {
  await connection(); // read env and the picked model per request, never at build time
  return Response.json({
    // Free minutes left today on the hosted demo; null on a laptop, where there is no budget.
    budget: budgetOn() ? await budgetFor(req) : null,
    nebius: providers.nebius(),
    tavily: providers.tavily(),
    pexels: providers.pexels(),
    assemblyai: Boolean(process.env.ASSEMBLYAI_API_KEY),
    // On disk locally; hosted only with a Blob store connected.
    uploads: canUpload(),
    // A show is recorded for review only on a laptop. The hosted demo keeps nothing anyone says.
    record: !process.env.VERCEL,
    model: currentModel(),
    roles: await rolesStatus(),
  });
}
