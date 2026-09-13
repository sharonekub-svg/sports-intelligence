import { getResourceConfig, loadResourceRows } from "@/lib/admin/resources";
import ResourceTable from "./resource-table";

/**
 * Shared body for every /admin/<resource> page — keeps each route's
 * page.tsx a one-line wrapper. Access control is already handled by
 * app/admin/layout.tsx (page renders) and independently by
 * app/api/admin/[resource]/route.ts (the API calls ResourceTable makes).
 */
export default async function AdminResourcePage({ resource }: { resource: string }) {
  const config = getResourceConfig(resource);
  if (!config) return <p className="text-sm text-destructive">משאב לא מוכר: {resource}</p>;

  const rows = await loadResourceRows(resource);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
      <ResourceTable
        resource={resource}
        columns={config.columns}
        initialRows={rows}
        allowUpdate={config.allowUpdate}
        allowDelete={config.allowDelete}
      />
    </div>
  );
}
