import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/jobs/cronAuth";
import { runJob } from "@/lib/jobs/jobRunner";
import { ingestMatches } from "@/lib/jobs/ingestMatches";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const outcome = await runJob("ingest-matches", ingestMatches, { dataSourceKey: "the_odds_api" });
  return NextResponse.json(outcome, { status: outcome.status === "success" ? 200 : 500 });
}
