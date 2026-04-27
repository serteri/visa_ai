"use client";

import { useActionState } from "react";
import { Download, LockKeyhole } from "lucide-react";

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

function LockedSection({ title, isTr }: { title: string; isTr: boolean }) {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <CardHeader className="opacity-45 blur-[1px]">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-45 blur-[1px]">
        <p className="text-sm text-muted-foreground">
          {isTr
            ? "Daha ayrıntılı bir bölüm geliştirilmektedir."
            : "A deeper section is being developed."}
        </p>
      </CardContent>
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <LockKeyhole className="size-4 text-primary" />
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

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
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
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-passport-country">{isTr ? "Pasaport ülkesi" : "Passport country"}</Label>
            <Input
              id="waitlist-passport-country"
              name="passportCountry"
              placeholder={isTr ? "Ülke adı" : "Country name"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-age">{isTr ? "Yaş" : "Age"}</Label>
            <Input
              id="waitlist-age"
              name="age"
              type="number"
              placeholder={isTr ? "Örn: 28" : "E.g., 28"}
            />
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
            : isTr ? "Ücretsiz temel raporu al" : "Get free basic report"}
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

          <ReportSection
            title={isTr ? "Olası vize yolları" : "Possible visa pathways"}
            items={state.report.pathwayComparison.map((p) =>
              p.subclass === "general" 
                ? p.reason 
                : `${p.visaName} (${p.subclass}): ${p.reason}`
            )}
          />

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
                  {isTr ? "Meslek incelemesi" : "Occupation review"}
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

          <div className="flex gap-3">
            <Button onClick={handleDownloadPDF} variant="default" className="flex gap-2">
              <Download className="size-4" />
              {isTr ? "Raporu PDF olarak indir" : "Download report PDF"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
