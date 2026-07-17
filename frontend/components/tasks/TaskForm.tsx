"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTaskMutation } from "@/hooks/useTaskMutation"
import { ActionPreviewModal } from "./ActionPreviewModal"
import { X } from "lucide-react"

interface TaskFormProps {
  projectId: string
  onClose: () => void
  initialData?: {
    task_id?: string
    title?: string
    description?: string
    priority?: string
    due_date?: string
    assignee_user_id?: string
    version?: number
  }
}

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

export default function TaskForm({ projectId, onClose, initialData }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [priority, setPriority] = useState(initialData?.priority || "medium")
  const [dueDate, setDueDate] = useState(initialData?.due_date || "")
  const [assignee, setAssignee] = useState(initialData?.assignee_user_id || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { propose, confirm, cancel, loading, error, proposal } = useTaskMutation(projectId)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = "Title is required"
    if (!dueDate) errs.due_date = "Due date is required"
    else if (isNaN(Date.parse(dueDate))) errs.due_date = "Invalid date"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await propose({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate,
      assignee_user_id: assignee || undefined,
      task_id: initialData?.task_id,
      expected_version: initialData?.version,
    })
  }

  const handleConfirm = async () => {
    if (proposal?.workflow_id) {
      await confirm(proposal.workflow_id, "auto-confirm")
      onClose()
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">
            {initialData?.task_id ? "Edit Task" : "Create Task"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  options={priorityOptions}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date *</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assignee User ID</label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="user ID (optional)"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Review changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {proposal && (
        <ActionPreviewModal
          preview={proposal.preview}
          onConfirm={handleConfirm}
          onCancel={cancel}
          loading={loading}
        />
      )}
    </>
  )
}
