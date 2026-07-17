"use client"

import { useParams } from "next/navigation"
import { RiskTable } from "@/components/projects/RiskTable"

export default function RisksPage() {
  const params = useParams()
  const projectId = params.projectId as string

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risks</h1>
        <p className="text-sm text-muted-foreground">Track and manage project risks</p>
      </div>
      <RiskTable projectId={projectId} />
    </div>
  )
}
