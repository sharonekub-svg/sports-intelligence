import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AuthError } from "@/lib/auth/requirePro";
import { triggerBacktestSchema } from "@/lib/validation/admin.schema";
import { runBacktestForLeague } from "@/lib/jobs/runBacktest";
import { checkRateLimit } from "@/lib/rateLimit";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let adminUserId: string;
  try {
    adminUserId = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  // Compute-heavy (fits a model per walk-forward step) — tightly limited.
  const rateLimit = checkRateLimit(`backtest-trigger:${adminUserId}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "יותר מדי בקשות, נסה שוב בעוד רגע" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = triggerBacktestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const result = await runBacktestForLeague(parsed.data.leagueId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ backtestId: result.backtestId });
}
