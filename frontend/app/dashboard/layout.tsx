"use client"

import { useEffect } from "react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import Sidebar from "@/components/shell/Sidebar"
import Header from "@/components/shell/Header"
import { useProjects } from "@/hooks/useProjects"
import { useProject } from "@/context/ProjectContext"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setProjects, activeProject, setActiveProject } = useProject()
  const { data: projects } = useProjects()

  useEffect(() => {
    if (projects) {
      setProjects(projects)
      if (!activeProject && projects.length > 0) {
        const lastId = localStorage?.getItem("lastProjectId")
        const found = projects.find((p) => p.project_id === lastId) || projects[0]
        setActiveProject(found)
      }
    }
  }, [projects, setProjects, activeProject, setActiveProject])

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar pendingCount={0} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
