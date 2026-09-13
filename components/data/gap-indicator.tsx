import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A probability gap (model − market), in probability units (e.g. 0.14 = +14pp).
 * Direction is conveyed by icon + sign + color together — never color alone
 * (section 32: accessible to color-blind users).
 */
export function GapIndicator({ value, className }: { value: number; className?: string }) {
  const pp = value * 100;
  const isFlat = Math.abs(pp) < 0.05;
  const isPositive = pp > 0;
  const Icon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-data text-sm font-semibold",
        isFlat ? "text-muted-foreground" : isPositive ? "text-positive" : "text-negative",
        className
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.25} />
      {isPositive && !isFlat ? "+" : ""}
      {pp.toFixed(1)}pp
    </span>
  );
}
