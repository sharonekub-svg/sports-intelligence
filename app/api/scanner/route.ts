import { NextResponse, type NextRequest } from "next/server";
import { requirePro, AuthError } from "@/lib/auth/requirePro";
import { getAdminClient } from "@/lib/supabase/admin";
import { scannerFilterSchema } from "@/lib/validation/scanner.schema";
import { buildScannerQuery } from "@/lib/api/scannerQuery";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requirePro();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const rateLimit = checkRateLimit(`scanner:${userId}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "יותר מדי בקשות, נסה שוב בעוד רגע" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = scannerFilterSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "פילטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = getAdminClient();
  const query = await buildScannerQuery(admin, parsed.data);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await serverTrack(ANALYTICS_EVENTS.SEARCH, { filters: parsed.data });

  return NextResponse.json({ results: data ?? [] });
}
