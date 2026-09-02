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
  officialWebsite: string | null;
  updatedAt: string | null;
  isConfigured: boolean;
};

const STATUS_OPTIONS: Exclude<
  StateStatus,
  "Not configured" | "Open for Offshore" | "High Demand" | "Closed" | "Onshore Only"
>[] = ["Open (Onshore & Offshore)", "Open (Onshore Only)", "Open (Offshore Only)", "Suspended / Closed"];

/** Default official state/territory skilled-migration program pages. Prefilled
 *  directly into the "Official URL" input's value (not just shown as a
 *  placeholder) whenever a state has no `officialWebsite` saved yet, so the
 *  admin sees the form already populated and can just hit Save -- or edit
 *  it first if the default is stale. */
const DEFAULT_STATE_URLS: Record<string, string> = {
  NSW: "https://www.nsw.gov.au/visas-and-migration",
  VIC: "https://liveinmelbourne.vic.gov.au/",
  WA: "https://migration.wa.gov.au/",
  SA: "https://www.migration.sa.gov.au/",
  QLD: "https://migration.qld.gov.au/",
  TAS: "https://www.migration.tas.gov.au/",
  ACT: "https://www.act.gov.au/migration",
  NT: "https://theterritory.com.au/migrate",
};

function statusBadgeClass(status: StateStatus): string {
  if (status === "Closed" || status === "Suspended / Closed") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "Open for Offshore" || status === "Open (Offshore Only)")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "Open (Onshore & Offshore)") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "High Demand") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (status === "Onshore Only" || status === "Open (Onshore Only)")
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-slate-300 bg-slate-100 text-slate-600";
}

type RowFormState = {
  status: (typeof STATUS_OPTIONS)[number];
  visa190: boolean;
  visa491: boolean;
  feeAud: string;
  customAiNote: string;
  officialWebsite: string;
};

function toFormState(row: StateRow, defaultUrl?: string): RowFormState {
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
    officialWebsite: row.officialWebsite ?? defaultUrl ?? "",
  };
}

export function StatesConfigClient({ initialRows, disabled }: { initialRows: StateRow[]; disabled?: boolean }) {
  const [rows, setRows] = useState<StateRow[]>(initialRows);
  const [forms, setForms] = useState<Record<string, RowFormState>>(() =>
    Object.fromEntries(initialRows.map((row) => [row.code, toFormState(row, DEFAULT_STATE_URLS[row.code])]))
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
            officialWebsite: form.officialWebsite.trim() || null,
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
                  officialWebsite: form.officialWebsite.trim() || null,
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
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">Current status</th>
                <th className="px-4 py-3 font-semibold">Set status</th>
                <th className="px-4 py-3 font-semibold">Visas</th>
                <th className="px-4 py-3 font-semibold">Fee (AUD)</th>
                <th className="px-4 py-3 font-semibold">Official URL</th>
                <th className="px-4 py-3 font-semibold">AI note</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const form = forms[row.code];
                const message = messages[row.code];
                const saving = savingCode === row.code;
                const officialUrl = form.officialWebsite.trim() || null;
                return (
                  <tr key={row.code} className="border-b border-border/50 align-top hover:bg-muted/30">
                    <td className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{row.code}</span>
                        <a
                          href={officialUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={officialUrl ? `${row.name} official Skilled Migration page` : "No official URL set"}
                          aria-disabled={!officialUrl}
                          className={
                            officialUrl
                              ? "text-slate-600 transition-colors hover:text-[#53917E]"
                              : "pointer-events-none text-slate-300 opacity-50"
                          }
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="text-xs font-normal text-slate-600">{row.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={statusBadgeClass(row.status)} variant="outline">
                        {row.status}
                      </Badge>
                      {row.updatedAt && (
                        <div className="mt-1 text-xs text-slate-600">
                          {new Date(row.updatedAt).toLocaleString("en-AU")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={form.status}
                        disabled={disabled}
                        onChange={(e) =>
                          updateForm(row.code, { status: e.target.value as RowFormState["status"] })
                        }
                        className="w-full min-w-[190px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-white text-slate-900">
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.feeAud}
                        disabled={disabled}
                        onChange={(e) => updateForm(row.code, { feeAud: e.target.value })}
                        placeholder="e.g. 357.50"
                        className="w-32"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Input
                        type="url"
                        value={form.officialWebsite}
                        disabled={disabled}
                        onChange={(e) => updateForm(row.code, { officialWebsite: e.target.value })}
                        placeholder="e.g. https://liveinmelbourne.vic.gov.au"
                        className="w-56"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <textarea
                        value={form.customAiNote}
                        disabled={disabled}
                        onChange={(e) => updateForm(row.code, { customAiNote: e.target.value })}
                        placeholder="Shown in the PDF note column and quoted by the AI Assistant"
                        rows={2}
                        className="w-56 rounded-md border border-input bg-background px-2 py-1.5 text-xs disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
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
