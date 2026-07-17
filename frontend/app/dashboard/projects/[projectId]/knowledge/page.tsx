"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { AssistantComposer } from "@/components/chat/AssistantComposer"
import AssistantAnswer from "@/components/chat/AssistantAnswer"
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer"
import { WorkflowProgress } from "@/components/chat/WorkflowProgress"
import { useChat } from "@/hooks/useChat"
import { useProject } from "@/hooks/useProjects"
import type { Citation } from "@/lib/types"
import { MessageSquare } from "lucide-react"

export default function KnowledgePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { data: project } = useProject(projectId)
  const { messages, loading, error, send } = useChat(projectId)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)

  const suggestedPrompts = [
    "What is the procurement policy for this project?",
    "Summarize the current project status",
    "What are the main risks?",
    "Show me the budget summary",
  ]

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main conversation area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="rounded-full bg-primary/10 p-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Ask about {project?.name || "your project"}</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Search through project documents, reports, and knowledge sources with AI assistance.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="text-left p-3 rounded-lg border hover:bg-accent transition-colors text-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground px-4 py-2"
                    : "bg-muted px-0 py-0"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <AssistantAnswer
                    content={msg.content || msg.response?.answer}
                    citations={msg.response?.citations}
                    warnings={msg.response?.artifacts?.length ? undefined : undefined}
                    onCitationClick={setSelectedCitation}
                  />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <WorkflowProgress status="running" phase="Searching approved sources" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm max-w-[80%]">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t p-4">
          <AssistantComposer onSubmit={send} loading={loading} />
        </div>
      </div>

      {/* Evidence Drawer */}
      <EvidenceDrawer
        citation={selectedCitation}
        open={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  )
}
