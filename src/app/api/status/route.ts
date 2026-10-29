import { connection } from "next/server";
import { currentModel, providers, rolesStatus } from "@/lib/director";
import { canUpload } from "@/lib/library-store";

export async function GET(): Promise<Response> {
  await connection(); // read env and the picked model per request, never at build time
  return Response.json({
    nebius: providers.nebius(),
    tavily: providers.tavily(),
    pexels: providers.pexels(),
    assemblyai: Boolean(process.env.ASSEMBLYAI_API_KEY),
    // On disk locally; hosted only with a Blob store connected.
    uploads: canUpload(),
    model: currentModel(),
    roles: await rolesStatus(),
  });
}
