"use client";

import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/hooks/useOptions";
import { FULL_FORM, type ProgramFormConfig } from "@/lib/program-form/rules";

/** The questions a program's upload form asks (the full form until the program has its own setting). */
export function useProgramFormConfig(programId: string | null | undefined): ProgramFormConfig & { isLoading: boolean } {
  const query = useQuery({
    queryKey: ["program-form-config"],
    queryFn: () => requestJson<{ configs: Record<string, ProgramFormConfig> }>("/api/program-form-config").then((r) => r.configs),
    staleTime: 5 * 60_000,
  });
  const cfg = programId ? query.data?.[programId] : undefined;
  return { ...(cfg ?? FULL_FORM), isLoading: query.isLoading };
}
