# Do it live

**Talk. The slides make themselves.**

Do it live is a presentation tool with no deck. You press the mic and talk. While you are still mid-sentence, NVIDIA Nemotron models on Nebius Token Factory decide whether the moment deserves a slide, and the slide is drawn on screen as you speak: an interface element, a big number, a drawing or one of your own GIFs. There is no slide prep. The audience sees the point instead of reading it.

Built for the Nebius x NVIDIA Global AI Hackathon, **Best Apps and Agents** track.

## Why

Most slides repeat what the speaker is already saying, in text the audience reads instead of listening. Building them takes hours and they are out of date by the time you present. Do it live inverts that: the talk is the source, and the slides follow it live, showing rather than telling. It works for a conference talk, a demo day, a standup, or someone holding a phone plugged into a TV.

## How it works

```
mic ──► speech to text ──► stage engine (browser) ──┬──► director   Nemotron 3.5 Lightning   show or hold, which layout
        AssemblyAI          live words, figures,    │
        streaming           signposts, prepared     └──► drawer     race of Kimi-K3, gpt-oss-120b
                            cues: no model call                     and Nemotron 3 Ultra: streams the slide
                                                                    as HTML/CSS or a UI spec
```

1. **Listen.** Audio streams to AssemblyAI (`universal-3-6-pro`, English or Swedish, picked under the mic). Words arrive while they are being said, about a second after they are spoken.
2. **Read ahead without a model.** The stage engine acts on unfinished speech. A spoken figure ("700 builders", "80 percent") becomes a number slide the instant it is heard. Signposts ("here's the problem", "let me give you an example") shorten the wait. Prepared moments fire on their cue words. None of this needs a network call.
3. **Decide and draw in parallel.** Every few words the director (**Nemotron 3.5 Lightning**) decides whether there is a point worth a slide. At the same moment the drawer races three Token Factory models and takes the first that answers. Its first line is a verdict: the same picture still fits, nothing to show, an interface element (rating, map, poll, login form, notifications, progress bar...), or a drawing that streams onto the screen as it is written. The drawing runs in a sandboxed iframe with no scripts.
4. **Prepare, optionally.** Write a few sentences about the talk before you start. **Nemotron 3 Ultra** turns them into ready slides with cue words, which fire the moment you say them.
5. **Bring your own media.** Drop photos, GIFs and clips on the page. **Nemotron 3.5 Super VL** describes each file, because file names say nothing, and **Qwen3 Embedding** ranks them, so a GIF appears when it fits what you say.
6. **Ask for a fact.** Say "Bill, how many people...?" and Tavily searches the web. Nemotron 3 Ultra turns the results into one slide that shows its source.

### NVIDIA models on Nebius Token Factory

| Job | Model | Why this one |
|---|---|---|
| Director: show or hold, layout | `nvidia/Nemotron-3_5-Lightning` | Fast and steady enough to run on every few spoken words |
| Prep, fact slides | `nvidia/Nemotron-3-Ultra-550b-a55b` | Serious reasoning where a second of latency is fine |
| Describing the speaker's own media | `nvidia/Nemotron-3.5-Super-VL` | Sees start, middle and end frames of a GIF |
| Third runner in the drawing race | `nvidia/Nemotron-3-Ultra-550b-a55b` | Steady first token when the shared models stall |
| Library ranking | `Qwen/Qwen3-Embedding-8B` | Embeddings on the same API |
| Drawing | `moonshotai/Kimi-K3`, `openai/gpt-oss-120b` | Raced with Nemotron Ultra; first answer wins |

Every model call goes through one OpenAI-compatible endpoint, `https://api.tokenfactory.nebius.com/v1`. The roles resolve to the best available model at runtime, and `NEBIUS_MODEL_<ROLE>` overrides them. Nemotron reasoning models are called with `chat_template_kwargs: { enable_thinking: false }` so they return plain JSON.

Speech to text is the one piece that does not run on Token Factory, because it has no speech model. See the feedback in [docs/submission.md](docs/submission.md).

## Run it

Requirements: Node.js 22 (`.nvmrc`), and a browser with a microphone.

```bash
nvm use
npm install
```

Create `.env.local`:

```bash
NEBIUS_API_KEY=...        # required: Nebius Token Factory
ASSEMBLYAI_API_KEY=...    # recommended: speech to text in any browser, phones included
TAVILY_API_KEY=...        # optional: sourced fact slides
SITE_PASSWORD=...         # optional: a password in front of the whole app, API included
```

```bash
npm run dev -- -p 3100
```

Open http://localhost:3100, pick **English** or **Svenska** under the mic, press the mic and talk.

Without `ASSEMBLYAI_API_KEY` the app falls back to the browser's own speech recognition. That works in Google Chrome, Edge and Safari. Some Chromium browsers, Comet and Brave among them, ship the API with no service behind it. The app detects that and says so instead of failing silently.

No microphone at hand? **Play the demo talk** on the start page replays a scripted talk through the same engine.

### Pages

| Page | What it is |
|---|---|
| `/` | The show: mic, language, the live slide and caption |
| `/screen` | The audience window. Open it with **Screen** and drag it to the projector |
| `/style` | Your look: paste a website or drop a style guide, and the slides take its colours |
| `/library` | Your own photos, GIFs and clips |
| `/lab` | Engineering console: replays, logs, settings |

On a phone, **Screen** turns the phone itself into the audience screen: the slide alone, full screen. Plug the phone into a TV with USB-C and it mirrors, so you talk into the phone and the slides appear on the TV.

### Deploy

`vercel deploy` works as is (`vercel.json` pins the Stockholm region). Set the same environment variables in the Vercel project. On Vercel the disk is read-only, so the session recorder writes to the runtime log instead, and media uploads are local-only.

## Honest limits

- Speech to text needs AssemblyAI or a browser with a working speech service.
- The drawer sometimes picks a weak picture. It is told to draw from unfinished sentences, which keeps the slides moving with the talk, and the trade-off is that some pictures miss.
- English and Swedish are supported. Other languages AssemblyAI knows would need one line each in the language picker.
- The media library lives on local disk. A hosted multi-user version needs real storage.

## License

[MIT](LICENSE)
