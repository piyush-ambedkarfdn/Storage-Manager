"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import type { ProgramField } from "@/types/program-fields";

/** Categories of one program (visible ones; admins can ask for hidden ones too). null = nothing yet. */
export function useProgramFields(programId: string | null | undefined, includeHidden = false) {
  const query = useQuery({
    queryKey: ["program-fields", programId ?? "none", includeHidden],
    enabled: !!programId,
    queryFn: () =>
      requestJson<{ fields: ProgramField[] }>(`/api/program-fields?program=${programId}${includeHidden ? "&all=1" : ""}`).then((r) => r.fields),
    staleTime: 5 * 60_000,
  });
  return { ...query, fields: query.data ?? [] };
}

/** Every program's categories (gallery filter, photo labels). */
export function useAllProgramFields(includeHidden = false) {
  const query = useQuery({
    queryKey: ["program-fields", "all", includeHidden],
    queryFn: () => requestJson<{ fields: ProgramField[] }>(`/api/program-fields${includeHidden ? "?all=1" : ""}`).then((r) => r.fields),
    staleTime: 5 * 60_000,
  });
  return { ...query, fields: query.data ?? [] };
}

export function useInvalidateProgramFields() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["program-fields"] });
}
