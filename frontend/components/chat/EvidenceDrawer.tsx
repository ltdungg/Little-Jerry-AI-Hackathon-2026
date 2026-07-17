"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import type { Citation } from "@/lib/types"

interface EvidenceDrawerProps {
  citation: Citation | null
  open: boolean
  onClose: () => void
}

export function EvidenceDrawer({ citation, open, onClose }: EvidenceDrawerProps) {
  if (!citation) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Evidence Details</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{citation.document_title}</h3>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">{citation.source_system}</Badge>
              {citation.page_or_section && (
                <Badge variant="outline">{citation.page_or_section}</Badge>
              )}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-md text-sm">
            <p className="font-medium text-xs mb-1 text-muted-foreground">Excerpt</p>
            {citation.excerpt}
          </div>
          {citation.last_modified_at && (
            <div className="text-xs text-muted-foreground">
              Last modified: {citation.last_modified_at}
            </div>
          )}
          {citation.source_uri && (
            <Button className="w-full" variant="outline">
              <a
                href={citation.source_uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                View Source <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
