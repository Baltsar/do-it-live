# The take

The live part of the film is one screen recording, made outdoors on 30 Oct 2026: the app in the browser with
the camera bubble, the laptop's microphone for the voice. The file is `public/take.mp4` (not in git), copied
from `HACKATHON-NETLIGHT/RECORDING/Gustaf_presents-opsv_outside.mp4`, 3:23 long.

## The cut

`DEMO` in `src/live/bars.ts` lists the eight stretches the film plays at speed, about 53 seconds in all, each
a whole number of beats so every cut lands on one: six scenes and two glimpses of a couple of seconds.
Between them the take is fast-forwarded (one beat for a short skip, two for a long one) under a blinking ▶▶
and the take's own clock, so the jumps read as time passing, not as edits:

| Take | What is said | What the app puts up |
|---|---|---|
| 0:01–0:06 | the mic goes on; "Welcome to my presentation," | Talk. |
| 0:15–0:22 | "around 700 builders are right now active on the community" | builders; 700 counting up |
| 1:03–1:20 | "So the LLM is kind of sycophantic ... so you get hooked. That's why you need a community" | the chat, the robot, the puppet, spend more, hooked |
| 1:22–1:24 | glimpse: "...you up, because" | WAKE UP! |
| 1:59–2:07 | "I don't remember the word for... that" | ??? |
| 2:10–2:17 | "What's the word. Psychosis. AI psychosis." | psychosis: that's the word! |
| 2:38–2:41 | glimpse: "that's my presentation" | no one visits |
| 2:50–2:58 | "you enjoyed the presentation. Have a good day, my name is Gustaf." | doitlive.app; 0; then 1 likes |

Seen only in the fast-forwards: human touch, the bubble, the cathedral. Left out altogether: the ending where
the app does not change to a last slide ("I should probably fix this").

`SLIDES_UP` lists the seconds at which the app put up a new slide, read off a frame a second of the recording;
the score over the take counts them as the cut reaches them, fast-forwards included, and the hype quotes the
total (27), so both stay true if the cut changes.

## Over the take

- A score at the top: SLIDES PREPARED 0, SLIDES MADE counting up.
- Four hand-written asides in the margin: "no deck. no notes. no rehearsal.", "forgot the word.", "it
  waited.", "tough crowd." (`ASIDES` in `src/live/Film.tsx`, each at a second of the take).
- The browser's own bars and the strip beside the window are cropped away (`SCREEN` in `bars.ts`).

## Rebuilding

```bash
npm run live
```

renders the picture, cuts the track so its drop lands on bar 14, lays the take's own sound under the live
part (the skipped stretches sped up into the fast-forwards, rumble under 110 Hz removed, levelled to -16 LUFS),
muxes `out/live/do-it-live.mp4`, and measures it. `YOUTUBE.md` says how to swap in another track.
