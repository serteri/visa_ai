import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LegalPage() {
  return (
    <main className="ambient-bg flex-1 py-16">
      <section className="section-shell space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Legal and Compliance
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Information use and platform boundaries
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            This platform is designed for general information and eligibility
            pre-screening only. It is not a migration advice or legal advice
            service.
          </p>
        </div>

        <ComplianceNotice />

        <Card>
          <CardHeader>
            <CardTitle>What this platform does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Provides general pathway summaries using structured public visa data.</p>
            <p>Highlights missing information and discussion points for your next step.</p>
            <p>Offers optional referral pathways to registered migration professionals.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What this platform does not do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Does not provide migration advice or legal advice.</p>
            <p>Does not confirm visa eligibility, outcomes, or approvals.</p>
            <p>Does not replace consultation with a registered migration agent.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
