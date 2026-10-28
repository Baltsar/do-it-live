import opensverige from "@/lib/scripts/opensverige.json";
import litmus from "@/lib/scripts/litmus.json";
import pitch from "@/lib/scripts/pitch.json";

export interface ReplayLine {
  /** Milliseconds from the start of the script. */
  t: number;
  text: string;
}

export interface Sample {
  id: string;
  name: string;
  lang: string;
  lines: ReplayLine[];
}

/** Scripts for testing without speaking: setups, a joke, a question, a claim, direct commands. */
export const SAMPLES: Sample[] = [
  opensverige,
  pitch,
  litmus,
  {
    id: "keynote",
    name: "Keynote: why slides are bad",
    lang: "en-US",
    lines: [
      { t: 0, text: "Welcome everyone, let's get started." },
      { t: 4000, text: "Today I want to talk about why most slides are bad." },
      { t: 9000, text: "Seventy percent of people say they zone out in meetings." },
      { t: 14000, text: "So I did something stupid. I deleted all my slides." },
      { t: 19000, text: "And honestly, best decision I ever made." },
      { t: 24000, text: "Bill, rocket" },
      { t: 28000, text: "Someone in the back asked how I remember the structure." },
      { t: 33000, text: "Great question. I don't. I just talk." },
      { t: 38000, text: "Bill, how much does an office desk in Stockholm cost per month?" },
      { t: 46000, text: "Thank you all." },
    ],
  },
  {
    id: "food-joke",
    name: "Joke with a setup and a punchline",
    lang: "en-US",
    lines: [
      { t: 0, text: "I had this idea for a conference venue." },
      { t: 5000, text: "Imagine the nicest building in the city." },
      { t: 10000, text: "And in the lobby, I put a taco bar. Seriously." },
      { t: 15000, text: "Nobody knows why, but everyone shows up." },
      { t: 20000, text: "Bill, chaos" },
      { t: 25000, text: "The janitor hates me. The crowd loves me." },
      { t: 30000, text: "Three things matter: the food, the vibe, and the wifi." },
    ],
  },
];
