"use client"

import { useState } from "react"
import { useTasks } from "@/hooks/useTasks"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import EmptyState from "@/components/shared/EmptyState"
import ErrorState from "@/components/shared/ErrorState"
import { CheckSquare, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

interface TaskTableProps {
  projectId: string
}

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

export function TaskTable({ projectId }: TaskTableProps) {
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(0)
  const perPage = 10

  const { data: allTasks = [], isLoading, error, refetch } = useTasks(projectId, {
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    overdue_only: overdueOnly || undefined,
  })

  const sorted = [...allTasks].sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1
    if (!a.is_overdue && b.is_overdue) return 1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const paged = sorted.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(sorted.length / perPage)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/4" />
        <div className="flex gap-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  if (error) return <ErrorState message={error.message} onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          options={[
            { value: "", label: "All statuses" },
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "blocked", label: "Blocked" },
            { value: "done", label: "Done" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          className="w-full sm:w-44"
        />
        <Select
          options={[
            { value: "", label: "All priorities" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ]}
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(0) }}
          className="w-full sm:w-44"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => { setOverdueOnly(e.target.checked); setPage(0) }}
            className="rounded"
          />
          Overdue only
        </label>
      </div>

      {paged.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="No tasks found"
          description="No tasks match your current filters."
          action={statusFilter || priorityFilter || overdueOnly ? (
            <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setOverdueOnly(false) }} className="text-sm text-primary underline">
              Clear filters
            </button>
          ) : undefined}
        />
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((task) => (
                  <TableRow key={task.task_id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      <span className="flex items-center gap-1.5">
                        {task.is_overdue && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                        {task.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[task.status] || "bg-gray-100"}>{task.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[task.priority] || "bg-gray-100"}>{task.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{task.assignee?.display_name || "—"}</TableCell>
                    <TableCell className={`text-sm ${task.is_overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, sorted.length)} of {sorted.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
