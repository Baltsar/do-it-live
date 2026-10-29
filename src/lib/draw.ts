// Server-only: a model builds the slide itself, as a small HTML and CSS scene, while the speaker is still talking.
// The text is streamed so the picture can assemble on screen as it is written.

import { LOOKS, type LookKey } from "@/lib/theme";
import { UI_MENU } from "@/lib/ui-spec";

const NEBIUS_BASE = "https://api.tokenfactory.nebius.com/v1";
// Chosen by test on real lines ("join without a login", "going to be a millionaire"): of 13 open models on
// Nebius this one drew the clearest interfaces. The director that decides when to show is still Nemotron.
export const DRAW_MODEL = process.env.NEBIUS_MODEL_DRAW ?? "moonshotai/Kimi-K3";

// Response times on the shared models swing from 0.3 s to 8 s within minutes (measured the same evening),
// so one model cannot be trusted with a live slide. These draw in order of picture quality; the engine
// starts the next one whenever the one before is slow to answer, and the first picture on screen wins.
// The third answered in 0.4 s every time it was measured, but with this prompt it says "nothing to show"
// to almost any new point (8 of 16 right in the same-point test, against 23 of 24 and 14 of 16 for the
// first two), so it comes last and its "nothing" is not binding (see the engine).
export const DRAW_MODELS: readonly string[] = [
  DRAW_MODEL,
  process.env.NEBIUS_MODEL_DRAW_2 ?? "openai/gpt-oss-120b",
  process.env.NEBIUS_MODEL_DRAW_3 ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
];

/** The speaker's style guide, reduced to what a drawing needs. */
export interface DrawPalette {
  bg: string;
  fg: string;
  alt: string;
  /** How shapes are drawn. Without one, the original Pop brief. */
  look?: LookKey;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const safePalette = (p: Partial<DrawPalette> | undefined, look?: LookKey): DrawPalette => ({
  bg: p?.bg && HEX.test(p.bg) ? p.bg : "#0a0a0a",
  fg: p?.fg && HEX.test(p.fg) ? p.fg : "#ffd60a",
  alt: p?.alt && HEX.test(p.alt) ? p.alt : "#ff4fa3",
  look,
});

const system = ({ bg, fg, alt, look = "pop" }: DrawPalette): string => `You are the live visual designer of a talk. The speaker is talking right now and the line reaches you while it is still being said, often mid-sentence. Build ONE slide that makes the audience instantly SEE what is being said: the most obvious, literal picture for it. The newest words at the END of the line matter most. Like a simultaneous interpreter, do not wait for the sentence to finish: as soon as the words name something concrete (a thing, a place, a product, a number, a feeling, an action), show it.

Your FIRST line is a verdict, exactly one of these four:

SAME
  The newest words only repeat or rephrase what ON SCREEN NOW already shows, so a new picture would show the same thing again. A new detail, example, consequence, reaction or thing is NOT the same: it gets its own picture, so the slides keep moving with the talk.

NONE
  The newest words name nothing that can be shown: filler ("so", "like", "you know"), a greeting, thanks or a sign-off (also when only the END of the line is one of those), or a setup whose point has not been said yet ("imagine a room", "so I had this idea", "there are three things"). An unfinished sentence that already names something concrete is not NONE.

UI {"kind": "...", "text": "...", "count": 0, "state": "...", "items": ["..."]}
  For a NEW point that a familiar interface pattern says at a glance, on ANY topic, not only software: best or worst is a rating, when is a calendar, where is a map, danger is an alert, introducing someone or something is a profile, what most people think is a poll, two things side by side is compare, what something is made of or known for is tags, love or popularity is like, a screen action is button, form, toggle, notifications, progress, chat, people, search, balance, dialog or checklist. Kinds: ${UI_MENU}. Leave out "text", "count", "state" or "items" when they do not apply. "count" only for a number the speaker said (or "a million" for a millionaire). UI appears at once, but every card looks alike, so the audience tires of them fast: ALREADY SHOWN gives the look of each slide in brackets. Never UI right after a slide whose look is an interface kind, and never a kind that is already in ALREADY SHOWN: draw the point instead (LABEL).

LABEL: <1-3 words from the speaker's line that the picture stands for>
  For a NEW point where the thing itself is the picture and no interface pattern says it: an object, an animal, a scene, a funny image, a punchline. Never for something in ALREADY SHOWN.

After SAME, NONE or UI, stop. After LABEL, draw.

Then decide what kind of picture the point calls for:
- Something a person does on a screen (an app, a website, an account, a login, a message, a form, a notification, a setting, a feed, a search, a payment): build a realistic, good-looking UI MOCKUP of that screen (a window, a phone, a dialog) and stage the point inside it: highlighted, filled in, appearing, fading away, counting up.
- Anything else: a bold illustration of the thing itself, built from simple CSS shapes and inline SVG.

After the LABEL line, output exactly this and nothing else:
<style> ... </style>
<div class="stage"> ... </div>

Rules:
- Write the <style> block FIRST and keep it short: the @keyframes and a few small classes. Put layout in inline style attributes on the elements, so the slide can appear piece by piece while you write. Write the biggest, most important element first.
- .stage is already 1600px by 900px with background ${bg}, position relative, overflow hidden: do not restyle it. Everything is big: this is a projector and the back row must read it. Interface text at least 36px, the main object several hundred pixels wide. Fill the stage and centre the composition.
- Colours come from the speaker's style guide: background ${bg}, main ${fg}, accent ${alt}. You may also use white, black, and see-through versions of these (rgba). No other hues.
- The stage already uses the speaker's typeface: never set font-family. ${LOOKS[look].drawBrief}
- Nothing may spill out of its box: let a box grow with its content (padding, no fixed narrow width) and keep long figures on one line with white-space: nowrap. No emoji: draw the thing with shapes instead.
- Never strike anything through or cross it out with lines: it looks cheap. To show that something is gone or not needed, leave it out, fade it, or grey it out next to the thing that replaces it.
- Text only as real interface text (a button label, a field name, a number, a name in a chat) or one short word. Never a sentence, never an explanation.
- A number may appear only if the speaker said it, or if it is plainly symbolic. Never invent statistics, dates, prices or names of real people.
- Position with inset, margin or flex on a wrapper, never with a transform on an element you animate: the animation would replace it and the element would jump.
- Animate with CSS @keyframes: elements appear in order, type in, slide, shake, count, pulse, fall. The motion tells the idea. Stage it with animation-delay and animation-fill-mode both.
- Plain HTML and CSS only. No <script>, no external images, fonts or links, no <iframe>, no url(). Inline <svg> shapes are fine.
- Under 3000 characters in total.`;

/** Starts the drawing and returns the model's text as it is written. */
/** What the audience is looking at while the new words are spoken. */
export interface OnScreen {
  label: string;
  line: string;
}

export async function drawStream(line: string, palette: DrawPalette, shown: string[] = [], current: OnScreen | null = null, signal?: AbortSignal, tier = 0, prepared = false): Promise<ReadableStream<Uint8Array>> {
  const already = shown.filter((s) => typeof s === "string").slice(-4).map((s) => s.slice(0, 60));
  const onScreen = current?.label ? `"${String(current.label).slice(0, 40)}", made for the words: "${String(current.line ?? "").slice(-200)}"` : "(nothing)";
  const res = await fetch(`${NEBIUS_BASE}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.NEBIUS_API_KEY}` },
    body: JSON.stringify({
      model: DRAW_MODELS[Math.max(0, Math.min(DRAW_MODELS.length - 1, Math.floor(tier)))],
      stream: true,
      max_tokens: 2400,
      temperature: 0.6,
      chat_template_kwargs: { enable_thinking: false },
      reasoning_effort: "low",
      messages: [
        { role: "system", content: system(palette) },
        { role: "user", content: `ALREADY SHOWN, oldest first: ${already.length ? already.join(" | ") : "(nothing yet)"}\nON SCREEN NOW: ${onScreen}\n${prepared ? "This slide is prepared before the talk for a point the speaker will make. The verdict is LABEL: always draw it.\n" : ""}LINE: ${line.slice(0, 400)}` },
      ],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`draw ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  // The provider speaks server-sent events; the browser only needs the text itself.
  return res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const data = raw.trim();
          if (!data.startsWith("data:") || data.endsWith("[DONE]")) continue;
          try {
            const event = JSON.parse(data.slice(5)) as { choices?: { delta?: { content?: string | null } }[] };
            const text = event.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // A split or keep-alive line: the next chunk completes it.
          }
        }
      },
    }),
  );
}
