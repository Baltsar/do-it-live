// Server-only: turns the speaker's heads-up into slides that are ready before the talk starts.
import { chatJson } from "@/lib/director";
import { groundSlide } from "@/lib/grounding";
import { isMotion, libraryLine, loadIndex } from "@/lib/library";
import type { PreparedMoment } from "@/lib/prepared";
import { isScene, SCENE_CATALOG, SCENES } from "@/lib/scene-catalog";

const PREP_SYSTEM = `You prepare slides BEFORE a live talk. The speaker wrote a short heads-up about what they will say. Prepare up to 6 slides for moments the talk will clearly reach, so each can appear the instant the speaker gets there.

Rules:
- Go through the heads-up sentence by sentence. Every sentence that makes a point gets its own slide: a short heads-up of four sentences gives four slides.
- Use ONLY what the heads-up says. Never invent a fact, a number or a name.
- Every number in the heads-up gets its own slide: BIG_NUMBER, or CHART with a ring for a percentage. A change between two numbers ("from 12 to 700") is a DELTA with versus = ["12", "700"]; a share of a group ("one in five") is a PICTOGRAM with number "1/5".
- A theme or feeling in the heads-up becomes a SCENE from the list. Use each scene at most once.
- Use a library item only when it clearly fits something in the heads-up: PHOTO for a photo, GIF_REACTION for a gif or clip, with its library_id.
- No text slides. "headline" is a 1-2 word label.
- "cues": 3 to 6 lowercase words or short phrases the speaker will actually SAY at that moment, including names exactly as written and numbers as digits.
- "strong": the single cue that tells this moment apart from every other one: a name, a number or a specific phrase from the heads-up, never a common word.
- "say": the sentence or part of a sentence in the heads-up that this moment is about, copied word for word.
- Cues must be words from the heads-up itself. Never take a cue or a number from the library list.

SCENES:
${SCENES.map((n) => `  ${n} = ${SCENE_CATALOG[n].means}`).join("\n")}

Output ONLY JSON:
{"moments":[{"cues":["..."],"strong":"...","say":"...","slide":{"layout":"SCENE|BIG_NUMBER|DELTA|PICTOGRAM|CHART|PHOTO|GIF_REACTION","versus":["..."],"scene":"...","number":"...","headline":"...","chart":{"kind":"ring","values":[0]},"library_id":"...","mood":"hype|funny|calm|serious|chaos"}}]}`;

interface RawMoment {
  say?: unknown;
  cues?: unknown;
  strong?: unknown;
  slide?: Record<string, unknown>;
}

/** Why a moment the model proposed was not kept: shown in the prep answer so a thin result can be explained. */
export const prepDropped: string[] = [];

/**
 * The model's answer varies from call to call: the same four-sentence heads-up gave four slides
 * three times and then two. When it comes back thinner than the heads-up has sentences, it is asked
 * once more and the fuller answer is kept.
 */
export async function prepareMoments(brief: string): Promise<PreparedMoment[]> {
  prepDropped.length = 0;
  const sentences = brief.split(/[.!?\n]+/).filter((part) => part.trim().split(/\s+/).length >= 4).length;
  const first = await prepareOnce(brief);
  if (first.length >= Math.min(sentences, 6)) return first;
  prepDropped.push(`first answer had ${first.length} of ${sentences}: asked again`);
  const second = await prepareOnce(brief).catch(() => [] as PreparedMoment[]);
  return second.length > first.length ? second : first;
}

async function prepareOnce(brief: string): Promise<PreparedMoment[]> {
  const text = brief.trim().slice(0, 600);
  if (text.length < 15) return [];
  const index = await loadIndex();
  const library = index.length
    ? index.map(libraryLine).join("\n")
    : "(empty)";
  const { json } = await chatJson(PREP_SYSTEM, `HEADS-UP:\n${text}\n\nLIBRARY (id | kind | what it shows | what people use it to say | could stand for):\n${library}`, 1400, "quality");
  const raw = ((json as { moments?: RawMoment[] }).moments ?? []).slice(0, 10);
  prepDropped.push(`model proposed ${raw.length}`);

  const words = (t: string): string[] => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const briefWords = new Set(words(text));
  const fromBrief = (cue: string): boolean => {
    const w = words(cue);
    return w.length > 0 && w.every((x) => briefWords.has(x));
  };
  const out: PreparedMoment[] = [];
  const scenesUsed = new Set<string>();
  const strongUsed = new Set<string>();
  for (const m of raw) {
    const slide = m.slide;
    if (!slide || typeof slide !== "object") {
      prepDropped.push(`${String(m.strong)}: no slide`);
      continue;
    }
    // A cue the speaker never wrote cannot be trusted to come up: it would be the model's guess
    // (one run borrowed "227" from a library caption). Keep only cues made of the heads-up's own words.
    const given = Array.isArray(m.cues)
      ? m.cues.filter((c): c is string => typeof c === "string").map((c) => c.toLowerCase().trim()).filter((c) => c.length >= 2 && fromBrief(c))
      : [];
    // The model often gives one phrase where it was asked for several cues ("join without a login").
    // The telling words inside a phrase are cues too; without them such a moment was thrown away.
    const inside = given.flatMap((c) => (c.includes(" ") ? c.split(/\s+/).filter((w) => /\d/.test(w) || w.length >= 5) : []));
    const cues = [...new Set([...given, ...inside])].slice(0, 8);
    const strongRaw = typeof m.strong === "string" ? m.strong.toLowerCase().trim() : "";
    const strong = strongRaw && fromBrief(strongRaw) ? strongRaw : cues[0];
    const shortStrong = !/\d/.test(strong ?? "") && (strong ?? "").replace(/\s/g, "").length < 5;
    // A number or a long name fires on its own (see matchPrepared), so one cue is enough for those.
    const firesAlone = /\d/.test(strong ?? "") || (strong ?? "").replace(/\s/g, "").length >= 8;
    // A short strong cue never fires alone (the matcher asks for a second hit), so it needs spare cues.
    if (cues.length < (firesAlone ? 1 : 2) || !strong || (shortStrong && cues.length < 3) || strongUsed.has(strong)) {
      prepDropped.push(`${String(m.strong)}: cues ${JSON.stringify(m.cues)} kept ${JSON.stringify(cues)}`);
      continue;
    }
    strongUsed.add(strong);

    // The same honesty rules as live: a number must come from the speaker's own words.
    const asked = String(slide.layout ?? "").toUpperCase();
    groundSlide(slide, text);
    const item = index.find((i) => i.id === slide.library_id);
    if (item) slide.layout = isMotion(item) ? "GIF_REACTION" : "PHOTO";
    else slide.library_id = undefined;

    const layout = String(slide.layout ?? "").toUpperCase();
    const figures = ["BIG_NUMBER", "CHART", "DELTA", "PICTOGRAM", "STAT_ROW"];
    const figure = figures.includes(layout);
    if (figures.includes(asked) && !figure) {
      prepDropped.push(`${strong}: a number that is not in the heads-up`);
      continue;
    }
    if (!figure && !item) {
      // Everything else is drawn before the talk. The scene here is only what shows if that drawing fails,
      // so a missing or repeated scene is no reason to lose the moment (it used to cost two slides of four).
      const wanted = String(slide.scene ?? "").toLowerCase();
      const scene = isScene(wanted) && !scenesUsed.has(wanted) ? wanted : (SCENES.find((name) => !scenesUsed.has(name)) ?? SCENES[0]);
      scenesUsed.add(scene);
      slide.layout = "SCENE";
      slide.scene = scene;
    }
    const say = typeof m.say === "string" && m.say.trim() ? m.say.trim().slice(0, 240) : cues.join(", ");
    out.push({ id: `p${out.length}${Date.now().toString(36)}`, cues, strong, slide, say });
    if (out.length === 6) break;
  }
  return out;
}
