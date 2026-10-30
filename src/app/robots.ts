import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The tool pages (audience screen, presenter view, lab, previews) are screens for a running show,
// not pages to land on. AI crawlers are welcome: being cited by assistants is part of the point.
const TOOL_PAGES = ["/api/", "/lab", "/library", "/presenter", "/preview", "/reel", "/scenes", "/screen", "/templates"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: TOOL_PAGES },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"], allow: "/", disallow: TOOL_PAGES },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
