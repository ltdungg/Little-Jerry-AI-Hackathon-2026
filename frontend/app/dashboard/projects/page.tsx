"use client"

import { useState } from "react"
import Link from "next/link"
import { useProjects } from "@/hooks/useProjects"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import ErrorState from "@/components/shared/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { FolderOpen, Search, AlertTriangle, Calendar } from "lucide-react"
import { format } from "date-fns"
import type { Project } from "@/lib/types"

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
]

function healthColor(h: string) {
  if (h === "green") return "bg-green-100 text-green-800"
  if (h === "amber") return "bg-yellow-100 text-yellow-800"
  if (h === "red") return "bg-red-100 text-red-800"
  return "bg-gray-100 text-gray-800"
}

export default function ProjectsPage() {
  const { data: projects, isLoading, error, refetch } = useProjects()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  if (isLoading) return <PageSkeleton />
  if (error) return <ErrorState message={error.message} onRetry={refetch} />
  if (!projects?.length) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-12 w-12" />}
        title="No projects"
        description="You don't have access to any projects yet."
      />
    )
  }

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-sm text-muted-foreground">{projects.length} projects accessible</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching projects"
          description="Try adjusting your filters."
          action={<Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("") }}>Clear filters</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.project_id} href={`/dashboard/projects/${project.project_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base leading-tight">{project.name}</h3>
                    <Badge variant={project.status === "active" ? "default" : "secondary"} className="shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  {project.program_name && (
                    <p className="text-xs text-muted-foreground">{project.program_name}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Manager: {project.manager?.display_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={healthColor(project.health)}>{project.health}</span>
                    {project.overdue_task_count > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle size={12} />
                        {project.overdue_task_count} overdue
                      </span>
                    )}
                    {project.high_risk_count > 0 && (
                      <span className="flex items-center gap-1 text-orange-600">
                        {project.high_risk_count} risks
                      </span>
                    )}
                  </div>
                  {project.next_milestone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
                      <Calendar size={12} />
                      <span>{project.next_milestone.name}</span>
                      <span className="ml-auto">{project.next_milestone.target_date}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
