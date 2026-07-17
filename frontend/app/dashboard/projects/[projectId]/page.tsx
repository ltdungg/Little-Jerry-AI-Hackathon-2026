"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useProject } from "@/hooks/useProjects"
import { useProject as useActiveProject } from "@/context/ProjectContext"
import { ProjectOverview } from "@/components/projects/ProjectOverview"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import ErrorState from "@/components/shared/ErrorState"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TaskTable } from "@/components/projects/TaskTable"
import { RiskTable } from "@/components/projects/RiskTable"
import { BarChart3, CheckSquare, AlertTriangle, BookOpen } from "lucide-react"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { data: project, isLoading, error, refetch } = useProject(projectId)
  const { setActiveProject } = useActiveProject()

  useEffect(() => {
    if (project) setActiveProject(project)
  }, [project, setActiveProject])

  if (isLoading) return <PageSkeleton />
  if (error) return <ErrorState message={error.message} onRetry={refetch} />
  if (!project) return <ErrorState message="Project not found" />

  return (
    <div className="p-6 space-y-6">
      <ProjectOverview project={project} />

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks"><CheckSquare size={14} className="mr-1.5" />Tasks</TabsTrigger>
          <TabsTrigger value="risks"><AlertTriangle size={14} className="mr-1.5" />Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TaskTable projectId={projectId} />
        </TabsContent>

        <TabsContent value="risks">
          <RiskTable projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
