"use client";

import { useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { assignLeadToAgent } from "../actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";

type Agent = {
  id: string;
  name: string | null;
  email: string;
};

type Lead = {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  pointsTier: string | null;
  createdAt: Date;
  source: string;
  locale: string;
  inputJson: unknown;
  reportJson: unknown;
};

// Plain shadcn Select instead of a Command+Popover combobox: with a handful
// of agents there's no real need for in-list search, and the combobox's
// portal/positioning was overlapping adjacent table rows (z-index + stacking
// context issue inside the table's overflow-x-auto wrapper). Select already
// portals to document.body with a high z-index (see components/ui/select.tsx)
// and is used the same way elsewhere in this app without that problem.
function AgentSelect({ lead, agents, locale }: { lead: Lead; agents: Agent[]; locale: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    const agentLabel = agent?.name ?? agent?.email ?? "agent";

    startTransition(async () => {
      try {
        await assignLeadToAgent(lead.id, agentId, locale);
        toast.success(`✅ Lead successfully assigned to ${agentLabel}`);
      } catch {
        toast.error(`❌ Failed to assign lead to ${agentLabel}`);
      }
    });
  }

  if (agents.length === 0) {
    return (
      <p className="w-[200px] rounded-lg border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400">
        No agents available
      </p>
    );
  }

  return (
    <Select onValueChange={handleSelect} disabled={isPending}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={isPending ? "Assigning..." : "Select an agent..."} />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name ?? agent.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One label/value pair in the detail grid -- rows with no value are skipped
 *  entirely so the panel doesn't fill up with "—" for fields the lead never
 *  answered (e.g. partner-track submissions skip occupation/English). */
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-white">{value}</dd>
    </div>
  );
}

function yesNo(value: boolean | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value ? "Yes" : "No";
}

function LeadDetailSheet({
  lead,
  agents,
  locale,
  open,
  onOpenChange,
}: {
  lead: Lead;
  agents: Agent[];
  locale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const input = (lead.inputJson ?? {}) as Partial<ReadinessInput>;
  const report = (lead.reportJson ?? {}) as Partial<ReadinessReport>;
  const estimatedPoints = report.assessmentState?.estimatedPoints;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{lead.fullName || "Unnamed lead"}</SheetTitle>
          <SheetDescription>{lead.email}</SheetDescription>
        </SheetHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <DetailField label="Points score" value={typeof estimatedPoints === "number" ? estimatedPoints : undefined} />
          <DetailField label="Points tier" value={lead.pointsTier} />
          <DetailField label="Visa interest" value={input.preferredPathway} />
          <DetailField label="Main goal" value={input.mainGoal} />
          <DetailField label="Age" value={input.age} />
          <DetailField label="Occupation" value={input.occupation} />
          <DetailField label="English level" value={input.englishLevel} />
          <DetailField label="Qualification level" value={input.qualificationLevel} />
          <DetailField label="Current country" value={input.currentCountry} />
          <DetailField label="Passport country" value={input.passportCountry} />
          <DetailField label="Preferred state" value={input.preferredState} />
          <DetailField
            label="Offshore experience"
            value={input.offshoreExperienceYears !== undefined ? `${input.offshoreExperienceYears} yrs` : undefined}
          />
          <DetailField
            label="Onshore experience"
            value={input.onshoreExperienceYears !== undefined ? `${input.onshoreExperienceYears} yrs` : undefined}
          />
          <DetailField label="Annual salary (AUD)" value={input.annualSalaryAud} />
          <DetailField label="Budget range" value={input.estimatedBudgetRange} />
          <DetailField label="Timeline" value={input.timeline} />
          <DetailField label="Sponsor / family" value={input.sponsorOrFamily} />
          <DetailField label="Qualification awarded in Australia" value={yesNo(input.qualificationAwardedInAustralia)} />
          <DetailField label="Occupation confirmed" value={input.occupationConfirmed} />
          <div className="col-span-2">
            <DetailField label="Biggest concern" value={input.biggestConcern} />
          </div>
          <DetailField label="Phone" value={lead.phone} />
          <DetailField label="Source" value={lead.source} />
          <DetailField label="Submitted" value={lead.createdAt.toLocaleString()} />
        </dl>

        <div className="mt-2 border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Assign to Agent (optional)
          </p>
          <AgentSelect lead={lead} agents={agents} locale={locale} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LeadRow({ lead, agents, locale }: { lead: Lead; agents: Agent[]; locale: string }) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-slate-800 hover:bg-slate-800/50">
        <td className="py-3 pr-4 font-medium text-white">{lead.fullName || "—"}</td>
        <td className="px-4 py-3 text-slate-400">{lead.email}</td>
        <td className="px-4 py-3 font-semibold text-slate-200">{lead.pointsTier || "—"}</td>
        <td className="px-4 py-3">
          <AgentSelect lead={lead} agents={agents} locale={locale} />
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-indigo-300"
          >
            <Eye className="h-3.5 w-3.5" />
            View Details
          </button>
        </td>
      </tr>
      <LeadDetailSheet lead={lead} agents={agents} locale={locale} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
}

export function LeadAssigner({
  unassignedLeads,
  agents,
  locale,
}: {
  unassignedLeads: Lead[];
  agents: Agent[];
  locale: string;
}) {
  if (unassignedLeads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No unassigned leads in the pool.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-left text-slate-400">
            <th className="py-3 pr-4 font-semibold">Lead</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Tier</th>
            <th className="px-4 py-3 font-semibold">Assign to Agent</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {unassignedLeads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} agents={agents} locale={locale} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
