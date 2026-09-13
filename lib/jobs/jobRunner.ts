import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

export interface JobResult {
  rowsProcessed?: number;
  rowsInserted?: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
}

export interface JobRunOutcome {
  status: "success" | "failed";
  runId: string | null;
  result?: JobResult;
  error?: string;
}

// Structurally-typed subset of the Supabase client this module needs —
// lets tests pass a lightweight fake without pulling in a real Supabase
// client or hitting a live project.
export interface JobRunnerClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): { maybeSingle(): Promise<{ data: unknown }> };
    };
    insert(row: Record<string, unknown>): {
      select(columns: string): { single(): Promise<{ data: unknown; error: { message: string } | null }> };
    };
    update(row: Record<string, unknown>): { eq(column: string, value: unknown): Promise<unknown> };
  };
}

/**
 * Shared wrapper for every cron job: opens an `ingestion_runs` row,
 * executes `fn`, and closes it with success/failure — writing a
 * `system_logs` error entry on failure too. Every route handler under
 * app/api/cron/* is a thin wrapper that just calls this; the job logic
 * itself (lib/jobs/*.ts, this function included) has no Next.js
 * dependency, so it's testable without spinning up a server.
 */
export async function runJob(
  jobName: string,
  fn: () => Promise<JobResult>,
  options: { dataSourceKey?: string; client?: JobRunnerClient } = {}
): Promise<JobRunOutcome> {
  const admin = options.client ?? (getAdminClient() as unknown as JobRunnerClient);

  let dataSourceId: string | null = null;
  if (options.dataSourceKey) {
    const { data } = await admin
      .from("data_sources")
      .select("id")
      .eq("key", options.dataSourceKey)
      .maybeSingle();
    dataSourceId = (data as { id: string } | null)?.id ?? null;
  }

  const { data: run, error: insertError } = await admin
    .from("ingestion_runs")
    .insert({ job_name: jobName, data_source_id: dataSourceId, status: "running" })
    .select("id")
    .single();

  if (insertError || !run) {
    throw new Error(
      `failed to start ingestion_runs row for "${jobName}": ${insertError?.message ?? "unknown error"}`
    );
  }

  const runId = (run as { id: string }).id;

  try {
    const result = await fn();
    await admin
      .from("ingestion_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_processed: result.rowsProcessed ?? 0,
        rows_inserted: result.rowsInserted ?? 0,
        rows_updated: result.rowsUpdated ?? 0,
        rows_skipped: result.rowsSkipped ?? 0,
      })
      .eq("id", runId);
    return { status: "success", runId, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? null) : null;

    await admin
      .from("ingestion_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: message,
        error_stack: stack,
      })
      .eq("id", runId);

    await admin
      .from("system_logs")
      .insert({ level: "error", source: jobName, message, context: { stack } });

    return { status: "failed", runId, error: message };
  }
}
