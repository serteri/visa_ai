"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ComplianceNotice } from "@/components/sections/compliance-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { calculateSkilledPoints } from "@/lib/points/calculate-skilled-points";
import type {
  AgeOption,
  AustralianEmploymentOption,
  EducationOption,
  EnglishOption,
  OverseasEmploymentOption,
  PartnerOption,
  SkilledPointsInput,
} from "@/lib/points/types";

const DEFAULT_INPUT: SkilledPointsInput = {
  age: "25_32",
  english: "competent",
  overseasEmployment: "lt3",
  australianEmployment: "lt1",
  education: "none_or_unsure",
  specialistEducation: false,
  australianStudyRequirement: false,
  professionalYear: false,
  credentialledCommunityLanguage: false,
  regionalStudy: false,
  partner: "none_or_unsure",
  hasStateNomination190: false,
};

function SelectRow<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 rounded-md border border-border/70 p-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );
}

export default function PointsCalculatorPage() {
  const params = useParams();
  const locale = String(params.locale ?? "en");
  const isTr = locale === "tr";

  const [input, setInput] = useState<SkilledPointsInput>(DEFAULT_INPUT);

  const result = useMemo(() => calculateSkilledPoints(input), [input]);

  const content = {
    pageBadge: isTr ? "Genel Bilgi Aracı" : "General Information Tool",
    title: isTr ? "Nitelikli Göç Puan Hesaplayıcısı" : "Skilled Migration Points Calculator",
    subtitle: isTr
      ? "Subclass 189 ve 190 için puanınızın genel bir tahminini görüntüleyin."
      : "Estimate your points score for subclass 189 and 190 pathways.",
    warning45: isTr
      ? "45 yaş veya üzeri seçimi 0 yaş puanı verir."
      : "Age 45 or older gives 0 points for age.",
    capNote: isTr
      ? "Yurt dışı ve Avustralya iş tecrübesi puanlarının toplamı en fazla 20 puandır."
      : "Combined overseas and Australian employment points are capped at 20.",
    minThreshold: isTr ? "Asgari puan eşiği: 65" : "Minimum points required: 65",
    statusAbove: isTr
      ? "Tahmini puanınız asgari puan eşiğini karşılayabilir. Bu durum davet veya vize sonucunu garanti etmez."
      : "Your estimated score may meet the minimum points threshold. This does not guarantee invitation or visa grant.",
    statusBelow: isTr
      ? "Tahmini puanınız asgari puan eşiğinin altında. Bu yol için daha fazla puana ihtiyaç duyabilirsiniz."
      : "Your estimated score is below the minimum points threshold. You may need more points before this pathway is relevant.",
    invitationNote: isTr
      ? "Davet garantili değildir. Eyalet veya bölge adaylık kriterleri ayrıca uygulanabilir."
      : "Invitation is not guaranteed. State or territory nomination criteria may also apply.",
    estimatePrefix: isTr ? "Tahmini puanınız" : "Your estimated points score is",
    cta189: isTr ? "Subclass 189 detaylarını görüntüle" : "View subclass 189 details",
    cta190: isTr ? "Subclass 190 detaylarını görüntüle" : "View subclass 190 details",
    ctaAgent: isTr
      ? "Kayıtlı bir göç danışmanı ile görüşün"
      : "Speak with a registered migration agent",
    compliance: isTr
      ? "Bu hesaplayıcı yalnızca genel bir tahmin sağlar. Göç tavsiyesi, hukuki tavsiye vermez ve davet veya vize sonucunu garanti etmez."
      : "This calculator provides a general estimate only. It does not provide migration advice, legal advice, or guarantee invitation or visa grant.",
  };

  const setField = <K extends keyof SkilledPointsInput>(key: K, value: SkilledPointsInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const ageOptions: { value: AgeOption; label: string }[] = [
    { value: "18_24", label: "18 to less than 25 (25 points)" },
    { value: "25_32", label: "25 to less than 33 (30 points)" },
    { value: "33_39", label: "33 to less than 40 (25 points)" },
    { value: "40_44", label: "40 to less than 45 (15 points)" },
    { value: "45_plus", label: "45 or older (0 points)" },
  ];

  const englishOptions: { value: EnglishOption; label: string }[] = [
    { value: "competent", label: "Competent English (0 points)" },
    { value: "proficient", label: "Proficient English (10 points)" },
    { value: "superior", label: "Superior English (20 points)" },
  ];

  const overseasOptions: { value: OverseasEmploymentOption; label: string }[] = [
    { value: "lt3", label: "Less than 3 years (0 points)" },
    { value: "3_4", label: "3 to less than 5 years (5 points)" },
    { value: "5_7", label: "5 to less than 8 years (10 points)" },
    { value: "8_plus", label: "8+ years (15 points)" },
  ];

  const ausOptions: { value: AustralianEmploymentOption; label: string }[] = [
    { value: "lt1", label: "Less than 1 year (0 points)" },
    { value: "1_2", label: "1 to less than 3 years (5 points)" },
    { value: "3_4", label: "3 to less than 5 years (10 points)" },
    { value: "5_7", label: "5 to less than 8 years (15 points)" },
    { value: "8_plus", label: "8+ years (20 points)" },
  ];

  const educationOptions: { value: EducationOption; label: string }[] = [
    { value: "doctorate", label: "Doctorate (20 points)" },
    {
      value: "bachelor_or_higher",
      label: "Bachelor degree or higher recognised standard (15 points)",
    },
    {
      value: "australian_diploma_or_trade",
      label: "Australian diploma or trade qualification (10 points)",
    },
    {
      value: "assessing_authority_recognised",
      label: "Qualification recognised by assessing authority (10 points)",
    },
    { value: "none_or_unsure", label: "None / not sure (0 points)" },
  ];

  const partnerOptions: { value: PartnerOption; label: string }[] = [
    {
      value: "partner_skilled",
      label: "Partner meets age, English and skill criteria (10 points)",
    },
    { value: "partner_competent_english", label: "Partner has competent English only (5 points)" },
    {
      value: "single_or_partner_au_citizen_or_pr",
      label: "Single or partner is Australian citizen/permanent resident (10 points)",
    },
    { value: "none_or_unsure", label: "None / not sure (0 points)" },
  ];

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">{content.pageBadge}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{content.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{content.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SelectRow id="age" label="Age" value={input.age} options={ageOptions} onChange={(v) => setField("age", v)} />
              <SelectRow
                id="english"
                label="English"
                value={input.english}
                options={englishOptions}
                onChange={(v) => setField("english", v)}
              />
              <SelectRow
                id="overseas"
                label="Overseas skilled employment"
                value={input.overseasEmployment}
                options={overseasOptions}
                onChange={(v) => setField("overseasEmployment", v)}
              />
              <SelectRow
                id="aus"
                label="Australian skilled employment"
                value={input.australianEmployment}
                options={ausOptions}
                onChange={(v) => setField("australianEmployment", v)}
              />
              <SelectRow
                id="education"
                label="Education"
                value={input.education}
                options={educationOptions}
                onChange={(v) => setField("education", v)}
              />
              <SelectRow
                id="partner"
                label="Partner"
                value={input.partner}
                options={partnerOptions}
                onChange={(v) => setField("partner", v)}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <CheckboxRow
                  id="bonus-specialist"
                  label="Specialist education qualification (10 points)"
                  checked={input.specialistEducation}
                  onChange={(checked) => setField("specialistEducation", checked)}
                />
                <CheckboxRow
                  id="bonus-aus-study"
                  label="Australian study requirement (5 points)"
                  checked={input.australianStudyRequirement}
                  onChange={(checked) => setField("australianStudyRequirement", checked)}
                />
                <CheckboxRow
                  id="bonus-pro-year"
                  label="Professional Year in Australia (5 points)"
                  checked={input.professionalYear}
                  onChange={(checked) => setField("professionalYear", checked)}
                />
                <CheckboxRow
                  id="bonus-language"
                  label="Credentialled community language (5 points)"
                  checked={input.credentialledCommunityLanguage}
                  onChange={(checked) => setField("credentialledCommunityLanguage", checked)}
                />
                <CheckboxRow
                  id="bonus-regional"
                  label="Study in regional Australia (5 points)"
                  checked={input.regionalStudy}
                  onChange={(checked) => setField("regionalStudy", checked)}
                />
                <CheckboxRow
                  id="state-nom-190"
                  label="State or territory nomination for subclass 190 (5 points)"
                  checked={input.hasStateNomination190}
                  onChange={(checked) => setField("hasStateNomination190", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{content.estimatePrefix}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Subclass 189</p>
                    <p className="text-2xl font-bold">{result.total189}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Subclass 190</p>
                    <p className="text-2xl font-bold">{result.total190}</p>
                  </div>
                </div>

                <p className="text-muted-foreground">{content.minThreshold}</p>

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-foreground">
                  <p>{result.total189 >= 65 ? content.statusAbove : content.statusBelow}</p>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-foreground">
                  <p>{result.total190 >= 65 ? content.statusAbove : content.statusBelow}</p>
                </div>
                <p className="text-muted-foreground">{content.invitationNote}</p>

                {result.age45OrOlder && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    {content.warning45}
                  </p>
                )}

                {result.employmentCapApplied && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    {content.capNote}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-sm">
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2 text-muted-foreground">Age</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.age}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">English</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.english}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Overseas skilled employment</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.overseasEmployment}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Australian skilled employment</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.australianEmployment}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Employment combined (before cap)</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.employmentCombinedBeforeCap}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Employment combined (after cap)</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.employmentCombinedAfterCap}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Education</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.education}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Bonus points total</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.bonus.total}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Partner</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.partner}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">State nomination (190)</td>
                        <td className="py-2 text-right font-semibold">{result.breakdown.stateNomination190}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild>
              <Link href={`/${locale}/visas/189`}>{content.cta189}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/visas/190`}>{content.cta190}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/${locale}/agent-referral`}>{content.ctaAgent}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 text-sm text-muted-foreground">{content.compliance}</CardContent>
        </Card>

        <ComplianceNotice />
      </section>
    </main>
  );
}
