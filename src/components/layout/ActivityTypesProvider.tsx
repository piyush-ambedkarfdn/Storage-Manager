"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { activityTypesForProgram, fromRow, getActivityTypes, setActivityTypes, type ActivityType } from "@/config/activity-types";

type Value = { types: readonly ActivityType[]; refresh: () => Promise<void> };
const Ctx = createContext<Value | null>(null);

/**
 * Receives the activity types the server loaded and makes them current in the browser before any
 * child renders, so activityLabel()/activityColor() and pickers show the admin's list straight away.
 * refresh() reloads them from the API (used right after an admin changes them).
 */
export function ActivityTypesProvider({ types, children }: { types: readonly ActivityType[]; children: React.ReactNode }) {
  const [fromServer, setFromServer] = useState(types);
  const [current, setCurrent] = useState(types);
  if (types !== fromServer) {
    // the server sent a newer list (page reload or router.refresh)
    setFromServer(types);
    setCurrent(types);
  }
  setActivityTypes(current);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/activity-types", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { types: { id: string; label: string; label_hi: string | null; color: string; hidden: boolean; program_id: string | null }[] };
    const list = body.types.map(fromRow);
    setActivityTypes(list);
    setCurrent(list);
  }, []);

  return <Ctx.Provider value={{ types: current, refresh }}>{children}</Ctx.Provider>;
}

/** All types (with retired ones), the ones to offer in pickers, the ones for one program, and refresh(). */
export function useActivityTypes(): {
  all: readonly ActivityType[];
  active: readonly ActivityType[];
  forProgram: (programId: string | null | undefined) => ActivityType[];
  refresh: () => Promise<void>;
} {
  const ctx = useContext(Ctx);
  const all = ctx?.types ?? getActivityTypes();
  return {
    all,
    active: all.filter((a) => !a.retired),
    forProgram: (programId) => activityTypesForProgram(all, programId),
    refresh: ctx?.refresh ?? (async () => undefined),
  };
}
