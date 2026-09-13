import "server-only";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export type ColumnType = "text" | "number" | "boolean" | "select";

export interface AdminColumn {
  key: string;
  label: string;
  editable?: boolean;
  type?: ColumnType;
  options?: string[];
}

export interface AdminResourceConfig {
  table: string;
  label: string;
  columns: AdminColumn[];
  orderBy: string;
  ascending?: boolean;
  allowCreate: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
  createSchema?: z.ZodType;
  updateSchema?: z.ZodType;
}

const uuid = () => z.string().uuid();

export const ADMIN_RESOURCES: Record<string, AdminResourceConfig> = {
  matches: {
    table: "matches",
    label: "משחקים",
    orderBy: "scheduled_at",
    ascending: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "scheduled_at", label: "מועד" },
      { key: "status", label: "סטטוס", editable: true, type: "select", options: ["scheduled", "live", "final", "postponed", "cancelled"] },
      { key: "home_score", label: "בית", editable: true, type: "number" },
      { key: "away_score", label: "חוץ", editable: true, type: "number" },
    ],
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    updateSchema: z.object({
      status: z.enum(["scheduled", "live", "final", "postponed", "cancelled"]).optional(),
      home_score: z.number().int().min(0).nullable().optional(),
      away_score: z.number().int().min(0).nullable().optional(),
    }),
  },
  leagues: {
    table: "leagues",
    label: "ליגות",
    orderBy: "name_he",
    columns: [
      { key: "id", label: "ID" },
      { key: "name_he", label: "שם", editable: true, type: "text" },
      { key: "provider_key", label: "provider_key", editable: true, type: "text" },
      { key: "active", label: "פעיל", editable: true, type: "boolean" },
      { key: "tier", label: "Tier", editable: true, type: "number" },
    ],
    allowCreate: true,
    allowUpdate: true,
    allowDelete: false,
    createSchema: z.object({
      sport_id: uuid(),
      provider_key: z.string().min(1),
      name_he: z.string().min(1),
      name_en: z.string().min(1),
      country: z.string().optional(),
    }),
    updateSchema: z.object({
      name_he: z.string().min(1).optional(),
      provider_key: z.string().min(1).optional(),
      active: z.boolean().optional(),
      tier: z.number().int().nullable().optional(),
    }),
  },
  teams: {
    table: "teams",
    label: "קבוצות",
    orderBy: "name_he",
    columns: [
      { key: "id", label: "ID" },
      { key: "league_id", label: "league_id" },
      { key: "name_he", label: "שם (עברית)", editable: true, type: "text" },
      { key: "name_en", label: "שם (אנגלית)", editable: true, type: "text" },
    ],
    allowCreate: false,
    allowUpdate: true,
    allowDelete: true,
    updateSchema: z.object({
      name_he: z.string().min(1).optional(),
      name_en: z.string().min(1).optional(),
    }),
  },
  predictions: {
    table: "predictions",
    label: "תחזיות",
    orderBy: "generated_at",
    ascending: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "match_id", label: "match_id" },
      { key: "market", label: "שוק" },
      { key: "outcome", label: "תוצאה" },
      { key: "p_model", label: "p_model" },
      { key: "opportunity_score", label: "Opportunity" },
      { key: "is_actionable", label: "פעיל", editable: true, type: "boolean" },
    ],
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    updateSchema: z.object({ is_actionable: z.boolean().optional() }),
  },
  models: {
    table: "model_versions",
    label: "מודלים",
    orderBy: "trained_at",
    ascending: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "שם" },
      { key: "version", label: "גרסה" },
      { key: "status", label: "סטטוס", editable: true, type: "select", options: ["active", "shadow", "retired"] },
      { key: "brier_score", label: "Brier" },
      { key: "sample_size", label: "מדגם" },
    ],
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    updateSchema: z.object({ status: z.enum(["active", "shadow", "retired"]).optional() }),
  },
  backtests: {
    table: "backtests",
    label: "Backtests",
    orderBy: "run_at",
    ascending: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "window_start", label: "התחלה" },
      { key: "window_end", label: "סיום" },
      { key: "sample_size", label: "מדגם" },
      { key: "brier_score", label: "Brier" },
      { key: "is_significant", label: "מובהק" },
    ],
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false,
  },
  "data-sources": {
    table: "data_sources",
    label: "מקורות נתונים",
    orderBy: "key",
    columns: [
      { key: "id", label: "ID" },
      { key: "key", label: "מפתח" },
      { key: "kind", label: "סוג" },
      { key: "status", label: "סטטוס", editable: true, type: "select", options: ["healthy", "degraded", "down"] },
      { key: "last_checked_at", label: "נבדק לאחרונה" },
    ],
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    updateSchema: z.object({ status: z.enum(["healthy", "degraded", "down"]).optional() }),
  },
  users: {
    table: "profiles",
    label: "משתמשים",
    orderBy: "created_at",
    ascending: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "display_name", label: "שם" },
      { key: "role", label: "תפקיד", editable: true, type: "select", options: ["user", "admin"] },
      { key: "created_at", label: "נרשם" },
    ],
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false,
    updateSchema: z.object({ role: z.enum(["user", "admin"]).optional() }),
  },
  subscriptions: {
    table: "subscriptions",
    label: "מנויים",
    orderBy: "created_at",
    ascending: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "user_id", label: "user_id" },
      { key: "status", label: "סטטוס" },
      { key: "current_period_end", label: "מתחדש/מסתיים" },
      { key: "cancel_at_period_end", label: "מבוטל בסוף התקופה" },
    ],
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false,
  },
  logs: {
    table: "system_logs",
    label: "Logs",
    orderBy: "created_at",
    ascending: false,
    columns: [
      { key: "created_at", label: "זמן" },
      { key: "level", label: "רמה" },
      { key: "source", label: "מקור" },
      { key: "message", label: "הודעה" },
    ],
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false,
  },
  "data-health": {
    table: "ingestion_runs",
    label: "בריאות נתונים",
    orderBy: "started_at",
    ascending: false,
    columns: [
      { key: "job_name", label: "Job" },
      { key: "status", label: "סטטוס" },
      { key: "started_at", label: "התחיל" },
      { key: "finished_at", label: "הסתיים" },
      { key: "rows_processed", label: "עובדו" },
      { key: "error_message", label: "שגיאה" },
    ],
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false,
  },
};

export function getResourceConfig(resource: string): AdminResourceConfig | null {
  return ADMIN_RESOURCES[resource] ?? null;
}

/** Server-side initial load for an admin page — the client-side table then
 * talks to /api/admin/[resource] for any further reads/writes. */
export async function loadResourceRows(resource: string): Promise<Record<string, unknown>[]> {
  const config = getResourceConfig(resource);
  if (!config) return [];
  const admin = getAdminClient();
  const { data } = await admin
    .from(config.table)
    .select("*")
    .order(config.orderBy, { ascending: config.ascending ?? true })
    .limit(200);
  return data ?? [];
}
