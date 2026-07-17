"use client"

import { useAuth } from "@/context/AuthContext"
import ProjectContextSelector from "@/components/shared/ProjectContextSelector"
import { Avatar } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function Header() {
  const { user, logout } = useAuth()

  const initials = user?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 bg-white border-b border-gray-200">
      <div className="md:hidden font-bold text-sm text-gray-900">NPO AI</div>

      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <ProjectContextSelector />
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Avatar fallback={user?.display_name || "U"} className="h-8 w-8" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.display_name}</p>
              <p className="text-xs text-muted-foreground">{user?.roles?.join(", ")}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
