"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminColumn } from "@/lib/admin/resources";

interface ResourceTableProps {
  resource: string;
  columns: AdminColumn[];
  initialRows: Record<string, unknown>[];
  allowUpdate: boolean;
  allowDelete: boolean;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ResourceTable({
  resource,
  columns,
  initialRows,
  allowUpdate,
  allowDelete,
}: ResourceTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editableColumns = columns.filter((c) => c.editable);

  function setDraft(rowId: string, key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: value } }));
  }

  function coerce(column: AdminColumn, raw: string): unknown {
    if (column.type === "number") return raw === "" ? null : Number(raw);
    if (column.type === "boolean") return raw === "true";
    return raw;
  }

  async function handleSave(rowId: string) {
    const draft = drafts[rowId];
    if (!draft) return;
    setSavingId(rowId);
    setError(null);

    const fields: Record<string, unknown> = {};
    for (const column of editableColumns) {
      if (draft[column.key] !== undefined) {
        fields[column.key] = coerce(column, draft[column.key]);
      }
    }

    const response = await fetch(`/api/admin/${resource}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, fields }),
    });
    const body = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setError(body.error ?? "שמירה נכשלה");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...body.row } : r)));
    setDrafts((prev) => ({ ...prev, [rowId]: {} }));
  }

  async function handleDelete(rowId: string) {
    if (!confirm("למחוק את השורה?")) return;
    setError(null);
    const response = await fetch(`/api/admin/${resource}?id=${rowId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "מחיקה נכשלה");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין שורות.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-muted-foreground">
                {columns.map((c) => (
                  <th key={c.key} className="py-2 pe-4">
                    {c.label}
                  </th>
                ))}
                {(allowUpdate || allowDelete) && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowId = String(row.id);
                return (
                  <tr key={rowId} className="border-b last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className="py-2 pe-4">
                        {c.editable ? (
                          <Input
                            className="h-8 w-28"
                            defaultValue={formatCell(row[c.key])}
                            onChange={(e) => setDraft(rowId, c.key, e.target.value)}
                          />
                        ) : (
                          formatCell(row[c.key])
                        )}
                      </td>
                    ))}
                    {(allowUpdate || allowDelete) && (
                      <td className="flex gap-2 py-2">
                        {allowUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === rowId}
                            onClick={() => handleSave(rowId)}
                          >
                            שמור
                          </Button>
                        )}
                        {allowDelete && (
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(rowId)}>
                            מחק
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
