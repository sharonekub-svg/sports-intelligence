import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AuthError } from "@/lib/auth/requirePro";
import { triggerBacktestSchema } from "@/lib/validation/admin.schema";
import { runBacktestForLeague } from "@/lib/jobs/runBacktest";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
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
