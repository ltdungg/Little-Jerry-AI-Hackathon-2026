"use client"

import { useState, useCallback } from "react"
import { createTaskProposal, confirmWorkflow } from "@/lib/api"

interface ProposalResult {
  workflow_id: string
  status: string
  preview: Record<string, unknown>
}

export function useTaskMutation(projectId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<ProposalResult | null>(null)

  const propose = useCallback(
    async (data: {
      title: string
      description?: string
      assignee_user_id?: string
      priority?: string
      due_date?: string
      milestone_id?: string
      related_risk_ids?: string[]
      expected_version?: number
      task_id?: string
    }) => {
      setLoading(true)
      setError(null)
      try {
        const result = await createTaskProposal(projectId, data)
        setProposal(result)
        return result
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create proposal"
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [projectId]
  )

  const confirm = useCallback(
    async (workflowId: string, token: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await confirmWorkflow(workflowId, token)
        setProposal(null)
        return result
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to confirm"
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const cancel = useCallback(() => {
    setProposal(null)
    setError(null)
  }, [])

  return { propose, confirm, cancel, loading, error, proposal }
}
