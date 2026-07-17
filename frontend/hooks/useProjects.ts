"use client"

import { useQuery } from "@tanstack/react-query"
import { getProjects, getProject } from "@/lib/api"

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}
