import { describe, it, expect } from "vitest";
import { runJob, type JobRunnerClient } from "@/lib/jobs/jobRunner";

/**
 * Minimal in-memory fake satisfying JobRunnerClient — enough to verify
 * runJob's state machine (running → success/failed, system_logs on
 * failure) without touching a real Supabase project.
 */
function createFakeClient() {
  const ingestionRuns: Record<string, Record<string, unknown>> = {};
  const systemLogs: Record<string, unknown>[] = [];
  let nextId = 1;

  const client: JobRunnerClient = {
    from(table: string) {
      return {
        select(_columns: string) {
          return {
            eq(_column: string, _value: unknown) {
              return {
                async maybeSingle() {
                  return { data: table === "data_sources" ? { id: "ds-1" } : null };
                },
              };
            },
          };
        },
        insert(row: Record<string, unknown>) {
          if (table === "ingestion_runs") {
            const id = `run-${nextId++}`;
            ingestionRuns[id] = { ...row, id };
            return {
              select(_columns: string) {
                return {
                  async single() {
                    return { data: { id }, error: null };
                  },
                };
              },
            };
          }
          if (table === "system_logs") {
            systemLogs.push(row);
          }
          return {
            select() {
              return { async single() { return { data: null, error: null }; } };
            },
          };
        },
        update(row: Record<string, unknown>) {
          return {
            async eq(_column: string, value: unknown) {
              const id = String(value);
              if (ingestionRuns[id]) {
                Object.assign(ingestionRuns[id], row);
              }
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };

  return { client, ingestionRuns, systemLogs };
}

describe("runJob", () => {
  it("records a success run with the returned counts", async () => {
    const { client, ingestionRuns } = createFakeClient();

    const outcome = await runJob(
      "test-job",
      async () => ({ rowsProcessed: 10, rowsInserted: 4, rowsUpdated: 6 }),
      { client }
    );

    expect(outcome.status).toBe("success");
    const run = ingestionRuns[outcome.runId!];
    expect(run.status).toBe("success");
    expect(run.rows_processed).toBe(10);
    expect(run.rows_inserted).toBe(4);
    expect(run.rows_updated).toBe(6);
    expect(run.rows_skipped).toBe(0);
    expect(run.finished_at).toBeDefined();
  });

  it("records a failed run and writes a system_logs error entry, without throwing", async () => {
    const { client, ingestionRuns, systemLogs } = createFakeClient();

    const outcome = await runJob(
      "test-job",
      async () => {
        throw new Error("upstream exploded");
      },
      { client }
    );

    expect(outcome.status).toBe("failed");
    expect(outcome.error).toBe("upstream exploded");

    const run = ingestionRuns[outcome.runId!];
    expect(run.status).toBe("failed");
    expect(run.error_message).toBe("upstream exploded");

    expect(systemLogs).toHaveLength(1);
    expect(systemLogs[0].level).toBe("error");
    expect(systemLogs[0].source).toBe("test-job");
  });

  it("starts every run with status 'running' before the job function resolves", async () => {
    const { client, ingestionRuns } = createFakeClient();
    let statusDuringRun: unknown;

    await runJob(
      "test-job",
      async () => {
        const [id] = Object.keys(ingestionRuns);
        statusDuringRun = ingestionRuns[id].status;
        return {};
      },
      { client }
    );

    expect(statusDuringRun).toBe("running");
  });

  it("looks up data_source_id when a dataSourceKey is given", async () => {
    const { client, ingestionRuns } = createFakeClient();
    const outcome = await runJob("test-job", async () => ({}), {
      client,
      dataSourceKey: "the_odds_api",
    });
    const run = ingestionRuns[outcome.runId!];
    expect(run.data_source_id).toBe("ds-1");
  });
});
