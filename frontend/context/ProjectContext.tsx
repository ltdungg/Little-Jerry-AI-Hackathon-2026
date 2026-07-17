"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { Project } from "@/lib/types"

interface ProjectContextType {
  projects: Project[]
  activeProject: Project | null
  setProjects: (projects: Project[]) => void
  setActiveProject: (project: Project | null) => void
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  activeProject: null,
  setProjects: () => {},
  setActiveProject: () => {},
})

export function useProject() {
  return useContext(ProjectContext)
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const handleSetProjects = useCallback((p: Project[]) => {
    setProjects(p)
  }, [])

  const handleSetActiveProject = useCallback((p: Project | null) => {
    setActiveProject(p)
    if (p) {
      try { localStorage.setItem("lastProjectId", p.project_id) } catch {}
    }
  }, [])

  return (
    <ProjectContext.Provider
      value={{ projects, activeProject, setProjects: handleSetProjects, setActiveProject: handleSetActiveProject }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
