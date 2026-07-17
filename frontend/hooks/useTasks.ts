"use client"

import { useQuery } from "@tanstack/react-query"
import { getTasks } from "@/lib/api"

export function useTasks(
  projectId: string | undefined,
  filters?: { status?: string; priority?: string; assignee?: string; overdue_only?: boolean }
) {
  return useQuery({
    queryKey: ["tasks", projectId, filters],
    queryFn: () => getTasks(projectId!, filters),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}
