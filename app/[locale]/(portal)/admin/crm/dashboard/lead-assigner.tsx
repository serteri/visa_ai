"use client";

import { useState, useTransition } from "react";
import { assignLeadToAgent } from "../actions";

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

export function LeadAssigner({
  unassignedLeads,
  agents,
}: {
  unassignedLeads: Lead[];
  agents: Agent[];
}) {
  const [isPending, startTransition] = useTransition();

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
                <select
                  disabled={isPending}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  defaultValue=""
                  onChange={(e) => {
                    const agentId = e.target.value;
                    if (agentId) {
                      startTransition(async () => {
                        await assignLeadToAgent(lead.id, agentId);
                      });
                    }
                  }}
                >
                  <option value="" disabled>
                    Select an agent...
                  </option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name ?? agent.email}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
