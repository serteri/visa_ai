"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignLeadToAgentLegacy } from "../actions";

type Agent = {
  id: string;
  name: string | null;
  email: string;
};

export function AssignAgentSelect({
  leadId,
  agents,
  currentAgentId,
}: {
  leadId: string;
  agents: Agent[];
  currentAgentId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    const agentLabel = agent?.name ?? agent?.email ?? "agent";

    startTransition(async () => {
      try {
        await assignLeadToAgentLegacy(leadId, agentId);
        toast.success(`✅ Lead assigned to ${agentLabel}`);
      } catch (error) {
        toast.error(`❌ Failed to assign lead: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    });
  }

  if (agents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No approved agents available yet.</p>
    );
  }

  return (
    <Select onValueChange={handleSelect} disabled={isPending} defaultValue={currentAgentId ?? undefined}>
      <SelectTrigger className="w-[260px]">
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
