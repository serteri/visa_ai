import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ComplianceNotice() {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="flex gap-4 p-5">
        <ShieldCheck className="mt-1 size-5 text-primary" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          This platform provides general information only. It does not provide
          migration advice, legal advice, or immigration assistance. For
          personalised advice, speak with a registered migration agent or
          Australian legal practitioner.
        </p>
      </CardContent>
    </Card>
  );
}
