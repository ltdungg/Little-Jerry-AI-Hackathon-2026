"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  side?: "left" | "right" | "top" | "bottom"
}

function Sheet({ open, onOpenChange, children, side = "right" }: SheetProps) {
  if (!open) return null

  const sideClasses = {
    left: "fixed inset-y-0 left-0 h-full w-3/4 max-w-sm",
    right: "fixed inset-y-0 right-0 h-full w-3/4 max-w-sm",
    top: "fixed inset-x-0 top-0 h-auto",
    bottom: "fixed inset-x-0 bottom-0 h-auto",
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange?.(false)} />
      <div className={cn("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out", sideClasses[side])}>
        {children}
      </div>
    </div>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-foreground", className)} {...props} />
}

function SheetContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative z-50 flex flex-col h-full", className)} {...props}>{children}</div>
}

export { Sheet, SheetHeader, SheetTitle, SheetContent }
