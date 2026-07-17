"use client"

import { useState } from "react"
import { useProjects } from "@/hooks/useProjects"
import { useTasks } from "@/hooks/useTasks"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import ErrorState from "@/components/shared/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { CheckSquare, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import type { Task } from "@/lib/types"

function statusBadge(s: string) {
  const map: Record<string, string> = {
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    blocked: "bg-red-100 text-red-700",
    done: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  }
  return map[s] || "bg-gray-100"
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  }
  return map[p] || "bg-gray-100"
}

export default function MyTasksPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const [selectedProject, setSelectedProject] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const projectId = selectedProject || projects?.[0]?.project_id
  const { data: tasks, isLoading: tasksLoading, error } = useTasks(projectId, {
    status: statusFilter || undefined,
  })

  if (projectsLoading) return <PageSkeleton />

  const projectOptions = [
    { value: "", label: "All projects" },
    ...(projects?.map((p) => ({ value: p.project_id, label: p.name })) || []),
  ]

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "blocked", label: "Blocked" },
    { value: "done", label: "Done" },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <p className="text-sm text-muted-foreground">Tasks assigned to you across projects</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          options={projectOptions}
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {tasksLoading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : !tasks?.length ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="No tasks"
          description="No tasks match your current filters."
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link key={task.task_id} href={`/dashboard/projects/${task.project_id}/tasks`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{task.title}</h3>
                      {task.is_overdue && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {projects?.find((p) => p.project_id === task.project_id)?.name}
                    </p>
                  </div>
                  <Badge className={`${statusBadge(task.status)} border-0`}>{task.status.replace("_", " ")}</Badge>
                  <Badge className={`${priorityBadge(task.priority)} border-0`}>{task.priority}</Badge>
                  <span className={`text-xs shrink-0 ${task.is_overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    {task.due_date ? format(new Date(task.due_date), "MMM d") : "—"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
