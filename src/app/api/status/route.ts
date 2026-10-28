import { connection } from "next/server";
import { currentModel, providers, rolesStatus } from "@/lib/director";

export async function GET(): Promise<Response> {
  await connection(); // read env and the picked model per request, never at build time
  return Response.json({
    nebius: providers.nebius(),
    tavily: providers.tavily(),
    klipy: providers.klipy(),
    pexels: providers.pexels(),
    assemblyai: Boolean(process.env.ASSEMBLYAI_API_KEY),
    model: currentModel(),
    roles: await rolesStatus(),
  });
}
