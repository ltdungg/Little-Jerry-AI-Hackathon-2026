"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useProject } from "@/context/ProjectContext"
import { MessageSquare, FolderOpen, CheckSquare, FileText, Plug, Menu, X } from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  pendingCount?: number
}

export default function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { activeProject } = useProject()

  const projectId = activeProject?.project_id || ""

  const routes = [
    { label: "Assistant", icon: MessageSquare, href: projectId ? `/dashboard/projects/${projectId}/knowledge` : "#" },
    { label: "Projects", icon: FolderOpen, href: "/dashboard/projects" },
    { label: "My Tasks", icon: CheckSquare, href: "/dashboard/my-tasks" },
    { label: "Reports", icon: FileText, href: "/dashboard/projects" },
    { label: "Connectors", icon: Plug, href: "/dashboard/projects" },
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-gray-950 text-white rounded-md"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 text-white transform transition-transform duration-300 md:translate-x-0 md:static md:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center h-16 px-6 font-bold text-lg border-b border-gray-800">
          NPO AI Platform
        </div>
        <nav className="p-4 space-y-1">
          {routes.map((route) => {
            const isActive = pathname.startsWith(route.href) && route.href !== "#"
            return (
              <Link
                key={route.label}
                href={route.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors hover:bg-gray-800",
                  isActive ? "bg-gray-800 text-white" : "text-gray-400"
                )}
              >
                <route.icon size={20} />
                {route.label}
                {route.label === "My Tasks" && pendingCount > 0 && (
                  <span className="ml-auto bg-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}
