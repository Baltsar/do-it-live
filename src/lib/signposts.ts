// A signpost is a phrase that says what KIND of thing is coming, before the thing itself arrives:
// "here's the kicker" promises a payoff, "let me show you" promises an image. Looking one up costs
// nothing and needs no model, so the engine can stop waiting out its gate and ask for a slide while
// the speaker is still mid-sentence.
//
// Markers narrow what comes next, they never fix it, so a signpost is a reason to decide sooner —
// never a slide on its own. Figures, counted lists and questions are already read in grounding.ts;
// this file only answers "what will the next clause BE".
//
// The table is corpus work, not intuition: every phrase below was drawn from 111 TED/TEDx
// transcripts (~176k words) and kept only where the announced thing actually followed. Phrases that
// read like signposts but are ordinary speech were measured and rejected — "imagine" (57 hits,
// almost all plain description), "in reality", "at the end of the day", "that said", "picture this".
// "so" (1043 sentences) and "but" (1101) constrain nothing at all. See docs/signpost-lexicon.md.

/** What the words right after the marker will be about. */
export type Expectation = "contrast" | "punchline" | "scene" | "example" | "closing" | "thesis";

export interface Signpost {
  expect: Expectation;
  /** The phrase that fired, for the log and for measuring hit rate afterwards. */
  marker: string;
  /** strong: the payload follows within a clause. weak: it may be several sentences out. */
  strength: "strong" | "weak";
  /** Payload words already spoken after the marker. Zero means only the announcement is in yet. */
  wordsAfter: number;
}

interface Rule {
  re: RegExp;
  expect: Expectation;
  strength: "strong" | "weak";
}

// Anchored rules carry their own prefix: "for example" announces a case, "at Facebook for example
// in Sweden" announces nothing, and only the position tells them apart.
const RULES: Rule[] = [
  { re: /\b(the biggest lesson i learned|the last thing i want to say|and i['’]?ll leave you with|the last thing i['’]?ll say|this is what i learned|here['’]?s what i learned|i will leave you with|i['’]?ll leave you with|the biggest lesson|the last thing|what i learned)\b/i, expect: "closing", strength: "strong" },
  { re: /(?:^|[.,;:!?]\s*|\b(?:and|but|so|okay|now|then|well)\s+)(i['’]?d like to close with|let me leave you with|i want to close with|and one last thing|let me close with|but before i go|one last thing|so before i go|before i go)\b/i, expect: "closing", strength: "strong" }, // clause-initial only
  { re: /\b(the problem with that|the problem with this|the problem with it|but the reality is|but the trouble is|on the other hand|on the other side|but the truth is|as it turns out|the problem was|the problem is|the reality is|the trouble is|it turned out|it turns out|the truth is|turns out|truth is)\b/i, expect: "contrast", strength: "strong" },
  { re: /(?:^|[.,;:!?]\s*|\b(?:and|but|so|okay|now|then|well)\s+)(okay but here['’]?s the problem|here['’]?s the thing though|but here['’]?s the problem|but here['’]?s the thing|here['’]?s the problem|here['’]?s the thing)\b/i, expect: "contrast", strength: "strong" }, // clause-initial only
  { re: /\b(and the thing is|but the thing is|now to be fair|the thing is|to be fair|and yet|yet)\b/i, expect: "contrast", strength: "weak" },
  { re: /\b(a case in point|case in point)\b/i, expect: "example", strength: "strong" },
  { re: /(?:^|[.,;:!?]\s*|\b(?:and|but|so|okay|now|then|well)\s+)(let me give you one example|i will give you an example|let me give you an example|i['’]?ll give you an example|just to illustrate|to illustrate this|to illustrate|for instance|for example)\b/i, expect: "example", strength: "strong" }, // clause-initial only
  { re: /\b(say you['’]?re|let['’]?s say|say you)\b/i, expect: "example", strength: "weak" },
  { re: /(?:^|[.,;:!?]\s*|\b(?:and|but|so|okay|now|then|well)\s+)(suppose that|suppose i|suppose)\b/i, expect: "example", strength: "weak" }, // clause-initial only
  { re: /\b(to make a long story short|so this is what we did|what['’]?s interesting is|but the good news is|here['’]?s the best part|and lo and behold|and the best part|the worst part is|long story short|the best part is|the good news is|and sure enough|and that['’]?s when|what we did was|what['’]?s crazy is|what['’]?s funny is|what['’]?s weird is|so what we did|the worst part|lo and behold|the best part|sure enough|that['’]?s when)\b/i, expect: "punchline", strength: "strong" },
  { re: /(?:^|[.,;:!?]\s*|\b(?:and|but|so|okay|now|then|well)\s+)(and here['’]?s the kicker|here['’]?s what we built|here['’]?s what we made|here['’]?s what we did|believe it or not|here['’]?s the kicker|the kicker is)\b/i, expect: "punchline", strength: "strong" }, // clause-initial only
  { re: /\b(here['’]?s how that works|here['’]?s how this works|i remember the moment|the first time i ever|the way that works is|the way this works is|i can still remember|i remember the night|let['’]?s take a look at|here['’]?s how it works|the way it works is|i remember the day|and then i saw it|just look at this|i still remember|the first time i|fast forward to|you walk in and|so there i was|take a look at|then i saw it|there we were|think back on|think back to|you walk into|fast forward|fast-forward|look at that|look at this|there i was|you walk in|think back)\b/i, expect: "scene", strength: "strong" },
  { re: /(?:^|[.,;:!?]\s*|\b(?:and|but|so|okay|now|then|well)\s+)(what i want to show you|now i want to show you|let me show you what|let me show you how|i want to show you|let me explain how|let me explain why|let me show you|let me explain)\b/i, expect: "scene", strength: "strong" }, // clause-initial only
  { re: /\b(early one morning|then one morning|one morning)\b/i, expect: "scene", strength: "weak" },
  { re: /\b(the most important thing is|what this comes down to|and what i['’]?m saying is|the important thing is|so what i['’]?m saying is|what it comes down to|what i['’]?m saying is|and the point is|but the point is|it comes down to|the key thing is|now my point is|the key here is|the point is|my point is|the key is)\b/i, expect: "thesis", strength: "strong" },

  // Hand-written, kept because they add a shade the corpus rows do not cover.
  { re: /\b(however|although|whereas|then again)\b/i, expect: "contrast", strength: "weak" },
  { re: /\b(and the (?:crazy|wild|funny) part(?: is)?)\b/i, expect: "punchline", strength: "strong" },
  { re: /\b(so if you remember (?:one|a single) thing|which brings me (?:back )?to)\b/i, expect: "closing", strength: "weak" },
];

// Recency without depending on punctuation. A clause split on commas threw the marker away —
// "here's the thing, I'm struggling" kept only "I'm struggling" — and a recogniser writes
// punctuation inconsistently anyway, so the window is counted in words.
const WINDOW_WORDS = 12;

const windowOf = (line: string): string => line.trim().split(/\s+/).slice(-WINDOW_WORDS).join(" ");

/**
 * The signpost the speaker just laid down, if any. Read from the end of what they are saying, so a
 * marker only counts while the thing it announces is still ahead. When two markers sit in the
 * window the later one wins: it is the one still owed a payload.
 */
export function detectSignpost(line: string): Signpost | null {
  const text = windowOf(line);
  if (!text) return null;
  let best: { hit: RegExpExecArray; rule: Rule } | null = null;
  for (const rule of RULES) {
    const hit = rule.re.exec(text);
    if (hit && (!best || hit.index > best.hit.index)) best = { hit, rule };
  }
  if (!best) return null;
  const marker = (best.hit[1] ?? best.hit[0]).trim();
  const after = text.slice(best.hit.index + best.hit[0].length).trim();
  return {
    expect: best.rule.expect,
    marker: marker.toLowerCase(),
    strength: best.rule.strength,
    wordsAfter: after ? after.split(/\s+/).length : 0,
  };
}

/** A marker alone is an announcement; a slide needs some of what it announced. */
export const PAYLOAD_WORDS = 2;

/**
 * True when the payload is a clause away AND the speaker has started saying it. The second half
 * matters: "let me give you an example" is six words on its own, enough to satisfy the shortened
 * gate with nothing to make a slide from.
 */
export const payloadIsNext = (line: string): boolean => {
  const found = detectSignpost(line);
  return found !== null && found.strength === "strong" && found.wordsAfter >= PAYLOAD_WORDS;
};

