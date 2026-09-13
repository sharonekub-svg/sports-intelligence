import { getAdminClient } from "@/lib/supabase/admin";
import { getResourceConfig, loadResourceRows } from "@/lib/admin/resources";
import ResourceTable from "@/components/admin/resource-table";
import TriggerForm from "./trigger-form";

export default async function BacktestsPage() {
  const admin = getAdminClient();
  const { data: leagues } = await admin
    .from("leagues")
    .select("id, name_he")
    .eq("active", true)
    .order("name_he");

  const config = getResourceConfig("backtests")!;
  const rows = await loadResourceRows("backtests");

  return (
    <div>
      <h1 className="text-2xl font-bold">Backtests</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        הרצת walk-forward ידנית לליגה בודדת (כדורגל בלבד כרגע). דורש לפחות 30 משחקים היסטוריים בליגה.
      </p>
      <div className="mt-4">
        <TriggerForm leagues={leagues ?? []} />
      </div>
      <ResourceTable
        resource="backtests"
        columns={config.columns}
        initialRows={rows}
        allowUpdate={false}
        allowDelete={false}
      />
    </div>
  );
}
