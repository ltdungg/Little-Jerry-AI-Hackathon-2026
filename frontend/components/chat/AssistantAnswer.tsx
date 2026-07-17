"use client";

import CitationChips from "@/components/shared/CitationChips"
import { format } from "date-fns"
import type { Citation } from "@/lib/types"

interface AssistantAnswerProps {
  content?: string
  citations?: Citation[]
  warnings?: string[]
  onCitationClick?: (c: Citation) => void
}

export default function AssistantAnswer({ content, citations, warnings, onCitationClick }: AssistantAnswerProps) {
  return (
    <div className="space-y-4 p-4 text-sm leading-relaxed">
      {warnings && warnings.length > 0 && (
        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
          {warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      <div className="whitespace-pre-wrap leading-relaxed">
        {content || "No answer provided."}
      </div>

      {citations && citations.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Sources:</p>
          <CitationChips citations={citations} onOpen={onCitationClick} />
        </div>
      )}

      <div className="text-[10px] text-muted-foreground pt-2">
        Data as of {format(new Date(), "yyyy-MM-dd HH:mm")}
      </div>
    </div>
  )
}
