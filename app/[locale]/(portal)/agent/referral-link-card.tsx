"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Only ever rendered for an APPROVED agent -- see /agent/pool and
 *  /agent/dashboard, which gate this behind isApprovedAgent(). */
export function ReferralLinkCard({ agentId }: { agentId: string }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  // Built client-side from window.location so it works the same in every
  // environment (localhost, staging, prod) without needing NEXT_PUBLIC_BASE_URL
  // wired through to this specific component. agentId= is read by
  // components/ref-capture.tsx as an alias for ?ref= -- both land in the
  // same logivisa_ref cookie.
  useEffect(() => {
    setLink(`${window.location.origin}/full-check?country=AU&agentId=${agentId}`);
  }, [agentId]);

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-[#53917E]/30 bg-[#53917E]/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base text-slate-500">
          <Link2 className="h-4 w-4" /> Your referral link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          Leads who fill out the assessment via this link are assigned to you automatically.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 truncate rounded-md border border-[#53917E]/30 bg-white px-3 py-2 text-sm text-slate-600">
            {link || "…"}
          </code>
          <Button type="button" size="sm" onClick={handleCopy} disabled={!link} className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
