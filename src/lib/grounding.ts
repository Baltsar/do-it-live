// Keeps invented numbers off the screen: a figure must come from the speaker's words or a source.

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, half: 50, quarter: 25, dozen: 12,
};
const MULTIPLIERS: Record<string, number> = { thousand: 1_000, million: 1_000_000, billion: 1_000_000_000 };

const CARDINALS: Record<string, number> = Object.fromEntries(Object.entries(UNITS).filter(([, v]) => v < 100 && (v < 20 || v % 10 === 0)).filter(([w]) => w !== "half" && w !== "quarter" && w !== "dozen"));
const AMOUNT_WORD = `(?:${[...Object.keys(CARDINALS), "hundred", ...Object.keys(MULTIPLIERS)].join("|")})`;
const AMOUNT_RUN = new RegExp(`\\b${AMOUNT_WORD}(?:(?:[\\s-]+(?:and[\\s-]+)?)${AMOUNT_WORD})*\\b`, "gi");

/** The value of one run of number words, or null when the words do not form one amount ("twenty twenty"). */
function amountOf(words: string[]): number | null {
  let total = 0;
  let current = 0;
  for (const w of words) {
    const low = current % 100;
    if (w in CARDINALS) {
      const v = CARDINALS[w];
      const fits = v >= 20 ? low === 0 : low === 0 || (low >= 20 && low % 10 === 0 && v < 10);
      if (!fits) return null;
      current += v;
    } else if (w === "hundred") {
      if (current >= 100) return null;
      current = (current || 1) * 100;
    } else if (w in MULTIPLIERS) {
      total += (current || 1) * MULTIPLIERS[w];
      current = 0;
    }
  }
  return total + current;
}

/**
 * Writes spoken amounts as digits ("seven hundred builders" becomes "700 builders"), the form the figure
 * rules read. AssemblyAI's multilingual model spells English amounts out where Chrome wrote digits. Only a
 * run with a tens or scale word changes: "three things" and "one of us" keep their words.
 */
export function digitsForSpokenAmounts(text: string): string {
  return text.replace(AMOUNT_RUN, (run) => {
    const words = run.toLowerCase().split(/[\s-]+/).filter((w) => w !== "and");
    const sized = words.some((w) => w === "hundred" || w in MULTIPLIERS || (CARDINALS[w] ?? 0) >= 20);
    if (!sized) return run;
    const value = amountOf(words);
    return value === null ? run : String(value);
  });
}

/** Every number the speaker said, as digits or words ("eighty percent", "twenty five", "5 thousand"). */
export function spokenNumbers(text: string): Set<number> {
  const found = new Set<number>();
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number.parseFloat(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) found.add(n);
  }
  const tokens = lower.replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(Boolean);
  let previous: number | null = null;
  for (const token of tokens) {
    if (token in UNITS) {
      const value = UNITS[token];
      // "twenty five": a tens word followed by a unit word is one number.
      if (previous !== null && previous >= 20 && previous < 100 && previous % 10 === 0 && value < 10) {
        found.add(previous + value);
      }
      found.add(value);
      previous = value;
    } else if (token in MULTIPLIERS && previous !== null) {
      found.add(previous * MULTIPLIERS[token]);
      previous = null;
    } else {
      previous = null;
    }
  }
  return found;
}

const numericCore = (text: string): number | null => {
  const m = text.replace(/\s/g, "").match(/\d[\d,]*(?:\.\d+)?/);
  if (!m) return null;
  const n = Number.parseFloat(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Downgrades slides that state numbers nobody said. Mutates the raw slide object from the model.
 * - BIG_NUMBER with an unsupported number becomes a plain word slide.
 * - CHART with unsupported values is marked illustrative: it keeps its shape but shows no figures.
 */
export function groundSlide(slide: Record<string, unknown>, spokenText: string): void {
  if (typeof slide.source === "string" && slide.source) return;
  const spoken = spokenNumbers(spokenText);
  const lowerSpoken = spokenText.toLowerCase();
  const layout = String(slide.layout ?? "").toUpperCase();

  if (layout === "BIG_NUMBER" || layout === "NUMBER") {
    const raw = String(slide.number ?? "");
    const n = numericCore(raw);
    const grounded = n !== null ? spoken.has(n) : raw.length > 0 && lowerSpoken.includes(raw.toLowerCase());
    if (!grounded) {
      slide.layout = "BIG_WORD";
      slide.number = undefined;
    }
    return;
  }

  // The new figure layouts hold several figures: every one of them has to have been said.
  if (layout === "DELTA" || layout === "STAT_ROW" || layout === "PICTOGRAM") {
    const printed =
      layout === "DELTA"
        ? (Array.isArray(slide.versus) ? slide.versus : []).map(String)
        : layout === "STAT_ROW"
          ? (Array.isArray(slide.items) ? slide.items : []).map((i) => String(i).match(/^[$€£]?[\d.,]+(?:\s?(?:[kKmMbB](?![a-z])|%))?/i)?.[0] ?? "")
          : String(slide.number ?? "").split(/[/ ]/).filter(Boolean);
    if (printed.length === 0 || printed.some((f) => !saidFigure(f.trim(), spoken, spokenText))) {
      slide.layout = "BIG_WORD";
      slide.number = undefined;
      slide.versus = undefined;
    }
    return;
  }

  if (layout === "CHART" && slide.chart && typeof slide.chart === "object") {
    const chart = slide.chart as { values?: unknown };
    let values = Array.isArray(chart.values) ? chart.values.filter((v): v is number => typeof v === "number") : [];
    // A ring draws only its first value; a made-up remainder ("80, 20") must not taint it.
    if (String((slide.chart as Record<string, unknown>).kind) !== "bars" && values.length > 1) {
      values = values.slice(0, 1);
      (slide.chart as Record<string, unknown>).values = values;
    }
    if (values.some((v) => !spoken.has(v))) {
      (slide.chart as Record<string, unknown>).illustrative = true;
      // A ring without a figure says nothing; only a bar shape can be illustrative.
      if (String((slide.chart as Record<string, unknown>).kind) !== "bars") {
        slide.layout = slide.icon ? "ICON" : "BIG_WORD";
      }
    }
  }
}

// The count has to sit on the list word ("three things", "a few big ideas"). Looking for the two anywhere
// in a long run-on thought held a real "...certain things like 50%..." line as an announcement.
const COUNTED_LIST = /\b(two|three|four|five|six|seven|few|several|\d{1,2})\s+(?:[a-z]+\s+)?(things|points|reasons|ideas|steps|lessons|ways|rules|problems|questions|principles)\b/i;
const ANNOUNCE = /\b(tell you|give you|show you|share|walk you through|going to|want to|let me|here are|here's|i have|we have)\b/i;

/** "Today I want to tell you three things." announces a list; the items come later, so the slide must wait. */
export function isAnnouncement(line: string): boolean {
  if (!COUNTED_LIST.test(line) || !ANNOUNCE.test(line)) return false;
  // A line that already lists the items has separators ("one, ..., two, ...", "A, B and C").
  const separators = (line.match(/[,;:]|\band\b/gi) ?? []).length;
  return separators < 2;
}

/** True when the slide states numbers the speaker never said (so they would need a source). */
export function hasUngroundedNumbers(slide: Record<string, unknown>, spokenText: string): boolean {
  const spoken = spokenNumbers(spokenText);
  const layout = String(slide.layout ?? "").toUpperCase();
  if (layout === "BIG_NUMBER" || layout === "NUMBER") {
    const n = numericCore(typeof slide.number === "object" ? JSON.stringify(slide.number) : String(slide.number ?? ""));
    return n !== null && !spoken.has(n);
  }
  const chart = slide.chart as { values?: unknown } | undefined;
  if (chart && Array.isArray(chart.values)) {
    const kind = String((slide.chart as Record<string, unknown>).kind);
    const values = kind === "bars" ? chart.values : chart.values.slice(0, 1);
    return values.some((v) => typeof v === "number" && !spoken.has(v));
  }
  return false;
}

export const isQuestion = (line: string): boolean => /\?|^\s*(how|what|when|where|who|which|why)\b/i.test(line);

/** "eighty percent", "35%", "half of" -> 80, 35, 50. Null when the line states no share. */
export function percentFromLine(line: string): number | null {
  const lower = line.toLowerCase();
  const m = lower.match(/([\w.,-]+(?:\s[\w-]+)?)\s*(?:percent|%)/);
  if (m) {
    const candidates = [...spokenNumbers(m[1])].filter((n) => n > 0 && n <= 100);
    if (candidates.length) return Math.max(...candidates);
  }
  if (/\bhalf of\b/.test(lower)) return 50;
  if (/\b(a|one) quarter of\b/.test(lower)) return 25;
  return null;
}

const NOT_COUNTED = new Set([
  "percent", "and", "or", "of", "to", "in", "at", "on", "the", "a", "an", "is", "are", "was", "were", "so", "but", "that", "this",
  "it", "we", "i", "you", "they", "for", "with", "as", "by", "from", "times", "am", "pm", "or", "if", "then", "like", "something",
]);
const SCALE: Record<string, string> = { k: "K", thousand: "K", million: "M", billion: "B" };

/**
 * A figure the speaker states with the thing it counts: "we are 700 people", "3,000 lines of code",
 * "2 million users". Null for shares, years, small list counts ("three things") and bare numbers.
 */
/** The value of "700", "2,000", "2 million", "40k": digits with an optional scale word. Null for anything else. */
const scaledAmount = (digits: string, scale: string | undefined): number | null => {
  const n = Number.parseFloat(digits.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return n * (scale ? SCALE_VALUE[scale] : 1);
};
const SCALE_VALUE: Record<string, number> = { k: 1e3, thousand: 1e3, million: 1e6, billion: 1e9 };

/** 700 -> "700", 2000000 -> "2M", 40000 -> "40K": how a figure reads on a slide. */
export const formatAmount = (n: number): string => {
  const unit = n >= 1e9 ? ["B", 1e9] : n >= 1e6 ? ["M", 1e6] : n >= 1e4 ? ["K", 1e3] : null;
  if (!unit) return n.toLocaleString("en");
  const short = Math.round((n / (unit[1] as number)) * 10) / 10;
  return `${short}${unit[0]}`;
};

/** Every figure the speaker states with the thing it counts, in order. See countFromLine for what is left out. */
export function countsFromLine(line: string, includeSmall = false): { number: string; label: string; value: number; small: boolean }[] {
  const lower = line.toLowerCase();
  const pattern = /(\S+\s+)?(?<![\w.,])(\d[\d,]*(?:\.\d+)?)(?:\s*(k|thousand|million|billion)\b)?\s+([a-z][a-z'-]+)(?:\s+of\s+([a-z][a-z'-]+))?/g;
  const out: { number: string; label: string; value: number; small: boolean }[] = [];
  for (const m of lower.matchAll(pattern)) {
    const before = (m[1] ?? "").trim();
    const n = Number.parseFloat(m[2].replace(/,/g, ""));
    const noun = m[4];
    if (!Number.isFinite(n) || NOT_COUNTED.has(noun)) continue;
    // "three things" announces a list; a figure worth a slide is bigger than a handful, unless it stands in a row of figures.
    const small = !m[3] && n < 10;
    if (small && !includeSmall) continue;
    // "in 2024", "the 2020 pandemic", "our 2025 roadmap": a year, not a count.
    // A real count in that range names many of something ("2000 people") or is written with a comma.
    const yearLike = !m[3] && !m[2].includes(",") && n >= 1900 && n <= 2100;
    if (yearLike && (/^(in|since|by|from|until|year|of|during)$/.test(before) || !/^(people|.+s)$/.test(noun))) continue;
    const number = m[3] ? `${m[2]}${SCALE[m[3]]}` : n.toLocaleString("en");
    const label = m[5] && !NOT_COUNTED.has(m[5]) ? `${noun} of ${m[5]}` : noun;
    if (out.some((o) => o.label === label)) continue;
    out.push({ number, label, value: scaledAmount(m[2], m[3]) ?? n, small });
  }
  return out;
}

/**
 * A figure the speaker states with the thing it counts: "we are 700 people", "3,000 lines of code",
 * "2 million users". Null for shares, years, small list counts ("three things") and bare numbers.
 */
export function countFromLine(line: string): { number: string; label: string } | null {
  const first = countsFromLine(line)[0];
  return first ? { number: first.number, label: first.label } : null;
}

const WORD_NUMBER: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1e6, billion: 1e9, k: 1000,
};
// One spoken figure: digits, or a run of number words ("seven hundred", "forty million").
const NUMBER_TOKEN = `(?:\\d[\\d,.]*|${Object.keys(WORD_NUMBER).join("|")})`;
const ORDINAL_SHARE: Record<string, number> = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, tenth: 10 };

/** The one amount in a few spoken words: "seven hundred", "2 million", "40k", "12". Null when there is none. */
function amountInWords(words: string): number | null {
  const m = words.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|million|billion)?/);
  if (m) return scaledAmount(m[1], m[2]);
  const tokens = words.split(/[\s-]+/).filter((t) => t in WORD_NUMBER);
  if (tokens.length === 0) return null;
  // "seven hundred", "two million": a unit word times the scale word after it.
  let total = 0;
  let current = 0;
  for (const t of tokens) {
    const v = WORD_NUMBER[t];
    if (v >= 100) {
      current = (current || 1) * v;
      if (v >= 1000) {
        total += current;
        current = 0;
      }
    } else current += v;
  }
  return total + current || null;
}

/** The thing a figure counts: the first word after it that is a noun, not a filler ("in", "of"). */
const nounAfter = (text: string): string => {
  const m = text.match(/^[\s.,;:!?]*([a-z][a-z'-]+)/);
  if (!m || NOT_COUNTED.has(m[1]) || m[1] in WORD_NUMBER) return "";
  return m[1];
};

/**
 * "from 12 to 700 builders", "we went from three to forty people": a change between two figures.
 * Years ("from 2019 to 2023") and tiny pairs ("from 1 to 3") are not a change worth a slide.
 */
export function deltaFromLine(line: string): { from: string; to: string; label: string; values: [number, number] } | null {
  const lower = line.toLowerCase();
  const m = lower.match(new RegExp(`\\bfrom\\s+((?:${NUMBER_TOKEN}\\s+){1,4})to\\s+((?:${NUMBER_TOKEN}\\b\\s*){1,4})(.*)$`));
  if (!m) return null;
  const a = amountInWords(m[1]);
  const b = amountInWords(m[2]);
  if (a === null || b === null || a === b || a <= 0) return null;
  const scaled = /k\b|thousand|million|billion|hundred/.test(`${m[1]} ${m[2]}`);
  if (!scaled && a < 10 && b < 10) return null;
  if (!scaled && a >= 1900 && a <= 2100 && b >= 1900 && b <= 2100) return null;
  // The thing counted: the first noun after the second figure ("700 builders in a year").
  return { from: formatAmount(a), to: formatAmount(b), label: nounAfter(m[3]), values: [a, b] };
}

/**
 * "one in five startups", "9 out of 10 dentists", "two of three", "every third person": a share of a group,
 * small enough to draw as a row of figures. Null for "half" (a share) and "one of the" (not a figure).
 */
export function fractionFromLine(line: string): { part: number; of: number; label: string } | null {
  const lower = line.toLowerCase();
  const every = lower.match(/\bevery\s+(second|third|fourth|fifth|sixth|tenth)\s+([a-z][a-z'-]+)?/);
  if (every) return { part: 1, of: ORDINAL_SHARE[every[1]], label: every[2] && !NOT_COUNTED.has(every[2]) ? every[2] : "" };
  const m = lower.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:in|out of|of)\s+(?:every\s+)?(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten|twenty)\b\s*(.*)$/);
  if (!m) return null;
  const part = amountInWords(m[1]);
  const of = amountInWords(m[2]);
  if (part === null || of === null || part < 1 || part >= of || of > 20) return null;
  return { part, of, label: nounAfter(m[3]) };
}

/**
 * The slide a line's own figures make, if any: a change (DELTA), a share of a group (PICTOGRAM) or several
 * figures in one breath (STAT_ROW). The one count is countFromLine's; a percentage is the ring's.
 */
export function figureFromLine(line: string): { slide: Record<string, unknown>; key: string; reason: string } | null {
  const delta = deltaFromLine(line);
  if (delta) {
    return {
      slide: { layout: "DELTA", versus: [delta.from, delta.to], headline: delta.label, mood: "hype" },
      key: `${delta.label || delta.to} [DELTA]`,
      reason: `the speaker said a change: ${delta.from} to ${delta.to} ${delta.label}`.trim(),
    };
  }
  const fraction = fractionFromLine(line);
  if (fraction) {
    return {
      slide: { layout: "PICTOGRAM", number: `${fraction.part}/${fraction.of}`, headline: fraction.label, mood: "serious" },
      key: `${fraction.label || `${fraction.part}/${fraction.of}`} [PICTOGRAM]`,
      reason: `the speaker said a share: ${fraction.part} in ${fraction.of} ${fraction.label}`.trim(),
    };
  }
  if (percentFromLine(line) === null) {
    // Small figures count in a row ("3 countries") when at least one real figure stands beside them.
    const counts = countsFromLine(line, true);
    if (counts.length >= 2 && counts.some((c) => !c.small)) {
      return {
        slide: { layout: "STAT_ROW", items: counts.slice(0, 3).map((c) => `${c.number} ${c.label}`), headline: "", mood: "hype" },
        key: `${counts[0].label} [STAT_ROW]`,
        reason: `the speaker said ${counts.length} figures: ${counts.map((c) => `${c.number} ${c.label}`).join(", ")}`,
      };
    }
  }
  return null;
}

/** True when the figure, as a slide prints it ("700", "2M", "1/5"), was said: as digits, words or a scaled amount. */
function saidFigure(printed: string, spoken: Set<number>, text: string): boolean {
  const lower = text.toLowerCase();
  if (printed && lower.includes(printed.toLowerCase())) return true;
  const n = magnitudeOf(printed);
  if (n === null) return printed.length === 0;
  if (spoken.has(n)) return true;
  for (const m of lower.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|million|billion)\b/g)) if (scaledAmount(m[1], m[2]) === n) return true;
  for (const m of lower.matchAll(/((?:(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|hundred|thousand|million|billion)[\s-]*){1,4})/g)) {
    if (amountInWords(m[1]) === n) return true;
  }
  return false;
}

/** "2M" -> 2000000, "$4,000" -> 4000, "40K" -> 40000. */
export const magnitudeOf = (text: string): number | null => {
  const m = text.replace(/[,\s$€£]/g, "").match(/^(\d+(?:\.\d+)?)([kmb])?/i);
  if (!m) return null;
  const scale = m[2] ? { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] ?? 1 : 1;
  return Number.parseFloat(m[1]) * scale;
};

// Words that make a photo search return unrelated pictures (logos, stock art, random scenes).
const ABSTRACT_PHOTO_WORDS = new Set([
  "ai", "agent", "agents", "discord", "opensverige", "software", "app", "apps", "code", "coding", "build", "building",
  "startup", "idea", "ideas", "growth", "innovation", "platform", "bot", "chatbot", "technology", "digital", "network",
  "online", "things", "ship", "shipping", "vibe", "community", "members", "project", "projects",
]);

/** A photo query only works for something you could point a camera at; otherwise use an icon or type. */
export function isAbstractPhotoQuery(query: string): boolean {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return true;
  const abstract = words.filter((w) => ABSTRACT_PHOTO_WORDS.has(w)).length;
  // "stockholm community venue": one abstract word among concrete ones is fine; mostly abstract is not.
  return abstract > 0 && abstract * 2 >= words.length;
}

const ORDINAL = /^(?:one|two|three|four|first|second|third|1|2|3|4)$/i;

/** "One, we ship. Two, we share. Three, we never wait." -> ["we ship", "we share", "we never wait"]. */
export function itemsFromEnumeration(line: string): string[] | null {
  const parts = line
    .split(/(?:^|[.,;:]\s*|\s)(?:one|two|three|four|first|second|third|fourth)\b[,:.]?\s+/i)
    .map((p) => p.replace(/[.,;:\s]+$/g, "").trim())
    .filter(Boolean);
  return parts.length >= 3 ? parts.slice(0, 3) : null;
}

export const areBareOrdinals = (items: unknown): boolean =>
  Array.isArray(items) && items.length > 0 && items.every((i) => typeof i === "string" && ORDINAL.test(i.replace(/[.,:\s]/g, "")));

const tidy = (t: string): string => t.replace(/^(?:you|we|and|then|so)\s+/i, "").replace(/[.,;:!\s]+$/g, "").trim();

/** "First you talk, then Bill listens, and then the slide appears." -> 3 ordered steps. */
export function processFromLine(line: string): string[] | null {
  const m = line.match(/\bfirst\b[,\s]+(.+)/i);
  if (!m || !/\bthen\b/i.test(m[1])) return null;
  const steps = m[1].split(/[,.]?\s*(?:and\s+)?then\s+/i).map(tidy).filter(Boolean);
  return steps.length >= 2 && steps.length <= 4 ? steps : null;
}

/** "Here is what you get. No clicker, no slides to build, and pure improv." -> the promised items. */
export function checklistFromLine(line: string): string[] | null {
  if (!/\b(what you get|you get|you'll get|includes?|included|comes with)\b/i.test(line)) return null;
  const sentences = line.split(/(?<=[.!?])\s+/);
  const listy = [...sentences].reverse().find((sentence) => (sentence.match(/,|\band\b/gi) ?? []).length >= 2) ?? "";
  const items = listy.split(/,\s*(?:and\s+)?|\s+and\s+/i).map(tidy).filter(Boolean);
  return items.length >= 2 && items.length <= 5 ? items : null;
}
