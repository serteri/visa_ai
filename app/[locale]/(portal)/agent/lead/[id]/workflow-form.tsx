"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_STATUSES } from "@/lib/crm/leads";
import { updateLeadWorkflowAction, type UpdateLeadWorkflowState } from "./actions";

export function WorkflowForm({
  locale,
  leadId,
  initialDocStatus,
  initialNotes,
}: {
  locale: string;
  leadId: string;
  initialDocStatus: string;
  initialNotes: string;
}) {
  const action = updateLeadWorkflowAction.bind(null, locale, leadId);
  const [state, formAction, isPending] = useActionState<UpdateLeadWorkflowState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="docStatus">Document / skills-assessment status</Label>
        <Select name="docStatus" defaultValue={initialDocStatus}>
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
      </div>

      <div className="space-y-1">
        <Label htmlFor="agentNotes">Internal notes</Label>
        <textarea
          id="agentNotes"
          name="agentNotes"
          defaultValue={initialNotes}
          rows={5}
          placeholder="Skills assessment status, English test score, document gaps, next follow-up..."
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Saved.</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
