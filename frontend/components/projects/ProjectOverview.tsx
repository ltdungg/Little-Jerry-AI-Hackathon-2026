"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { KpiCards } from "./KpiCards"
import { Calendar, User, MessageSquare } from "lucide-react"
import type { Project } from "@/lib/types"

function healthColor(h: string) {
  if (h === "green") return "bg-green-100 text-green-800"
  if (h === "amber") return "bg-yellow-100 text-yellow-800"
  if (h === "red") return "bg-red-100 text-red-800"
  return "bg-gray-100 text-gray-800"
}

interface ProjectOverviewProps {
  project: Project
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.program_name && (
            <p className="text-sm text-muted-foreground">{project.program_name}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status}
            </Badge>
            <Badge className={healthColor(project.health)}>
              {project.health}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User size={14} />
              {project.manager?.display_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {format(new Date(project.start_date), "MMM d, yyyy")} – {format(new Date(project.end_date), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <Link href={`/dashboard/projects/${project.project_id}/knowledge`}>
          <Button>
            <MessageSquare size={16} className="mr-1.5" />
            Ask about this project
          </Button>
        </Link>
      </div>

      <KpiCards projectId={project.project_id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {project.next_milestone ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-sm">{project.next_milestone.name}</p>
                  <p className="text-xs text-muted-foreground">Target: {project.next_milestone.target_date}</p>
                </div>
                <Badge variant="outline">{project.health}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming milestones</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {project.overdue_task_count > 0 ? (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">
                  {project.overdue_task_count} task{project.overdue_task_count > 1 ? "s" : ""} overdue
                </p>
                <Link href={`/dashboard/projects/${project.project_id}/tasks`}>
                  <Button variant="outline" size="sm">View all</Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No overdue tasks</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Risk Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {project.high_risk_count > 0 ? (
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-700">
                {project.high_risk_count} high-severity risk{project.high_risk_count > 1 ? "s" : ""}
              </p>
              <Link href={`/dashboard/projects/${project.project_id}/risks`}>
                <Button variant="outline" size="sm">View all</Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No high-severity risks</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
