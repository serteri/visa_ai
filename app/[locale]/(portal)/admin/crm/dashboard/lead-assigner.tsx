"use client";

import { useTransition } from "react";
import { assignLeadToAgent } from "../actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Agent = {
  id: string;
  name: string | null;
  email: string;
};

type Lead = {
  id: string;
  fullName: string | null;
  email: string;
  pointsTier: string | null;
};

// Plain shadcn Select instead of a Command+Popover combobox: with a handful
// of agents there's no real need for in-list search, and the combobox's
// portal/positioning was overlapping adjacent table rows (z-index + stacking
// context issue inside the table's overflow-x-auto wrapper). Select already
// portals to document.body with a high z-index (see components/ui/select.tsx)
// and is used the same way elsewhere in this app without that problem.
function AgentSelect({ lead, agents }: { lead: Lead; agents: Agent[] }) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    const agentLabel = agent?.name ?? agent?.email ?? "agent";

    startTransition(async () => {
      try {
        await assignLeadToAgent(lead.id, agentId);
        toast.success(`✅ Lead successfully assigned to ${agentLabel}`);
      } catch {
        toast.error(`❌ Failed to assign lead to ${agentLabel}`);
      }
    });
  }

  if (agents.length === 0) {
    return (
      <p className="w-[200px] rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
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

export function LeadAssigner({
  unassignedLeads,
  agents,
}: {
  unassignedLeads: Lead[];
  agents: Agent[];
}) {
  if (unassignedLeads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No unassigned leads in the pool.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-3 pr-4 font-semibold">Lead</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Tier</th>
            <th className="px-4 py-3 font-semibold">Assign to Agent</th>
          </tr>
        </thead>
        <tbody>
          {unassignedLeads.map((lead) => (
            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 pr-4 font-medium">{lead.fullName || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{lead.email}</td>
              <td className="px-4 py-3 font-semibold">{lead.pointsTier || "—"}</td>
              <td className="px-4 py-3">
                <AgentSelect lead={lead} agents={agents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
