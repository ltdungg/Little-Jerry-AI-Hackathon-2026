"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  fallback?: string
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, fallback, ...props }, ref) => {
    const initials = fallback
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted items-center justify-center",
          className
        )}
        {...props}
      >
        <span className="text-sm font-medium text-muted-foreground">{initials}</span>
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar }
