"use client"

import { useQuery } from "@tanstack/react-query"
import { getRisks } from "@/lib/api"

export function useRisks(
  projectId: string | undefined,
  filters?: { severity?: string; status?: string }
) {
  return useQuery({
    queryKey: ["risks", projectId, filters],
    queryFn: () => getRisks(projectId!, filters),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}
