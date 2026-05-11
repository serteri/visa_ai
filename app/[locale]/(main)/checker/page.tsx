"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";

import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { activeLocales } from "@/lib/i18n/config";
import { useTranslation } from "@/contexts/language-context";
import { Bot } from "lucide-react";

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

function validateStep(
  step: number,
  data: CheckerFormData,
  tx: (en: string, tr: string, zh: string) => string
): StepErrors {
  const errors: StepErrors = {};
  const reqMsg = tx("This field is required", "Bu alan zorunludur", "此项必填");
  const ageMsg = tx("Enter a valid age", "Geçerli bir yaş girin", "请输入有效年龄");

  if (step === 1) {
    if (!data.countryOfPassport.trim())
      errors.countryOfPassport = reqMsg;
    if (!data.currentCountryOfResidence.trim())
      errors.currentCountryOfResidence = reqMsg;
    if (!data.age.trim()) {
      errors.age = reqMsg;
    } else {
      const ageNum = Number(data.age);
      if (!Number.isFinite(ageNum) || ageNum <= 0 || ageNum >= 100)
        errors.age = ageMsg;
    }
  }

  if (step === 2) {
    if (!data.goal) errors.goal = reqMsg;
  }

  if (step === 3) {
    if (!data.highestQualification.trim())
      errors.highestQualification = reqMsg;
    if (!data.occupation.trim())
      errors.occupation = reqMsg;
    if (!data.yearsOfWorkExperience.trim())
      errors.yearsOfWorkExperience = reqMsg;
    if (data.englishTestTaken === "yes") {
      if (!data.englishScoreType.trim())
        errors.englishScoreType = reqMsg;
      if (!data.englishScore.trim())
        errors.englishScore = reqMsg;
    }
  }

  if (step === 4) {
    if (!data.currentlyInAustralia)
      errors.currentlyInAustralia = reqMsg;
    if (data.currentlyInAustralia === "yes" && !data.currentVisaType.trim())
      errors.currentVisaType = reqMsg;
    if (!data.hasEmployerSponsor)
      errors.hasEmployerSponsor = reqMsg;
    if (!data.hasPartnerOrFamilyInAustralia)
      errors.hasPartnerOrFamilyInAustralia = reqMsg;
  }

  if (step === 5) {
    if (!data.hasPassport)
      errors.hasPassport = reqMsg;
    if (!data.documentsReady)
      errors.documentsReady = reqMsg;
    if (!data.timeline.trim())
      errors.timeline = reqMsg;
    if (!data.budgetRange.trim())
      errors.budgetRange = reqMsg;
  }

  return errors;
}

// Shared select class
const selectCls =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";
const selectErrorCls =
  "h-11 w-full rounded-lg border border-destructive bg-white px-3 text-sm shadow-sm outline-none transition-all focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20";

const getInputCls = (isErr: boolean) => 
  `h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm outline-none transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${
    isErr ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-gray-200"
  }`;
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
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CheckerFormData>(initialData);
  const [showErrors, setShowErrors] = useState(false);
  const [showQuickCheck, setShowQuickCheck] = useState(false);

  const progressValue = useMemo(() => (step / totalSteps) * 100, [step]);

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const stepErrors = useMemo(() => validateStep(step, formData, tx), [step, formData, tx]);
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
  const quickCheckVisible = showQuickCheck || searchParams.get("quick") === "1";
  const choiceCopy = {
    quickTitle: tx("Quick Pathway Check", "Hızlı Yol Kontrolü", "快速路径评估"),
    quickLabel: tx("Free · 2 minutes", "Ücretsiz · 2 dakika", "免费 · 2 分钟"),
    quickDescription: tx(
      "A short questionnaire that shows possible pathway areas only.",
      "Yalnızca olası yol alanlarını gösteren kısa bir anket.",
      "简短问卷，仅显示可能的签证路径方向。"
    ),
    quickBestFor: tx("quick orientation", "hızlı yön bulma", "快速定向"),
    quickButton: tx("Start quick check", "Hızlı kontrolü başlat", "开始快速评估"),
    fullTitle: tx("Full Visa Readiness Report", "Tam Vize Hazırlık Raporu", "完整签证准备度报告"),
    fullLabel: tx(
      "🎁 Free for the first 50 users",
      "🎁 İlk 50 kullanıcıya ücretsiz",
      "🎁 前50名用户免费"
    ),
    fullDescription: tx(
      "Generate a structured report with pathway comparison, evidence readiness, points scenarios where relevant, financial roadmap, progression pathways, and PDF download.",
      "Vize yolu karşılaştırması, kanıt hazırlığı, ilgili olduğunda puan senaryoları, tahmini maliyet yol haritası, geçiş yolları ve PDF indirme içeren yapılandırılmış bir rapor oluşturun.",
      "生成包含路径对比、材料准备度、相关加分场景、费用路线图、过渡路径及 PDF 下载的结构化报告。"
    ),
    fullBestFor: tx("deeper preparation review", "daha derin hazırlık incelemesi", "深度准备评估"),
    fullButton: tx("Generate your readiness report", "Hazırlık raporunuzu oluşturun", "生成准备度报告"),
    fullTrustNote: tx(
      "$29 Comprehensive Report – FREE during the limited early access period.",
      "$29 Kapsamlı Rapor – Sınırlı erken erişim döneminde ÜCRETSİZ.",
      "$29 综合报告 – 限时抢先体验期间免费。"
    ),
    bestFor: tx("Best for:", "En uygun:", "最适合："),
    compliance: tx(
      "This tool provides general information only.",
      "Bu araç yalnızca genel bilgiler sağlar.",
      "本工具仅提供一般信息。"
    ),
  };

  return (
    <main className="flex-1 bg-slate-50 pt-32 pb-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                {t("checker.heading")}
              </p>
              <h1 className="text-3xl font-bold text-slate-900">{t("checker.title")}</h1>
              <p className="text-sm text-slate-500">
                {t("checker.subtitle")}
              </p>
            </div>

            {quickCheckVisible ? (
              <div id="quick-pathway-check" className="bg-white/60 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8">
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {t("checker.step")} {step} {t("checker.of")} {totalSteps}: {stepTitles[step - 1]}
                    </h2>
                    <span className="text-sm font-medium text-slate-500">{Math.round(progressValue)}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  {step === 1 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="countryOfPassport">{t("checker.countryOfPassport")}<Req /></Label>
                        <Input
                          id="countryOfPassport"
                          value={formData.countryOfPassport}
                          onChange={(e) => updateField("countryOfPassport", e.target.value)}
                          placeholder={tx("e.g. India", "Örn. Türkiye", "例如：印度")}
                          className={getInputCls(!!err.countryOfPassport)}
                        />
                        <FieldError msg={err.countryOfPassport} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="currentCountryOfResidence">{t("checker.currentResidence")}<Req /></Label>
                        <Input
                          id="currentCountryOfResidence"
                          value={formData.currentCountryOfResidence}
                          onChange={(e) => updateField("currentCountryOfResidence", e.target.value)}
                          placeholder={tx("e.g. UAE", "Örn. BAE", "例如：阿联酋")}
                          className={getInputCls(!!err.currentCountryOfResidence)}
                        />
                        <FieldError msg={err.currentCountryOfResidence} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="age">{t("checker.age")}<Req /></Label>
                        <Input
                          id="age" type="number" min={1} max={99}
                          value={formData.age}
                          onChange={(e) => updateField("age", e.target.value)}
                          placeholder={tx("e.g. 29", "Örn. 29", "例如：29")}
                          className={getInputCls(!!err.age)}
                        />
                        <FieldError msg={err.age} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="preferredLanguage">{t("checker.preferredLanguage")}</Label>
                        <select
                          id="preferredLanguage"
                          value={formData.preferredLanguage}
                          onChange={(e) => updateField("preferredLanguage", e.target.value)}
                          className={selectCls}
                        >
                          {activeLocales.map((langCode) => (
                            <option key={langCode} value={langCode}>
                              {langCode === "en" ? "English" : langCode === "tr" ? "Türkçe" : langCode === "zh-Hans" ? "简体中文" : langCode}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <div className="space-y-1">
                      <Label htmlFor="goal">{t("checker.primaryGoal")}<Req /></Label>
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

                  {/* Step 3 */}
                  {step === 3 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="highestQualification">{t("checker.qualification")}<Req /></Label>
                        <Input
                          id="highestQualification"
                          value={formData.highestQualification}
                          onChange={(e) => updateField("highestQualification", e.target.value)}
                          placeholder={tx("e.g. Bachelor's degree", "Örn. Lisans Derecesi", "例如：学士学位")}
                          className={getInputCls(!!err.highestQualification)}
                        />
                        <FieldError msg={err.highestQualification} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="occupation">{t("checker.occupation")}<Req /></Label>
                        <Input
                          id="occupation"
                          value={formData.occupation}
                          onChange={(e) => updateField("occupation", e.target.value)}
                          placeholder={tx("e.g. Software Engineer", "Örn. Yazılım Mühendisi", "例如：软件工程师")}
                          className={getInputCls(!!err.occupation)}
                        />
                        <FieldError msg={err.occupation} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="yearsOfWorkExperience">{t("checker.experience")}<Req /></Label>
                        <Input
                          id="yearsOfWorkExperience" type="number" min={0}
                          value={formData.yearsOfWorkExperience}
                          onChange={(e) => updateField("yearsOfWorkExperience", e.target.value)}
                          placeholder={tx("e.g. 5", "Örn. 5", "例如：5")}
                          className={getInputCls(!!err.yearsOfWorkExperience)}
                        />
                        <FieldError msg={err.yearsOfWorkExperience} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="englishTestTaken">{t("checker.englishTest")}<Req /></Label>
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
                            <Label htmlFor="englishScoreType">{t("checker.englishType")}<Req /></Label>
                            <Input
                              id="englishScoreType"
                              value={formData.englishScoreType}
                              onChange={(e) => updateField("englishScoreType", e.target.value)}
                              placeholder={tx("e.g. IELTS, PTE", "Örn. IELTS, PTE", "例如：IELTS, PTE")}
                              className={getInputCls(!!err.englishScoreType)}
                            />
                            <FieldError msg={err.englishScoreType} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="englishScore">{t("checker.englishScore")}<Req /></Label>
                            <Input
                              id="englishScore"
                              value={formData.englishScore}
                              onChange={(e) => updateField("englishScore", e.target.value)}
                              placeholder={tx("e.g. 7.0", "Örn. 7.0", "例如：7.0")}
                              className={getInputCls(!!err.englishScore)}
                            />
                            <FieldError msg={err.englishScore} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 4 */}
                  {step === 4 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="currentlyInAustralia">{t("checker.inAustralia")}<Req /></Label>
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
                        <Label htmlFor="currentVisaType">{t("checker.currentVisa")}{formData.currentlyInAustralia === "yes" && <Req />}</Label>
                        <Input
                          id="currentVisaType"
                          value={formData.currentVisaType}
                          onChange={(e) => updateField("currentVisaType", e.target.value)}
                          placeholder={tx("e.g. Student 500", "Örn. Öğrenci 500", "例如：500 学生签证")}
                          className={getInputCls(!!err.currentVisaType)}
                        />
                        <FieldError msg={err.currentVisaType} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hasEmployerSponsor">{t("checker.sponsor")}<Req /></Label>
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
                        <Label htmlFor="hasPartnerOrFamilyInAustralia">{t("checker.familyInAustralia")}<Req /></Label>
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

                  {/* Step 5 */}
                  {step === 5 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="hasPassport">{t("checker.passport")}<Req /></Label>
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
                        <Label htmlFor="documentsReady">{t("checker.documents")}<Req /></Label>
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
                        <Label htmlFor="timeline">{t("checker.timeline")}<Req /></Label>
                        <Input
                          id="timeline"
                          value={formData.timeline}
                          onChange={(e) => updateField("timeline", e.target.value)}
                          placeholder="e.g. Within 6 months"
                          className={getInputCls(!!err.timeline)}
                        />
                        <FieldError msg={err.timeline} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="budgetRange">{t("checker.budget")}<Req /></Label>
                        <Input
                          id="budgetRange"
                          value={formData.budgetRange}
                          onChange={(e) => updateField("budgetRange", e.target.value)}
                          placeholder="e.g. AUD 10,000 - 20,000"
                          className={getInputCls(!!err.budgetRange)}
                        />
                        <FieldError msg={err.budgetRange} />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-4">
                    <Button variant="outline" onClick={goBack} disabled={step === 1} className="rounded-lg border-gray-200">
                      {t("checker.back")}
                    </Button>
                    <Button onClick={goNext} disabled={showErrors && !stepIsValid} className="rounded-lg bg-indigo-600 hover:bg-indigo-700">
                      {step === totalSteps ? t("checker.viewResults") : t("checker.continue")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                   <Bot className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-slate-900">Select an assessment mode</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Please select one of the assessment options from the right panel to begin your journey.</p>
              </div>
            )}
            
            <p className="text-center text-[10px] text-slate-400">
              {choiceCopy.compliance}
            </p>
          </div>

          {/* Right Column: Choices */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-5">
              <Card className="border-gray-100 bg-white shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base font-bold">{choiceCopy.quickTitle}</CardTitle>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 text-[10px] uppercase tracking-wider">{choiceCopy.quickLabel}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {choiceCopy.quickDescription}
                  </p>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full rounded-xl border-gray-200 text-slate-700 hover:bg-slate-50">
                    <Link
                      href={`/${locale}/checker?quick=1#quick-pathway-check`}
                      onClick={() => setShowQuickCheck(true)}
                    >
                      {choiceCopy.quickButton}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm rounded-2xl overflow-hidden ring-1 ring-indigo-500/5 transition-all hover:shadow-md">
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base font-bold text-indigo-950">{choiceCopy.fullTitle}</CardTitle>
                    <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 border-0 text-[10px] uppercase tracking-wider">{choiceCopy.fullLabel}</Badge>
                  </div>
                  <p className="text-sm text-indigo-800/70 leading-relaxed">
                    {choiceCopy.fullDescription}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                    <Link href={`/${locale}/full-check`}>{choiceCopy.fullButton}</Link>
                  </Button>
                  <p className="text-center text-[11px] font-medium text-indigo-600/70">{choiceCopy.fullTrustNote}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
