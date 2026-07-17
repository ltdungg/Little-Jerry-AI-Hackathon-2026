"use client"

import { useState, useCallback, useRef } from "react"
import { sendMessage, getWorkflow } from "@/lib/api"
import type { ChatResponse } from "@/lib/types"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content?: string
  response?: ChatResponse
  timestamp: Date
}

export function useChat(projectId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)
      setError(null)

      try {
        const response = await sendMessage(text, projectId)
        const assistantMsg: ChatMessage = {
          id: `ai-${response.workflow_id}`,
          role: "assistant",
          content: response.answer,
          response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [projectId]
  )

  const pollWorkflow = useCallback(async (workflowId: string) => {
    const data = await getWorkflow(workflowId)
    return data
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, loading, error, send, pollWorkflow, clearMessages }
}
