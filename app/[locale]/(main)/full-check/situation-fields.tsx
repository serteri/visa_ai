"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";

/**
 * Three AU intake fields: employer sponsorship (required; years with the current sponsor only when sponsored on a
 * 482 / 457), state or territory of residence (required only when the current country is Australia) and the
 * application stage (optional, default "Planning"). Single selects, validated by the server action like the other
 * fields (actions.ts); the ids below are the ones the step-1 client check and the error map use.
 */

export const EMPLOYER_SPONSORSHIP_OPTIONS = [
  { value: "none", label: { en: "No employer sponsor or job offer", tr: "İşveren sponsoru veya iş teklifi yok", "zh-Hans": "没有雇主担保或工作邀约" } },
  { value: "job_offer", label: { en: "Job offer from an Australian employer willing to sponsor", tr: "Sponsor olmaya istekli bir Avustralya işvereninden iş teklifi", "zh-Hans": "有愿意担保的澳大利亚雇主的工作邀约" } },
  { value: "sponsored_482", label: { en: "Currently sponsored on a 482 or 457 visa", tr: "Şu anda 482 veya 457 vizesiyle sponsorlu", "zh-Hans": "目前持 482 或 457 签证获得担保" } },
] as const;

export const RESIDENCE_STATE_OPTIONS = [
  ["NSW", "New South Wales"],
  ["VIC", "Victoria"],
  ["QLD", "Queensland"],
  ["SA", "South Australia"],
  ["WA", "Western Australia"],
  ["TAS", "Tasmania"],
  ["NT", "Northern Territory"],
  ["ACT", "Australian Capital Territory"],
] as const;

export const APPLICATION_STAGE_OPTIONS = [
  { value: "planning", label: { en: "Planning", tr: "Planlama", "zh-Hans": "规划中" } },
  { value: "skills_assessment_in_progress", label: { en: "Skills assessment in progress", tr: "Beceri değerlendirmesi sürüyor", "zh-Hans": "技能评估进行中" } },
  { value: "eoi_submitted", label: { en: "EOI submitted", tr: "EOI gönderildi", "zh-Hans": "已提交 EOI" } },
  { value: "invited", label: { en: "Invited or nominated", tr: "Davet edildi veya aday gösterildi", "zh-Hans": "已获邀请或提名" } },
] as const;

/** Which conditional fields show: residence only when in Australia, sponsor years only when sponsored on a 482 / 457. */
export function situationFieldVisibility(currentCountry: string, employerSponsorship: string) {
  return { residence: currentCountry === "AU", sponsorYears: employerSponsorship === "sponsored_482" };
}

type Loc = "en" | "tr" | "zh-Hans";

export function SituationFields({
  locale,
  currentCountry,
  selectClassName,
  fieldErrors,
  initialEmployerSponsorship = "",
}: {
  locale: string;
  currentCountry: string;
  selectClassName: string;
  fieldErrors?: Record<string, string> | null;
  initialEmployerSponsorship?: string;
}) {
  const loc: Loc = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en";
  const txt = (en: string, tr: string, zh: string) => (loc === "tr" ? tr : loc === "zh-Hans" ? zh : en);
  const [employerSponsorship, setEmployerSponsorship] = useState(initialEmployerSponsorship);
  const show = situationFieldVisibility(currentCountry, employerSponsorship);
  const errCls = (id: string) => (fieldErrors?.[id] ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "");
  const Req = () => <span className="text-red-500 ml-1" aria-hidden="true">*</span>;
  const Err = ({ id }: { id: string }) => (fieldErrors?.[id] ? <p className="text-xs text-red-600">{fieldErrors[id]}</p> : null);

  return (
    <>
      <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-employer-sponsorship"] || undefined}>
        <Label htmlFor="waitlist-employer-sponsorship">{txt("Employer sponsorship", "İşveren sponsorluğu", "雇主担保")}<Req /></Label>
        <select id="waitlist-employer-sponsorship" name="employerSponsorship" required value={employerSponsorship} onChange={(e) => setEmployerSponsorship(e.target.value)} className={`${selectClassName} ${errCls("waitlist-employer-sponsorship")}`}>
          <option className="bg-gray-900 text-white" value="">{txt("Select", "Seçin", "请选择")}</option>
          {EMPLOYER_SPONSORSHIP_OPTIONS.map((o) => <option className="bg-gray-900 text-white" key={o.value} value={o.value}>{o.label[loc]}</option>)}
        </select>
        <Err id="waitlist-employer-sponsorship" />
      </div>

      {show.sponsorYears && (
        <div className="space-y-2">
          <Label htmlFor="waitlist-years-current-sponsor">{txt("Years with your current sponsor", "Mevcut sponsorunuzla geçen yıl", "与当前担保雇主的年限")}</Label>
          <select id="waitlist-years-current-sponsor" name="yearsWithCurrentSponsor" defaultValue="" className={selectClassName}>
            <option className="bg-gray-900 text-white" value="">{txt("Select", "Seçin", "请选择")}</option>
            {Array.from({ length: 11 }, (_, n) => <option className="bg-gray-900 text-white" key={n} value={String(n)}>{n === 10 ? "10+" : String(n)}</option>)}
          </select>
        </div>
      )}

      {show.residence && (
        <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-residence-state"] || undefined}>
          <Label htmlFor="waitlist-residence-state">{txt("State or territory you live in", "Yaşadığınız eyalet veya bölge", "您居住的州或领地")}<Req /></Label>
          <select id="waitlist-residence-state" name="residenceState" required defaultValue="" className={`${selectClassName} ${errCls("waitlist-residence-state")}`}>
            <option className="bg-gray-900 text-white" value="">{txt("Select", "Seçin", "请选择")}</option>
            {RESIDENCE_STATE_OPTIONS.map(([c, n]) => <option className="bg-gray-900 text-white" key={c} value={c}>{c} — {n}</option>)}
          </select>
          <Err id="waitlist-residence-state" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="waitlist-application-stage">{txt("Application stage (optional)", "Başvuru aşaması (isteğe bağlı)", "申请阶段（可选）")}</Label>
        <select id="waitlist-application-stage" name="applicationStage" defaultValue="planning" className={selectClassName}>
          {APPLICATION_STAGE_OPTIONS.map((o) => <option className="bg-gray-900 text-white" key={o.value} value={o.value}>{o.label[loc]}</option>)}
        </select>
      </div>
    </>
  );
}
