# YouTube upload

Upload `out/live/do-it-live.mp4` as **Public**: the Devpost rules require a public video.
Add the English captions file once it exists, so the transcript has every name right.

## Title

Do it live: you talk, it shows · Nebius x NVIDIA Global AI Hackathon

## Description

No deck. No clicker. No wall of text.
Do it live is presenting without slides: you talk, and the slides appear while you speak, mid-sentence, in the moment.

Try it: https://doitlive.app (open, no account)
Code: https://github.com/Baltsar/do-it-live (MIT)

Built for the Nebius x NVIDIA Global AI Hackathon, Best Apps and Agents track. It runs on NVIDIA Nemotron models through Nebius Token Factory, with Tavily for sourced facts.

The live part is one take, outdoors, unrehearsed: 27 slides made, 0 prepared.

0:00 You're about to present
0:17 F*ck it, we'll do it live
0:21 One take, outdoors, no deck
1:22 27 slides. 0 prepared.
1:29 We did it live. Your turn.

Music: made for this film (synthesized in code, no third-party audio).

## Chapters

The times above are for the track at 128 BPM (`src/live/bars.ts`). If a track at another tempo ever goes in,
every cut moves with it: read the new bar times from `npm run live` and update them.

## Music

The film carries `public/music-standin.wav`, made by `scripts/music-standin.mjs` (`npm run music:standin`): our
own synthesis, so nothing to license or attribute. To swap in another track: save it as `public/music.mp3`, run
`node ~/.claude/skills/sound-layer/scripts/listen.mjs public/music.mp3` for its tempo, set `MUSIC` in
`src/live/bars.ts` to `{ file: "music.mp3", bpm, drop }` where `drop` is the second its drop lands, run
`npm run live` again, and change the music line above.
