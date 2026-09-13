import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/auth/session";
import { savedMatchInputSchema } from "@/lib/validation/savedMatches.schema";
import { serverTrack } from "@/lib/analytics/serverTrack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { checkRateLimit } from "@/lib/rateLimit";

// Uses the RLS-respecting server client (not the admin client) — this IS
// a genuinely user-owned table with real self-row RLS policies, so
// Postgres itself enforces "only your own rows" without any extra
// application-level check.

export async function POST(request: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: "התחברות נדרשת" }, { status: 401 });

  const rateLimit = checkRateLimit(`save-match:${userId}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "יותר מדי בקשות, נסה שוב בעוד רגע" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = savedMatchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from("saved_matches")
    .insert({ user_id: userId, match_id: parsed.data.matchId });

  if (error && error.code !== "23505") {
    // 23505 = unique_violation — already saved; treat as idempotent success.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await serverTrack(ANALYTICS_EVENTS.SAVE, { matchId: parsed.data.matchId });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: "התחברות נדרשת" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = savedMatchInputSchema.safeParse({ matchId: searchParams.get("matchId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט לא תקין" }, { status: 400 });
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from("saved_matches")
    .delete()
    .eq("user_id", userId)
    .eq("match_id", parsed.data.matchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
