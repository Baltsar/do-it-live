import type { Metadata, Viewport } from "next";
import { Anton, Archivo, Barlow_Condensed, Bricolage_Grotesque, Doto, Fraunces, JetBrains_Mono, Shantell_Sans, Space_Grotesk } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AUTHOR_X_HANDLE, SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

// Variable width axis: slides pick a wide cut for short words, a narrow one for long.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Typefaces a speaker can pick in their style guide.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });
// The Scribble look: Informal makes it marker-like, Bounce lets letters sit off the line.
const shantell = Shantell_Sans({ variable: "--font-shantell", subsets: ["latin"], axes: ["BNCE", "INFM"] });
// Faces only one look uses are not preloaded: a speaker on Scribble never downloads them.
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["700", "800", "900"], preload: false });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], axes: ["ROND"], preload: false });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], preload: false });

// The share image and icons come from the file conventions in this folder (opengraph-image.png,
// icon.svg, apple-icon.png, favicon.ico); metadataBase makes their URLs absolute on every host.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [SITE_AUTHOR],
  creator: SITE_AUTHOR.name,
  category: "technology",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_TAGLINE,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    creator: AUTHOR_X_HANDLE,
    title: SITE_TITLE,
    description: SITE_TAGLINE,
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
};

// No colorScheme: a page scheme that differs from a slide iframe's paints an opaque backdrop behind
// drawings that are meant to be transparent.
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${bricolage.variable} ${anton.variable} ${fraunces.variable} ${space.variable} ${shantell.variable} ${barlow.variable} ${doto.variable} ${jetbrains.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
