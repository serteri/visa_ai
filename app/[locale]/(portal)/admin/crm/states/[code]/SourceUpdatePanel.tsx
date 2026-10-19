"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { approveSourceUpdateAction, discardSourceUpdateAction, markVerifiedFromUpdateAction, proposeSourceUpdateAction, updateKnowledgeOnlyAction, type ProposeResponse } from "../actions";

type Proposed = Extract<ProposeResponse, { ok: true }>;

const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-600";
const today = () => new Date().toISOString().slice(0, 10);

/**
 * "Update from official source": paste the text of the state's official page(s) and / or upload a file, press Find changes, tick the changes that are right and
 * press Approve selected. Nothing is saved until then, and every change shown carries the sentence in the source that states it.
 */
export function SourceUpdatePanel({ stateCode, stateName, locale }: { stateCode: string; stateName: string; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[] | null>(null);
  const [result, setResult] = useState<Proposed | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [occPicked, setOccPicked] = useState<Set<string>>(new Set());
  // Chat documents ticked for removal. Only the document from the same source starts ticked; occupation lists never do.
  const [docPicked, setDocPicked] = useState<Set<string>>(new Set());
  const docKey = (d: { source: string; category: string }) => `${d.category}|${d.source}`;

  const find = (form: HTMLFormElement) => {
    setError(null);
    setDone(null);
    setResult(null);
    const data = new FormData(form);
    data.set("stateCode", stateCode);
    startTransition(async () => {
      const res = await proposeSourceUpdateAction(data);
      if (!res.ok) return setError(res.error);
      setResult(res);
      setPicked(new Set());
      setOccPicked(new Set());
      setDocPicked(new Set(res.knowledgeCandidates.filter((d) => d.preselected).map(docKey)));
    });
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const approve = () => {
    if (!result) return;
    setError(null);
    startTransition(async () => {
      const res = await approveSourceUpdateAction(result.id, [...picked], [...occPicked], [...docPicked], locale);
      if (!res.ok) return setError(res.issues.join(" "));
      const lines = [`Saved: ${res.changed.length ? res.changed.join(", ") : "no row field"}${res.occupationChanged ? `; ${res.occupationChanged} occupation-list change(s)` : ""}. Last verified is the date you entered.`];
      if (res.droppedTranslations.length) lines.push(`The English of ${res.droppedTranslations.join(", ")} changed, so its translations were removed: customers see English until you translate and review them again.`);
      lines.push(res.knowledge.ok ? `Chat knowledge: indexed ${res.knowledge.addedChunks} chunk(s) for ${stateName}, removed ${res.knowledge.removedChunks} old one(s).` : `The data is saved, but the chat knowledge was NOT updated: ${res.knowledge.error}`);
      setDone(lines);
      setResult(null);
      router.refresh();
    });
  };

  // The update stays open after these two, so fields can still be approved (or the update discarded) afterwards.
  const knowledgeOnly = () => {
    if (!result) return;
    setError(null);
    startTransition(async () => {
      const res = await updateKnowledgeOnlyAction(result.id, [...docPicked]);
      if (!res.ok) return setError(res.issues.join(" "));
      setDone([res.knowledge.ok ? `Chat knowledge: indexed ${res.knowledge.addedChunks} chunk(s) of this page for ${stateName}, removed ${res.knowledge.removedChunks} chunk(s) of the ${docPicked.size} document(s) you ticked. No row field was changed.` : `The chat knowledge was NOT updated: ${res.knowledge.error}`]);
    });
  };

  const markVerified = () => {
    if (!result) return;
    setError(null);
    startTransition(async () => {
      const res = await markVerifiedFromUpdateAction(result.id, locale);
      if (!res.ok) return setError(res.error);
      setDone(["Marked verified with the date you entered. No row field and no chat document was changed."]);
      router.refresh();
    });
  };

  const discard = () => {
    if (!result) return;
    startTransition(async () => {
      await discardSourceUpdateAction(result.id);
      setResult(null);
      setDone(["Discarded. Nothing was saved."]);
    });
  };

  const occ = result?.occupation ?? null;
  const groupIds = (kind: "add" | "remove" | "change") => (occ ? (kind === "add" ? occ.added : kind === "remove" ? occ.removed : occ.changed).map((x) => `${kind}:${x.code}`) : []);
  const setGroup = (kind: "add" | "remove" | "change", on: boolean) => {
    const next = new Set(occPicked);
    for (const id of groupIds(kind)) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setOccPicked(next);
  };
  const allIn = (kind: "add" | "remove" | "change") => groupIds(kind).length > 0 && groupIds(kind).every((id) => occPicked.has(id));

  return (
    <section className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50/40 p-4" data-testid="source-update-panel">
      <h2 className="text-lg font-semibold text-slate-900">Update from official source</h2>
      <p className="text-sm text-slate-600">
        Paste the text of {stateName}&apos;s official page(s) and / or upload a PDF, DOCX, XLSX or CSV (max 10 MB). The assistant proposes changes to this row; each one shows the sentence of the source that states it, and nothing is saved until you approve it.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          find(e.currentTarget);
        }}
        className="space-y-3"
      >
        <label className="block space-y-1">
          <span className={labelCls}>Text from the official page(s)</span>
          <Textarea name="pastedText" rows={8} placeholder="Paste the text of the page here" data-testid="source-text" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className={labelCls}>File (PDF, DOCX, XLSX, CSV)</span>
            <Input type="file" name="file" accept=".pdf,.docx,.xlsx,.csv" data-testid="source-file" />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Source URL</span>
            <Input type="url" name="sourceUrl" placeholder="https://" data-testid="source-url" />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Date you checked it</span>
            <Input type="date" name="checkedOn" defaultValue={today()} required data-testid="source-date" />
          </label>
        </div>
        <label className="block space-y-1 sm:w-1/3">
          <span className={labelCls}>Occupation list file: subclass (only if the file does not say)</span>
          <select name="occupationSubclasses" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" defaultValue="">
            <option value="">The file says</option>
            <option value="190">190</option>
            <option value="491">491</option>
            <option value="190,491">190 and 491</option>
          </select>
        </label>
        <Button type="submit" disabled={pending} data-testid="source-find">
          {pending && !result ? "Reading…" : "Find changes"}
        </Button>
      </form>

      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800" data-testid="source-error">{error}</p>}
      {done && (
        <div className="space-y-1 rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900" data-testid="source-done">
          {done.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-4" data-testid="source-review">
          {result.truncated && <p className="text-sm text-amber-800">The text was longer than 300,000 characters and was cut; only the first part was read.</p>}
          {result.proposals.length === 0 && !occ && <p className="text-sm text-slate-700">The text states no change to this row.</p>}

          {result.proposals.length > 0 && (
            <div className="space-y-2">
              <p className={labelCls}>Proposed changes ({result.proposals.length})</p>
              {result.proposals.map((p) => (
                <label key={p.id} className="block cursor-pointer rounded-md border border-slate-200 bg-white p-3" data-testid={`proposal-${p.id}`}>
                  <span className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={picked.has(p.id)} onChange={() => toggle(picked, setPicked, p.id)} />
                    <span className="min-w-0 flex-1 space-y-1 text-sm">
                      <span className="block font-semibold text-slate-900">{p.label}</span>
                      <span className="block break-words">
                        <span className="text-slate-500 line-through">{p.current ?? "(empty)"}</span> → <span className="font-medium text-emerald-800">{p.proposed}</span>
                      </span>
                      <span className="block border-l-2 border-slate-300 pl-2 text-xs italic text-slate-600">&ldquo;{p.quote}&rdquo;</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {result.rejected.length > 0 && (
            <details className="text-sm text-slate-700">
              <summary className="cursor-pointer">{result.rejected.length} proposal(s) were rejected by the server checks</summary>
              <ul className="mt-1 list-disc pl-5">
                {result.rejected.map((r, i) => (
                  <li key={i}>
                    {r.field}: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {occ && (
            <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3" data-testid="occupation-review">
              <p className={labelCls}>Occupation list ({occ.sheets.join(", ")})</p>
              <p className="text-sm">
                In the file: {occ.found["190"].length} occupations for 190 and {occ.found["491"].length} for 491 (now {occ.counts.current190} / {occ.counts.current491}). Subclass information comes from: {occ.subclassSource}.
              </p>
              {occ.warnings.map((w) => (
                <p key={w} className="text-sm text-amber-800">
                  {w}
                </p>
              ))}
              {(["add", "remove", "change"] as const).map((kind) => {
                const rows = kind === "add" ? occ.added : kind === "remove" ? occ.removed : occ.changed;
                if (rows.length === 0) return null;
                return (
                  <details key={kind}>
                    <summary className="cursor-pointer text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={allIn(kind)} onChange={(e) => setGroup(kind, e.target.checked)} data-testid={`occ-all-${kind}`} />
                        {kind === "add" ? "Added" : kind === "remove" ? "Removed" : "Changed"}: {rows.length}
                      </label>
                    </summary>
                    <ul className="mt-1 max-h-64 overflow-auto text-xs">
                      {rows.map((r) => (
                        <li key={r.code} className="flex items-center gap-2">
                          <input type="checkbox" checked={occPicked.has(`${kind}:${r.code}`)} onChange={() => toggle(occPicked, setOccPicked, `${kind}:${r.code}`)} />
                          <span className="font-mono">{r.code}</span> {r.title}
                          {"before" in r ? <span className="text-slate-500"> ({r.before} → {r.after})</span> : "s190" in r ? <span className="text-slate-500"> ({r.s190 ? "190" : ""}{r.s190 && r.s491 ? "+" : ""}{r.s491 ? "491" : ""})</span> : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-white p-3 text-sm" data-testid="knowledge-preview">
            <p className={labelCls}>Chat knowledge</p>
            <p>
              On approval (or &ldquo;Update chat knowledge for this page only&rdquo;) the text of this page is added to the chat knowledge for {stateName}. Only the documents ticked below are removed. A document is ticked for you only when it comes from the same source URL or file; nothing else, and never an occupation list, unless you tick it.
            </p>
            {result.knowledgeError ? (
              <p className="mt-1 text-amber-800">The existing chat documents of this state could not be listed ({result.knowledgeError}). Nothing will be removed.</p>
            ) : result.knowledgeCandidates.length === 0 ? (
              <p className="mt-1">No other {stateName} source document is in the index.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {result.knowledgeCandidates.map((d) => (
                  <li key={docKey(d)}>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={docPicked.has(docKey(d))}
                        onChange={() => toggle(docPicked, setDocPicked, docKey(d))}
                        data-testid={`doc-${d.sameSource ? "same" : "other"}${d.occupationList ? "-occupation-list" : ""}`}
                      />
                      <span>
                        {d.source} ({d.chunks} chunks)
                        {d.sameSource ? <span className="ml-1 font-semibold text-emerald-800">· same source</span> : <span className="ml-1 text-slate-500">· different source</span>}
                        {d.occupationList ? <span className="ml-1 font-semibold text-amber-800">· occupation list: removing it takes that list out of the chat</span> : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={approve} disabled={pending || (picked.size === 0 && occPicked.size === 0)} data-testid="source-approve">
              Approve selected ({picked.size + occPicked.size})
            </Button>
            <Button type="button" variant="outline" onClick={knowledgeOnly} disabled={pending} data-testid="source-knowledge-only">
              Update chat knowledge for this page only
            </Button>
            <Button type="button" variant="outline" onClick={markVerified} disabled={pending} data-testid="source-mark-verified">
              Mark verified
            </Button>
            <Button type="button" variant="outline" onClick={discard} disabled={pending} data-testid="source-discard">
              Discard
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
