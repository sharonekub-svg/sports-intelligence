import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GLOSSARY, type GlossaryKey } from "./glossary";

/** Wraps a data-term label with a one-sentence plain-language tooltip. */
export function TermTooltip({ term, children }: { term: GlossaryKey; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help border-b border-dotted border-current/40">
        {children}
      </TooltipTrigger>
      <TooltipContent>{GLOSSARY[term]}</TooltipContent>
    </Tooltip>
  );
}
