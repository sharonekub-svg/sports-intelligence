import { redirect } from "next/navigation";
import Link from "next/link";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { getServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import UnsaveButton from "./unsave-button";

const FREE_LIMIT = 3;

interface SavedMatchRow {
  match_id: string;
  saved_at: string;
  matches: { scheduled_at: string; status: string; leagues: { name_he: string } | null } | null;
}

export default async function SavedMatchesPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  const pro = await isPro(user.id);

  // RLS-scoped client is correct here: saved_matches has a genuine
  // self-row policy, so "only your own rows" is enforced by Postgres
  // itself, not by an application-level filter.
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("saved_matches")
    .select("match_id, saved_at, matches(scheduled_at, status, leagues(name_he))")
    .order("saved_at", { ascending: false })
    .returns<SavedMatchRow[]>();

  const rows = data ?? [];
  const visibleRows = pro ? rows : rows.slice(0, FREE_LIMIT);

  return (
    <div>
      <h1 className="text-2xl font-bold">משחקים שמורים</h1>

      {!pro && rows.length > FREE_LIMIT && (
        <p className="mt-2 text-sm text-muted-foreground">
          מוצגים {FREE_LIMIT} מתוך {rows.length} —{" "}
          <Link href="/account/billing" className="underline">
            שדרג ל-Pro
          </Link>{" "}
          לצפייה בכולם.
        </p>
      )}

      {visibleRows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">עדיין לא שמרת משחקים.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visibleRows.map((row) => (
            <Card key={row.match_id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <Link href={`/match/${row.match_id}`} className="font-medium underline">
                    {row.matches?.leagues?.name_he ?? "משחק"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {row.matches ? new Date(row.matches.scheduled_at).toLocaleString("he-IL") : "—"}
                  </p>
                </div>
                <UnsaveButton matchId={row.match_id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
