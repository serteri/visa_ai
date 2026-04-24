import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AgentReferralCta() {
  return (
    <Card className="bg-gradient-to-br from-[#0b4a6f] via-[#0e5d8a] to-[#0f6ea3] text-white">
      <CardHeader>
        <CardTitle className="text-xl">Need personalised help?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-sky-50/95">
          We can connect you with a registered migration professional for
          personalised guidance after your general pathway summary.
        </p>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href="/results">Request agent referral</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
