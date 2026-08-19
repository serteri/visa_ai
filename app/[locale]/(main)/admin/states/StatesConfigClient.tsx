"use client";

import { useState, useTransition } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type StateStatus = "Open for Offshore" | "High Demand" | "Closed" | "Onshore Only" | "Not configured";

export type StateRow = {
  code: string;
  name: string;
  status: StateStatus;
  supportedVisas: string[];
  feeAud: number | null;
  customAiNote: string | null;
  updatedAt: string | null;
  isConfigured: boolean;
};

const STATUS_OPTIONS: Exclude<StateStatus, "Not configured">[] = [
  "Open for Offshore",
  "High Demand",
  "Onshore Only",
  "Closed",
];

function statusBadgeClass(status: StateStatus): string {
  if (status === "Closed") return "border-red-200 bg-red-50 text-red-700";
  if (status === "Open for Offshore") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "High Demand") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "Onshore Only") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

type RowFormState = {
  status: Exclude<StateStatus, "Not configured">;
  visa190: boolean;
  visa491: boolean;
  feeAud: string;
  customAiNote: string;
};

function toFormState(row: StateRow): RowFormState {
  return {
    status: row.status === "Not configured" ? "Open for Offshore" : row.status,
    visa190: row.supportedVisas.includes("190"),
    visa491: row.supportedVisas.includes("491"),
    feeAud: row.feeAud !== null ? String(row.feeAud) : "",
    customAiNote: row.customAiNote ?? "",
  };
}

export function StatesConfigClient({ initialRows, disabled }: { initialRows: StateRow[]; disabled?: boolean }) {
  const [rows, setRows] = useState<StateRow[]>(initialRows);
  const [forms, setForms] = useState<Record<string, RowFormState>>(() =>
    Object.fromEntries(initialRows.map((row) => [row.code, toFormState(row)]))
  );
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { type: "success" | "error"; text: string }>>({});
  const [isPending, startTransition] = useTransition();

  function updateForm(code: string, patch: Partial<RowFormState>) {
    setForms((prev) => ({ ...prev, [code]: { ...prev[code], ...patch } }));
  }

  function handleSave(code: string) {
    const form = forms[code];
    if (!form) return;

    setMessages((prev) => ({ ...prev, [code]: undefined as unknown as never }));
    setSavingCode(code);

    startTransition(async () => {
      try {
        const supportedVisas = [form.visa190 ? "190" : null, form.visa491 ? "491" : null].filter(
          (v): v is string => Boolean(v)
        );

        const res = await fetch("/api/admin/states", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stateCode: code,
            status: form.status,
            supportedVisas,
            feeAud: form.feeAud.trim() === "" ? null : Number(form.feeAud),
            customAiNote: form.customAiNote.trim() || null,
          }),
        });

        const data = (await res.json()) as { ok: boolean; error?: string };

        if (!res.ok || !data.ok) {
          setMessages((prev) => ({ ...prev, [code]: { type: "error", text: data.error ?? "Save failed" } }));
          return;
        }

        setRows((prev) =>
          prev.map((row) =>
            row.code === code
              ? {
                  ...row,
                  status: form.status,
                  supportedVisas,
                  feeAud: form.feeAud.trim() === "" ? null : Number(form.feeAud),
                  customAiNote: form.customAiNote.trim() || null,
                  isConfigured: true,
                  updatedAt: new Date().toISOString(),
                }
              : row
          )
        );
        setMessages((prev) => ({ ...prev, [code]: { type: "success", text: "Saved." } }));
      } catch (err) {
        setMessages((prev) => ({
          ...prev,
          [code]: { type: "error", text: err instanceof Error ? err.message : "Save failed" },
        }));
      } finally {
        setSavingCode(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>State nomination status ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-3 font-semibold">State</th>
                <th className="px-3 py-3 font-semibold">Current status</th>
                <th className="px-3 py-3 font-semibold">Set status</th>
                <th className="px-3 py-3 font-semibold">Visas</th>
                <th className="px-3 py-3 font-semibold">Fee (AUD)</th>
                <th className="px-3 py-3 font-semibold">AI note</th>
                <th className="px-3 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const form = forms[row.code];
                const message = messages[row.code];
                const saving = savingCode === row.code;
                return (
                  <tr key={row.code} className="border-b border-border/50 align-top hover:bg-muted/30">
                    <td className="px-3 py-3 font-medium">
                      {row.code}
                      <div className="text-xs font-normal text-muted-foreground">{row.name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={statusBadgeClass(row.status)} variant="outline">
                        {row.status}
                      </Badge>
                      {row.updatedAt && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(row.updatedAt).toLocaleString("en-AU")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={form.status}
                        disabled={disabled}
                        onChange={(e) =>
                          updateForm(row.code, { status: e.target.value as RowFormState["status"] })
                        }
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={form.visa190}
                          disabled={disabled}
                          onChange={(e) => updateForm(row.code, { visa190: e.target.checked })}
                        />
                        190
                      </label>
                      <label className="mt-1 flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={form.visa491}
                          disabled={disabled}
                          onChange={(e) => updateForm(row.code, { visa491: e.target.checked })}
                        />
                        491
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.feeAud}
                        disabled={disabled}
                        onChange={(e) => updateForm(row.code, { feeAud: e.target.value })}
                        placeholder="e.g. 357.50"
                        className="w-28"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <textarea
                        value={form.customAiNote}
                        disabled={disabled}
                        onChange={(e) => updateForm(row.code, { customAiNote: e.target.value })}
                        placeholder="Shown in the PDF note column and quoted by the AI Assistant"
                        rows={2}
                        className="w-56 rounded-md border border-input bg-background px-2 py-1.5 text-xs disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleSave(row.code)}
                        disabled={disabled || saving || isPending}
                        className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save
                      </button>
                      {message && (
                        <div
                          className={`mt-1.5 flex items-center justify-end gap-1 text-xs ${
                            message.type === "success" ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {message.type === "success" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {message.text}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
