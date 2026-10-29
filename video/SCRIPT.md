# Pitch video: script and shot list

**The idea:** this pitch has no slides. You pitch *inside* Do it live, and every slide behind you is drawn live while you talk. Remotion adds the cold open, two short cutaways (how it works, the numbers) and the outro. It also labels each live slide with what made it, taken straight from the session log of the take.

- **Target length:** 2:40. Devpost limit: under 3:00.
- **Language:** English.
- **Audio:** your voice from the take only. No music; copyrighted music is not allowed.

## What you record

### Take A: the main take (one continuous recording, about 2:20)

**Setup**
- Screen recorder at 1920×1080.
- Face bubble in the bottom right corner.
- Do it live in Chrome, installed as an app so there is no address bar (address bar menu → Install).
- Full screen.
- Language: English.
- "What will you talk about?" left empty.
- Nothing else on screen: no other tabs, no notifications (turn on Do Not Disturb).

**How to talk**
- Talk as you would on a stage, a little slower than normal.
- Pause for half a second after the lines marked ⏸, so the slide has time to land.
- Just keep going if a slide misses; that is part of the show, and the edit can cover it.

**At the very start:** say "three, two, one" and clap once while the mic is off. The clap lines up the recording with the session log.

### Take B (optional, 5 s): the phone

Film your phone in stage mode, ideally plugged into a TV, while you say one sentence. Any phone camera works.

## The script

Times are in the finished video. ▶ marks what is on screen.

---

**0:00 to 0:06 · COLD OPEN (Remotion, no voice)**
▶ Black. Yellow: "F\*ck it, we'll do it live." DO IT LIVE slams in. "Vibe presenting."

---

**0:06 to 0:18 · START PAGE (take A, mic off)**
▶ The start page, your bubble.

> Hi, I'm Gustaf. I didn't make a single slide for this pitch. ⏸
> I'm going to press this button, and just talk.

*(press the mic)*

---

**0:18 to 1:25 · LIVE (take A, mic on)**
▶ Slides appear behind you. Remotion labels each one ("drawn live by Kimi-K3 in 1.4 s").

> Every week someone stands in front of a room with slides they built at midnight. ⏸
> Teachers, meetup hosts, founders at demo day. It takes hours, and then the audience reads instead of listening. ⏸
>
> So what if the slides followed *you*?
> While I'm still in the middle of a sentence, NVIDIA Nemotron on Nebius decides if this moment deserves a picture. ⏸
>
> Say a number, like our community, which is seven hundred builders, and it's on screen before I finish the sentence. ⏸
>
> Compare two things, a clicker versus your voice, and you get the duel. ⏸
>
> Talk about joining without a login, and it draws the interface. ⏸
>
> And it knows when to stay quiet. When I just say "so, um, anyway", nothing changes. ⏸
>
> Need a fact? Bill, how many people use PowerPoint every day? ⏸⏸
>
> A sourced slide, from a question.

---

**1:25 to 1:55 · HOW IT WORKS (Remotion cutaway; your voice from the take continues)**
▶ The pipeline builds step by step: mic → speech to text → stage engine → Nemotron 3.5 Lightning, plus a three-model drawing race on Nebius Token Factory → screen.

> Under the hood: my voice streams in, and every few words Nemotron 3.5 Lightning decides: show, or hold.
> At the same moment three models on Nebius Token Factory race to draw it, and the first good picture wins.
> Nemotron 3 Ultra prepares slides and checks facts, and Nemotron Super VL reads your own GIFs, so they show up when they fit.

---

**1:55 to 2:10 · THE NUMBERS (Remotion cutaway)**
▶ 1.7 s · 9 looks · 0 slides built.

> In our tests a picture lands about two seconds after you say it, in nine different looks, and nobody built a single slide.

---

**2:10 to 2:30 · CLOSE (take A; take B cut in if you have it)**
▶ Back to you and the live slides.

> It runs in any browser, and on a phone plugged into a TV.
> Walk on stage, talk, and the slides draw themselves. ⏸
> We call it vibe presenting.

*(press the mic to stop)*

---

**2:30 to 2:40 · OUTRO (Remotion)**
▶ DO IT LIVE · #vibepresenting · the demo URL · github.com/Baltsar/do-it-live · "Built in Stockholm for the Nebius × NVIDIA Global AI Hackathon".

---

## After recording

1. Put take A in `video/public/take.mp4`, and take B (if any) in `video/public/phone.mp4`.
2. Tell Claude right away, within an hour. The session log on Vercel is only kept about that long, and it holds the slide labels.
3. Claude:
   - lines up the take with the log;
   - sets the cut points;
   - renders `video/out/pitch.mp4`.
4. Upload to YouTube as **Public**, and paste the link into Devpost.

## Rules this video must follow (Devpost)

- Under three minutes.
- Shows the project working.
- Public on YouTube.
- No third-party trademarks or copyrighted music or material without permission. Do not show film GIFs, other brands' logos, or a song.
