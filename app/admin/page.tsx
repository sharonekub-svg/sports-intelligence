import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function loadCounts() {
  const admin = getAdminClient();
  const [{ count: matches }, { count: predictions }, { count: leagues }, { count: users }] =
    await Promise.all([
      admin.from("matches").select("id", { count: "exact", head: true }),
      admin.from("predictions").select("id", { count: "exact", head: true }),
      admin.from("leagues").select("id", { count: "exact", head: true }).eq("active", true),
      admin.from("profiles").select("id", { count: "exact", head: true }),
    ]);
  return {
    matches: matches ?? 0,
    predictions: predictions ?? 0,
    leagues: leagues ?? 0,
    users: users ?? 0,
  };
}

async function loadRecentFailedRuns() {
  const admin = getAdminClient();
  const { data } = await admin
    .from("ingestion_runs")
    .select("job_name, started_at, error_message")
    .eq("status", "failed")
    .order("started_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

export default async function AdminOverviewPage() {
  const [counts, failedRuns] = await Promise.all([loadCounts(), loadRecentFailedRuns()]);

  const tiles = [
    { label: "משחקים", value: counts.matches, href: "/admin/matches" },
    { label: "תחזיות", value: counts.predictions, href: "/admin/predictions" },
    { label: "ליגות פעילות", value: counts.leagues, href: "/admin/leagues" },
    { label: "משתמשים", value: counts.users, href: "/admin/users" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">סקירה כללית</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{tile.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{tile.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">הרצות job שנכשלו לאחרונה</CardTitle>
        </CardHeader>
        <CardContent>
          {failedRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין כשלים לאחרונה.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {failedRuns.map((run, i) => (
                <li key={i} className="flex justify-between border-b pb-2 last:border-0">
                  <span>{run.job_name}</span>
                  <span className="text-muted-foreground">{run.error_message}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/data-health" className="mt-3 inline-block text-sm underline">
            צפה בכל ה-runs
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
