"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Target, AlertTriangle } from "lucide-react"
import { useTasks } from "@/hooks/useTasks"
import { useRisks } from "@/hooks/useRisks"
import { useProject } from "@/context/ProjectContext"

interface KpiCardsProps {
  projectId: string
}

export function KpiCards({ projectId }: KpiCardsProps) {
  const { data: tasks = [] } = useTasks(projectId)
  const { data: risks = [] } = useRisks(projectId)
  const { activeProject } = useProject()

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "done").length
  const overdueTasks = tasks.filter((t) => t.is_overdue).length
  const openRisks = risks.filter((r) => r.status !== "closed").length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6 flex items-center space-x-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tasks</p>
            <h3 className="text-2xl font-bold">{completedTasks}/{totalTasks}</h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center space-x-4">
          <AlertTriangle className={`h-8 w-8 ${overdueTasks > 0 ? "text-red-500" : "text-yellow-500"}`} />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
            <h3 className={`text-2xl font-bold ${overdueTasks > 0 ? "text-red-600" : ""}`}>{overdueTasks}</h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center space-x-4">
          <AlertCircle className="h-8 w-8 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Open Risks</p>
            <h3 className="text-2xl font-bold">{openRisks}</h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center space-x-4">
          <Target className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Next Milestone</p>
            <h3 className="text-lg font-semibold truncate">
              {activeProject?.next_milestone?.name || "None"}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
