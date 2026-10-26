"use client";

import { useCallback, useEffect, useRef } from "react";
import { prepareImage, readExif } from "@/lib/image";
import type { DraftPhoto } from "@/components/upload/Dropzone";

type SetPhotos = React.Dispatch<React.SetStateAction<DraftPhoto[]>>;

/**
 * Shrinks picked photos one at a time (a phone cannot decode several 12 MP photos at once) and fills each card in
 * as it finishes. Cards that are removed while waiting are skipped. A photo that cannot be read becomes an error
 * card instead of stopping the others.
 */
export function usePhotoPreparer(setPhotos: SetPhotos) {
  const waiting = useRef<{ key: string; file: File }[]>([]);
  const running = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      let job: { key: string; file: File } | undefined;
      while ((job = waiting.current.shift())) {
        const { key, file } = job;
        try {
          const takenAt = (await readExif(file)).takenAt;
          const img = await prepareImage(file);
          if (!alive.current) return;
          setPhotos((list) =>
            list.map((p) =>
              p.key === key ? { ...p, status: "ready", file: img.blob, thumb: img.thumb, width: img.width, height: img.height, takenAt, error: undefined } : p,
            ),
          );
        } catch (err) {
          if (!alive.current) return;
          const message = err instanceof Error && err.message ? err.message : "This file could not be read as a photo.";
          setPhotos((list) => list.map((p) => (p.key === key ? { ...p, status: "error", error: message } : p)));
        }
        // let the browser breathe between photos (keeps the page responsive on slow phones)
        await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      running.current = false;
    }
  }, [setPhotos]);

  const prepare = useCallback(
    (jobs: { key: string; file: File }[]) => {
      waiting.current.push(...jobs);
      void pump();
    },
    [pump],
  );

  /** forget photos that were removed before their turn */
  const cancel = useCallback((key: string) => {
    waiting.current = waiting.current.filter((j) => j.key !== key);
  }, []);

  return { prepare, cancel };
}
