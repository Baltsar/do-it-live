/** How the site describes itself to search engines, link previews and AI assistants. */

export const SITE_URL = "https://doitlive.app";
export const SITE_NAME = "Do it live";
export const SITE_TITLE = "Do it live: vibe presenting, slides that draw themselves";
// Search results show about 155 characters: say what it is and what it costs before the attitude.
export const SITE_DESCRIPTION =
  "Vibe presenting with no deck: press the mic and talk, and AI draws each slide while you speak. Free in any browser, on NVIDIA Nemotron via Nebius Token Factory.";
// Link previews are read by people who were sent the link, so they get the line the product opens with.
export const SITE_TAGLINE = "F*ck it, we'll do it live. Talk on stage and the slides draw themselves while you speak.";
export const REPO_URL = "https://github.com/Baltsar/do-it-live";

export const SITE_AUTHOR: { name: string; url: string } = { name: "Gustaf Baltsar Garnow", url: "https://headless.design" };
export const AUTHOR_X_HANDLE = "@gustafgarnow";
export const AUTHOR_X_URL = "https://x.com/gustafgarnow";
const AUTHOR_GITHUB_URL = "https://github.com/Baltsar";

/** schema.org graph for the home page. No ratings or reviews: there are none to cite. */
export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      alternateName: "Vibe presenting",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      image: `${SITE_URL}/opengraph-image.png`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web browser",
      browserRequirements: "A microphone. Google Chrome, Edge or Safari; Firefox works through server-side speech recognition.",
      inLanguage: ["en", "sv"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: "https://opensource.org/licenses/MIT",
      featureList: [
        "Slides drawn live from what the speaker says, with no deck to build",
        "Seven looks: Scribble, Pop, Signal, Redacted, Broadcast, Sticker and Scoreboard",
        "Figures read from the spoken line, never invented",
        "The speaker's own GIFs, photos and clips, shown when they fit what is said",
        "Sourced facts on stage, with the source shown",
        "English and Swedish speech",
        "Runs on a phone plugged into a TV",
      ],
      author: { "@id": `${SITE_URL}/#author` },
      sameAs: [REPO_URL],
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#author`,
      name: SITE_AUTHOR.name,
      alternateName: "Baltsar",
      url: SITE_AUTHOR.url,
      sameAs: [SITE_AUTHOR.url, AUTHOR_X_URL, AUTHOR_GITHUB_URL],
    },
  ],
};
