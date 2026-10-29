import { connection } from "next/server";
import { currentModel, providers, rolesStatus } from "@/lib/director";

export async function GET(): Promise<Response> {
  await connection(); // read env and the picked model per request, never at build time
  return Response.json({
    nebius: providers.nebius(),
    tavily: providers.tavily(),
    pexels: providers.pexels(),
    assemblyai: Boolean(process.env.ASSEMBLYAI_API_KEY),
    // The media library lives on local disk; a Vercel deploy has none to write to.
    uploads: !process.env.VERCEL,
    model: currentModel(),
    roles: await rolesStatus(),
  });
}
