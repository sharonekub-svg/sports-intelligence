import { SignalHigh, SignalMedium, SignalLow } from "lucide-react";
import { cn } from "@/lib/utils";
import { TermTooltip } from "./term-tooltip";

function tier(score: number) {
  if (score >= 0.75) return { label: "גבוהה", icon: SignalHigh, className: "text-positive" };
  if (score >= 0.5) return { label: "בינונית", icon: SignalMedium, className: "text-warning" };
  return { label: "נמוכה", icon: SignalLow, className: "text-negative" };
}

/**
 * Confidence is always shown as label + icon + number together — never
 * color alone (section 32/33: must remain legible for color-blind users
 * and at a glance without relying on hue).
 */
export function ConfidenceIndicator({ score, className }: { score: number; className?: string }) {
  const { label, icon: Icon, className: colorClass } = tier(score);
  return (
    <TermTooltip term="confidence">
      <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
        <Icon className={cn("size-4", colorClass)} strokeWidth={1.75} />
        <span className="font-data font-medium">{Math.round(score * 100)}%</span>
        <span className="text-muted-foreground">{label}</span>
      </span>
    </TermTooltip>
  );
}
