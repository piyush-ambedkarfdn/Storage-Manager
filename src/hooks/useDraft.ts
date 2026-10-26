"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { clearDraft, draftKey, loadDraft, saveDraft, type DraftStorage } from "@/lib/drafts/store";

/**
 * Like useState, but the value is kept in the browser for `ttlMs` (see lib/drafts/store). It is read after the page
 * has mounted (so server and browser render the same first), saved shortly after each change, and removed with discard().
 * `restored` is true when the value came from an earlier visit. `isEmpty` decides when there is nothing worth keeping.
 */
export function useDraftState<T>(
  name: string,
  initial: T,
  options: { ttlMs: number; storage?: DraftStorage; isEmpty?: (value: T) => boolean; enabled?: boolean },
) {
  const { ttlMs, storage = "local", isEmpty, enabled = true } = options;
  const profile = useProfile();
  const key = draftKey(profile.id, name);
  const [value, setValue] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  // true once the saved draft (if any) has been read; saving waits for it so an old draft is never overwritten by an empty form
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    // read after mount, in a microtask: the first render matches the server, then the saved value is applied
    void Promise.resolve().then(() => {
      if (stop) return;
      const saved = loadDraft<T>(key, storage);
      if (saved !== null && !(isEmpty?.(saved) ?? false)) {
        setValue(saved);
        setRestored(true);
      }
      setReady(true);
    });
    return () => {
      stop = true;
    };
    // read once per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const id = setTimeout(() => {
      if (isEmpty?.(value)) clearDraft(key, storage);
      else saveDraft(key, value, ttlMs, storage);
    }, 400);
    return () => clearTimeout(id);
  }, [value, key, ttlMs, storage, isEmpty, enabled, ready]);

  const discard = useCallback(() => {
    clearDraft(key, storage);
    setValue(initialRef.current);
    setRestored(false);
  }, [key, storage]);

  const forget = useCallback(() => {
    clearDraft(key, storage);
    setRestored(false);
  }, [key, storage]);

  return { value, setValue, restored, discard, forget };
}
