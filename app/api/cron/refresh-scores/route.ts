import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/jobs/cronAuth";
import { runJob } from "@/lib/jobs/jobRunner";
import { refreshScores } from "@/lib/jobs/refreshScores";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const outcome = await runJob("refresh-scores", refreshScores, { dataSourceKey: "free_scores_provider" });
  return NextResponse.json(outcome, { status: outcome.status === "success" ? 200 : 500 });
}
