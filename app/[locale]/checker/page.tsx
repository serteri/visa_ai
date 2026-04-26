"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { activeLocales } from "@/lib/i18n/config";
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

type StepErrors = Partial<Record<keyof CheckerFormData, string>>;

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

function validateStep(step: number, data: CheckerFormData): StepErrors {
  const errors: StepErrors = {};

  if (step === 1) {
    if (!data.countryOfPassport.trim())
      errors.countryOfPassport = "This field is required";
    if (!data.currentCountryOfResidence.trim())
      errors.currentCountryOfResidence = "This field is required";
    if (!data.age.trim()) {
      errors.age = "This field is required";
    } else {
      const ageNum = Number(data.age);
      if (!Number.isFinite(ageNum) || ageNum <= 0 || ageNum >= 100)
        errors.age = "Enter a valid age";
    }
    // preferredLanguage always has a default value — no validation needed
  }

  if (step === 2) {
    if (!data.goal) errors.goal = "This field is required";
  }

  if (step === 3) {
    if (!data.highestQualification.trim())
      errors.highestQualification = "This field is required";
    if (!data.occupation.trim())
      errors.occupation = "This field is required";
    if (!data.yearsOfWorkExperience.trim())
      errors.yearsOfWorkExperience = "This field is required";
    // englishTestTaken always has a value (yes/no default)
    if (data.englishTestTaken === "yes") {
      if (!data.englishScoreType.trim())
        errors.englishScoreType = "This field is required";
      if (!data.englishScore.trim())
        errors.englishScore = "This field is required";
    }
  }

  if (step === 4) {
    if (!data.currentlyInAustralia)
      errors.currentlyInAustralia = "This field is required";
    if (data.currentlyInAustralia === "yes" && !data.currentVisaType.trim())
      errors.currentVisaType = "This field is required";
    if (!data.hasEmployerSponsor)
      errors.hasEmployerSponsor = "This field is required";
    if (!data.hasPartnerOrFamilyInAustralia)
      errors.hasPartnerOrFamilyInAustralia = "This field is required";
  }

  if (step === 5) {
    if (!data.hasPassport)
      errors.hasPassport = "This field is required";
    if (!data.documentsReady)
      errors.documentsReady = "This field is required";
    if (!data.timeline.trim())
      errors.timeline = "This field is required";
    if (!data.budgetRange.trim())
      errors.budgetRange = "This field is required";
  }

  return errors;
}

// Shared select class
const selectCls =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
const selectErrorCls =
  "h-10 w-full rounded-md border border-destructive bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

function Req() {
  return <span className="ml-0.5 text-destructive">*</span>;
}

export default function CheckerPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CheckerFormData>(initialData);
  const [showErrors, setShowErrors] = useState(false);

  const progressValue = useMemo(() => (step / totalSteps) * 100, [step]);

  const stepErrors = useMemo(() => validateStep(step, formData), [step, formData]);
  const stepIsValid = Object.keys(stepErrors).length === 0;

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
    if (!stepIsValid) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);

    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      return;
    }

    const query = new URLSearchParams({ goal: formData.goal });
    if (formData.hasEmployerSponsor)
      query.set("hasSponsor", formData.hasEmployerSponsor);
    if (formData.currentlyInAustralia)
      query.set("inAustralia", formData.currentlyInAustralia);
    if (formData.englishScore)
      query.set("englishScore", formData.englishScore);

    router.push(`/${locale}/results?${query.toString()}`);
  }

  function goBack() {
    setShowErrors(false);
    setStep((prev) => Math.max(1, prev - 1));
  }

  const err = showErrors ? stepErrors : {};

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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Quick Pathway Check</CardTitle>
              <p className="text-sm font-semibold text-primary">Free · 2 minutes</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get a simple overview of visa pathways that may be relevant based on your answers.
              </p>
              <Button asChild className="w-full sm:w-auto">
                <Link href="#quick-pathway-check">Start quick check</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Full Visa Readiness Report</CardTitle>
                <Badge variant="secondary">Premium</Badge>
              </div>
              <p className="text-sm font-semibold text-primary">Detailed · Premium</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A structured review including risks, documents, and next steps tailored to your situation.
              </p>
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/${locale}/full-check`}>Unlock full report</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground">
          This tool provides general information only.
        </p>

        <Card id="quick-pathway-check">
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
            {/* ── Step 1: Basic profile ── */}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="countryOfPassport">
                    {t("checker.countryOfPassport")}<Req />
                  </Label>
                  <Input
                    id="countryOfPassport"
                    value={formData.countryOfPassport}
                    onChange={(e) => updateField("countryOfPassport", e.target.value)}
                    placeholder="e.g. India"
                    className={err.countryOfPassport ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.countryOfPassport} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="currentCountryOfResidence">
                    {t("checker.currentResidence")}<Req />
                  </Label>
                  <Input
                    id="currentCountryOfResidence"
                    value={formData.currentCountryOfResidence}
                    onChange={(e) => updateField("currentCountryOfResidence", e.target.value)}
                    placeholder="e.g. UAE"
                    className={err.currentCountryOfResidence ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.currentCountryOfResidence} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="age">
                    {t("checker.age")}<Req />
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min={1}
                    max={99}
                    value={formData.age}
                    onChange={(e) => updateField("age", e.target.value)}
                    placeholder="e.g. 29"
                    className={err.age ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.age} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="preferredLanguage">
                    {t("checker.preferredLanguage")}
                  </Label>
                  <select
                    id="preferredLanguage"
                    value={formData.preferredLanguage}
                    onChange={(e) => updateField("preferredLanguage", e.target.value)}
                    className={selectCls}
                  >
                    {activeLocales.map((langCode) => (
                      <option key={langCode} value={langCode}>
                        {langCode === "en" ? "English" : langCode === "tr" ? "Türkçe" : langCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 2: Goal ── */}
            {step === 2 && (
              <div className="space-y-1">
                <Label htmlFor="goal">
                  {t("checker.primaryGoal")}<Req />
                </Label>
                <select
                  id="goal"
                  value={formData.goal}
                  onChange={(e) => updateField("goal", e.target.value)}
                  className={err.goal ? selectErrorCls : selectCls}
                >
                  <option value="">{t("checker.select")}</option>
                  <option value="Study in Australia">{t("checker.study")}</option>
                  <option value="Work in Australia">{t("checker.work")}</option>
                  <option value="Migrate permanently">{t("checker.migrate")}</option>
                  <option value="Join partner/family">{t("checker.family")}</option>
                  <option value="Not sure">{t("checker.notSure")}</option>
                </select>
                <FieldError msg={err.goal} />
              </div>
            )}

            {/* ── Step 3: Education / work ── */}
            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="highestQualification">
                    {t("checker.qualification")}<Req />
                  </Label>
                  <Input
                    id="highestQualification"
                    value={formData.highestQualification}
                    onChange={(e) => updateField("highestQualification", e.target.value)}
                    placeholder="e.g. Bachelor's degree"
                    className={err.highestQualification ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.highestQualification} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="occupation">
                    {t("checker.occupation")}<Req />
                  </Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => updateField("occupation", e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className={err.occupation ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.occupation} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="yearsOfWorkExperience">
                    {t("checker.experience")}<Req />
                  </Label>
                  <Input
                    id="yearsOfWorkExperience"
                    type="number"
                    min={0}
                    value={formData.yearsOfWorkExperience}
                    onChange={(e) => updateField("yearsOfWorkExperience", e.target.value)}
                    placeholder="e.g. 5"
                    className={err.yearsOfWorkExperience ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.yearsOfWorkExperience} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="englishTestTaken">
                    {t("checker.englishTest")}<Req />
                  </Label>
                  <select
                    id="englishTestTaken"
                    value={formData.englishTestTaken}
                    onChange={(e) => updateField("englishTestTaken", e.target.value)}
                    className={selectCls}
                  >
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                </div>

                {formData.englishTestTaken === "yes" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="englishScoreType">
                        {t("checker.englishType")}<Req />
                      </Label>
                      <Input
                        id="englishScoreType"
                        value={formData.englishScoreType}
                        onChange={(e) => updateField("englishScoreType", e.target.value)}
                        placeholder="e.g. IELTS, PTE"
                        className={err.englishScoreType ? "border-destructive" : ""}
                      />
                      <FieldError msg={err.englishScoreType} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="englishScore">
                        {t("checker.englishScore")}<Req />
                      </Label>
                      <Input
                        id="englishScore"
                        value={formData.englishScore}
                        onChange={(e) => updateField("englishScore", e.target.value)}
                        placeholder="e.g. 7.0"
                        className={err.englishScore ? "border-destructive" : ""}
                      />
                      <FieldError msg={err.englishScore} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 4: Australia situation ── */}
            {step === 4 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="currentlyInAustralia">
                    {t("checker.inAustralia")}<Req />
                  </Label>
                  <select
                    id="currentlyInAustralia"
                    value={formData.currentlyInAustralia}
                    onChange={(e) => updateField("currentlyInAustralia", e.target.value)}
                    className={err.currentlyInAustralia ? selectErrorCls : selectCls}
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                  <FieldError msg={err.currentlyInAustralia} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="currentVisaType">
                    {t("checker.currentVisa")}
                    {formData.currentlyInAustralia === "yes" && <Req />}
                  </Label>
                  <Input
                    id="currentVisaType"
                    value={formData.currentVisaType}
                    onChange={(e) => updateField("currentVisaType", e.target.value)}
                    placeholder="e.g. Student 500"
                    className={err.currentVisaType ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.currentVisaType} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="hasEmployerSponsor">
                    {t("checker.sponsor")}<Req />
                  </Label>
                  <select
                    id="hasEmployerSponsor"
                    value={formData.hasEmployerSponsor}
                    onChange={(e) => updateField("hasEmployerSponsor", e.target.value)}
                    className={err.hasEmployerSponsor ? selectErrorCls : selectCls}
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                  <FieldError msg={err.hasEmployerSponsor} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="hasPartnerOrFamilyInAustralia">
                    {t("checker.familyInAustralia")}<Req />
                  </Label>
                  <select
                    id="hasPartnerOrFamilyInAustralia"
                    value={formData.hasPartnerOrFamilyInAustralia}
                    onChange={(e) => updateField("hasPartnerOrFamilyInAustralia", e.target.value)}
                    className={err.hasPartnerOrFamilyInAustralia ? selectErrorCls : selectCls}
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                  <FieldError msg={err.hasPartnerOrFamilyInAustralia} />
                </div>
              </div>
            )}

            {/* ── Step 5: Readiness ── */}
            {step === 5 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="hasPassport">
                    {t("checker.passport")}<Req />
                  </Label>
                  <select
                    id="hasPassport"
                    value={formData.hasPassport}
                    onChange={(e) => updateField("hasPassport", e.target.value)}
                    className={err.hasPassport ? selectErrorCls : selectCls}
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                  <FieldError msg={err.hasPassport} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="documentsReady">
                    {t("checker.documents")}<Req />
                  </Label>
                  <select
                    id="documentsReady"
                    value={formData.documentsReady}
                    onChange={(e) => updateField("documentsReady", e.target.value)}
                    className={err.documentsReady ? selectErrorCls : selectCls}
                  >
                    <option value="">{t("checker.select")}</option>
                    <option value="yes">{t("checker.yes")}</option>
                    <option value="partially">{t("checker.partially")}</option>
                    <option value="no">{t("checker.no")}</option>
                  </select>
                  <FieldError msg={err.documentsReady} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="timeline">
                    {t("checker.timeline")}<Req />
                  </Label>
                  <Input
                    id="timeline"
                    value={formData.timeline}
                    onChange={(e) => updateField("timeline", e.target.value)}
                    placeholder="e.g. Within 6 months"
                    className={err.timeline ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.timeline} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="budgetRange">
                    {t("checker.budget")}<Req />
                  </Label>
                  <Input
                    id="budgetRange"
                    value={formData.budgetRange}
                    onChange={(e) => updateField("budgetRange", e.target.value)}
                    placeholder="e.g. AUD 10,000 - 20,000"
                    className={err.budgetRange ? "border-destructive" : ""}
                  />
                  <FieldError msg={err.budgetRange} />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={goBack} disabled={step === 1}>
                {t("checker.back")}
              </Button>
              <Button onClick={goNext} disabled={showErrors && !stepIsValid}>
                {step === totalSteps ? t("checker.viewResults") : t("checker.continue")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ComplianceNotice />

        <p className="text-center text-sm text-muted-foreground">
          {t("footer.disclaimer")}{" "}
          <Link href={`/${locale}/legal`} className="text-primary underline">
            {t("footer.legal")}
          </Link>
        </p>
      </section>
    </main>
  );
}
