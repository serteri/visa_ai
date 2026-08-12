"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useSearchParams } from "next/navigation";

function RequiredMark() {
  return <span className="text-red-500 ml-1" aria-hidden="true">*</span>;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}
import { activeCountries, countryLabels, countryVisaPathways, migrationGoalOptions, getVisaSubclassesForGoals, type SupportedCountry, type MigrationGoalId } from "@/lib/countries";
import { useTranslation } from "@/contexts/language-context";
import { renderVisaPathwayOptions } from "./full-check-waitlist-form";

const COUNTRIES = [
  { code: "AU", label: "Australia" }, { code: "TR", label: "Turkey" }, { code: "IN", label: "India" },
  { code: "CN", label: "China" }, { code: "GB", label: "United Kingdom" }, { code: "US", label: "United States" },
  { code: "CA", label: "Canada" }, { code: "NZ", label: "New Zealand" }, { code: "PK", label: "Pakistan" },
  { code: "BD", label: "Bangladesh" }, { code: "NP", label: "Nepal" }, { code: "PH", label: "Philippines" },
  { code: "VN", label: "Vietnam" }, { code: "ID", label: "Indonesia" }, { code: "MY", label: "Malaysia" },
  { code: "SG", label: "Singapore" }, { code: "ZA", label: "South Africa" }, { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" }, { code: "DE", label: "Germany" }, { code: "FR", label: "France" },
  { code: "IT", label: "Italy" }, { code: "ES", label: "Spain" }, { code: "OTHER", label: "Other" },
] as const;

interface Step1Props {
  locale: string;
  selectedCountry: SupportedCountry;
  onCountryChange: (c: SupportedCountry) => void;
  initialValues: Record<string, string>;
  currentCountry: string;
  setCurrentCountry: (v: string) => void;
  passportCountry: string;
  setPassportCountry: (v: string) => void;
  migrationGoals: MigrationGoalId[];
  toggleMigrationGoal: (id: MigrationGoalId) => void;
  fieldErrors?: Record<string, string> | null;
  visaInterest: string;
  setVisaInterest: (v: string) => void;
  nominationStream: string;
  setNominationStream: (v: string) => void;
  yearsInSponsoredPosition: string;
  setYearsInSponsoredPosition: (v: string) => void;
  courseName: string;
  setCourseName: (v: string) => void;
  courseCricosCode: string;
  setCourseCricosCode: (v: string) => void;
  courseCompletionStatus: string;
  setCourseCompletionStatus: (v: string) => void;
  courseCompletionDate: string;
  setCourseCompletionDate: (v: string) => void;
  preferredState: string;
  setPreferredState: (v: string) => void;
  state: { errors?: Record<string, string> };
  fieldClassName: string;
  selectClassName: string;
  noAutofill: (name: string, override?: string) => Record<string, string>;
  showsCourseFields: (visa: string) => boolean;
}

export function Step1Personal({
  locale, selectedCountry, onCountryChange, initialValues,
  currentCountry, setCurrentCountry, passportCountry, setPassportCountry,
  migrationGoals, toggleMigrationGoal, visaInterest, setVisaInterest,
  nominationStream, setNominationStream, yearsInSponsoredPosition, setYearsInSponsoredPosition,
  courseName, setCourseName, courseCricosCode, setCourseCricosCode,
  courseCompletionStatus, setCourseCompletionStatus, courseCompletionDate, setCourseCompletionDate,
  preferredState, setPreferredState, state, fieldClassName, selectClassName, noAutofill,
  showsCourseFields,
  fieldErrors,
}: Step1Props) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const txt = (tr: string, en: string, zh: string) => isTr ? tr : isZh ? zh : en;
  const errCls = (id: string) => fieldErrors?.[id] ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";

  // GÖREV 1: URL'den ülke kilidi
  const searchParams = useSearchParams();
  const lockedCountry = ((): SupportedCountry | null => {
    const code = searchParams.get("country");
    if (!code) return null;
    const upper = code.toUpperCase();
    return ["AU", "CA"].includes(upper) ? (upper as SupportedCountry) : null;
  })();

  return (
    <>
      <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-full-name"] || undefined}>
        <Label htmlFor="waitlist-full-name">{txt("Ad soyad", "Full name", "姓名")}<RequiredMark /></Label>
        <Input id="waitlist-full-name" name="fullName" required {...noAutofill("fullName")} className={`${fieldClassName} ${errCls("waitlist-full-name")}`} placeholder={txt("Adınız", "Your name", "请输入姓名")} />
        {fieldErrors?.["waitlist-full-name"] && <p className="text-xs text-red-600">{fieldErrors["waitlist-full-name"]}</p>}
      </div>

      <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-email"] || undefined}>
        <Label htmlFor="waitlist-e">{txt("E-posta adresi", "Email address", "邮箱地址")}<RequiredMark /></Label>
        {/* Chrome autofill honeypot — redirects Chrome's saved-email dropdown to this invisible field */}
        <input type="email" name="fake_email" autoComplete="email" className="hidden" aria-hidden="true" tabIndex={-1} />
        <Input id="waitlist-e" name="contactEmail" type="text" inputMode="email" placeholder="you@example.com" autoComplete="nope" autoCorrect="off" autoCapitalize="off" spellCheck="false" data-lpignore="true" className={`${fieldClassName} ${errCls("waitlist-email")}`} required />
        {fieldErrors?.["waitlist-email"] && <p className="text-xs text-red-600">{fieldErrors["waitlist-email"]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="waitlist-target-country">{txt("Hangi ülke için rapor istiyorsunuz?", "Which country is this report for?", "您希望针对哪个国家生成报告？")}</Label>
        <Combobox
          placeholder={txt("Ülke seçin", "Select country", "请选择国家")}
          items={activeCountries.map(code => ({ value: code, label: countryLabels[code][isTr ? "tr" : isZh ? "zh-Hans" : "en"] }))}
          value={selectedCountry}
          onChange={(val) => onCountryChange(val as SupportedCountry)}
          disabled={lockedCountry !== null}
          className={selectClassName}
        />
        <input type="hidden" name="targetCountry" value={selectedCountry} />
      </div>

      <div className="space-y-3">
        <Label>{txt("Birincil göç hedefiniz nedir?", "What is your primary migration goal?", "您的主要移民目标是什么？")}</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {migrationGoalOptions.map((goal) => {
            const sel = migrationGoals.includes(goal.id);
            return (
              <button key={goal.id} type="button" onClick={() => toggleMigrationGoal(goal.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${sel ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" : "border-border/60 bg-background/60 hover:border-primary/40"}`}>
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${sel ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                    {sel && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${sel ? "text-primary" : "text-foreground"}`}>{goal.label[locale as "en" | "tr" | "zh-Hans"] ?? goal.label.en}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{goal.description[locale as "en" | "tr" | "zh-Hans"] ?? goal.description.en}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="migrationGoals" value={JSON.stringify(migrationGoals)} />
        <input type="hidden" name="mainGoal" value={migrationGoals.map((id) => migrationGoalOptions.find((g) => g.id === id)?.label.en ?? id).join(", ")} />
        {migrationGoals.length === 0 && <p className="text-xs text-muted-foreground">{txt("En az bir hedef seçin.", "Select at least one goal.", "请至少选择一个目标。")}</p>}
      </div>

      {migrationGoals.length === 0 && (
        <div className="space-y-2">
          <Label htmlFor="waitlist-visa-interest">{txt("veya belirli bir vize yolunu seçin", "or select a specific visa pathway", "或选择具体签证路径")}</Label>
          <select id="waitlist-visa-interest" name="visaInterest" value={visaInterest} onChange={(e) => setVisaInterest(e.target.value)} className={selectClassName}>
            <option value="">{txt("Tüm yollar / Emin değilim", "All pathways / Not sure", "全部路径 / 不确定")}</option>
            {renderVisaPathwayOptions(countryVisaPathways[selectedCountry], isTr, isZh)}
          </select>
        </div>
      )}
      {migrationGoals.length > 0 && <input type="hidden" name="visaInterest" value={getVisaSubclassesForGoals(migrationGoals).join(",")} />}

      {selectedCountry === "AU" && (migrationGoals.includes("direct_pr") || migrationGoals.includes("regional")) && (
        <div className="space-y-2">
          <Label htmlFor="waitlist-preferred-state">{txt("Tercih ettiğiniz eyalet?", "Preferred state?", "您偏好哪个州？")}</Label>
          <select id="waitlist-preferred-state" name="preferredState" value={preferredState} onChange={(e) => setPreferredState(e.target.value)} className={selectClassName}>
            <option value="">{txt("Seçin", "Select", "请选择")}</option>
            {[["NSW","New South Wales"],["VIC","Victoria"],["QLD","Queensland"],["SA","South Australia"],["WA","Western Australia"],["TAS","Tasmania"],["NT","Northern Territory"],["ACT","Australian Capital Territory"]].map(([c,n]) => <option key={c} value={c}>{c} — {n}</option>)}
          </select>
          <ErrorText message={state.errors?.preferredState} />
        </div>
      )}

      {visaInterest === "186" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-nomination-stream">{txt("186 için hangi akışı hedefliyorsunuz?", "Which subclass 186 stream?", "您计划申请186签证的哪个通道？")}</Label>
            <select id="waitlist-nomination-stream" name="nominationStream" value={nominationStream} onChange={(e) => setNominationStream(e.target.value)} className={selectClassName}>
              <option value="">{txt("Emin değilim", "Not sure", "不确定")}</option>
              <option value="direct_entry">Direct Entry</option>
              <option value="trt">Temporary Residence Transition (TRT)</option>
              <option value="labour_agreement">Labour Agreement</option>
            </select>
            <p className="text-xs text-muted-foreground">{txt("Direct Entry: yeni başvurular için. TRT: 457/482 ile 2+ yıl. LA: işveren anlaşmalı.", "Direct Entry: new applicants. TRT: 2+ years on 457/482. LA: employer has labour agreement.", "Direct Entry：新申请人。TRT：持457/482超2年。LA：雇主有劳工协议。")}</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--cf-line)] px-4 py-3">
            <input type="checkbox" id="waitlist-labour-agreement-employer" name="isLabourAgreementEmployer" className="h-4 w-4 rounded border-[var(--cf-line)] accent-[var(--cf-accent)]" />
            <Label htmlFor="waitlist-labour-agreement-employer" className="cursor-pointer text-sm font-medium text-foreground">Is your employer party to a Labour Agreement / DAMA?</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-years-sponsored-position">{txt("TRT: Sponsor altında çalışma süresi (yıl)", "TRT: Years under approved sponsor", "TRT：在获批担保方名下的工作年限")}</Label>
            <Input id="waitlist-years-sponsored-position" name="yearsInSponsoredPosition" type="number" min={0} step="0.5" inputMode="decimal" value={yearsInSponsoredPosition} onChange={(e) => setYearsInSponsoredPosition(e.target.value)} {...noAutofill("yearsInSponsoredPosition")} className={fieldClassName} placeholder={txt("Örn: 3", "E.g., 3", "例如：3")} />
          </div>
        </div>
      )}

      {showsCourseFields(visaInterest) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-course-name">{txt("Kurs adı (opsiyonel)", "Course name (optional)", "课程名称（可选）")}</Label>
            <Input id="waitlist-course-name" name="courseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} {...noAutofill("courseName")} className={fieldClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-course-cricos-code">{txt("CRICOS kodu (opsiyonel)", "CRICOS code (optional)", "CRICOS 代码（可选）")}</Label>
            <Input id="waitlist-course-cricos-code" name="courseCricosCode" value={courseCricosCode} onChange={(e) => setCourseCricosCode(e.target.value)} {...noAutofill("courseCricosCode")} className={fieldClassName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-course-completion-status">{txt("Kurs durumu", "Course status", "课程状态")}</Label>
            <select id="waitlist-course-completion-status" name="courseCompletionStatus" value={courseCompletionStatus} onChange={(e) => setCourseCompletionStatus(e.target.value)} className={selectClassName}>
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="studying">{txt("Hâlâ okuyorum", "Still studying", "仍在就读")}</option>
              <option value="completed">{txt("Tamamladım", "Completed", "已完成")}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-course-completion-date">{txt("Tahmini bitiş tarihi", "Est. completion date", "预计完成日期")}</Label>
            <Input id="waitlist-course-completion-date" name="courseCompletionDate" type="month" value={courseCompletionDate} onChange={(e) => setCourseCompletionDate(e.target.value)} {...noAutofill("courseCompletionDate")} className={fieldClassName} />
          </div>
        </div>
      )}

      <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-current-country"] || undefined}>
        <Label htmlFor="waitlist-current-country">{txt("Bulunduğunuz ülke", "Current country", "当前国家")}<RequiredMark /></Label>
        <Combobox
          placeholder={txt("Seçiniz", "Select", "请选择")}
          items={COUNTRIES.map(c => ({ value: c.code, label: c.label }))}
          value={currentCountry}
          onChange={(val) => { setCurrentCountry(val as SupportedCountry); }}
          className={`${selectClassName} ${errCls("waitlist-current-country")}`}
        />
        <input type="hidden" name="currentCountry" value={currentCountry} />
        {fieldErrors?.["waitlist-current-country"] && <p className="text-xs text-red-600">{fieldErrors["waitlist-current-country"]}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-passport-country"] || undefined}>
          <Label htmlFor="waitlist-passport-country">{txt("Pasaport ülke", "Passport country", "护照国家")}<RequiredMark /></Label>
          <Combobox
            placeholder={txt("Seçiniz", "Select", "请选择")}
            items={COUNTRIES.map(c => ({ value: c.code, label: c.label }))}
            value={passportCountry}
            onChange={(val) => { setPassportCountry(val as SupportedCountry); }}
            className={`${selectClassName} ${errCls("waitlist-passport-country")}`}
          />
          <input type="hidden" name="passportCountry" value={passportCountry} />
          {fieldErrors?.["waitlist-passport-country"] && <p className="text-xs text-red-600">{fieldErrors["waitlist-passport-country"]}</p>}
        </div>
        <div className="space-y-2" data-field-error={fieldErrors?.["waitlist-age"] || undefined}>
          <Label htmlFor="waitlist-age">{txt("Yaş", "Age", "年龄")}<RequiredMark /></Label>
          <Input id="waitlist-age" name="age" type="number" required {...noAutofill("age")} className={`${fieldClassName} ${errCls("waitlist-age")}`} placeholder={txt("Örn: 28", "E.g., 28", "例如：28")} />
          {fieldErrors?.["waitlist-age"] && <p className="text-xs text-red-600">{fieldErrors["waitlist-age"]}</p>}
        </div>
      </div>
    </>
  );
}
