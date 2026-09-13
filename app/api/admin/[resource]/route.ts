import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AuthError } from "@/lib/auth/requirePro";
import { getAdminClient } from "@/lib/supabase/admin";
import { getResourceConfig } from "@/lib/admin/resources";

const uuidSchema = z.string().uuid();

/**
 * Generic CRUD endpoint for every /admin/<resource> page. Gated by
 * requireAdmin() independently here — the /admin layout's guard covers
 * page renders only, not this route handler (a route handler doesn't
 * inherit a layout's guard).
 */
async function guard(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { resource } = await context.params;
  const config = getResourceConfig(resource);
  if (!config) return NextResponse.json({ error: "unknown resource" }, { status: 404 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from(config.table)
    .select("*")
    .order(config.orderBy, { ascending: config.ascending ?? true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { resource } = await context.params;
  const config = getResourceConfig(resource);
  if (!config) return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  if (!config.allowCreate || !config.createSchema) {
    return NextResponse.json({ error: "יצירה אינה מותרת למשאב זה" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = config.createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט לא תקין", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from(config.table)
    .insert(parsed.data as Record<string, unknown>)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { resource } = await context.params;
  const config = getResourceConfig(resource);
  if (!config) return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  if (!config.allowUpdate || !config.updateSchema) {
    return NextResponse.json({ error: "עדכון אינו מותר למשאב זה" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const idResult = uuidSchema.safeParse(body?.id);
  if (!idResult.success) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }
  const id = idResult.data;

  const parsed = config.updateSchema.safeParse(body?.fields ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט לא תקין", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from(config.table)
    .update(parsed.data as Record<string, unknown>)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { resource } = await context.params;
  const config = getResourceConfig(resource);
  if (!config) return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  if (!config.allowDelete) {
    return NextResponse.json({ error: "מחיקה אינה מותרת למשאב זה" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idResult = uuidSchema.safeParse(searchParams.get("id"));
  if (!idResult.success) return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  const id = idResult.data;

  const admin = getAdminClient();
  const { error } = await admin.from(config.table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
