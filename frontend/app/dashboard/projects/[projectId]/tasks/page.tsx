"use client"

import { useParams } from "next/navigation"
import { TaskTable } from "@/components/projects/TaskTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import TaskForm from "@/components/tasks/TaskForm"

export default function TasksPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage project tasks</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} className="mr-1.5" />
          Create task
        </Button>
      </div>

      {showCreate && (
        <TaskForm projectId={projectId} onClose={() => setShowCreate(false)} />
      )}

      <TaskTable projectId={projectId} />
    </div>
  )
}
