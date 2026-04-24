import Link from "next/link";
import { CheckCircle2, Languages, Scale, ShieldCheck } from "lucide-react";

import { AgentReferralCta } from "@/components/sections/agent-referral-cta";
import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supportedLanguages } from "@/lib/mock-visa-data";

const howItWorks = [
  "Tell us your background",
  "We compare your answers against structured visa information",
  "Get a general pathway summary",
  "Speak with a registered migration agent if needed",
];

const categories = [
  "Student visa",
  "Skilled migration",
  "Employer sponsored",
  "Partner visa",
  "Visitor visa",
  "Regional pathways",
];

const trustIndicators = [
  {
    title: "Based on official Australian government sources",
    icon: ShieldCheck,
  },
  {
    title: "General information only",
    icon: Scale,
  },
  {
    title: "Multilingual support",
    icon: Languages,
  },
  {
    title: "Agent referral available",
    icon: CheckCircle2,
  },
];

export default function Home() {
  return (
    <main className="ambient-bg flex-1 py-12 sm:py-16">
      <section className="section-shell grid gap-8 rounded-2xl border border-border/60 bg-white/80 p-6 shadow-[0_18px_50px_-24px_rgba(2,6,23,0.35)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div className="space-y-5">
          <Badge variant="secondary">Australian Visa Pathway Checker</Badge>
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-5xl">
            Check your possible Australian visa pathways in minutes
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Answer a few questions and receive a general pathway summary before
            speaking with a registered migration agent.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/checker">Start free check</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
        </div>

        <div className="grid-veil rounded-xl border border-border/60 bg-[#f8fbff] p-6">
          <h2 className="mb-4 text-lg font-semibold">Trust indicators</h2>
          <div className="space-y-3">
            {trustIndicators.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-lg bg-white/80 px-4 py-3"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section-shell mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {howItWorks.map((step, index) => (
              <div key={step} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported visa categories</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <div key={category} className="rounded-lg bg-muted px-3 py-2 text-sm">
                {category}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="section-shell mt-10 grid gap-6 md:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Multilingual support</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {supportedLanguages.map((language) => (
              <Badge key={language} variant="outline" className="bg-white">
                {language}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ComplianceNotice />
          <div className="flex justify-end">
            <Button asChild variant="ghost">
              <Link href="/legal">Read full legal disclaimer</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-shell mt-10">
        <AgentReferralCta />
      </section>
    </main>
  );
}
