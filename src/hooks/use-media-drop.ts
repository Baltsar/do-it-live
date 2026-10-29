"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filesFromDrop, uploadMedia, type UploadReport } from "@/lib/upload";

export interface MediaDrop {
  /** Files are being dragged over the window. */
  dragging: boolean;
  progress: { done: number; total: number } | null;
  /** Result of the last dump, or null. */
  report: UploadReport | null;
  /** How many files the library holds. */
  count: number;
  add(files: File[]): Promise<void>;
}

/**
 * Makes the whole window a drop target for the speaker's own media. Disabled (a host with no disk),
 * files dropped on the page are still caught, so the browser does not open them, but not uploaded.
 */
export function useMediaDrop(enabled = true): MediaDrop {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<MediaDrop["progress"]>(null);
  const [report, setReport] = useState<UploadReport | null>(null);
  const [count, setCount] = useState(0);
  const depth = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const d = (await (await fetch("/api/library")).json()) as { items: unknown[] };
      setCount(d.items.length);
    } catch {
      // Count is a nicety.
    }
  }, []);

  const add = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setReport(null);
      setProgress({ done: 0, total: files.length });
      const result = await uploadMedia(files, (done, total) => setProgress({ done, total }));
      setProgress(null);
      setReport(result);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 0);
    const hasFiles = (e: DragEvent): boolean => Boolean(e.dataTransfer?.types.includes("Files"));
    const enter = (e: DragEvent): void => {
      if (!hasFiles(e) || !enabled) return;
      depth.current += 1;
      setDragging(true);
    };
    const leave = (e: DragEvent): void => {
      if (!hasFiles(e)) return;
      // dragenter and dragleave fire for every element crossed: only the last leave ends the drag.
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const over = (e: DragEvent): void => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent): void => {
      if (!e.dataTransfer || !hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (enabled) void filesFromDrop(e.dataTransfer).then(add);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      clearTimeout(id);
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [add, refresh, enabled]);

  return { dragging, progress, report, count, add };
}
