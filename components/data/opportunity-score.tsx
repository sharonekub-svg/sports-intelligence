import { cn } from "@/lib/utils";
import { TermTooltip } from "./term-tooltip";

interface OpportunityScoreProps {
  value: number;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * The Opportunity Score is the product's headline number — sized and
 * weighted accordingly, but using the single brand accent rather than a
 * traffic-light rainbow (methodology.md warns against over-interpreting
 * this as a simple "good/bad" signal without also looking at Confidence
 * and Data Quality alongside it).
 */
export function OpportunityScore({ value, size = "sm", className }: OpportunityScoreProps) {
  const strong = value >= 1.5;
  return (
    <TermTooltip term="opportunityScore">
      <span
        className={cn(
          "font-data font-semibold",
          size === "lg" ? "text-3xl" : "text-base",
          strong ? "text-primary" : "text-foreground",
          className
        )}
      >
        {value.toFixed(2)}
      </span>
    </TermTooltip>
  );
}
