"use client";

import { useState, useTransition } from "react";
import { CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// "High Demand" was an occupation-dependent, vague signal that doesn't
// belong in a program-level status -- kept here only so a legacy row
// fetched before this revision (or a state-rules-config.ts/JSON fallback
// value, see lib/readiness/state-nomination.ts's asKnownStatus) still
// renders instead of falling through to "Not configured". The dropdown
// below (STATUS_OPTIONS) never offers it -- new saves always use one of
// the four current values.
export type StateStatus =
  | "Open for Offshore"
  | "High Demand"
  | "Closed"
  | "Onshore Only"
  | "Open (Onshore & Offshore)"
  | "Open (Onshore Only)"
  | "Open (Offshore Only)"
  | "Suspended / Closed"
  | "Not configured";

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

const STATUS_OPTIONS: Exclude<
  StateStatus,
  "Not configured" | "Open for Offshore" | "High Demand" | "Closed" | "Onshore Only"
>[] = ["Open (Onshore & Offshore)", "Open (Onshore Only)", "Open (Offshore Only)", "Suspended / Closed"];

/** Official state/territory skilled-migration program pages -- linked next
 *  to each state's name via the ExternalLink icon so an admin can verify
 *  the live program status before setting it here. */
const STATE_OFFICIAL_URL: Record<string, string> = {
  NSW: "https://www.nsw.gov.au/migrating-to-nsw/skilled-visa-nomination",
  VIC: "https://www.liveinmelbourne.vic.gov.au/migrate/skilled-and-business-visas",
  WA: "https://migration.wa.gov.au/",
  SA: "https://migration.sa.gov.au/",
  QLD: "https://migration.qld.gov.au/",
  NT: "https://theterritory.com.au/migrate",
  TAS: "https://www.migration.tas.gov.au/",
  ACT: "https://www.canberramigration.com.au/",
};

function statusBadgeClass(status: StateStatus): string {
  if (status === "Closed" || status === "Suspended / Closed") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "Open for Offshore" || status === "Open (Offshore Only)")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "Open (Onshore & Offshore)") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "High Demand") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (status === "Onshore Only" || status === "Open (Onshore Only)")
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-slate-600 bg-slate-800 text-slate-300";
}

type RowFormState = {
  status: (typeof STATUS_OPTIONS)[number];
  visa190: boolean;
  visa491: boolean;
  feeAud: string;
  customAiNote: string;
};

function toFormState(row: StateRow): RowFormState {
  const legacyToCurrent: Partial<Record<StateStatus, (typeof STATUS_OPTIONS)[number]>> = {
    "Open for Offshore": "Open (Offshore Only)",
    "High Demand": "Open (Onshore & Offshore)",
    "Onshore Only": "Open (Onshore Only)",
    Closed: "Suspended / Closed",
  };

  return {
    status:
      (STATUS_OPTIONS as StateStatus[]).includes(row.status)
        ? (row.status as (typeof STATUS_OPTIONS)[number])
        : (legacyToCurrent[row.status] ?? "Open (Onshore & Offshore)"),
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
                const officialUrl = STATE_OFFICIAL_URL[row.code];
                return (
                  <tr key={row.code} className="border-b border-border/50 align-top hover:bg-muted/30">
                    <td className="px-3 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{row.code}</span>
                        {officialUrl && (
                          <a
                            href={officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${row.name} official Skilled Migration page`}
                            className="text-slate-400 transition-colors hover:text-indigo-400"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs font-normal text-slate-300">{row.name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={statusBadgeClass(row.status)} variant="outline">
                        {row.status}
                      </Badge>
                      {row.updatedAt && (
                        <div className="mt-1 text-xs text-slate-400">
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
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-slate-900 text-white">
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
                            message.type === "success" ? "text-emerald-400" : "text-red-400"
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
