import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The product is the home page; the look picker is the only other page a visitor lands on. No
// lastModified, since a date read at build time is not when the content changed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/style`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
