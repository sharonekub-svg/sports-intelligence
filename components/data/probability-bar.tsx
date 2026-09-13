import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  label: string;
  value: number;
  variant?: "model" | "market";
  className?: string;
}

/** A labeled horizontal probability bar — the core visual for Model vs Market. */
export function ProbabilityBar({ label, value, variant = "model", className }: ProbabilityBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-data text-sm font-semibold">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            variant === "model" ? "bg-primary" : "bg-muted-foreground/60"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
