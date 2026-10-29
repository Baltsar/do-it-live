"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SlideView } from "@/components/slide/slide-view";
import { artDirect } from "@/lib/art-director";
import { parseDrawing, setLive } from "@/lib/live-store";
import { SCENE_CATALOG, SCENES } from "@/lib/scene-catalog";
import { BACKDROPS, MOODS, normalizeSlide, type Slide } from "@/lib/slide";
import { applyLook, DEFAULT_THEME, isLookKey, type Theme } from "@/lib/theme";

// Everything the engine can put on screen, numbered, so the speaker can say which to keep, drop or rebuild.
// Not part of the show.

interface Entry {
  code: string;
  name: string;
  /** When the engine uses it today, with the default setting "words: none". */
  when: string;
  raw: Record<string, unknown>;
}

// The speaker's own files in the library, used as samples.
const BLINK_GIF = "gmv6pb3ye0";
const MAP_PHOTO = "gmv6pb67z4";

const LAYOUT_ENTRIES: Entry[] = [
  { code: "L1", name: "Drawn live (LIVE_UI)", when: "Main track: a model draws the point while you talk", raw: { layout: "LIVE_UI", headline: "no login needed" } },
  { code: "L2", name: "Big number", when: "Main track: a figure you say, or a prepared one", raw: { layout: "BIG_NUMBER", number: "700", headline: "builders", mood: "hype" } },
  { code: "L3", name: "Ring chart", when: "Main track: a percentage you say", raw: { layout: "CHART", headline: "80%", chart: { kind: "ring", values: [80] }, mood: "calm" } },
  { code: "L4", name: "Your own clip", when: "Main track: a clip or GIF you uploaded yourself, when the judge scores it 4+", raw: { layout: "GIF_REACTION", headline: "awkward", library_id: BLINK_GIF, mood: "funny" } },
  { code: "L5", name: "Your photo", when: "Main track: one of your photos that the judge scores 4+", raw: { layout: "PHOTO", headline: "Sweden", library_id: MAP_PHOTO, mood: "serious" } },
  { code: "L6", name: "Scene (animated metaphor)", when: "Fallback only: drawing failed and a scene fits 5 of 5", raw: { layout: "SCENE", scene: "surge", headline: "growth", mood: "hype" } },
  { code: "L7", name: "Bar chart", when: "Only with words on (A few / All), when you list several figures", raw: { layout: "CHART", headline: "Members", chart: { kind: "bars", values: [120, 300, 700], labels: ["2024", "2025", "2026"] }, mood: "serious" } },
  { code: "L8", name: "Big word", when: "Only with words: All. Never with words: none", raw: { layout: "BIG_WORD", headline: "Ship it.", body: "Then tell people.", mood: "hype" } },
  { code: "L9", name: "Quote", when: "Only with words: All", raw: { layout: "QUOTE", headline: "The best slide is the one you never notice.", body: "Someone smart", mood: "calm" } },
  { code: "L10", name: "Title card", when: "Only with words: All, on a topic change", raw: { layout: "TITLE_CARD", headline: "Why we ship", body: "Part one", mood: "hype" } },
  { code: "L11", name: "Versus", when: "With words on, or when you say \"X or Y\" to Bill", raw: { layout: "VERSUS", versus: ["Clicker", "Voice"], headline: "Duel", mood: "chaos" } },
  { code: "L12", name: "Three things", when: "With words on, when you list exactly three things", raw: { layout: "REVEAL_3", headline: "Three rules", items: ["We ship", "We share", "We never wait"], mood: "funny" } },
  { code: "L13", name: "Steps", when: "With words on, \"first X, then Y\"", raw: { layout: "PROCESS", headline: "How it works", items: ["Talk", "Bill listens", "Slide appears"], mood: "hype" } },
  { code: "L14", name: "Checklist", when: "With words on, \"you get A, B and C\"", raw: { layout: "CHECKLIST", headline: "What you get", items: ["No clicker", "No slides to build", "Pure improv"], mood: "funny" } },
  { code: "L16", name: "Icon grid", when: "With words on, four parallel things", raw: { layout: "ICON_GRID", headline: "Four tools", items: ["Voice", "Photos", "Drawings", "Charts"], icons: ["Mic", "Camera", "Pencil", "ChartPie"], mood: "calm" } },
  { code: "L17", name: "Number + icon", when: "With words on, a figure with the thing it counts", raw: { layout: "SPLIT_STAT", number: "80%", headline: "shipped with an agent", icon: "Bot", mood: "serious" } },
  { code: "L19", name: "Moving type", when: "Main track: instead of a card right after a card", raw: { layout: "KINETIC", headline: "Insane", mood: "chaos" } },
  { code: "L20", name: "The speaker's own words", when: "Main track: instead of a card, the point underlined", raw: { layout: "QUOTE", headline: "“you can make the AI insane”", ui: { kind: "alert", text: "insane" }, mood: "calm" } },
  // Figures read from the line itself, and two more ways with words.
  { code: "L21", name: "From one figure to another", when: "Main track: \"we went from 12 to 700 builders\"", raw: { layout: "DELTA", versus: ["12", "700"], headline: "builders", mood: "hype" } },
  { code: "L22", name: "A share of a group", when: "Main track: \"one in five startups make it\"", raw: { layout: "PICTOGRAM", number: "1/5", headline: "startups make it", icon: "Rocket", mood: "serious" } },
  { code: "L23", name: "Figures in a row", when: "Main track: \"700 builders, 12 cities, 3 countries\"", raw: { layout: "STAT_ROW", items: ["700 builders", "12 cities", "3 countries"], mood: "hype" } },
  { code: "L24", name: "A question left hanging", when: "With words on: \"what if the slides made themselves?\"", raw: { layout: "QUESTION", headline: "What if the slides made themselves", mood: "calm" } },
  { code: "L25", name: "A wall of words", when: "With words on: six languages named in one go", raw: { layout: "WORDS", items: ["Swedish", "English", "Finnish", "Danish", "Norwegian", "German"], mood: "funny" } },
];

// One big interface element each: the drawing model can name one of these instead of drawing.
const UI_ENTRIES: { code: string; name: string; when: string; ui: Record<string, unknown>; mood: string }[] = [
  { code: "U1", name: "Button", when: "\"just press the button\", \"one click\"", ui: { kind: "button", text: "Deploy" }, mood: "hype" },
  { code: "U2", name: "Form, login folds away", when: "\"join without a login\"", ui: { kind: "form", text: "Join", state: "crossed" }, mood: "serious" },
  { code: "U3", name: "Toggle", when: "\"we just switched it on\"", ui: { kind: "toggle", text: "AI", state: "on" }, mood: "calm" },
  { code: "U4", name: "Notifications piling up", when: "\"my inbox explodes\"", ui: { kind: "notifications", count: 1000 }, mood: "chaos" },
  { code: "U5", name: "Progress, stuck", when: "\"we are still waiting for the permit\"", ui: { kind: "progress", state: "loading" }, mood: "funny" },
  { code: "U6", name: "Chat, nobody answers", when: "\"nobody answers in the Discord\"", ui: { kind: "chat", state: "empty" }, mood: "serious" },
  { code: "U7", name: "People", when: "\"we are 700 people\"", ui: { kind: "people", count: 700 }, mood: "hype" },
  { code: "U8", name: "Search, nothing found", when: "\"you google it and find nothing\"", ui: { kind: "search", text: "vibe coding", state: "empty" }, mood: "calm" },
  { code: "U9", name: "Balance", when: "\"I am going to be a millionaire\"", ui: { kind: "balance", count: 1000000 }, mood: "funny" },
  { code: "U10", name: "Dialog, No pressed", when: "\"a robot that says no to everything\"", ui: { kind: "dialog", text: "Ship it?", state: "crossed" }, mood: "chaos" },
  { code: "U11", name: "Checklist", when: "\"we ticked every box\"", ui: { kind: "checklist", state: "done" }, mood: "calm" },
  // Any topic, shown here with a talk about mushrooms.
  { code: "U12", name: "Rating", when: "\"the chanterelle is the best mushroom there is\"", ui: { kind: "rating", text: "Chanterelle", count: 5 }, mood: "funny" },
  { code: "U13", name: "Poll", when: "\"most people cannot tell them apart\"", ui: { kind: "poll", text: "Edible?", items: ["No idea", "Yes", "No"], count: 64 }, mood: "serious" },
  { code: "U14", name: "Calendar", when: "\"the season starts in August\"", ui: { kind: "calendar", text: "August", count: 14 }, mood: "calm" },
  { code: "U15", name: "Map", when: "\"you find them in the forest\"", ui: { kind: "map", text: "The forest" }, mood: "hype" },
  { code: "U16", name: "Compare", when: "\"the real one and the fake one look the same\"", ui: { kind: "compare", items: ["Chanterelle", "False one"], state: "crossed" }, mood: "chaos" },
  { code: "U17", name: "Tags", when: "\"it is edible, rare and only grows in autumn\"", ui: { kind: "tags", items: ["Edible", "Rare", "Autumn"] }, mood: "funny" },
  { code: "U18", name: "Profile", when: "\"let me introduce the fly agaric\"", ui: { kind: "profile", text: "Fly agaric", items: ["Red", "Toxic"] }, mood: "hype" },
  { code: "U19", name: "Alert", when: "\"that one will kill you\"", ui: { kind: "alert", text: "Deadly" }, mood: "serious" },
  { code: "U20", name: "Like", when: "\"everybody loves mushroom season\"", ui: { kind: "like", count: 12400 }, mood: "chaos" },
  // Moments every talk has, shown with a talk about shipping a product.
  { code: "U21", name: "Timeline", when: "\"we started in 2019, launched in 2023, and here we are\"", ui: { kind: "timeline", items: ["2019", "2023", "Now"] }, mood: "calm" },
  { code: "U22", name: "Terminal, failing", when: "\"and then the deploy failed\"", ui: { kind: "terminal", text: "npm run deploy", state: "error" }, mood: "chaos" },
  { code: "U23", name: "Error page", when: "\"the whole site went down\"", ui: { kind: "error", count: 500, text: "Server down" }, mood: "serious" },
  { code: "U24", name: "Text message", when: "\"then my boss texted: we need to talk\"", ui: { kind: "message", text: "We need to talk" }, mood: "funny" },
  { code: "U25", name: "Battery, almost empty", when: "\"I was running on two percent\"", ui: { kind: "battery", count: 2 }, mood: "funny" },
  { code: "U26", name: "Trend", when: "\"users grew seven hundred percent\"", ui: { kind: "trend", text: "Users", count: 700 }, mood: "hype" },
  { code: "U27", name: "Leaderboard", when: "\"we came first, ahead of the giants\"", ui: { kind: "leaderboard", items: ["Us", "Giant A", "Giant B"] }, mood: "hype" },
  { code: "U28", name: "Timer", when: "\"we had 48 hours\"", ui: { kind: "timer", count: 48, text: "hours" }, mood: "chaos" },
  { code: "U29", name: "Signal lost", when: "\"no internet out there\"", ui: { kind: "signal", state: "off" }, mood: "calm" },
  { code: "U30", name: "Post going viral", when: "\"the post went viral overnight\"", ui: { kind: "post", text: "We did it live", count: 48000 }, mood: "hype" },
  // Money, code, calls, media, the browser's nags and the physical world.
  { code: "U31", name: "Pricing", when: "\"the pro plan is nine dollars\"", ui: { kind: "pricing", items: ["Free", "Pro", "Team"], count: 9 }, mood: "calm" },
  { code: "U32", name: "Merged", when: "\"we merged it at 3 am\"", ui: { kind: "merge", text: "Scribble look" }, mood: "hype" },
  { code: "U33", name: "Stars", when: "\"ten thousand stars in a week\"", ui: { kind: "stars", text: "do-it-live", count: 10000 }, mood: "funny" },
  { code: "U34", name: "Incoming call", when: "\"then my mom called\"", ui: { kind: "call", text: "Mom" }, mood: "chaos" },
  { code: "U35", name: "Now playing", when: "\"we recorded a podcast about it\"", ui: { kind: "playing", text: "Episode 12" }, mood: "calm" },
  { code: "U36", name: "Video", when: "\"the video got a million views\"", ui: { kind: "video", text: "Live demo", count: 1000000 }, mood: "serious" },
  { code: "U37", name: "Tabs", when: "\"I had 47 tabs open\"", ui: { kind: "tabs", count: 47 }, mood: "chaos" },
  { code: "U38", name: "Cookie banner", when: "\"you click accept all without reading\"", ui: { kind: "cookie" }, mood: "funny" },
  { code: "U39", name: "Captcha", when: "\"it did not believe I was human\"", ui: { kind: "captcha", state: "error" }, mood: "funny" },
  { code: "U40", name: "Update", when: "\"and then it wanted to restart\"", ui: { kind: "update", text: "Restart required" }, mood: "chaos" },
  { code: "U41", name: "Dial", when: "\"we turned it up to eleven\"", ui: { kind: "dial", count: 11, text: "Volume" }, mood: "hype" },
  { code: "U42", name: "Table", when: "\"a spreadsheet with ten thousand rows\"", ui: { kind: "table", text: "rows", count: 10000 }, mood: "serious" },
  { code: "U43", name: "Kanban", when: "\"it finally moved to done\"", ui: { kind: "kanban", text: "Ship it", state: "done" }, mood: "calm" },
  { code: "U44", name: "Receipt", when: "\"the bill came to four thousand\"", ui: { kind: "receipt", text: "Cloud bill", count: 4000 }, mood: "serious" },
  { code: "U45", name: "Boarding pass", when: "\"we flew to Stockholm\"", ui: { kind: "ticket", items: ["ARN", "SFO"], count: 12 }, mood: "hype" },
  { code: "U46", name: "Weather", when: "\"it was pouring rain\"", ui: { kind: "weather", text: "Rain" }, mood: "calm" },
  { code: "U47", name: "Clock", when: "\"at three in the morning\"", ui: { kind: "clock", count: 3, text: "am" }, mood: "serious" },
  { code: "U48", name: "Lock", when: "\"they got in anyway\"", ui: { kind: "lock", text: "Hacked", state: "crossed" }, mood: "chaos" },
  { code: "U49", name: "Link", when: "\"scan this, try it yourself\"", ui: { kind: "link", text: "do-it-live.vercel.app" }, mood: "hype" },
  { code: "U50", name: "Temperature", when: "\"it was forty degrees in the tent\"", ui: { kind: "temperature", count: 40, text: "in the tent" }, mood: "funny" },
  // Meetings, habits, money, queues, shops, parcels, audiences and languages.
  { code: "U51", name: "On mute", when: "\"I talked for two minutes on mute\"", ui: { kind: "mute" }, mood: "funny" },
  { code: "U52", name: "Meeting, waiting", when: "\"we sat there waiting for the host\"", ui: { kind: "meeting", state: "loading" }, mood: "calm" },
  { code: "U53", name: "Streak", when: "\"47 days in a row\"", ui: { kind: "streak", count: 47 }, mood: "hype" },
  { code: "U54", name: "Achievement", when: "\"first paying customer\"", ui: { kind: "badge", text: "First customer" }, mood: "hype" },
  { code: "U55", name: "Card declined", when: "\"and the card got declined\"", ui: { kind: "declined", text: "Cloud bill" }, mood: "chaos" },
  { code: "U56", name: "Waitlist", when: "\"we were number 4,021 in line\"", ui: { kind: "waitlist", count: 4021, text: "GPU waitlist" }, mood: "serious" },
  { code: "U57", name: "Sold out", when: "\"the tickets sold out in an hour\"", ui: { kind: "soldout", text: "Tickets", count: 49 }, mood: "chaos" },
  { code: "U58", name: "Delivery", when: "\"the GPUs are on their way\"", ui: { kind: "delivery", text: "8 GPUs" }, mood: "calm" },
  { code: "U59", name: "Followers", when: "\"ten thousand followers now\"", ui: { kind: "followers", text: "do_it_live", count: 10000 }, mood: "hype" },
  { code: "U60", name: "Translate", when: "\"in Swedish we say lagom\"", ui: { kind: "translate", items: ["lagom", "just enough"] }, mood: "funny" },
];

// A drawing made the way the engine makes one live, so the first card shows the real thing.
const SAMPLE_LINE = "and the best part is you can join without a login, no account needed";

function Card({ code, name, when, slide, theme, still }: { code: string; name: string; when: string; slide: Slide; theme?: Theme; still?: boolean }) {
  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
        <SlideView slide={slide} theme={theme} still={still} />
      </div>
      <figcaption className="text-sm leading-snug">
        <span className="mr-2 inline-block min-w-10 rounded bg-white px-1.5 py-0.5 text-center font-bold text-black">{code}</span>
        <span className="font-semibold">{name}</span>
        <span className="block text-white/55">{when}</span>
      </figcaption>
    </figure>
  );
}

// Slides get time-based ids, so the page is built on each visit rather than ahead of time.
export default function TemplatesPage() {
  return (
    <Suspense fallback={null}>
      <TemplatesView />
    </Suspense>
  );
}

function TemplatesView() {
  const [drawing, setDrawing] = useState("drawing a sample…");
  // ?look=pop previews every template in that look without touching the speaker's own setting;
  // ?still=1 shows the poster frame of each, with no motion, for contact sheets and reviews.
  const search = useSyncExternalStore(
    () => () => undefined,
    () => window.location.search,
    () => "",
  );
  const { preview, still } = useMemo(() => {
    const params = new URLSearchParams(search);
    const look = params.get("look");
    return { preview: isLookKey(look) ? applyLook(DEFAULT_THEME, look) : undefined, still: params.get("still") === "1" };
  }, [search]);
  // The samples that use the speaker's own files are shown only where those files exist: the hosted
  // app has no media library.
  const [own, setOwn] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let alive = true;
    void fetch("/api/library")
      .then((res) => res.json() as Promise<{ items?: { id: string }[] }>)
      .then((d) => {
        if (alive) setOwn(new Set((d.items ?? []).map((item) => item.id)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const layouts = useMemo(() => {
    const built: Slide[] = [];
    for (const entry of LAYOUT_ENTRIES) {
      const slide = artDirect(normalizeSlide(entry.raw), built.slice(-2), "balanced");
      if (slide.libraryId && slide.layout === "GIF_REACTION") slide.gif = `/api/library/${slide.libraryId}`;
      if (slide.libraryId && slide.layout === "PHOTO") slide.image = `/api/library/${slide.libraryId}`;
      built.push(slide);
    }
    return built;
  }, []);

  useEffect(() => {
    let alive = true;
    const live = layouts[0];
    const palette = { bg: "#0a0a0a", fg: "#8cf5c9", alt: "#ffd60a" };
    void (async () => {
      try {
        const res = await fetch("/api/draw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ line: SAMPLE_LINE, palette, prepared: true }) });
        const raw = await res.text();
        const { html } = parseDrawing(raw);
        if (!alive) return;
        setLive(live.id, { html, done: true, palette });
        setDrawing(html ? `drawn for: "${SAMPLE_LINE}"` : "the drawing model did not answer: reload to try again");
      } catch {
        if (alive) setDrawing("the drawing model did not answer: reload to try again");
      }
    })();
    return () => {
      alive = false;
    };
  }, [layouts]);

  const uiSlides = useMemo(() => {
    const built: Slide[] = [];
    for (const entry of UI_ENTRIES) built.push(artDirect(normalizeSlide({ layout: "UI_HERO", headline: entry.name, ui: entry.ui, mood: entry.mood }), built.slice(-2), "pure"));
    return built;
  }, []);

  const scenes: Slide[] = [];
  SCENES.forEach((scene, i) => {
    scenes.push(artDirect(normalizeSlide({ layout: "SCENE", scene, headline: scene, mood: MOODS[i % MOODS.length] }), scenes.slice(-3), "pure"));
  });
  const backdrops = BACKDROPS.map((name, i) => {
    const slide = normalizeSlide({ layout: "BIG_NUMBER", number: `B${i + 1}`, headline: name, mood: MOODS[i % MOODS.length] });
    return { ...slide, style: { ...slide.style, field: MOODS[i % MOODS.length], backdrop: name, text: "full" as const } };
  });

  return (
    <main className="mx-auto max-w-[1600px] space-y-12 p-6 text-white">
      <header className="space-y-2">
        <h1 className="text-4xl font-black">Templates</h1>
        <p className="max-w-3xl text-white/60">
          Everything the engine can put on screen, numbered. L = slide types, S = animated scenes, B = moving backgrounds.
          &ldquo;Main track&rdquo; is what appears with the default setting (no words on screen); the rest only appears with words switched on in Look, or not at all any more.
        </p>
      </header>

      <section className="space-y-4">
        <h2 id="layouts" className="text-2xl font-bold">Slide types (L1 to L{LAYOUT_ENTRIES.length})</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {layouts.map((slide, i) =>
            slide.libraryId && !own.has(slide.libraryId) ? null : (
              <Card key={slide.id} code={LAYOUT_ENTRIES[i].code} name={LAYOUT_ENTRIES[i].name} when={i === 0 ? `${LAYOUT_ENTRIES[i].when}. Sample ${drawing}` : LAYOUT_ENTRIES[i].when} slide={slide} theme={preview} still={still} />
            ),
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="cards" className="text-2xl font-bold">Interface elements (U1 to U{UI_ENTRIES.length}), new</h2>
        <p className="text-white/60">One big shadcn element instead of a whole screen. Only the word or number that carries the point is readable; the rest are grey bars.</p>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {uiSlides.map((slide, i) => (
            <Card key={slide.id} code={UI_ENTRIES[i].code} name={UI_ENTRIES[i].name} when={`For example ${UI_ENTRIES[i].when}`} slide={slide} theme={preview} still={still} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="scenes" className="text-2xl font-bold">Animated scenes (S1 to S{SCENES.length})</h2>
        <p className="text-white/60">Since the drawing took over, these only appear when a drawing fails and the scene fits perfectly, or behind a prepared slide that could not be drawn.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {scenes.map((slide, i) => (
            <Card key={slide.id} code={`S${i + 1}`} name={slide.scene ?? ""} when={slide.scene ? `${SCENE_CATALOG[slide.scene].shows}. Means: ${SCENE_CATALOG[slide.scene].means}` : ""} slide={slide} theme={preview} still={still} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Moving backgrounds (B1 to B{BACKDROPS.length})</h2>
        <p className="text-white/60">Rotate behind scenes, numbers, icons and big words. Not behind drawn slides.</p>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {backdrops.map((slide, i) => (
            <Card key={slide.id} code={`B${i + 1}`} name={BACKDROPS[i]} when="Background layer" slide={slide} theme={preview} still={still} />
          ))}
        </div>
      </section>
    </main>
  );
}
