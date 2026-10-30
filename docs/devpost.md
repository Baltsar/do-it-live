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

Up to 15 JPG or PNG, 3:2 works best. Frames to pull from the film: the mic on the Talk. screen, 700 builders landing, "forgot the word" with ???, psychosis: that's the word!, the score at 27, and the mic end card.
