import { z } from "zod";

export const scannerFilterSchema = z.object({
  sportKey: z.enum(["football", "basketball"]).optional(),
  leagueId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  minOpportunityScore: z.coerce.number().optional(),
  minDataQuality: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.coerce.number().int().min(0).default(0),
});

export type ScannerFilters = z.infer<typeof scannerFilterSchema>;
