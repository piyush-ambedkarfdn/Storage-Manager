"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { ProgramViewData } from "@/types/program-view";

/** The programs, and for the chosen one its Staff > Village > Activity type counts. */
export function useProgramView(programId: string | null) {
  return useQuery({
    queryKey: ["program-view", programId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (programId) p.set("program", programId);
      return requestJson<ProgramViewData>(`/api/program-view?${p}`);
    },
  });
}
