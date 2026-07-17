"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { configureAuth, signIn, signOut, currentUser } from "@/lib/auth"
import { getMe } from "@/lib/api"
import type { UserProfile } from "@/lib/types"

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    configureAuth()
    currentUser()
      .then(() => getMe())
      .then((profile) => setUser(profile))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await signIn(username, password)
    const profile = await getMe()
    setUser(profile)
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
