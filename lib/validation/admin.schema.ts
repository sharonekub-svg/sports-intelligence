import { z } from "zod";

export const triggerBacktestSchema = z.object({
  leagueId: z.string().uuid(),
});
