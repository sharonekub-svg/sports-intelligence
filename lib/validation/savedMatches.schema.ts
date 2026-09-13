import { z } from "zod";

export const savedMatchInputSchema = z.object({
  matchId: z.string().uuid(),
});

export type SavedMatchInput = z.infer<typeof savedMatchInputSchema>;
