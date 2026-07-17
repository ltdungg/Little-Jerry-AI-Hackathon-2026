"use client"

import { useState } from "react"
import { useRisks } from "@/hooks/useRisks"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import EmptyState from "@/components/shared/EmptyState"
import ErrorState from "@/components/shared/ErrorState"
import { AlertTriangle } from "lucide-react"

interface RiskTableProps {
  projectId: string
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  mitigating: "bg-yellow-100 text-yellow-800",
  accepted: "bg-gray-100 text-gray-800",
  closed: "bg-green-100 text-green-800",
}

export function RiskTable({ projectId }: RiskTableProps) {
  const [severityFilter, setSeverityFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const { data: risks = [], isLoading, error, refetch } = useRisks(projectId, {
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
  })

  const filtered = risks
    .sort((a, b) => b.score - a.score)

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-1/4" />
        <div className="flex gap-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  if (error) return <ErrorState message={error.message} onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          options={[
            { value: "", label: "All severities" },
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <Select
          options={[
            { value: "", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "mitigating", label: "Mitigating" },
            { value: "accepted", label: "Accepted" },
            { value: "closed", label: "Closed" },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12" />}
          title="No risks found"
          description="No risks match your current filters."
        />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Review Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((risk) => (
                <TableRow key={risk.risk_id}>
                  <TableCell className="font-medium max-w-[300px] truncate">{risk.title}</TableCell>
                  <TableCell>
                    <Badge className={severityColors[risk.severity] || "bg-gray-100"}>{risk.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[risk.status] || "bg-gray-100"}>{risk.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{risk.score}</TableCell>
                  <TableCell className="text-sm">{risk.owner?.display_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{risk.review_date || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
