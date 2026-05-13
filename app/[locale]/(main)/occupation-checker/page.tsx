"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/contexts/language-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkOccupation } from "@/lib/occupations/check-occupation";

export default function OccupationCheckerPage() {
  const params = useParams();
  const locale = String(params.locale ?? "en");
  const { t } = useTranslation();

  const [occupation, setOccupation] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const result = useMemo(() => checkOccupation({ occupation: submittedQuery }), [submittedQuery]);


  return (
    <main className="ambient-bg flex-1 pt-20 pb-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{t("occupationChecker.badge")}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{t("occupationChecker.title")}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{t("occupationChecker.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("occupationChecker.inputLabel")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={t("occupationChecker.inputPlaceholder")}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              <Button
                onClick={() => setSubmittedQuery(occupation)}
                className="sm:w-auto"
              >
                {t("occupationChecker.button")}
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
                      {t("occupationChecker.foundA")}
                    </p>
                    <p className="text-muted-foreground">{t("occupationChecker.foundB")}</p>
                    <p className="text-muted-foreground">
                      {t("occupationChecker.stateNote")}
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
                          {match.confidence === "exact" ? t("occupationChecker.confidenceExact") : t("occupationChecker.confidencePartial")}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{t("occupationChecker.listLabel")}: </span>
                          {match.list}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{t("occupationChecker.pathwaysLabel")}: </span>
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
                    {t("occupationChecker.noMatch")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("occupationChecker.officialConfirm")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("occupationChecker.nextSteps")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild>
              <Link href={`/${locale}/visas/189`}>{t("occupationChecker.cta189")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/visas/190`}>{t("occupationChecker.cta190")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/visas/491`}>{t("occupationChecker.cta491")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/${locale}/points-calculator`}>{t("occupationChecker.ctaPoints")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/${locale}/agent-referral`}>{t("occupationChecker.ctaAgent")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 text-sm text-muted-foreground">{t("occupationChecker.compliance")}</CardContent>
        </Card>
      </section>
    </main>
  );
}
