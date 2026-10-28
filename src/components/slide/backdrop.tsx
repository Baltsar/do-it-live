"use client";

import type { CSSProperties } from "react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { Particles } from "@/components/ui/particles";
import { RetroGrid } from "@/components/ui/retro-grid";
import { Ripple } from "@/components/ui/ripple";
import { useTheme } from "@/hooks/use-theme";
import type { BackdropName, Mood } from "@/lib/slide";

/**
 * A moving layer behind a scene or a number, in the field's accent colour. It carries no meaning:
 * its job is that the same scene never looks the same twice. Components are Magic UI (MIT).
 */
export function Backdrop({ kind, field }: { kind: BackdropName; field: Mood }) {
  const [theme] = useTheme();
  const color = theme.fields[field].alt;

  return (
    <div className="backdrop" aria-hidden>
      {kind === "flicker" ? <FlickeringGrid className="absolute inset-0 size-full" squareSize={10} gridGap={12} color={color} maxOpacity={0.5} flickerChance={0.14} /> : null}
      {kind === "retro" ? <RetroGrid angle={62} cellSize={64} opacity={0.75} lightLineColor={color} darkLineColor={color} /> : null}
      {kind === "ripple" ? (
        // The component draws with the theme's foreground token: point it at the accent instead.
        <div className="absolute inset-0" style={{ "--foreground": color } as CSSProperties}>
          <Ripple mainCircleSize={260} mainCircleOpacity={0.5} numCircles={7} className="mask-none" />
        </div>
      ) : null}
      {kind === "particles" ? <Particles className="absolute inset-0" quantity={90} size={2.2} color={color} staticity={30} ease={60} vx={0.12} vy={-0.06} /> : null}
      {kind === "gridpulse" ? (
        <AnimatedGridPattern width={64} height={64} numSquares={22} maxOpacity={0.45} duration={2.4} repeatDelay={0.4} style={{ color, stroke: color, strokeOpacity: 0.35, fill: "none" }} />
      ) : null}
      {kind === "depth" ? <Floating3DParticles className="absolute inset-0 size-full" quantity={160} size={4} color={color} /> : null}
    </div>
  );
}
