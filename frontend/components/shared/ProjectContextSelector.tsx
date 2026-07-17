"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useProject } from "@/context/ProjectContext"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ChevronDown, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ProjectContextSelector() {
  const { projects, activeProject, setActiveProject } = useProject()
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (project: typeof activeProject) => {
    if (!project) return
    setActiveProject(project)
    router.push(`/dashboard/projects/${project.project_id}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 focus:outline-none min-w-[180px] max-w-[300px]">
        <span className="truncate font-medium">{activeProject?.name || "Select project"}</span>
        <ChevronDown size={14} className="ml-auto shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]" align="center">
        {projects.length > 10 && (
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-8 h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredProjects.map((project) => (
            <DropdownMenuItem
              key={project.project_id}
              onClick={() => handleSelect(project)}
              className={cn(
                "flex justify-between items-center cursor-pointer",
                activeProject?.project_id === project.project_id && "bg-accent"
              )}
            >
              <span className="truncate">{project.name}</span>
              <Badge variant={project.status === "active" ? "default" : "secondary"} className="ml-2 shrink-0">
                {project.status}
              </Badge>
            </DropdownMenuItem>
          ))}
          {filteredProjects.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
