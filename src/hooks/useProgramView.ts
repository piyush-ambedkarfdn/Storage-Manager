"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { ProgramViewData } from "@/types/program-view";

/** The programs, and for the chosen one its categories and Staff > Village > Activity counts. */
export function useProgramView(programId: string | null, fieldId: string | null) {
  return useQuery({
    queryKey: ["program-view", programId, fieldId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (programId) p.set("program", programId);
      if (fieldId) p.set("field", fieldId);
      return requestJson<ProgramViewData>(`/api/program-view?${p}`);
    },
  });
}
