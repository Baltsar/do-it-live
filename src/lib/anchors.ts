export interface Anchor {
  id: string;
  keywords: string[];
  slide: Record<string, unknown>;
}

/** Safe slides the Director falls back on in Hybrid mode. Edit freely. */
export const ANCHORS: Anchor[] = [
  {
    id: "intro",
    keywords: ["welcome everyone", "welcome all", "let's get started", "good morning everyone"],
    slide: { layout: "BIG_WORD", headline: "No clicker.", body: "Just voice.", mood: "hype" },
  },
  {
    id: "agenda",
    keywords: ["here is the agenda", "what we cover today", "on the agenda"],
    slide: { layout: "REVEAL_3", headline: "Three things", items: ["The problem", "The magic", "The future"], mood: "serious" },
  },
  {
    id: "close",
    keywords: ["thank you all", "thanks for listening", "thank you so much"],
    slide: { layout: "BIG_WORD", headline: "Thank you!", body: "That was live, for real.", mood: "funny" },
  },
];
