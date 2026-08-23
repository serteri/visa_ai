"use client";

import { useState, useTransition } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_STATUSES } from "@/lib/crm/leads";
import { updateLeadStatusAction } from "./actions";

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

export function WorkflowForm({
  locale,
  leadId,
  initialDocStatus,
}: {
  locale: string;
  leadId: string;
  initialDocStatus: string;
}) {
  return <StatusSelect locale={locale} leadId={leadId} initialDocStatus={initialDocStatus} />;
}
