"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkOccupation } from "@/lib/occupations/check-occupation";

export default function OccupationCheckerPage() {
  const params = useParams();
  const locale = String(params.locale ?? "en");
  const isTr = locale === "tr";

  const [occupation, setOccupation] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const result = useMemo(() => checkOccupation({ occupation: submittedQuery }), [submittedQuery]);

  const copy = {
    badge: isTr ? "Genel Bilgi Aracı" : "General Information Tool",
    title: isTr ? "Meslek Kontrol Aracı" : "Occupation Checker",
    subtitle: isTr
      ? "Mesleğinizi girerek dahili nitelikli meslek listesinde eşleşme olup olmadığını kontrol edin."
      : "Type your occupation to check matches in the current internal skilled occupation list.",
    inputLabel: isTr ? "Meslek" : "Occupation",
    inputPlaceholder: isTr ? "Ornek: Civil Engineer" : "e.g. Civil Engineer",
    button: isTr ? "Meslegi kontrol et" : "Check occupation",
    foundA: isTr
      ? "Bu meslek mevcut dahili nitelikli meslek listesinde gorunuyor."
      : "This occupation appears in the current internal skilled occupation list.",
    foundB: isTr
      ? "Ilgili yollar subclass 189, subclass 190 ve/veya subclass 491 olabilir."
      : "Relevant pathways may include subclass 189, subclass 190 and/or subclass 491.",
    noMatch: isTr
      ? "Mevcut dahili listede eslesme bulunamadi. Bu durum meslegin uygun olmadigi anlamina gelmez."
      : "No match found in the current internal list. This does not mean the occupation is not eligible.",
    confidenceExact: isTr ? "Eslesme: Tam" : "Match type: Exact",
    confidencePartial: isTr ? "Eslesme: Kismi" : "Match type: Partial",
    listLabel: isTr ? "Liste" : "List",
    pathwaysLabel: isTr ? "Ilgili yollar" : "Relevant pathways",
    cta189: isTr ? "Subclass 189 detaylari" : "View subclass 189",
    cta190: isTr ? "Subclass 190 detaylari" : "View subclass 190",
    cta491: isTr ? "Subclass 491 detaylari" : "View subclass 491",
    ctaPoints: isTr ? "Puan hesaplayiciyi ac" : "Open points calculator",
    ctaAgent: isTr
      ? "Kayitli bir goc danismani ile gorusun"
      : "Speak with a registered migration agent",
    compliance: isTr
      ? "Bu meslek kontrol araci yalnizca genel bilgi saglar. Meslek uygunlugu resmi meslek listelerine, degerlendirme kurumlarina ve eyalet veya bolge adaylik kriterlerine bagli olabilir."
      : "This occupation checker provides general information only. Occupation eligibility can depend on official occupation lists, assessing authorities, and state or territory nomination criteria.",
  };

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{copy.badge}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{copy.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{copy.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{copy.inputLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={copy.inputPlaceholder}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              <Button
                onClick={() => setSubmittedQuery(occupation)}
                className="sm:w-auto"
              >
                {copy.button}
              </Button>
            </div>
          </CardContent>
        </Card>

        {submittedQuery.trim() !== "" && (
          <div className="space-y-4">
            {result.matches.length > 0 ? (
              <>
                <Card>
                  <CardContent className="pt-6 space-y-2 text-sm">
                    <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-foreground">
                      {copy.foundA}
                    </p>
                    <p className="text-muted-foreground">{copy.foundB}</p>
                    <p className="text-muted-foreground">
                      {isTr
                        ? "Eyalet veya bolge adaylik kriterleri de uygulanabilir. Resmi kaynaklardan veya kayitli bir goc danismanindan teyit edin."
                        : "State nomination criteria may also apply. Confirm against official sources or a registered migration agent."}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  {result.matches.map((match) => (
                    <Card key={`${match.title}-${match.confidence}`}>
                      <CardHeader>
                        <CardTitle className="text-base">{match.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          {match.confidence === "exact" ? copy.confidenceExact : copy.confidencePartial}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{copy.listLabel}: </span>
                          {match.list}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{copy.pathwaysLabel}: </span>
                          {match.relevantVisas.join(", ")}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-2 text-sm">
                  <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-foreground">
                    {copy.noMatch}
                  </p>
                  <p className="text-muted-foreground">
                    {isTr
                      ? "Resmi kaynaklardan veya kayitli bir goc danismanindan teyit edin."
                      : "Confirm against official sources or a registered migration agent."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isTr ? "Sonraki adimlar" : "Next steps"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild>
              <Link href={`/${locale}/visas/189`}>{copy.cta189}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/visas/190`}>{copy.cta190}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/visas/491`}>{copy.cta491}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/${locale}/points-calculator`}>{copy.ctaPoints}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/${locale}/agent-referral`}>{copy.ctaAgent}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 text-sm text-muted-foreground">{copy.compliance}</CardContent>
        </Card>
      </section>
    </main>
  );
}
