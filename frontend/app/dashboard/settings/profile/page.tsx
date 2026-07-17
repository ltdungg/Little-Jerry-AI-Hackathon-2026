"use client"

import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Shield, Globe } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar fallback={user.display_name} className="h-16 w-16" />
            <div>
              <CardTitle>{user.display_name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Roles</p>
              <div className="flex gap-1.5 mt-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary">{role.replace("_", " ")}</Badge>
                ))}
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Capabilities</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {user.capabilities.map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
