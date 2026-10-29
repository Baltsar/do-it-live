# After the hackathon

Written the night before the Devpost deadline (30 Oct 2026, 18:00 Stockholm). What the demo costs to
run, how it stays safe, and how it becomes something people pay for.

## What a show costs

Measured on 29 Oct, a 6-minute talk: about 1.5 M tokens, 96 % of them input.

| Part | Calls per minute | Share of tokens |
|---|---|---|
| Director (Nemotron 3.5 Lightning) | 12 | 45 % |
| Scene classifier (Lightning) | 12 | 20 % |
| Drawing race (Kimi K3, gpt-oss-120b, Nemotron 3 Ultra) | 34 requests | 33 % |
| Library judge, embeddings | few | 2 % |

Roughly half a dollar per 6-minute talk at Token Factory list prices, about 5 dollars per hour on
stage. One upload costs one vision call, one Ultra call, two Tavily searches and an embedding.
Hosting (Vercel functions and Blob) is cents.

The two cheap wins left on the table: pre-filter the 80 scenes with the embedding model so the
director sees 20, not 80 (about a quarter of all tokens), and cache the drawing prompt prefix.

## How the open demo stays safe

- `src/lib/budget.ts`: every visitor has `FREE_MINUTES` of stage time a day (15), the whole site
  has `DAILY_STAGE_MINUTES` (180). Director calls, drawing requests and uploads draw on it. Counts are
  merged into one small file in Blob, so the ceiling holds across instances.
- A library holds at most 100 files, 40 MB each, private to the visitor's cookie.
- Vercel spend management: 50 dollars a month, projects pause at 100 %.
- When a visitor is out of minutes the stage says so and points at running it yourself.

## What people would pay for

The unit is a minute on stage. Everything else follows from it.

1. **Free**: 15 minutes a day on the hosted demo. Enough to feel it, not enough to run a conference.
2. **Minutes**: buy stage time, pay as you go. A talk is a few dollars; a day of talks is tens. Margin
   is wide because the models are cheap and the slides are drawn, not stored.
3. **Pro, monthly**: unlimited minutes for one speaker, their own library, their own looks, the
   session log after each show. The speaker who talks every week.
4. **Bring your own keys**: run it on your own machine with your own Token Factory key. Free, open
   source, no minutes. The Mac app is this, packaged so nobody needs a terminal (coming soon; until
   then `pnpm dev`).
5. **Events and teams**: one account, many speakers, the organiser's look on every stage, a screen
   per room. Priced per event or per seat.

What makes it hard to copy is not a model. It is the taste: 7 looks, 23 slide types, 60 interface
cards, 80 scenes, and a director that knows when to show nothing. Every show makes that library
better, and the contributor door is open.

## Order of work

1. Ship the hackathon submission (today).
2. Scene pre-filter with embeddings; log each drawing's HTML so a show can be reviewed as a contact
   sheet.
3. Minutes for sale: Stripe checkout, minutes credited to the visitor's id, the meter on stage.
4. Accounts, so a library and minutes survive a cleared cookie.
5. The Mac app: the same Next app in a shell, keys in the keychain, the library on disk.
6. Events: an organiser's look pushed to many stages.
