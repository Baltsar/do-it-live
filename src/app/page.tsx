import type { Metadata } from "next";
import { ShowPage } from "@/components/show-page";
import { STRUCTURED_DATA } from "@/lib/site";

// Only the home page claims the root URL: the tool pages under it are not copies of it.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// `<` is escaped so no string in the graph can close the script tag.
const jsonLd = JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c");

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ShowPage />
    </>
  );
}
