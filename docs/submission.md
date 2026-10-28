# Devpost submission: Do it live

Text for the Devpost form, field by field. Track: **Best Apps and Agents**.

## Tagline

Talk. The slides make themselves.

## What it does

Do it live is a presentation with no deck. You press the mic and talk. While you are still mid-sentence, NVIDIA Nemotron models on Nebius Token Factory decide whether the moment deserves a slide, and the slide is drawn on screen as you speak: an interface element (a login form being crossed out, a poll, a rating), a big number you just said, a drawing, or one of your own GIFs. The audience sees the point instead of reading it, and you never build a slide.

It runs in any browser, and on a phone: press Screen, plug the phone into a TV, and talk.

## Why we built it

Slides cost hours and mostly repeat the speaker in text the audience reads instead of listening. We wanted the opposite: the talk is the source, and the visuals follow it live, like a simultaneous interpreter who translates speech into pictures.

## How we built it

- **Next.js** app. A browser-side stage engine reads the live transcript and decides when to ask for a slide.
- **Speech to text:** AssemblyAI streaming (`universal-3-6-pro`) with a single-use token from our server, so the key never reaches the browser. The speaker picks English or Swedish.
- **Director: `nvidia/Nemotron-3_5-Lightning`** on Token Factory. It decides show or hold and which layout, every few spoken words.
- **Drawer:** a race on Token Factory between `moonshotai/Kimi-K3`, `openai/gpt-oss-120b` and `nvidia/Nemotron-3-Ultra-550b-a55b`. The first model to answer wins. Its first line is a verdict (same picture, nothing, an interface spec, or a label), and a drawing then streams onto the screen as HTML/CSS in a sandboxed iframe with no scripts.
- **Prep: `nvidia/Nemotron-3-Ultra-550b-a55b`** turns a few sentences written before the talk into ready slides with cue words. They fire locally the moment the cue is spoken, with no model call.
- **Own media: `nvidia/Nemotron-3.5-Super-VL`** describes each uploaded GIF or photo from its first, middle and last frames, and `Qwen/Qwen3-Embedding-8B` ranks them against what is being said.
- **Facts:** ask "Bill, how many...?" and Tavily search plus Nemotron 3 Ultra produce one slide that shows its source.
- Figures, signpost phrases ("here's the problem") and prepared cues are handled by rules with no model, so a number you say is on screen before you finish the sentence.
- Hosted on Vercel behind a password gate that also covers the API, because the drawing routes spend credits.

## Challenges

- **Latency is the product.** A slide that lands three seconds late is worse than none. We moved everything we could out of the model path: figures, cues and signposts run on interim words in the browser. The director and the drawer run in parallel, not in sequence, and the drawer is a race of three models because shared-model latency on any one of them swung from under a second to eight seconds within minutes.
- **The browser's speech recognition failed us.** It worked in Google Chrome but returned nothing, with no error, in Chromium browsers without Google's speech service. Five debugging rounds later we moved speech to text to a streaming service, which works the same in every browser and on phones.
- **Live speech is unfinished.** Our first drawing prompt refused half sentences, which is everything a live system sees. Rewriting it as a simultaneous interpreter ("show it as soon as the words name something concrete") took one real recorded conversation from 9 to 23 pictures out of the same 55 chunks.
- **No invented numbers.** A slide may only show a figure the speaker said, or one from a cited source.

## What we learned

Most of the "intelligence" a live system needs is deciding *when* to speak up, not what to say. The cheapest wins came from treating the model as the slow path and keeping the fast path rule-based and local.

## What's next

- Hosting NVIDIA Parakeet or Canary for speech to text, so the whole pipeline runs on Nebius.
- A rehearsal mode that learns your talk and pre-draws it.
- Rooms: the phone as the mic, any screen in the venue as the display, with no cable.

## Built with

Nebius Token Factory, NVIDIA Nemotron 3.5 Lightning, NVIDIA Nemotron 3 Ultra, NVIDIA Nemotron 3.5 Super VL, Kimi-K3, gpt-oss-120b, Qwen3 Embedding, AssemblyAI, Tavily, Next.js, React, Tailwind CSS, shadcn/ui, Motion, Vercel.

## Testing instructions

Demo: https://do-it-live-two.vercel.app (password in the private testing field).

Use a laptop or a phone with a microphone. Pick English or Swedish under the mic, press the mic and talk for a minute about anything. Pause briefly between sentences. Say a number ("we are 700 people") to see a figure land mid-sentence. **Play the demo talk** replays a scripted talk if no microphone is available. On a phone, **Screen** turns the phone into the audience screen.

## Feedback on Nebius Token Factory and NVIDIA models

- **One endpoint for many models was the biggest accelerator.** We raced three drawing models and moved roles between models by changing a model id, with no new SDK or keys. The `/models` listing let roles resolve at runtime.
- **Latency on shared models varies a lot.** Within minutes, first-token time for Kimi-K3 ranged from 0.6 s to 7.9 s, and for gpt-oss-120b from 0.3 s to 6.1 s. Nemotron 3 Ultra held about 0.4 s. A published latency signal, or a priority tier for interactive use, would help real-time apps.
- **Thinking has to be switched off for JSON.** Nemotron reasoning models return reasoning text unless called with `chat_template_kwargs: { enable_thinking: false }`. That is easy to miss, and a short note on the model pages would save time.
- **No speech model.** `/v1/audio/transcriptions` returns 404 and the catalogue has no ASR model. NVIDIA Parakeet or Canary on Token Factory would let voice apps like ours run entirely on Nebius.
- **Model id naming is inconsistent** (`Nemotron-3_5-Lightning` next to `nemotron-3-super-120b-a12b`). We match ids with patterns rather than hard-coding them.
- **Nemotron 3 Ultra was the most conservative drawer.** With the same prompt it declined to draw far more often than the other two, which made it a dependable fallback but a weak first choice for creative visual output.
