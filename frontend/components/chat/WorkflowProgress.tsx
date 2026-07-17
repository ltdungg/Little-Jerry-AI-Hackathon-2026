"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PHASES = ["Understanding", "Searching", "Verifying", "Complete"];

interface WorkflowProgressProps {
  status: string;
  phase?: string;
  progress?: { completed: number; total: number };
}

export function WorkflowProgress({ status, phase, progress }: WorkflowProgressProps) {
  const currentPhaseIndex = phase ? PHASES.indexOf(phase) : 0;

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="text-sm font-medium">{status}</div>
      <div className="flex justify-between items-center text-xs">
        {PHASES.map((p, i) => (
          <div key={p} className={cn("flex flex-col items-center gap-1", i <= currentPhaseIndex ? "text-primary" : "text-muted-foreground")}>
            {i < currentPhaseIndex ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : i === currentPhaseIndex ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-current" />
            )}
            <span>{p}</span>
          </div>
        ))}
      </div>
      {progress && (
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
