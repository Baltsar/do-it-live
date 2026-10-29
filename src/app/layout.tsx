import type { Metadata } from "next";
import { Anton, Archivo, Bricolage_Grotesque, Fraunces, Shantell_Sans, Space_Grotesk } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export const metadata: Metadata = {
  title: "Do it live: vibe presenting",
  description: "F*ck it, we'll do it live. Talk on stage and the slides draw themselves while you speak.",
  appleWebApp: { capable: true, title: "Do it live", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${bricolage.variable} ${anton.variable} ${fraunces.variable} ${space.variable} ${shantell.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
