import type { ImageSource, Slide, VisualMode } from "@/lib/slide";

async function getJson<T>(url: string): Promise<T | null> {
  try {
    return (await (await fetch(url)).json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fills in the photo or GIF a slide needs. A slide is never left empty: a failed lookup falls
 * back to the icon, and in text-friendly modes to plain type. Mutates the slide.
 */
export async function resolveVisuals(slide: Slide, mode: VisualMode = "balanced", source: ImageSource = "library"): Promise<void> {
  const fallback = (): void => {
    // Image-first modes must never fall back to a text slide: an icon still says something.
    slide.layout = slide.icon || mode !== "balanced" ? "ICON" : "BIG_WORD";
    slide.icon ??= "Sparkles";
  };
  // The speaker's own photo: straight from the library, no lookup.
  if (slide.layout === "PHOTO" && slide.libraryId) {
    slide.image = `/api/library/${slide.libraryId}`;
    slide.credit = "";
    return;
  }
  const wantsGif = slide.layout === "GIF_REACTION" || slide.layout === "MEME";
  if (wantsGif && slide.libraryId) {
    slide.gif = `/api/library/${slide.libraryId}`;
  } else if (wantsGif && slide.gifQuery) {
    const g = await getJson<{ url: string | null }>(`/api/gif?q=${encodeURIComponent(slide.gifQuery)}`);
    slide.gif = g?.url ?? null;
    if (!slide.gif) {
      if (slide.imageQuery && source === "web") slide.layout = "PHOTO";
      else fallback();
    }
  } else if (wantsGif) {
    if (slide.imageQuery && source === "web") slide.layout = "PHOTO";
    else fallback();
  }
  const query = slide.imageQuery || slide.headline;
  const lookup = async (): Promise<{ url: string; credit: string } | null> => {
    const params = new URLSearchParams({ q: query, alts: slide.imageAlts.join("|"), intent: slide.metaphor });
    return (await getJson<{ hit: { url: string; credit: string } | null }>(`/api/image?${params}`))?.hit ?? null;
  };
  if (slide.layout === "SPLIT_STAT" && slide.imageQuery && source === "web") {
    const hit = await lookup();
    if (hit) slide.image = hit.url;
  }
  if (slide.layout === "PHOTO") {
    const hit = source === "web" ? await lookup() : null;
    if (hit) {
      slide.image = hit.url;
      slide.credit = hit.credit;
    } else {
      fallback();
    }
  }
}
