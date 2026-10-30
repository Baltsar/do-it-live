import { connection } from "next/server";
import { talkCount } from "@/lib/talk-count";

/** The public talk counter. Cached at the edge for a minute: every page load asks, the store rarely does. */
export async function GET(): Promise<Response> {
  await connection(); // the count changes while the site runs, never read it at build time
  const count = await talkCount();
  return Response.json(count ?? { talks: null, minutes: null }, {
    headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
  });
}
