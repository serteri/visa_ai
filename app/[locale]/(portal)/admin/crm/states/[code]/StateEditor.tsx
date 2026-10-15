"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { availabilityFor, CURRENT_STATE_STATUSES, isClosedStatus } from "@/lib/admin-data/statuses";
import type { AuditRecord } from "@/lib/admin-data/audit";
import type { ConditionKind, LocalizedField, StateCondition, StateProgramData, SubclassData, TranslationEntry } from "@/lib/admin-data/types";
import type { ValidationIssue } from "@/lib/admin-data/validate";
import { draftTranslationAction, markVerifiedAction, restoreAction, saveStateAction } from "../actions";

const select = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-600";
const KINDS: ConditionKind[] = ["residence", "employment", "study", "english", "points", "fee", "process", "other"];

type Draft = StateProgramData;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** One text in English plus the two translations, each with its draft / reviewed state and the "Draft translation" button. */
function LocalizedEditor(props: {
  label: string;
  value: LocalizedField;
  onChange: (next: LocalizedField) => void;
  rows?: number;
  stateCode: string;
  fieldPath: string;
  testId: string;
}) {
  const { value, onChange } = props;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setEnglish = (en: string) => onChange({ ...value, en });
  const setEntry = (lang: "tr" | "zh-Hans", entry: TranslationEntry | undefined) => {
    const next = { ...value };
    if (entry) next[lang] = entry;
    else delete next[lang];
    onChange(next);
  };
  const draft = async (lang: "tr" | "zh-Hans") => {
    setBusy(lang);
    setError(null);
    const res = await draftTranslationAction(props.stateCode, props.fieldPath, value.en, lang);
    setBusy(null);
    if (!res.ok) setError(res.error);
    else setEntry(lang, res.entry);
  };

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3" data-testid={props.testId}>
      <p className={labelCls}>{props.label}</p>
      <Textarea value={value.en} rows={props.rows ?? 3} onChange={(e) => setEnglish(e.target.value)} aria-label={`${props.label} (English)`} />
      {(["tr", "zh-Hans"] as const).map((lang) => {
        const entry = value[lang];
        const name = lang === "tr" ? "Türkçe" : "简体中文";
        return (
          <div key={lang} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-700">{name}</span>
              {entry ? (
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${entry.reviewed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  {entry.reviewed ? `reviewed${entry.origin === "carried_over" ? " (carried over from the code)" : ""}${entry.reviewedBy ? ` by ${entry.reviewedBy}` : ""}` : "draft: not shown to customers"}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">none: customers see English</span>
              )}
              <Button type="button" size="sm" variant="outline" disabled={busy !== null || !value.en.trim()} onClick={() => void draft(lang)} data-testid={`${props.testId}-draft-${lang}`}>
                {busy === lang ? "Drafting…" : "Draft translation"}
              </Button>
            </div>
            <Textarea
              value={entry?.text ?? ""}
              rows={props.rows ?? 3}
              aria-label={`${props.label} (${name})`}
              onChange={(e) => setEntry(lang, e.target.value ? { text: e.target.value, reviewed: false, origin: "manual" } : undefined)}
            />
            {entry && entry.text.trim() && (
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={entry.reviewed} onChange={(e) => setEntry(lang, { ...entry, reviewed: e.target.checked })} data-testid={`${props.testId}-reviewed-${lang}`} />
                I have read this translation and it is correct (customers see it only when this is ticked)
              </label>
            )}
          </div>
        );
      })}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

function SubclassEditor({ value, onChange, stateCode }: { value: SubclassData; onChange: (next: SubclassData) => void; stateCode: string }) {
  const set = <K extends keyof SubclassData>(k: K, v: SubclassData[K]) => onChange({ ...value, [k]: v });
  const computeIncl = () => value.feeExclGst !== null && onChange({ ...value, gstBasis: "computed_10pct", feeInclGst: Math.round(value.feeExclGst * 110) / 100 });
  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3" data-testid={`admin-subclass-${value.subclass}`}>
      <p className="text-sm font-semibold">Subclass {value.subclass}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className={labelCls}>Availability</span>
          <select className={select} value={value.availability} onChange={(e) => set("availability", e.target.value as SubclassData["availability"])}>
            <option value="inherit">Follows the state status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="exception">Open only under the exceptions</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Allocation (places)</span>
          <Input type="number" min={0} value={value.allocation ?? ""} onChange={(e) => set("allocation", num(e.target.value))} data-testid={`admin-allocation-${value.subclass}`} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Used so far</span>
          <Input type="number" min={0} value={value.allocationUsed ?? ""} onChange={(e) => set("allocationUsed", num(e.target.value))} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Nomination fee excl. GST (AUD)</span>
          <Input type="number" min={0} step="0.01" value={value.feeExclGst ?? ""} onChange={(e) => set("feeExclGst", num(e.target.value))} data-testid={`admin-fee-excl-${value.subclass}`} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Nomination fee incl. GST (AUD)</span>
          <Input type="number" min={0} step="0.01" value={value.feeInclGst ?? ""} onChange={(e) => set("feeInclGst", num(e.target.value))} data-testid={`admin-fee-incl-${value.subclass}`} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>GST basis</span>
          <select className={select} value={value.gstBasis} onChange={(e) => set("gstBasis", e.target.value as SubclassData["gstBasis"])} data-testid={`admin-gst-basis-${value.subclass}`}>
            <option value="stated_by_state">Both figures stated by the state</option>
            <option value="computed_10pct">Incl. = excl. × 1.10 (computed)</option>
            <option value="no_gst">No GST</option>
            <option value="not_stated">Not stated</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" size="sm" variant="outline" onClick={computeIncl} disabled={value.feeExclGst === null}>
          Compute incl. GST (× 1.10)
        </Button>
        <label className="space-y-1">
          <span className={labelCls}>Fee effective from</span>
          <Input type="date" value={value.effectiveFrom ?? ""} onChange={(e) => set("effectiveFrom", e.target.value || null)} />
        </label>
      </div>
      <LocalizedEditor
        label={`Fee note, subclass ${value.subclass}`}
        value={value.feeNote ?? { en: "" }}
        rows={2}
        stateCode={stateCode}
        fieldPath={`subclasses.${value.subclass}.feeNote`}
        testId={`admin-feenote-${value.subclass}`}
        onChange={(next) => set("feeNote", next.en.trim() || next.tr || next["zh-Hans"] ? next : null)}
      />
    </div>
  );
}

function ConditionEditor(props: { value: StateCondition; stateCode: string; onChange: (next: StateCondition) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void }) {
  const { value, onChange } = props;
  const toggleSub = (s: "190" | "491") => onChange({ ...value, subclasses: value.subclasses.includes(s) ? value.subclasses.filter((x) => x !== s) : [...value.subclasses, s] });
  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3" data-testid={`admin-condition-${value.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-mono text-slate-500">{value.id}</span>
        <select className={`${select} w-40`} value={value.kind} onChange={(e) => onChange({ ...value, kind: e.target.value as ConditionKind, ...(e.target.value === "residence" ? {} : { residenceRule: undefined }) })} aria-label="Kind">
          {KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        {value.kind === "residence" && (
          <select className={`${select} w-56`} value={value.residenceRule ?? "not_stated"} onChange={(e) => onChange({ ...value, residenceRule: e.target.value as StateCondition["residenceRule"] })} aria-label="Residence rule" data-testid={`admin-residence-rule-${value.id}`}>
            <option value="required">Living in the state is required</option>
            <option value="not_required">Applicants from other states are eligible</option>
            <option value="not_stated">Not stated</option>
          </select>
        )}
        {(["190", "491"] as const).map((s) => (
          <label key={s} className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={value.subclasses.includes(s)} onChange={() => toggleSub(s)} /> {s}
          </label>
        ))}
        <span className="text-[11px] text-slate-500">(no box ticked = both subclasses)</span>
        <div className="ml-auto flex gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => props.onMove(-1)} aria-label="Move up">↑</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => props.onMove(1)} aria-label="Move down">↓</Button>
          <Button type="button" size="sm" variant="outline" onClick={props.onRemove} aria-label="Remove condition">Remove</Button>
        </div>
      </div>
      <LocalizedEditor label="Published statement" value={value.text} stateCode={props.stateCode} fieldPath={`conditions.${value.id}.text`} testId={`admin-condition-text-${value.id}`} rows={2} onChange={(text) => onChange({ ...value, text })} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={labelCls}>Verbatim quote from the source (optional)</span>
          <Input value={value.quote ?? ""} onChange={(e) => onChange({ ...value, quote: e.target.value || null })} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Source / page (optional)</span>
          <Input value={value.source ?? ""} onChange={(e) => onChange({ ...value, source: e.target.value || null })} />
        </label>
      </div>
    </div>
  );
}

function summarize(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 160 ? `${v.slice(0, 160)}…` : v;
  const text = JSON.stringify(v);
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}

export function StateEditor({ initial, history, locale }: { initial: StateProgramData; history: AuditRecord[]; locale: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => clone(initial));
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string; issues?: ValidationIssue[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const update = (fn: (d: Draft) => void) => setDraft((d) => {
    const next = clone(d);
    fn(next);
    return next;
  });
  const legacyStatus = !(CURRENT_STATE_STATUSES as readonly string[]).includes(draft.status);

  const run = (fn: () => Promise<{ ok: true; changed: string[] } | { ok: false; issues: ValidationIssue[] }>, okText: (changed: string[]) => string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMessage({ kind: "ok", text: okText(res.changed) });
        router.refresh();
      } else setMessage({ kind: "error", text: "Not saved: please fix the following.", issues: res.issues });
    });
  };

  const save = () => run(() => saveStateAction(draft, locale), (c) => (c.length === 0 ? "Nothing changed, nothing saved." : `Saved (${c.join(", ")}). Last verified was set to now; reports, the chat and the monitor read the new data within a moment.`));

  return (
    <div className="space-y-6" data-testid="admin-state-editor">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-white/95 py-3 backdrop-blur">
        <Button type="button" onClick={save} disabled={pending || !dirty} data-testid="admin-save">{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" disabled={pending || !dirty} onClick={() => { setDraft(clone(initial)); setMessage(null); }}>Discard changes</Button>
        <Button type="button" variant="outline" disabled={pending || dirty} onClick={() => run(() => markVerifiedAction(initial.stateCode, locale), () => "Marked as verified now. Nothing else changed.")} data-testid="admin-mark-verified">
          Mark verified (checked, no change)
        </Button>
        <span className="text-xs text-slate-600">
          Last verified {initial.lastVerifiedAt.slice(0, 10)}{initial.lastVerifiedBy ? ` by ${initial.lastVerifiedBy}` : ""}. It is set when you save; you do not type it.
        </span>
        {dirty && <span className="text-xs font-semibold text-amber-700">unsaved changes</span>}
      </div>

      {message && (
        <div role="status" className={`rounded-md border p-3 text-sm ${message.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`} data-testid="admin-message">
          <p>{message.text}</p>
          {message.issues && (
            <ul className="mt-1 list-disc pl-5">
              {message.issues.map((i, n) => (
                <li key={n}><code>{i.path}</code> {i.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">Status and program</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className={labelCls}>Status</span>
            <select className={select} value={draft.status} onChange={(e) => update((d) => { d.status = e.target.value; const a = availabilityFor(d.status); if (a) { d.scoring.onshoreAvailability = a.onshore; d.scoring.offshoreAvailability = a.offshore; if (isClosedStatus(d.status) && d.status !== "Not yet published") d.scoring.offshoreQuotaPressure = d.scoring.ruleQuotaPressure = "closed"; } })} data-testid="admin-status">
              {legacyStatus && <option value={draft.status}>{draft.status} (legacy: keep, or pick a current status)</option>}
              {CURRENT_STATE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Program year</span>
            <Input value={draft.programYear} onChange={(e) => update((d) => { d.programYear = e.target.value; })} placeholder="2026-27" data-testid="admin-program-year" />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Opening date</span>
            <Input type="date" value={draft.openingDate ?? ""} onChange={(e) => update((d) => { d.openingDate = e.target.value || null; })} data-testid="admin-opening-date" />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Closing date</span>
            <Input type="date" value={draft.closingDate ?? ""} onChange={(e) => update((d) => { d.closingDate = e.target.value || null; })} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className={labelCls}>Official page (https)</span>
            <Input value={draft.officialUrl ?? ""} onChange={(e) => update((d) => { d.officialUrl = e.target.value.trim() || null; })} data-testid="admin-official-url" />
          </label>
        </div>
        <label className="space-y-1">
          <span className={labelCls}>Other official pages the monitor watches (one per line, https)</span>
          <Textarea rows={3} value={draft.extraUrls.join("\n")} onChange={(e) => update((d) => { d.extraUrls = e.target.value.split("\n").map((x) => x.trim()).filter(Boolean); })} data-testid="admin-extra-urls" />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Sources the data comes from (text)</span>
          <Textarea rows={2} value={draft.sourceText} onChange={(e) => update((d) => { d.sourceText = e.target.value; })} />
        </label>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">Exceptions</h2>
        <p className="text-sm text-slate-600">Required for the status &ldquo;Closed with exceptions&rdquo;. Say exactly who the exception covers.</p>
        {draft.exceptions ? (
          <>
            <LocalizedEditor label="Exceptions text" value={draft.exceptions.text} rows={4} stateCode={draft.stateCode} fieldPath="exceptions.text" testId="admin-exceptions" onChange={(text) => update((d) => { if (d.exceptions) d.exceptions.text = text; })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className={labelCls}>Subclass</span>
                <select className={select} value={draft.exceptions.subclass ?? ""} onChange={(e) => update((d) => { if (d.exceptions) d.exceptions.subclass = (e.target.value || null) as "190" | "491" | null; })}>
                  <option value="">Any</option>
                  <option value="190">190</option>
                  <option value="491">491</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className={labelCls}>Applies to</span>
                <select className={select} value={draft.exceptions.appliesTo ?? ""} onChange={(e) => update((d) => { if (d.exceptions) d.exceptions.appliesTo = (e.target.value || null) as "onshore" | "offshore" | "all" | null; })}>
                  <option value="">Not specified</option>
                  <option value="onshore">Onshore applicants</option>
                  <option value="offshore">Offshore applicants</option>
                  <option value="all">All applicants</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className={labelCls}>Deadline</span>
                <Input type="date" value={draft.exceptions.deadline ?? ""} onChange={(e) => update((d) => { if (d.exceptions) d.exceptions.deadline = e.target.value || null; })} />
              </label>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => update((d) => { d.exceptions = null; })}>Remove the exceptions</Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => update((d) => { d.exceptions = { text: { en: "" }, subclass: null, appliesTo: null, deadline: null }; })} data-testid="admin-add-exceptions">Add exceptions</Button>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">Notes (what reports and the chat say)</h2>
        <LocalizedEditor label="State note" value={draft.notes} rows={5} stateCode={draft.stateCode} fieldPath="notes" testId="admin-notes" onChange={(notes) => update((d) => { d.notes = notes; })} />
        <LocalizedEditor label="Summary for the chat" value={draft.aiSummary} rows={8} stateCode={draft.stateCode} fieldPath="aiSummary" testId="admin-ai-summary" onChange={(aiSummary) => update((d) => { d.aiSummary = aiSummary; })} />
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">Allocation and nomination fees per subclass</h2>
        {(["190", "491"] as const).map((sub) => {
          const value = draft.subclasses.find((s) => s.subclass === sub) ?? { subclass: sub, availability: "inherit" as const, allocation: null, allocationUsed: null, feeExclGst: null, feeInclGst: null, gstBasis: "not_stated" as const, feeNote: null, effectiveFrom: null };
          return (
            <SubclassEditor
              key={sub}
              value={value}
              stateCode={draft.stateCode}
              onChange={(next) => update((d) => { d.subclasses = [...d.subclasses.filter((s) => s.subclass !== sub), next].sort((a, b) => a.subclass.localeCompare(b.subclass)); })}
            />
          );
        })}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">Published conditions (residence, employment, study, ...)</h2>
        <p className="text-sm text-slate-600">One published statement each. A condition of kind &ldquo;residence&rdquo; carries the explicit residence rule the report uses to decide whether living in another state matters.</p>
        {draft.conditions.map((c, i) => (
          <ConditionEditor
            key={c.id}
            value={c}
            stateCode={draft.stateCode}
            onChange={(next) => update((d) => { d.conditions[i] = next; })}
            onRemove={() => update((d) => { d.conditions.splice(i, 1); })}
            onMove={(dir) => update((d) => { const j = i + dir; if (j >= 0 && j < d.conditions.length) [d.conditions[i], d.conditions[j]] = [d.conditions[j], d.conditions[i]]; })}
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="admin-add-condition"
          onClick={() => update((d) => {
            const next = Math.max(0, ...d.conditions.map((c) => Number(c.id.replace(/\D/g, "")) || 0)) + 1;
            d.conditions.push({ id: `c${String(next).padStart(2, "0")}`, kind: "other", subclasses: [], stream: null, text: { en: "" }, quote: null, source: null });
          })}
        >
          Add a condition
        </Button>
      </section>

      <details className="rounded-lg border border-slate-200 p-4">
        <summary className="cursor-pointer text-lg font-semibold">Scoring inputs (advanced)</summary>
        <p className="mt-2 text-sm text-slate-600">These feed the report&apos;s state score. They were seeded from the old dataset; change them only if you know the effect.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1"><span className={labelCls}>Offshore availability</span>
            <select className={select} value={draft.scoring.offshoreAvailability} onChange={(e) => update((d) => { d.scoring.offshoreAvailability = e.target.value as Draft["scoring"]["offshoreAvailability"]; })}>
              <option value="open">open</option><option value="limited">limited</option><option value="closed">closed</option><option value="unknown">unknown</option>
            </select></label>
          <label className="space-y-1"><span className={labelCls}>Onshore availability</span>
            <select className={select} value={draft.scoring.onshoreAvailability} onChange={(e) => update((d) => { d.scoring.onshoreAvailability = e.target.value as Draft["scoring"]["onshoreAvailability"]; })}>
              <option value="open">open</option><option value="priority">priority</option><option value="closed">closed</option><option value="unknown">unknown</option>
            </select></label>
          <label className="space-y-1"><span className={labelCls}>Minimum points</span>
            <Input type="number" value={draft.scoring.minimumPoints} onChange={(e) => update((d) => { d.scoring.minimumPoints = Number(e.target.value); })} /></label>
          <label className="space-y-1"><span className={labelCls}>Minimum English</span>
            <select className={select} value={draft.scoring.minimumEnglish} onChange={(e) => update((d) => { d.scoring.minimumEnglish = e.target.value as Draft["scoring"]["minimumEnglish"]; })}>
              <option value="competent">competent</option><option value="proficient">proficient</option><option value="superior">superior</option>
            </select></label>
          <label className="space-y-1"><span className={labelCls}>Minimum experience (years)</span>
            <Input type="number" step="0.5" value={draft.scoring.minimumExperienceYears} onChange={(e) => update((d) => { d.scoring.minimumExperienceYears = Number(e.target.value); })} /></label>
          <label className="space-y-1"><span className={labelCls}>Quota pressure (score penalty)</span>
            <select className={select} value={draft.scoring.offshoreQuotaPressure} onChange={(e) => update((d) => { d.scoring.offshoreQuotaPressure = d.scoring.ruleQuotaPressure = e.target.value as Draft["scoring"]["offshoreQuotaPressure"]; })}>
              <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="closed">closed</option>
            </select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.scoring.regionalFocus} onChange={(e) => update((d) => { d.scoring.regionalFocus = e.target.checked; })} /> Regional focus</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.scoring.requiresStateResidence} onChange={(e) => update((d) => { d.scoring.requiresStateResidence = e.target.checked; })} /> Requires state residence</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.scoring.requiresRecentEmployment} onChange={(e) => update((d) => { d.scoring.requiresRecentEmployment = e.target.checked; })} /> Requires recent employment</label>
        </div>
        <label className="mt-3 block space-y-1"><span className={labelCls}>Program window (text)</span>
          <Textarea rows={2} value={draft.scoring.programWindow} onChange={(e) => update((d) => { d.scoring.programWindow = e.target.value; })} /></label>
        <div className="mt-3 space-y-2">
          <p className={labelCls}>Special conditions shown in the report</p>
          {draft.scoring.specialConditions.map((f, i) => (
            <div key={i} className="space-y-1">
              <LocalizedEditor label={`Special condition ${i + 1}`} value={f} rows={2} stateCode={draft.stateCode} fieldPath={`scoring.specialConditions.${i}`} testId={`admin-special-${i}`} onChange={(next) => update((d) => { d.scoring.specialConditions[i] = next; })} />
              <Button type="button" size="sm" variant="outline" onClick={() => update((d) => { d.scoring.specialConditions.splice(i, 1); })}>Remove</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => update((d) => { d.scoring.specialConditions.push({ en: "" }); })}>Add a special condition</Button>
        </div>
      </details>

      <section className="space-y-3 rounded-lg border border-slate-200 p-4" data-testid="admin-history">
        <h2 className="text-lg font-semibold">History</h2>
        {history.length === 0 && <p className="text-sm text-slate-600">No changes recorded yet.</p>}
        <ul className="space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className="rounded-md border border-slate-200 p-2" data-testid="admin-history-entry">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{h.at.slice(0, 16).replace("T", " ")} UTC</span>
                <span>{h.actorLabel}</span>
                <span className="rounded bg-slate-100 px-1.5 text-xs">{h.action}</span>
                <code className="text-xs">{h.fieldPath}</code>
                {(h.action === "edit" || h.action === "restore") && h.fieldPath !== "lastVerified" && h.oldValue !== null && (
                  <Button type="button" size="sm" variant="outline" disabled={pending || dirty} onClick={() => run(() => restoreAction(h.id, locale), () => "Restored the earlier value (logged as a new change).")}>
                    Restore the old value
                  </Button>
                )}
              </div>
              {h.note && <p className="mt-1 text-xs text-slate-500">{h.note}</p>}
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-slate-600">{summarize(h.oldValue).slice(0, 70)} → {summarize(h.newValue).slice(0, 70)}</summary>
                <p className="mt-1 break-words text-xs"><strong>Before:</strong> {summarize(h.oldValue)}</p>
                <p className="break-words text-xs"><strong>After:</strong> {summarize(h.newValue)}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
