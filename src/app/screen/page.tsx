"use client";

import { useEffect, useState } from "react";
import { SlideView } from "@/components/slide/slide-view";
import { CHANNEL, type StageMessage } from "@/lib/stage-engine";
import { setLive } from "@/lib/live-store";
import type { Slide } from "@/lib/slide";

/** Audience screen: nothing but the slide. Click anywhere for full screen. */
export default function AudiencePage() {
  const [slide, setSlide] = useState<Slide | null>(null);
  const [blank, setBlank] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent<StageMessage>) => {
      if (e.data.type === "live") return setLive(e.data.id, e.data.drawing);
      if (e.data.type !== "state") return;
      setSlide(e.data.slide);
      setBlank(e.data.blank);
    };
    channel.postMessage({ type: "hello" });
    return () => channel.close();
  }, []);

  return (
    <main
      className="cursor-none"
      onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}
    >
      <SlideView slide={slide} blank={blank} fill />
    </main>
  );
}
