"use client"

import type { Citation } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CitationChipsProps {
  citations: Citation[]
  onOpen?: (citation: Citation) => void
}

export default function CitationChips({ citations, onOpen }: CitationChipsProps) {
  if (!citations.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {citations.map((c, i) => (
        <button
          key={c.citation_id}
          onClick={() => onOpen?.(c)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            "bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer",
            "border border-blue-200"
          )}
          title={c.excerpt}
        >
          <span className="font-bold">{i + 1}</span>
          <span className="truncate max-w-[200px]">{c.document_title}</span>
        </button>
      ))}
    </div>
  )
}
