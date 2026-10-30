# Devpost submission: Do it live

Text for the Devpost form, field by field. Track: **Best Apps and Agents**. City: **Stockholm** (Builders & Brews).

Links for the form:
- Demo: https://do-it-live-two.vercel.app (open, no password; 15 free minutes of stage time per visitor and day)
- Code: https://github.com/Baltsar/do-it-live (MIT)
- Video: [YOUTUBE LINK, public, 3 minutes or shorter]

## Project name

Do it live

## Elevator pitch (one line)

F*ck it, we'll do it live. Vibe presenting: talk on stage and the slides draw themselves while you speak, on NVIDIA Nemotron via Nebius Token Factory.

## What it does

Do it live is a presentation with no deck. We call it vibe presenting. You press the mic and talk. While you are still mid-sentence, NVIDIA Nemotron models on Nebius Token Factory decide whether the moment deserves a slide, and the slide appears as you speak. It can be:
- a drawing that builds on screen while it is written;
- one of 60 big interface elements: a login that folds away, a poll, a card that gets declined, a text message, a terminal that fails;
- a figure you just said, read from your own words: "from 12 to 700" becomes a change with its factor, "one in five" a row of figures with one lit, "700 builders in 12 cities and 3 countries" a row of three;
- a duel between two things, moving type, a question left hanging, or your own words quoted back;
- one of your own GIFs, which the engine has watched and understood;
- one of 80 wordless animated scenes when nothing better fits.

Every slide comes in one of seven looks, chosen like a Keynote theme: Scribble (marker on a whiteboard, the default), Pop, Signal, Redacted, Broadcast, Sticker and Scoreboard. The same talk looks like a different deck in each.

The audience sees the point instead of reading it, and you never build a slide. It runs in any browser, and on a phone: press Screen, plug the phone into a TV, and talk.

## Why we built it

Slides cost hours and mostly repeat the speaker in text the audience reads instead of listening. The people who present most often have the least time to build slides. Teachers and preschool staff present from a phone. Meetup hosts and community organisers speak every week. Founders pitch at demo day with one minute's notice.

We wanted the opposite of a deck: the talk is the source, and the visuals follow it live, like a simultaneous interpreter who translates speech into pictures.

## How we built it

- **Next.js** app. A browser-side stage engine reads the live transcript and decides when to ask for a slide.
- **Speech to text:** AssemblyAI streaming (`universal-3-6-pro`) with a single-use token from our server, so the key never reaches the browser. The speaker picks English or Swedish.
- **Director: `nvidia/Nemotron-3_5-Lightning`** on Token Factory. Every few spoken words it decides show or hold, and which layout. A second Lightning call scores the line against the 80 scenes, and a third judges whether a GIF from the speaker's library really fits the moment.
- **Drawer:** a race on Token Factory between `moonshotai/Kimi-K3`, `openai/gpt-oss-120b` and `nvidia/Nemotron-3-Ultra-550b-a55b`. The first model to answer wins. Its first line is a verdict (same picture, nothing, an interface spec, or a label), and a drawing then streams onto the screen as HTML/CSS in a sandboxed iframe with no scripts. Each look gives the drawer its own brief: on Scribble it draws with a marker kit of cards, sticky notes and hand-drawn arrows.
- **Figures without a model.** "From 12 to 700", "one in five", "80 percent", "700 builders in 12 cities": parsed from the spoken words in the browser and on the server, digits and number words alike. A slide may show a figure only if the speaker said it, so a model that invents one is downgraded to a plain word slide.
- **Prep: `nvidia/Nemotron-3-Ultra-550b-a55b`** turns a few sentences written before the talk into ready slides with cue words. They fire locally the moment the cue is spoken, with no model call.
- **Own media, understood.** Drop a whole folder. The file's own bytes say what it is (a "gif" from Giphy is often WebP or MP4), never its name. `nvidia/Nemotron-3.5-Super-VL` watches six frames of each file, Tavily looks it up on meme and GIF sites, and Nemotron 3 Ultra decides what it is and what the internet uses it to say: "Blinking White Guy" means disbelief. A meme name is kept only when a web page confirms it. `Qwen/Qwen3-Embedding-8B` then ranks the library against what is being said, and the Lightning judge has the last word. On the hosted demo every visitor gets a private library in Vercel Blob; on a laptop it is a folder on disk.
- **Facts:** ask "Bill, how many...?" and Tavily search plus Nemotron 3 Ultra produce one slide that shows its source.
- **The art director** is code, not a model: it changes colour field, alignment and backdrop so two slides in a row never look alike, never shows two interface cards in a row, and turns a card that would be one too many into a big number, a duel, moving type or a quote.
- **Hosted on Vercel**, open to everyone. Each visitor gets 15 free minutes of stage time a day and the site has a daily ceiling, counted across instances in Blob, so the demo can stay open without the credits running away.

## How we use Tavily

Two jobs, both in the live path.

1. **Sourced facts on stage.** When the speaker asks the room a question with a number in it ("Bill, how many people live in Sweden?"), Tavily `/search` with `include_answer` fetches the sources and Nemotron 3 Ultra turns them into one slide that shows its source URL. A number nobody said is never shown without one.
2. **The culture desk.** When a speaker uploads a GIF, a vision model can describe the frames but cannot know that a blinking man means disbelief. Tavily `/search` restricted with `include_domains` to knowyourmeme.com, giphy.com, tenor.com, imdb.com, wikipedia.org and reddit.com finds the pages that name the clip. Nemotron 3 Ultra reads the frames' description, the file name and the results, and names the meme, its origin and what people use it to say. The name is kept only if the page it cites is in Tavily's results, so the library is never wrong about a reference, only sometimes silent. The director then picks that GIF for the moment it means, not for the word in its file name.

## Challenges

- **Latency is the product.** A slide that lands three seconds late is worse than none. We moved everything we could out of the model path: figures, cues and signposts run on interim words in the browser. The director and the drawer run in parallel, not in sequence, and the drawer is a race of three models because shared-model latency on any one of them swung from under a second to eight seconds within minutes.
- **The browser's speech recognition failed us.** It worked in Google Chrome but returned nothing, with no error, in Chromium browsers without Google's speech service. Five debugging rounds later we moved speech to text to a streaming service, which works the same in every browser and on phones.
- **Live speech is unfinished.** Our first drawing prompt refused half sentences, which is everything a live system sees. Rewriting it as a simultaneous interpreter ("show it as soon as the words name something concrete") took one real recorded conversation from 9 to 23 pictures out of the same 55 chunks.
- **The quickest answer is not the best one.** A recorded test talk showed two problems, both caused by "first answer wins": 16 of 22 slides were the same kind of interface card, and a fast model's "nothing to show" cut off the best model while it was still drawing, 26 times in 80 seconds. The fix: a quick "nothing" no longer overrules a model still at work, there are never two cards in a row, and a card that would be one too many appears as another look instead. The same talk then had 6 cards out of 21, nine different looks, and a median of 1.7 s from words to screen.
- **A look is more than colours.** Making Scribble work meant that the live drawings, which a model writes as HTML, had to match the hand-drawn templates. The drawer gets a kit of ready classes (a card with a marker outline, a sticky note, a loop around the key figure) and four composition recipes, and the stage forces the typeface and centring, because the model will otherwise copy the example's numbers and set its own fonts.
- **No invented numbers.** A slide may only show a figure the speaker said, or one from a cited source. Every number layout is checked against the transcript, including number words ("forty million").
- **Keeping an open demo open.** The day the password came off, the credits were the risk. A per-visitor and per-site minute budget, merged into one small Blob file with conditional writes, holds across serverless instances and costs nothing to read.

## What we learned

Most of the "intelligence" a live system needs is deciding *when* to speak up, not what to say. The cheapest wins came from treating the model as the slow path and keeping the fast path rule-based and local. A 6-minute talk costs about 1.5 million tokens, 96 % of them input: the prompt a model reads every few seconds matters more than anything it writes.

## What's next

- Minutes for sale, so a speaker who talks every week can buy stage time; and a Mac app that runs on the speaker's own Token Factory key with the library on disk.
- Pre-filtering the 80 scenes with the embedding model, which cuts about a quarter of all tokens.
- Hosting NVIDIA Parakeet or Canary for speech to text, so the whole pipeline runs on Nebius.
- Rooms: the phone as the mic, any screen in the venue as the display, with no cable.

## Built during the submission period

The repository was created on 28 October 2026 and everything in it was built during the hackathon. The last 48 hours added: the seven looks and the hand-drawn Scribble default; 60 interface cards; the figure layouts read from speech; the media library that understands memes; private per-visitor libraries on the hosted demo; and the free-minutes budget that let us open the demo without a password.

## Built with

Nebius Token Factory, NVIDIA Nemotron 3.5 Lightning, NVIDIA Nemotron 3 Ultra, NVIDIA Nemotron 3.5 Super VL, Kimi-K3, gpt-oss-120b, Qwen3 Embedding, Tavily, AssemblyAI, Next.js, React, Tailwind CSS, shadcn/ui, Motion, Vercel, Vercel Blob.

## Testing instructions

Open https://do-it-live-two.vercel.app in Google Chrome, Edge or Safari, on a laptop or a phone with a microphone. No account, no password. Each visitor has 15 free minutes of stage time a day.

1. Pick English or Swedish under the mic, press the mic and talk for a minute about anything. Pause briefly between sentences.
2. Say a figure ("we went from 12 to 700 people", "one in five", "80 percent") to see it land mid-sentence.
3. Ask "Bill, how many people live in Sweden?" to see a sourced fact slide.
4. **Look** (top right) switches between the seven looks; **Templates** at /templates shows every slide type, card and scene.
5. **Library** at /library takes a folder of your own GIFs and photos; each is watched, looked up and described. Then say what one of them means.
6. No microphone? **Play the demo talk** replays a scripted talk. On a phone, **Screen** turns the phone into the audience screen.

Run it yourself with your own Token Factory key: `pnpm install && pnpm dev`, see the README.

## Feedback on Nebius Token Factory and NVIDIA models

- **One endpoint for many models was the biggest accelerator.** We raced three drawing models and moved roles between models by changing a model id, with no new SDK or keys. The `/models` listing let roles resolve at runtime.
- **Latency on shared models varies a lot.** Within minutes, first-token time for Kimi-K3 ranged from 0.6 s to 7.9 s, and for gpt-oss-120b from 0.3 s to 6.1 s. Nemotron 3 Ultra held about 0.4 s. In a 6-minute recorded talk Kimi stalled 6 times and the race covered every one; Lightning timed out once in 132 director calls. A published latency signal, or a priority tier for interactive use, would help real-time apps.
- **Prompt caching would halve our bill.** A 6-minute talk is about 1.5 million tokens and 96 % is input: the same system prompt, read every few seconds. Prefix caching on repeated system prompts is the one feature we would ask for first.
- **Thinking has to be switched off for JSON.** Nemotron reasoning models return reasoning text unless called with `chat_template_kwargs: { enable_thinking: false }`. That is easy to miss, and a short note on the model pages would save time.
- **Nemotron 3.5 Super VL reads motion when given frames.** Six frames spread over a GIF were enough to describe a blink or a head turn; three were not. A native animated-GIF or short-video input would remove the frame extraction in the browser.
- **Nemotron 3 Ultra is a careful editor.** As the "culture desk" it refused to name a meme without evidence far more reliably than it drew pictures: a dependable judge, a conservative artist.
- **No speech model.** `/v1/audio/transcriptions` returns 404 and the catalogue has no ASR model. NVIDIA Parakeet or Canary on Token Factory would let voice apps like ours run entirely on Nebius.
- **Model id naming is inconsistent** (`Nemotron-3_5-Lightning` next to `nemotron-3-super-120b-a12b`). We match ids with patterns rather than hard-coding them.

## Feedback on Tavily

- `include_domains` with six reference sites turned a general web search into a meme encyclopedia in one parameter. That is what made the culture desk possible.
- `search_depth: "basic"` answered in about a second, fast enough to run twice per uploaded file without the speaker noticing.
- Two wishes: a result field that says which domain and page type a hit is (a Giphy clip page, a Know Your Meme entry, a Wikipedia article), so a model does not have to infer it from the URL; and image or GIF results for media lookups, so the engine could compare frames and not only titles.
