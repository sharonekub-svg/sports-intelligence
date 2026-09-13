import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/jobs/cronAuth";
import { runJob } from "@/lib/jobs/jobRunner";
import { recomputeModelPerformance } from "@/lib/jobs/recomputeModelPerformance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const outcome = await runJob("recompute-model-performance", recomputeModelPerformance);
  return NextResponse.json(outcome, { status: outcome.status === "success" ? 200 : 500 });
}
