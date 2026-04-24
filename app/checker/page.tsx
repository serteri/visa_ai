"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { enabledLanguages } from "@/lib/languages";
import { useTranslation } from "@/contexts/language-context";

type CheckerFormData = {
  countryOfPassport: string;
  currentCountryOfResidence: string;
  age: string;
  preferredLanguage: string;
  goal: string;
  highestQualification: string;
  occupation: string;
  yearsOfWorkExperience: string;
  englishTestTaken: string;
  englishScoreType: string;
  englishScore: string;
  currentlyInAustralia: string;
  currentVisaType: string;
  hasEmployerSponsor: string;
  hasPartnerOrFamilyInAustralia: string;
  hasPassport: string;
  documentsReady: string;
  timeline: string;
  budgetRange: string;
};

const totalSteps = 5;

const initialData: CheckerFormData = {
  countryOfPassport: "",
  currentCountryOfResidence: "",
  age: "",
  preferredLanguage: "en",
  goal: "",
  highestQualification: "",
  occupation: "",
  yearsOfWorkExperience: "",
  englishTestTaken: "no",
  englishScoreType: "",
  englishScore: "",
  currentlyInAustralia: "",
  currentVisaType: "",
  hasEmployerSponsor: "",
  hasPartnerOrFamilyInAustralia: "",
  hasPassport: "",
  documentsReady: "",
  timeline: "",
  budgetRange: "",
};

export default function CheckerPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CheckerFormData>(initialData);

  const progressValue = useMemo(() => (step / totalSteps) * 100, [step]);

  const stepTitles = [
    t("checker.basicProfile"),
    t("checker.goal"),
    t("checker.educationWork"),
    t("checker.australiaSituation"),
    t("checker.readiness"),
  ];

  function updateField<K extends keyof CheckerFormData>(
    key: K,
    value: CheckerFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      return;
    }

    router.push("/results");
  }

  function goBack() {
    setStep((prev) => Math.max(1, prev - 1));
  }

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t("checker.heading")}
          </p>
          <h1 className="text-3xl font-bold">{t("checker.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("checker.subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                {t("checker.step")} {step} {t("checker.of")} {totalSteps}: {stepTitles[step - 1]}
              </CardTitle>
              <span className="text-sm text-muted-foreground">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} />
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="countryOfPassport">{t("checker.countryOfPassport")}</Label>
                  <Input
                    id="countryOfPassport"
                    value={formData.countryOfPassport}
                    onChange={(event) => updateField("countryOfPassport", event.target.value)}
                    placeholder="e.g. India"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentCountryOfResidence">{t("checker.currentResidence")}</Label>
                  <Input
                    id="currentCountryOfResidence"
                    value={formData.currentCountryOfResidence}
                    onChange={(event) =>
                      updateField("currentCountryOfResidence", event.target.value)
                    }
                    placeholder="e.g. UAE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">{t("checker.age")}</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(event) => updateField("age", event.target.value)}
                    placeholder="e.g. 29"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredLanguage">{t("checker.preferredLanguage")}</Label>
                  <select
                    id="preferredLanguage"
                    value={formData.preferredLanguage}
                    onChange={(event) => updateField("preferredLanguage", event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    {enabledLanguages.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.localLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <Label htmlFor="goal">{t("checker.primaryGoal")}</Label>
                <select
                  id="goal"
                  value={formData.goal}
                  onChange={(event) => updateField("goal", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <option value="">{t("checker.select")}</option>
                  <option value="Study in Australia">{t("checker.study")}</option>
                  <option value="Work in Australia">{t("checker.work")}</option>
                  <option value="Migrate permanently">{t("checker.migrate")}</option>
                  <option value="Join partner/family">{t("checker.family")}</option>
                  <option value="Visit Australia">{t("checker.visit")}</option>
                  <option value="Not sure">{t("checker.notSure")}</option>
                </select>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="highestQualification">{t("checker.qualification")}</Label>
                  <Input
                    id="highestQualification"
                    value={formData.highestQualification}
                    onChange={(event) => updateField("highestQualification", event.target.value)}
                    placeholder="e.g. Bachelor's degree"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">{t("checker.occupation")}</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(event) => updateField("occupation", event.target.value)}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsOfWorkExperience">{t("checker.experience")}</Label>
                  <Input
                    id="yearsOfWorkExperience"
                    type="number"
                    value={formData.yearsOfWorkExperience}
                    onChange={(event) =>
                      updateField("yearsOfWorkExperience", event.target.value)
                    }
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="englishTestTaken">{t("checker.englishTest")}</Label>
                  <select
                    id="englishTestTaken"
                    value={formData.englishTestTaken}
                    onChange={(event) => updateField("englishTestTaken", event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>

                {formData.englishTestTaken === "yes" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="englishScoreType">{t("checker.englishType")}</Label>
                      <Input
                        id="englishScoreType"
                        value={formData.englishScoreType}
                        onChange={(event) => updateField("englishScoreType", event.target.value)}
                        placeholder="e.g. IELTS, PTE"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="englishScore">{t("checker.englishScore")}</Label>
                      <Input
                        id="englishScore"
                        value={formData.englishScore}
                        onChange={(event) => updateField("englishScore", event.target.value)}
                        placeholder="e.g. IELTS 7.0"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentlyInAustralia">{t("checker.inAustralia")}</Label>
                  <select
                    id="currentlyInAustralia"
                    value={formData.currentlyInAustralia}
                    onChange={(event) => updateField("currentlyInAustralia", event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentVisaType">{t("checker.currentVisa")}</Label>
                  <Input
                    id="currentVisaType"
                    value={formData.currentVisaType}
                    onChange={(event) => updateField("currentVisaType", event.target.value)}
                    placeholder="e.g. Student 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hasEmployerSponsor">{t("checker.sponsor")}</Label>
                  <select
                    id="hasEmployerSponsor"
                    value={formData.hasEmployerSponsor}
                    onChange={(event) => updateField("hasEmployerSponsor", event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hasPartnerOrFamilyInAustralia">
                    {t("checker.familyInAustralia")}
                  </Label>
                  <select
                    id="hasPartnerOrFamilyInAustralia"
                    value={formData.hasPartnerOrFamilyInAustralia}
                    onChange={(event) =>
                      updateField("hasPartnerOrFamilyInAustralia", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hasPassport">{t("checker.passport")}</Label>
                  <select
                    id="hasPassport"
                    value={formData.hasPassport}
                    onChange={(event) => updateField("hasPassport", event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentsReady">{t("checker.documents")}</Label>
                  <select
                    id="documentsReady"
                    value={formData.documentsReady}
                    onChange={(event) => updateField("documentsReady", event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="partially">{t("checker.partially")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">{t("checker.timeline")}</Label>
                  <Input
                    id="timeline"
                    value={formData.timeline}
                    onChange={(event) => updateField("timeline", event.target.value)}
                    placeholder="e.g. Within 6 months"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">{t("checker.budget")}</Label>
                  <Input
                    id="budgetRange"
                    value={formData.budgetRange}
                    onChange={(event) => updateField("budgetRange", event.target.value)}
                    placeholder="e.g. AUD 10,000 - 20,000"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={goBack} disabled={step === 1}>
                {t("checker.back")}
              </Button>
              <Button onClick={goNext}>
                {step === totalSteps ? t("checker.viewResults") : t("checker.continue")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ComplianceNotice />

        <p className="text-center text-sm text-muted-foreground">
          {t("footer.legal")} <Link href="/legal" className="text-primary underline">{t("footer.legal")}</Link>
        </p>
      </section>
    </main>
  );
}
