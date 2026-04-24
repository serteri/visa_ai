import Link from "next/link";

import { AgentReferralCta } from "@/components/sections/agent-referral-cta";
import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockMissingInformation,
  mockPathwaySuggestions,
  mockRiskFlags,
} from "@/lib/mock-visa-data";

export default function ResultsPage() {
  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">General pathway summary</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">Your mock pathway results</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            Based on your answers, the following pathways may be relevant and
            could be worth reviewing with a registered migration agent.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {mockPathwaySuggestions.map((pathway, index) => (
            <Card key={pathway.title}>
              <CardHeader>
                <CardTitle>
                  Possible pathway {index + 1}: {pathway.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{pathway.rationale}</p>
                <p className="rounded-lg bg-muted p-3">{pathway.caution}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Missing information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {mockMissingInformation.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {mockRiskFlags.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recommended next step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Prepare your missing documents and discuss these possible pathways
              with a registered migration agent before making visa decisions.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button>Request agent referral</Button>
              <Button asChild variant="outline">
                <Link href="/checker">Edit questionnaire answers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <ComplianceNotice />

        <section>
          <AgentReferralCta />
        </section>
      </section>
    </main>
  );
}
