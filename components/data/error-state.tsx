"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "לא הצלחנו לטעון את הנתונים.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-negative/10">
        <AlertCircle className="size-5 text-negative" strokeWidth={1.5} />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{title}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-1 gap-1.5">
          <RotateCcw className="size-3.5" strokeWidth={2} />
          נסה שוב
        </Button>
      )}
    </div>
  );
}
