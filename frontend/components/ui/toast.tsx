"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

interface ToastContextType {
  toast: (props: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType>({
  toast: () => {},
  dismiss: () => {},
})

export function useToast() {
  return React.useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((props: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...props, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border p-4 shadow-lg bg-background animate-in slide-in-from-bottom-5",
              t.variant === "destructive" && "border-destructive/50 text-destructive",
              t.variant === "success" && "border-green-500/50 text-green-700"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {t.title && <div className="font-semibold text-sm">{t.title}</div>}
                {t.description && <div className="text-sm mt-1 opacity-90">{t.description}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
