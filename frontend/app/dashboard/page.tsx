"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProject } from "@/context/ProjectContext"
import { useProjects } from "@/hooks/useProjects"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import { FolderOpen } from "lucide-react"

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects()
  const router = useRouter()

  useEffect(() => {
    if (projects && projects.length > 0) {
      router.replace(`/dashboard/projects/${projects[0].project_id}`)
    }
  }, [projects, router])

  if (isLoading) return <PageSkeleton />

  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-12 w-12" />}
        title="No projects"
        description="You don't have access to any projects yet. Contact your administrator."
      />
    )
  }

  return <PageSkeleton />
}
