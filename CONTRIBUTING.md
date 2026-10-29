# Contributing to DO IT LIVE

The engine stays small. What grows is its **vocabulary**: the pictures it can put up while someone talks. That is where a pull request helps most.

You can add, in order of how much the stage notices it:

1. **A scene**: a wordless animated metaphor (`surge`, `collapse`, `launch`). The engine shows one when a drawing fails and the scene fits what was just said.
2. **A look**: a whole style guide (colour fields, typeface, how the templates are skinned, how live drawings are briefed). Scribble and Pop are the two today.
3. **An interface card**: one big shadcn element that says the point at a glance (`rating`, `poll`, `alert`).
4. **Engine work**: speed, speech, the director. Open an issue first; the live loop is tuned against recorded shows in `sessions/`.

No new dependencies without asking in the issue. Never commit API keys or a `.env.local`.

## The rules every picture lives by

A slide is on screen for a few seconds, seen from the back row of a room, next to a person who is still talking.

- **One idea.** If you need to explain it, it is two slides.
- **No text in a scene.** Words come from the templates, never from the picture.
- **Big and flat.** Shapes several hundred pixels wide at 1920×1080; outlines at least 6 px; no gradients, no soft shadows, no hairlines.
- **Only the style guide's colours.** A scene uses `var(--fg)` and `var(--alt)` on the field's background. Never a hard-coded colour: the same scene must work in every look and every field.
- **It reads as a still.** Thumbnails and previews render with animation off (`.slide-frame.static`). The first frame must already make the point.
- **It loops in 3 to 6 seconds** and never jumps when it restarts.
- **Keep the 7 % safe margin** on every side: projectors crop.

The engine keeps a talk varied on its own: a colour field never repeats twice in a row, a card kind is not used again within four slides, a scene has to fit better the second time. Your job is one strong picture, not variety.

## Add a scene (three files)

Take `launch` as the pattern.

**1. `src/lib/scene-catalog.ts`**: add the name to `SCENES` and an entry to `SCENE_CATALOG`.

```ts
earth: {
  shows: "A globe turns and one dot on it lights up, then another, until it is covered",
  means: "the whole world, global reach, international, every country, going worldwide",
},
```

`means` is what the director reads to decide whether the scene fits a spoken line. Write what a line must be *about*, as the words people actually say on stage, not as a caption. This text matters more than the drawing: a scene with a vague `means` either never shows or shows at the wrong moment.

**2. `src/components/slide/scenes.tsx`**: add `earth` to `RENDER`. The canvas is a 160 × 90 viewBox, cropped to the slide (`slice`), so keep the subject inside roughly 12..148 × 8..82.

```tsx
earth: () => (
  <>
    <circle cx="80" cy="45" r="30" fill="none" stroke={FG} strokeWidth="4" />
    {DOTS.map(([x, y], i) => (
      <circle key={i} className="er" cx={x} cy={y} r="3.4" fill={ALT} style={v({ "--i": i })} />
    ))}
  </>
),
```

**3. `src/components/slide/slide.css`**: the motion, under `/* ---- Scenes ---- */`. One or two keyframes, `--i` for stagger, and a `.slide-frame.static` rule when the still frame needs help.

```css
/* earth: one dot, then the world */
.er { opacity: 0; animation: erOn 4.8s ease-out infinite; animation-delay: calc(var(--i) * 0.35s); }
@keyframes erOn { 0% { opacity: 0; } 10%, 80% { opacity: 1; } 100% { opacity: 0; } }
.slide-frame.static .er { opacity: 1; }
```

Then open `/templates`: your scene appears in the S list in the current look. `/templates?look=pop` and `/templates?look=scribble` show it in each look without changing your own setting. Both must hold.

## Add a look

A look is one entry in `LOOKS` in `src/lib/theme.ts`:

- `fields`: five colour fields (`hype`, `funny`, `calm`, `serious`, `chaos`), each `bg`, `fg`, `alt`. Type on field must reach 4.5:1 contrast (`contrast()` in the same file); `/style` warns when it does not.
- `font`: a key in `FONTS`. A new typeface also goes into `src/app/layout.tsx` (Google Fonts through `next/font`; include its variable axes) and `FONTS` (weight, tracking, `variation`).
- `drawBrief`: the lines the drawing model gets about how shapes look in this world. Short, concrete, with CSS values.

Optional, where the templates should change shape and not only colour:

- a `[data-look="yours"]` block at the end of `src/components/slide/slide.css`. Every rule scoped to the look; Pop must render exactly as before.
- a kit in `KITS` in `src/components/slide/live-ui.tsx`: ready classes the drawing model composes from, so live drawings match the templates. Scope them under `.stage` and lock the text sizes the model must not shrink.

Add the look to the picker by nothing more than the `LOOKS` entry: `/style` lists what is there.

## Add an interface card

- `src/lib/ui-spec.ts`: the kind in `UI_KINDS` and one line in `UI_MENU` telling the director when it fits ("where is a map").
- `src/components/slide/ui-hero.tsx`: a `case` that renders one shadcn element on the small stage. Only the word or number that carries the point is readable; everything else is grey bars.
- Check it on `/templates` under U, in both looks.

## Before you open the pull request

```bash
npx tsc --noEmit
npm run lint
```

Both clean. Attach a screenshot of `/templates` showing your addition in Scribble and in Pop. One scene, look or card per pull request; a description of the moment on stage it is for is worth more than a long diff.
