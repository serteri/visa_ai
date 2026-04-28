"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type FullCheckWaitlistState,
  submitFullCheckWaitlist,
} from "@/app/[locale]/full-check/actions";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PathwayDetailCard({
  title,
  confidenceLabel,
  confidenceExplanation,
  summary,
  keyRequirements,
  pathwayRisks,
  isTr,
}: {
  title: string;
  confidenceLabel: string;
  confidenceExplanation: string;
  summary: string;
  keyRequirements: string[];
  pathwayRisks: string[];
  isTr: boolean;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {isTr ? "Güven:" : "Confidence:"} {confidenceLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
        <p className="text-xs text-muted-foreground">{confidenceExplanation}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium">{isTr ? "Ana Gereklilikler" : "Key Requirements"}</p>
          <ul className="space-y-2 text-muted-foreground">
            {keyRequirements.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-medium">{isTr ? "Yola Özgü Riskler" : "Pathway-Specific Risks"}</p>
          <ul className="space-y-2 text-muted-foreground">
            {pathwayRisks.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function LockedSection({ title, isTr }: { title: string; isTr: boolean }) {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <CardHeader className="opacity-45 blur-[1px]">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-45 blur-[1px]">
        <p className="text-sm text-muted-foreground">
          {isTr
            ? "Bu bölüm ilgili ayrıntılar sağlandığında oluşturulan raporda yer alır."
            : "This section is included in the generated report when relevant details are provided."}
        </p>
      </CardContent>
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <Download className="size-4 text-primary" />
          <span>{isTr ? "Kilitli" : "Locked"}</span>
        </div>
      </div>
    </Card>
  );
}

export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
}: {
  locale: string;
  initialValues?: {
    visaInterest?: string;
    currentCountry?: string;
    mainGoal?: string;
    source?: string;
  };
}) {
  const isTr = locale === "tr";
  const initialState: FullCheckWaitlistState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitFullCheckWaitlist,
    initialState
  );

  function handleDownloadPDF() {
    if (!state.report) return;

    generateReadinessPDF({
      report: state.report,
      locale: locale === "tr" ? "tr" : "en",
      userInputSummary: state.userInput || {},
    });
  }

  function getConfidenceLabel(level: "low" | "medium" | "high") {
    if (isTr) {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }

    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getDifficultyLabel(level: "low" | "medium" | "high") {
    if (isTr) {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }

    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getIndicatorLabel(level: "low" | "medium" | "high") {
    if (isTr) {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }

    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="preferredLanguage" value={locale} />
        <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />

        <div className="space-y-2">
          <Label htmlFor="waitlist-full-name">{isTr ? "Ad soyad" : "Full name"}</Label>
          <Input
            id="waitlist-full-name"
            name="fullName"
            autoComplete="name"
            placeholder={isTr ? "Adınız" : "Your name"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">{isTr ? "E-posta adresi" : "Email address"}</Label>
          <Input
            id="waitlist-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <ErrorText message={state.errors?.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-visa-interest">{isTr ? "Vize ilgi alanı" : "Visa interest"}</Label>
          <Input
            id="waitlist-visa-interest"
            name="visaInterest"
            defaultValue={initialValues.visaInterest ?? ""}
            placeholder={isTr ? "Öğrenci, yetenekli, partner veya emin değilim" : "Student, skilled, partner, or not sure"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-current-country">{isTr ? "Bulunduğunuz ülke" : "Current country"}</Label>
          <Input
            id="waitlist-current-country"
            name="currentCountry"
            defaultValue={initialValues.currentCountry ?? ""}
            autoComplete="country-name"
            placeholder={isTr ? "Avustralya, Türkiye, Hindistan veya başka bir ülke" : "Australia, Turkiye, India, or elsewhere"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-main-goal">{isTr ? "Ana hedef" : "Main goal"}</Label>
          <Textarea
            id="waitlist-main-goal"
            name="mainGoal"
            defaultValue={initialValues.mainGoal ?? ""}
            placeholder={isTr ? "Raporun hangi konuda yardımcı olmasını istediğinizi belirtin" : "Tell us what you want the report to help with"}
            rows={3}
            required
          />
          <ErrorText message={state.errors?.mainGoal} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-passport-country">{isTr ? "Pasaport ülkesi" : "Passport country"}</Label>
            <Input
              id="waitlist-passport-country"
              name="passportCountry"
              required
              placeholder={isTr ? "Ülke adı" : "Country name"}
            />
            <ErrorText message={state.errors?.passportCountry} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-age">{isTr ? "Yaş" : "Age"}</Label>
            <Input
              id="waitlist-age"
              name="age"
              type="number"
              required
              placeholder={isTr ? "Örn: 28" : "E.g., 28"}
            />
            <ErrorText message={state.errors?.age} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-occupation">{isTr ? "Meslek" : "Occupation"}</Label>
          <Input
            id="waitlist-occupation"
            name="occupation"
            placeholder={isTr ? "Örn: Yazılım Mühendisi" : "E.g., Software Engineer"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-english">{isTr ? "İngilizce seviyesi" : "English level"}</Label>
          <Input
            id="waitlist-english"
            name="englishLevel"
            placeholder={isTr ? "Örn: IELTS 7.0 veya Yüksek" : "E.g., IELTS 7.0 or Proficient"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-sponsor">{isTr ? "Sponsor veya aile durumu" : "Sponsor or family status"}</Label>
          <Input
            id="waitlist-sponsor"
            name="sponsorOrFamily"
            placeholder={isTr ? "Örn: İşveren sponsor, Partner veya Aile" : "E.g., Employer sponsor, Partner, or Family"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-concern">{isTr ? "En büyük endişe" : "Biggest concern"}</Label>
          <Input
            id="waitlist-concern"
            name="biggestConcern"
            placeholder={isTr ? "Örn: Belgeler, Puan, Dil testi" : "E.g., Documents, Points, English test"}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-english-test-taken">
              {isTr ? "İngilizce testi alındı mı? (opsiyonel)" : "English test taken? (optional)"}
            </Label>
            <select
              id="waitlist-english-test-taken"
              name="englishTestTaken"
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="">{isTr ? "Belirtmek istemiyorum" : "Prefer not to say"}</option>
              <option value="yes">{isTr ? "Evet" : "Yes"}</option>
              <option value="no">{isTr ? "Hayır" : "No"}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-occupation-confirmed">
              {isTr ? "Meslek bilgisi net mi? (opsiyonel)" : "Occupation confirmed? (optional)"}
            </Label>
            <select
              id="waitlist-occupation-confirmed"
              name="occupationConfirmed"
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="">{isTr ? "Belirtmek istemiyorum" : "Prefer not to say"}</option>
              <option value="yes">{isTr ? "Evet" : "Yes"}</option>
              <option value="no">{isTr ? "Hayır" : "No"}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-budget-range">
              {isTr ? "Tahmini bütçe aralığı (opsiyonel)" : "Estimated budget range (optional)"}
            </Label>
            <Input
              id="waitlist-budget-range"
              name="estimatedBudgetRange"
              placeholder={isTr ? "Örn: 10k-20k AUD" : "E.g., 10k-20k AUD"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-timeline">
              {isTr ? "Zamanlama (opsiyonel)" : "Timeline (optional)"}
            </Label>
            <select
              id="waitlist-timeline"
              name="timeline"
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="">{isTr ? "Belirtmek istemiyorum" : "Prefer not to say"}</option>
              <option value="0-6">{isTr ? "0-6 ay" : "0-6 months"}</option>
              <option value="6-12">{isTr ? "6-12 ay" : "6-12 months"}</option>
              <option value="12+">{isTr ? "12+ ay" : "12+ months"}</option>
            </select>
          </div>
        </div>

        {state.status === "success" && state.message && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message}
          </p>
        )}

        {state.status === "error" && state.message && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? isTr ? "Oluşturuluyor..." : "Generating..."
            : isTr ? "Hazırlık raporunuzu oluşturun" : "Generate your readiness report"}
        </Button>
      </form>

      {state.status === "success" && state.report && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">
              {isTr ? "Tam vize hazırlık raporu" : "Full visa readiness report"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Bu rapor yapısal bilgiye ve kişisel duruma bağlıdır. Kayıtlı bir göç danışmanı ile yapılan görüşme ek inceleme sağlar."
                : "This report is based on structured information and personal circumstances. A consultation with a registered migration agent provides additional review."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isTr ? "Rapor göstergeleri" : "Report indicators"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-semibold">
                    {isTr ? "Veri Tamamlanma Skoru:" : "Data Completeness Score:"} {state.report.reportIndicators.dataCompletenessLabel} ({state.report.reportIndicators.dataCompletenessScore}/100)
                  </p>
                  <p className="text-sm font-semibold">
                    {isTr ? "Belge Hazırlık Göstergesi:" : "Document Readiness Indicator:"} {getIndicatorLabel(state.report.reportIndicators.documentReadinessIndicator)}
                  </p>
                  <p className="text-sm font-semibold">
                    {isTr ? "Bilgi Kapsam Düzeyi:" : "Information Coverage Level:"} {getIndicatorLabel(state.report.reportIndicators.informationCoverageLevel)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {state.report.reportIndicators.explanation}
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    {isTr ? "Birincil Boşluk" : "Primary Gap"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{state.report.primaryGap}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Veri Tamamlanma Düzeyi" : "Data Completeness"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold">
                  {isTr ? "Tamamlanma:" : "Completeness:"} {state.report.reportIndicators.dataCompletenessLabel} ({state.report.dataCompleteness.percentage}%)
                </p>
                {state.report.dataCompleteness.missingFields.length > 0 ? (
                  <ul className="space-y-1 text-muted-foreground">
                    {state.report.dataCompleteness.missingFields.map((field) => (
                      <li key={field} className="flex gap-2">
                        <span className="text-primary">-</span>
                        <span>{field}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    {isTr ? "Ana veri alanları tamamlandı." : "Core data fields are complete."}
                  </p>
                )}
              </CardContent>
            </Card>

            {state.report.pathwayComparison.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isTr ? "Yapılandırılmış yol karşılaştırması" : "Structured pathway comparison"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">{isTr ? "Vize" : "Visa"}</th>
                        <th className="pb-2 pr-4 font-medium">{isTr ? "Zorluk" : "Difficulty"}</th>
                        <th className="pb-2 pr-4 font-medium">{isTr ? "Gereklilik Türü" : "Requirement Type"}</th>
                        <th className="pb-2 font-medium">{isTr ? "Size Göre Konum" : "User-Relative Position"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.report.pathwayComparison.map((pathway) => (
                        <tr
                          key={`${pathway.subclass}-${pathway.visaName}-table`}
                          className="border-b align-top"
                        >
                          <td className="py-2 pr-4">
                            {pathway.subclass === "general"
                              ? pathway.visaName
                              : `${pathway.visaName} (${pathway.subclass})`}
                          </td>
                          <td className="py-2 pr-4">{getDifficultyLabel(pathway.difficulty)}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{pathway.requirementType}</td>
                          <td className="py-2 text-muted-foreground">{pathway.userRelativePosition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1">
              <h4 className="text-base font-semibold">
                {isTr ? "Olası vize yolları" : "Possible visa pathways"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {isTr
                  ? "Her yol, güven seviyesi, ana gereklilikler ve yola özgü risklerle birlikte gösterilir."
                  : "Each pathway is shown with a confidence level, key requirements, and pathway-specific risks."}
              </p>
            </div>

            <div className="grid gap-4">
              {state.report.pathwayComparison.map((pathway) => (
                <PathwayDetailCard
                  key={`${pathway.subclass}-${pathway.visaName}`}
                  title={
                    pathway.subclass === "general"
                      ? pathway.visaName
                      : `${pathway.visaName} (${pathway.subclass})`
                  }
                  confidenceLabel={getConfidenceLabel(pathway.confidenceLevel)}
                  confidenceExplanation={pathway.confidenceExplanation}
                  summary={pathway.reason}
                  keyRequirements={pathway.keyRequirements}
                  pathwayRisks={pathway.pathwaySpecificRisks}
                  isTr={isTr}
                />
              ))}
            </div>
          </div>

          {state.report.keyVisaRequirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Ana vize gereklilikleri" : "Key visa requirements"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {state.report.keyVisaRequirements.map((requirement) => (
                  <div key={requirement.pathway} className="space-y-2">
                    <p className="font-medium text-sm">{requirement.pathway}</p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      {requirement.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-primary">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {state.report.whatThisMeans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Bunun anlamı" : "What this means"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {state.report.whatThisMeans.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <ReportSection
            title={isTr ? "Risk göstergeleri" : "Risk indicators"}
            items={state.report.riskIndicators.map(
              (r) => `[${isTr ? (r.level === "high" ? "Yüksek" : r.level === "medium" ? "Orta" : "Düşük") : (r.level === "high" ? "High" : r.level === "medium" ? "Medium" : "Low")}] ${r.title}: ${r.explanation}`
            )}
          />

          {state.report.documentChecklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Belge kontrol listesi" : "Document checklist"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.report.documentChecklist.map((category) => (
                  <div key={category.category}>
                    <p className="font-medium text-sm mb-2">{category.category}</p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      {category.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-primary">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {state.report.pointsEstimate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Puan tahmini" : "Points estimate"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.report.pointsEstimate.estimatedPoints !== undefined && (
                  <p className="font-semibold">
                    {isTr ? "Tahmini puan:" : "Estimated points:"} {state.report.pointsEstimate.estimatedPoints}
                  </p>
                )}
                {state.report.pointsEstimate.breakdown.length > 0 && (
                  <div className="space-y-1">
                    {state.report.pointsEstimate.breakdown.map((item) => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.points}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{state.report.pointsEstimate.note}</p>
              </CardContent>
            </Card>
          )}

          {state.report.occupationIndication && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Meslek göstergesi" : "Occupation indication"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.report.occupationIndication.occupation && (
                  <p className="font-medium">{state.report.occupationIndication.occupation}</p>
                )}
                {state.report.occupationIndication.matches.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {state.report.occupationIndication.matches.map((match) => (
                      <li key={match.title}>
                        <p className="font-medium">{match.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {isTr ? "İlgili vizeler:" : "Relevant visas:"} {match.relevantVisas.join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-2">{state.report.occupationIndication.note}</p>
              </CardContent>
            </Card>
          )}

          <ReportSection
            title={isTr ? "Önerilen sonraki adımlar" : "Suggested next steps"}
            items={state.report.suggestedNextSteps}
          />

          {state.report.factorsAffectingPathways.length > 0 && (
            <ReportSection
              title={isTr ? "Yolları etkileyebilecek faktörler" : "Factors that may affect pathways"}
              items={state.report.factorsAffectingPathways}
            />
          )}

          {state.report.missingInformation.length > 0 && (
            <ReportSection
              title={isTr ? "Eksik bilgiler" : "Missing information"}
              items={state.report.missingInformation}
            />
          )}

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm text-amber-900">
                {isTr ? "Uyarı" : "Disclaimer"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-800">{state.report.disclaimer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isTr ? "İndirilebilir PDF" : "Downloadable PDF"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadPDF} variant="default" className="flex gap-2">
                <Download className="size-4" />
                {isTr ? "PDF indir" : "Download PDF"}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
