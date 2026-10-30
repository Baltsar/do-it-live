import { appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "sessions");
const ID = /^[\w-]{1,80}$/;

/** Session recorder: one JSONL file per show, so a run can be reviewed and replayed. */
export async function POST(req: Request): Promise<Response> {
  const { id, entry } = (await req.json()) as { id?: string; entry?: unknown };
  if (!id || !ID.test(id) || entry === undefined) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  // The hosted demo keeps nothing a visitor says: only a browser crash report reaches the runtime log,
  // since a crash on a phone cannot be watched in a console. Talk entries are dropped unread.
  if (process.env.VERCEL) {
    if ((entry as { kind?: unknown }).kind === "client-error") console.log(`CLIENT-ERROR ${JSON.stringify(entry)}`);
    return Response.json({ ok: true });
  }
  await mkdir(DIR, { recursive: true });
  await appendFile(path.join(DIR, `${id}.jsonl`), `${JSON.stringify(entry)}\n`);
  return Response.json({ ok: true });
}

export async function GET(req: Request): Promise<Response> {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    const files = await readdir(DIR).catch(() => [] as string[]);
    const sessions = files.filter((f) => f.endsWith(".jsonl")).map((f) => f.replace(/\.jsonl$/, "")).sort().reverse();
    return Response.json({ sessions });
  }
  if (!ID.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const raw = await readFile(path.join(DIR, `${id}.jsonl`), "utf8").catch(() => "");
  const entries = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as unknown);
  return Response.json({ entries });
}
