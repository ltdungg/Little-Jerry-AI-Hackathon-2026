"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ActionPreviewModalProps {
  preview: Record<string, unknown>
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ActionPreviewModal({ preview, onConfirm, onCancel, loading }: ActionPreviewModalProps) {
  const before = (preview.before as Record<string, unknown>) || {}
  const after = (preview.after as Record<string, unknown>) || {}
  const entityType = (preview.entity_type as string) || "entity"
  const entityId = (preview.entity_id as string) || ""

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm {entityType.replace("_", " ")}</DialogTitle>
        </DialogHeader>

        {entityId && (
          <p className="text-sm text-muted-foreground">Entity: {entityId}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="font-semibold text-red-900 text-xs mb-2">Before</p>
            <pre className="text-xs whitespace-pre-wrap text-red-800">
              {Object.keys(before).length > 0 ? JSON.stringify(before, null, 2) : "—"}
            </pre>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="font-semibold text-green-900 text-xs mb-2">After</p>
            <pre className="text-xs whitespace-pre-wrap text-green-800">
              {Object.keys(after).length > 0 ? JSON.stringify(after, null, 2) : "—"}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Confirming..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
