import { connection } from "next/server";

/**
 * A single-use AssemblyAI streaming token for the page, valid for 60 seconds to open one socket. The API
 * key never leaves the server, and the password gate in proxy.ts covers this route like the rest.
 */
export async function POST(): Promise<Response> {
  await connection();
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return Response.json({ error: "ASSEMBLYAI_API_KEY is not set" }, { status: 503 });
  const res = await fetch("https://streaming.assemblyai.com/v3/token?expires_in_seconds=60", { headers: { Authorization: key }, cache: "no-store" });
  if (!res.ok) return Response.json({ error: `AssemblyAI token request failed: ${res.status}` }, { status: 502 });
  const { token } = (await res.json()) as { token?: string };
  return token ? Response.json({ token }) : Response.json({ error: "AssemblyAI returned no token" }, { status: 502 });
}
