# Devpost: Project details

The form's "Project details" step, field by field. Paste as is. The long version with the feedback on Token
Factory and Tavily stays in `submission.md`.

## About the project

```markdown
## F*ck it, we'll do it live.

You know the clip. A news anchor, a teleprompter that will not cooperate, and the line that became the internet's shorthand for *stop fixing it and just go*.

We think that is how talks should be given. No deck built the night before. No clicker. No wall of text the room reads while you speak. You walk up, press the mic and talk, and the slides draw themselves while you do. Think Pecha Kucha, minus the night before.

We call it **vibe presenting**. It is a movement as much as an app: `#vibepresenting`.

## What it does

Press the mic and talk, in English or Swedish. Every few words the app decides whether this moment deserves a picture, and if it does, the picture lands mid-sentence: a drawing, a big number you just said, a duel between two things, your own words quoted back, one of your own GIFs. Ask "Bill, how many people live in Sweden?" and it looks it up and puts the answer on screen with its source.

The slides stop being your script and become your sidekick. The audience watches you, not a paragraph.

It runs in any browser and on a phone: plug the phone into a TV and talk.

## How we built it

NVIDIA Nemotron models on Nebius Token Factory are the brain: one decides every few words whether to show or hold, another draws, a third writes the sourced facts. Three drawing models race and the first usable picture wins. Tavily finds the facts and tells the app what a meme means. Speech becomes words a second after they are said. The slide engine lives in the browser, reads ahead on unfinished sentences, and fires figures and cues without waiting for any model.

The demo video is one take, outdoors, unrehearsed: 27 slides made, 0 prepared.

## What went wrong

It did not work. Then it did, then it did not. We rebuilt the engine three times in three days.

- **The slides came too late.** Three seconds after the words is worse than no slide. We moved everything we could out of the model's way, ran the decision and the drawing in parallel, and made the drawing a race, because any single model would stall for eight seconds without warning.
- **The browser's speech recognition went silent.** It returned nothing, with no error, in half the browsers we tried. Five rounds of debugging later we moved speech to a streaming service that works everywhere, phones included.
- **The drawer refused half sentences.** Which is all a live system ever sees. Rewriting it as a simultaneous interpreter took the same recorded talk from 9 pictures to 23.
- **The fastest answer was the dullest.** First answer wins gave us 16 identical cards out of 22, and a quick "nothing to show" kept cutting off the best model mid-drawing. Now a fast "nothing" never overrules a model still at work, there are never two cards in a row, and a slide lands 1.7 seconds after the words.

## What we learned

The intelligence a live system needs is knowing *when* to speak, not what to say. The model is the slow path; everything that can be a rule runs locally in the time it takes to say the next word. And a talk is a performance: when a slide misses now and then, that is the show, not a bug.

## What's next

- Stage minutes for people who talk every week: teachers, founders, meetup hosts.
- A phone as the mic and any screen in the room as the display, no cable.
- Speech to text on Nebius too, so the whole show runs on one platform.

Try it: https://doitlive.app. Press the mic. Do it live.
```

## Built with

```
nvidia-nemotron, nebius-token-factory, tavily, assemblyai, next.js, react, typescript, tailwind-css, vercel, vercel-blob, kimi-k3, gpt-oss-120b, qwen3-embedding, motion
```

## "Try it out" links

- https://doitlive.app
- https://github.com/Baltsar/do-it-live

## Demo video URL

The YouTube link, public, once `video/out/live/do-it-live.mp4` is uploaded (title and description in `video/YOUTUBE.md`).

## Image gallery

Up to 15 JPG or PNG, 3:2. The set is in `HACKATHON-NETLIGHT/RECORDING/product/`, numbered in upload order.

# Devpost: Additional info (for judges)

- **Upload a file:** leave empty.
- **Submitter type:** Individual.
- **Organization name:** N/A.
- **Country of residence:** Sweden.
- **Canada province:** N/A.
- **Track:** Best apps and agents.
- **New or existing prior to August 26, 2026:** New.
- **If existing, how updated:** leave empty.
- **Public code repository:** https://github.com/Baltsar/do-it-live
- **Working demo:** https://doitlive.app

**Which model(s) did you use, and why that size/variant?**

```
Nemotron 3.5 Lightning as the director: it runs every few spoken words and decides show or hold and which layout, so it has to answer in well under a second, every time. Nemotron 3 Ultra (550B-A55B) where a second of latency is fine and judgement matters: turning prepared notes into slides, turning Tavily results into one sourced fact slide, naming a meme only when a page confirms it, and as the third runner in the drawing race. Nemotron 3.5 Super VL to watch six frames of each uploaded GIF or clip. Qwen3-Embedding-8B on the same endpoint ranks the speaker's library against what is being said. Kimi-K3 and gpt-oss-120b race Ultra for drawings; the first usable picture wins.
```

**Rate Nemotron's output quality (1 = Poor, 10 = Excellent)**

```
8. Lightning returned clean JSON on schedule for 132 director calls in a six-minute talk, with one timeout. Ultra is a careful editor: as our "culture desk" it refused to name a meme without evidence far more reliably than it drew pictures, so it is the dependable judge and the conservative artist. Two things to know: reasoning models return thinking text unless called with chat_template_kwargs { enable_thinking: false }, and a drawer will copy the example's numbers and set its own fonts unless the prompt forbids both.
```

**Fine-tune, prompt-engineer, or out of the box?**

```
Out of the box, with prompt engineering and rules around the model. The drawing prompt was rewritten as a simultaneous interpreter ("show it as soon as the words name something concrete"), which took one recorded conversation from 9 to 23 pictures out of the same 55 chunks. Everything that can be a rule runs outside the model: figures are parsed from the transcript, a slide may only show a number the speaker said, and an art director in code keeps two slides in a row from looking alike. No fine-tuning yet; the recorded sessions are the training set for later.
```

**How did Nemotron's performance compare to other models for similar tasks?**

```
Measured in the drawing race over a six-minute talk: first-token time for Kimi-K3 swung from 0.6 to 7.9 s and for gpt-oss-120b from 0.3 to 6.1 s within minutes, and Kimi stalled six times. Nemotron 3 Ultra held about 0.4 s and covered every stall. As a drawer it was the most conservative of the three; as a judge and an editor it was the most reliable, which is why it holds every role where being wrong costs more than being slow.
```

**Which Nebius platform capabilities were most valuable, and how?**

```
One OpenAI-compatible endpoint for every model, https://api.tokenfactory.nebius.com/v1. Racing three drawing models or moving a role to another model is a change of model id, with no new SDK and no new keys. The /models listing lets each role resolve to the best available model at runtime, with an env override per role. Embeddings (Qwen3) and vision (Super VL) live on the same API, so the whole product is one client and one key. We used inference only, no GPU instances; the app runs serverless on Vercel in Stockholm and every model call goes to Token Factory.
```

**How likely to recommend Nemotron on Nebius (1 to 10)?**

```
9. One endpoint, many models, and a model id is all it takes to try another one. For a real-time app the one thing missing is a latency promise: a published first-token signal or an interactive priority tier for shared models.
```

**Rate the experience running Nemotron inference on Nebius vs previous environments (1 to 10)**

```
8. Faster to start than any provider we have used: no SDK, no per-model keys, plain fetch. The minus is first-token variance on shared models (under a second to eight seconds within minutes), which we had to design around with a race.
```

**What additional features or improvements would have made the experience more effective?**

```
Prompt caching first: a six-minute talk is about 1.5 million tokens and 96 % is input, the same system prompt read every few seconds. Then a latency signal or an interactive tier. A speech model on Token Factory (NVIDIA Parakeet or Canary), so voice apps run entirely on Nebius; today /v1/audio/transcriptions returns 404. Native animated-GIF or short-video input for Super VL, so the frames need not be cut in the browser. A note on the model pages that reasoning models need enable_thinking: false for JSON, and consistent model id naming.
```

**What do you most hope to see from the Nemotron team next?**

```
A small, fast judge variant with a guaranteed low first-token time, for the decide-every-few-words loop that live apps run on. Speech to text in the family. Video input for the VL models. Prefix caching for long system prompts.
```

- **Did you use Tavily?** Yes. Two runtime calls: `/search` with `include_answer` for sourced fact slides on stage, and `/search` restricted with `include_domains` to meme and GIF sites so the app learns what an uploaded GIF means.
- **Builders & Brews city:** Stockholm.
- **Both checkboxes:** tick (age of majority; not employees of the promotion entities).

**Which AI tools have you leveraged while working on this project?**

```
Cursor, Claude Code and Codex for the code and the pitch film; NVIDIA Nemotron, Kimi-K3, gpt-oss and Qwen3 on Nebius Token Factory inside the product; Tavily for facts; AssemblyAI for speech to text.
```

- **Level of learning:** the highest option offered.
- **AI value for your career:** Yes.
