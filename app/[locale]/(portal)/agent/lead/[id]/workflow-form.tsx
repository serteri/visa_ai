"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_STATUSES, type NoteEntry } from "@/lib/crm/leads";
import { addLeadNoteAction, updateLeadStatusAction, type ActionState } from "./actions";

function StatusSelect({
  locale,
  leadId,
  initialDocStatus,
}: {
  locale: string;
  leadId: string;
  initialDocStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(status: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateLeadStatusAction(locale, leadId, status);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="docStatus">Document / skills-assessment status</Label>
      <Select
        name="docStatus"
        defaultValue={initialDocStatus}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger id="docStatus" className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DOC_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function formatNoteTimestamp(iso: string, locale: string): string {
  if (!iso) return "Earlier";
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}

function NotesLog({
  locale,
  leadId,
  initialNotes,
}: {
  locale: string;
  leadId: string;
  initialNotes: NoteEntry[];
}) {
  const action = addLeadNoteAction.bind(null, locale, leadId);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {});

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="note">Add a note</Label>
        <form action={formAction} className="mt-1 space-y-2">
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="Skills assessment status, English test score, document gaps, next follow-up..."
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
          />
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : "Save note"}
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        <Label>Activity</Label>
        {initialNotes.length === 0 ? (
          <p className="text-sm text-slate-400">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {initialNotes.map((entry, i) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {formatNoteTimestamp(entry.at, locale)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">{entry.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function WorkflowForm({
  locale,
  leadId,
  initialDocStatus,
  initialNotes,
}: {
  locale: string;
  leadId: string;
  initialDocStatus: string;
  initialNotes: NoteEntry[];
}) {
  return (
    <div className="space-y-6">
      <StatusSelect locale={locale} leadId={leadId} initialDocStatus={initialDocStatus} />
      <NotesLog locale={locale} leadId={leadId} initialNotes={initialNotes} />
    </div>
  );
}
