"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { assignLeadToAgent } from "../actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

function AgentCombobox({ lead, agents }: { lead: Lead; agents: Agent[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (agentId: string) => {
    setOpen(false);
    startTransition(async () => {
      try {
        await assignLeadToAgent(lead.id, agentId);
        toast.success("Lead successfully assigned.");
      } catch {
        toast.error("Failed to assign lead.");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
            disabled={isPending}
          />
        }
      >
        {isPending ? "Assigning..." : "Select an agent..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>No agent found.</CommandEmpty>
            <CommandGroup>
              {agents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={agent.name ?? agent.email}
                  onSelect={() => handleSelect(agent.id)}
                >
                  <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                  {agent.name ?? agent.email}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
                <AgentCombobox lead={lead} agents={agents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
