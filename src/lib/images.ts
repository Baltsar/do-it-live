// Server-only: finds the photo that best expresses a visual metaphor.
// Gather candidates from free sources, then let the vision model pick the strongest one.
import { chatJson, modelFor, providers } from "@/lib/director";

export interface ImageHit {
  url: string;
  credit: string;
  /** Vision model's rating of the match, 1-5. Absent when no vision model was available. */
  score?: number;
}

interface Candidate {
  /** Full-size image, or an mp4 loop, shown on screen. */
  url: string;
  /** Small version for the vision model. */
  thumb: string;
  credit: string;
}

const UA = "doitlive-hackathon/0.1 (presentation tool; contact via project repo)";
const cache = new Map<string, ImageHit>();
// Commons search also returns logos, diagrams and maps: they never make a good photo slide.
const BAD_TITLE = /logo|icon|diagram|chart|coat of arms|flag of|map of|screenshot|wordmark|\.svg|poster|stamp|scheme|banner|cover|book/i;
const MIN_SCORE = 3;
const SEARCH_DEADLINE_MS = 4200;

interface OpenverseResponse {
  results?: { url: string; thumbnail?: string; creator?: string; title?: string; license?: string; width?: number }[];
}
interface CommonsResponse {
  query?: { pages?: Record<string, { title?: string; imageinfo?: { thumburl?: string }[] }> };
}

interface PexelsPhotos {
  photos?: { src: { landscape: string; large: string; medium: string }; photographer?: string }[];
}
interface PexelsVideos {
  videos?: {
    image: string;
    user?: { name?: string };
    video_files: { quality?: string; file_type?: string; width?: number; link: string }[];
  }[];
}

/** Stock photos and short video loops from Pexels (free key). Relevance-ranked and fast, so tried first. */
async function pexels(query: string): Promise<Candidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const headers = { authorization: key, "user-agent": UA };
  const [photoRes, videoRes] = await Promise.allSettled([
    fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape&size=large`, { signal: AbortSignal.timeout(4000), headers }),
    fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape&size=medium`, { signal: AbortSignal.timeout(4000), headers }),
  ]);
  const out: Candidate[] = [];
  if (photoRes.status === "fulfilled" && photoRes.value.ok) {
    const data = (await photoRes.value.json()) as PexelsPhotos;
    for (const p of data.photos ?? []) {
      out.push({ url: p.src.landscape, thumb: p.src.medium, credit: `${p.photographer ?? "Pexels"}, Pexels` });
    }
  }
  if (videoRes.status === "fulfilled" && videoRes.value.ok) {
    const data = (await videoRes.value.json()) as PexelsVideos;
    for (const v of data.videos ?? []) {
      // HD mp4 around 1280-1920 wide: sharp on a projector, still quick to start.
      const file = v.video_files
        .filter((f) => f.file_type === "video/mp4" && (f.width ?? 0) >= 1200 && (f.width ?? 0) <= 1920)
        .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0];
      if (file) out.push({ url: file.link, thumb: v.image, credit: `${v.user?.name ?? "Pexels"}, Pexels (video)` });
    }
  }
  return out;
}

async function openverse(query: string): Promise<Candidate[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10&license_type=commercial&category=photograph&aspect_ratio=wide&mature=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "user-agent": UA } });
  if (!res.ok) return [];
  const data = (await res.json()) as OpenverseResponse;
  return (data.results ?? [])
    .filter((r) => (r.width ?? 0) >= 1000 && !BAD_TITLE.test(r.title ?? ""))
    .map((r) => ({
      url: r.url,
      thumb: r.thumbnail ?? r.url,
      credit: [r.creator, r.license?.toUpperCase()].filter(Boolean).join(", "),
    }));
}

async function commons(query: string): Promise<Candidate[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=1280&format=json&origin=*`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "user-agent": UA } });
  if (!res.ok) return [];
  const data = (await res.json()) as CommonsResponse;
  const out: Candidate[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const thumb = page.imageinfo?.[0]?.thumburl;
    if (!thumb || BAD_TITLE.test(page.title ?? "") || !/\.(jpe?g|png|webp)(\?|$)/i.test(thumb)) continue;
    out.push({ url: thumb, thumb: thumb.replace("/1280px-", "/500px-"), credit: "Wikimedia Commons" });
  }
  return out;
}

/** Wikimedia and some hosts refuse remote fetches by the vision service, so we download and inline the small version. */
async function toDataUrl(c: Candidate): Promise<string | null> {
  try {
    const res = await fetch(c.thumb, { signal: AbortSignal.timeout(3500), headers: { "user-agent": UA } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

const RERANK_SYSTEM = `You are the art director's eye. A presenter needs ONE full-screen photo for a live talk. The photo must amplify the speaker's idea as a visual metaphor, not illustrate the literal words.
You see numbered candidate photos. Choose the one with the strongest, simplest composition that expresses the idea. Reject photos with visible text, logos, watermarks, screenshots, maps, diagrams, product shots or an unrelated subject.
Reply ONLY JSON: {"index": <candidate number, or -1 if none is good enough>, "score": <1-5 how well it expresses the idea>}`;

export interface FindImageInput {
  query: string;
  alts?: string[];
  /** The metaphor in a sentence: what the photo should say. */
  intent?: string;
}

export async function findImage({ query, alts = [], intent = "" }: FindImageInput): Promise<ImageHit | null> {
  const queries = [query, ...alts].map((q) => q.trim().toLowerCase()).filter(Boolean).slice(0, 4);
  if (queries.length === 0) return null;
  const key = `${queries.join("|")}#${intent}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const runs = queries.flatMap((q) => [pexels(q), openverse(q), commons(q)]);
  // Take what has arrived by the deadline: one slow free API must not stall the slide.
  const arrived: Candidate[][] = runs.map(() => []);
  await Promise.race([
    Promise.allSettled(runs.map((run, i) => run.then((list) => (arrived[i] = list)))),
    new Promise((resolve) => setTimeout(resolve, SEARCH_DEADLINE_MS)),
  ]);
  const seen = new Set<string>();
  const pool: Candidate[] = [];
  // Interleave sources and queries so the shortlist is varied, not ten near-duplicates.
  for (let i = 0; pool.length < 8 && arrived.some((l) => i < l.length); i += 1) {
    for (const l of arrived) {
      const c = l[i];
      if (c && !seen.has(c.url) && pool.length < 8) {
        seen.add(c.url);
        pool.push(c);
      }
    }
  }
  if (pool.length === 0) return null;

  let hit: ImageHit = { url: pool[0].url, credit: pool[0].credit };
  const canSee = providers.nebius() && Boolean(await modelFor("vision").catch(() => null));
  if (canSee && pool.length > 1) {
    const inlined = (await Promise.all(pool.slice(0, 6).map(toDataUrl))).map((data, i) => ({ data, c: pool[i] })).filter((x) => x.data);
    if (inlined.length > 0) {
      try {
        const content = [
          { type: "text" as const, text: `Idea to express: ${intent || query}\nSearch terms used: ${queries.join(", ")}\n${inlined.length} candidates, numbered 0 to ${inlined.length - 1}.` },
          ...inlined.map((x) => ({ type: "image_url" as const, image_url: { url: x.data as string } })),
        ];
        const { json } = await chatJson(RERANK_SYSTEM, content, 120, "vision");
        const pick = json as { index?: number; score?: number };
        const chosen = typeof pick.index === "number" ? inlined[pick.index] : undefined;
        const score = typeof pick.score === "number" ? pick.score : 0;
        if (!chosen || score < MIN_SCORE) return null;
        hit = { url: chosen.c.url, credit: chosen.c.credit, score };
      } catch {
        // Vision unavailable this time: fall back to the first candidate.
      }
    }
  }
  cache.set(key, hit);
  return hit;
}
