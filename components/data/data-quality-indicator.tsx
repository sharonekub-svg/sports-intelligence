import { Database } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DataQualityBreakdownItem {
  label: string;
  value: string;
}

interface DataQualityIndicatorProps {
  score: number; // 0-100
  breakdown?: DataQualityBreakdownItem[];
  className?: string;
}

const DEFAULT_FACTORS = ["שלמות נתונים", "עומק היסטורי", "עדכניות", "גודל מדגם"];

/**
 * Data Quality reads as a real measured indicator, not a decorative badge:
 * clicking it opens the actual factors behind the score (section 33).
 */
export function DataQualityIndicator({ score, breakdown, className }: DataQualityIndicatorProps) {
  const rounded = Math.round(score);
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md text-sm text-foreground/90 outline-none hover:text-foreground",
          className
        )}
      >
        <Database className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="font-data font-medium">{rounded}/100</span>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <PopoverTitle>איכות נתונים</PopoverTitle>
        <ul className="mt-1 flex flex-col gap-1.5 text-sm">
          {(breakdown ?? DEFAULT_FACTORS.map((label) => ({ label, value: "—" }))).map((item) => (
            <li key={item.label} className="flex items-center justify-between text-muted-foreground">
              <span>{item.label}</span>
              <span className="font-data text-foreground">{item.value}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
