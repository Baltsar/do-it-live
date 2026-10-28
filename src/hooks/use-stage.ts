"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createStage, type Stage, type StageSnapshot } from "@/lib/stage-engine";

export function useStage(): { stage: Stage; snap: StageSnapshot } {
  const [stage] = useState<Stage>(() => createStage());
  const snap = useSyncExternalStore(stage.subscribe, stage.getSnapshot, stage.getServerSnapshot);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void stage.init().then((fn) => {
      if (cancelled) fn();
      else cleanup = fn;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [stage]);

  return { stage, snap };
}
