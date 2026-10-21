"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function RequiredMark() {
  return <span className="text-red-700 ml-1" aria-hidden="true">*</span>;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}
import { CanadaCrsFields } from "./canada-crs-fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Step3Props {
  locale: string;
  selectedCountry: string;
  isPartner: boolean;
  englishLevel: string; setEnglishLevel: (v: string) => void;
  englishLevelOptions: { value: string; label: string }[];
  qualificationLevel: string; setQualificationLevel: (v: string) => void;
  educationOptions: { value: string; label: string }[];
  qualificationAwardedInAustralia: string; setQualificationAwardedInAustralia: (v: string) => void;
  qualificationRegionalAustralia: string; setQualificationRegionalAustralia: (v: string) => void;
  specialistEducationStemResponse: string; setSpecialistEducationStemResponse: (v: string) => void;
  isResearchOrDoctorateQualification: boolean;
  /** The visitor explicitly answered Yes to the skills-assessment question in step 2. */
  skillsAssessmentYes: boolean;
  isQualificationRecognized: string; setIsQualificationRecognized: (v: string) => void;
  annualSalaryAud: string; setAnnualSalaryAud: (v: string) => void;
  sponsorFamilyStatus: string; setSponsorFamilyStatus: (v: string) => void;
  sponsorFamilyOptions: { value: string; label: string }[];
  experienceHelpText: string;
  visaInterest: string;
  state: { errors?: Record<string, string>; status?: string; message?: string };
  fieldClassName: string; selectClassName: string;
  noAutofill: (name: string) => Record<string, string>;
}

export function Step3Language(props: Step3Props) {
  const { locale, selectedCountry, isPartner, state, fieldClassName, selectClassName, noAutofill } = props;
  const isTr = locale === "tr"; const isZh = locale === "zh-Hans";
  const txt = (tr: string, en: string, zh: string) => isTr ? tr : isZh ? zh : en;
  const {
    englishLevel, setEnglishLevel, englishLevelOptions,
    qualificationLevel, setQualificationLevel, educationOptions,
    qualificationAwardedInAustralia, setQualificationAwardedInAustralia,
    qualificationRegionalAustralia, setQualificationRegionalAustralia,
    specialistEducationStemResponse, setSpecialistEducationStemResponse,
    isResearchOrDoctorateQualification,
    skillsAssessmentYes,
    isQualificationRecognized, setIsQualificationRecognized,
    annualSalaryAud, setAnnualSalaryAud,
    sponsorFamilyStatus, setSponsorFamilyStatus, sponsorFamilyOptions,
    experienceHelpText,
  } = props;

  const selectedCountryIsAU = selectedCountry === "AU";
  const selectedCountryIsCA = selectedCountry === "CA";

  return (
    <>
      {!isPartner && (
        <>
          {selectedCountryIsCA ? (
            <>
              <CanadaCrsFields selectClassName={selectClassName} errors={state.errors} setEnglishLevel={setEnglishLevel} setQualificationLevel={setQualificationLevel} setSponsorFamilyStatus={setSponsorFamilyStatus} />
              <input type="hidden" name="englishLevel" value={englishLevel} />
              <input type="hidden" name="qualificationLevel" value={qualificationLevel} />
              <input type="hidden" name="sponsorOrFamily" value={sponsorFamilyStatus} />
            </>
          ) : (
            <>
          <div className="space-y-2">
            <Label htmlFor="waitlist-english">{txt("İngilizce seviyesi", "English level", "英语水平")}<RequiredMark /></Label>
            <Select value={englishLevel} onValueChange={setEnglishLevel}>
              <SelectTrigger id="waitlist-english" className={`${fieldClassName} h-auto min-h-11 whitespace-normal [&>span]:text-left`}>
                <SelectValue placeholder={txt("Seçin", "Select", "请选择")} />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">{englishLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="englishLevel" value={englishLevel} />
            <ErrorText message={state.errors?.englishLevel} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-education">{txt("En yüksek eğitim seviyesi", "Highest Education Level", "最高学历")}<RequiredMark /></Label>
            <Select value={qualificationLevel} onValueChange={setQualificationLevel}>
              <SelectTrigger id="waitlist-education" className={`${fieldClassName} h-auto min-h-11 whitespace-normal [&>span]:text-left`}>
                <SelectValue placeholder={txt("Seçin", "Select", "请选择")} />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">{educationOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="qualificationLevel" value={qualificationLevel} />
            <ErrorText message={state.errors?.qualificationLevel} />
          </div>

            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="waitlist-qualification-awarded-in-australia">
              {selectedCountryIsCA ? txt("ECA denkliği aldınız mı?", "Did you obtain an ECA?", "您是否获得了 ECA？") : txt("Avustralya kurumunda mı tamamladınız?", "Completed at Australian institution?", "在澳大利亚机构完成？")}
              <RequiredMark />
            </Label>
            <select id="waitlist-qualification-awarded-in-australia" name="qualificationAwardedInAustralia" value={qualificationAwardedInAustralia} onChange={(e) => { const v = e.target.value; setQualificationAwardedInAustralia(v); if (v !== "yes") { setQualificationRegionalAustralia(""); setSpecialistEducationStemResponse(""); } }} className={selectClassName}>
              {/* Explicit empty option matching the "" initial state -- without
                  it, a native <select> silently falls back to displaying its
                  FIRST option ("Yes") whenever `value` doesn't match any
                  <option>, even though React's own state is still "" (nothing
                  chosen). That made the field look pre-answered "Yes" before
                  the user ever touched it. */}
              <option className="bg-gray-900 text-white" value="" disabled hidden>{txt("Seçin", "Select", "请选择")}</option>
              <option className="bg-gray-900 text-white" value="yes">{txt("Evet", "Yes", "是")}</option>
              <option className="bg-gray-900 text-white" value="no">{txt("Hayır", "No", "否")}</option>
            </select>
            <ErrorText message={state.errors?.qualificationAwardedInAustralia} />
          </div>

          {selectedCountryIsAU && qualificationAwardedInAustralia === "yes" && (
            <div className="space-y-2">
              <Label>{txt("Bölgesel kampüs mü?", "Regional campus?", "偏远地区校区？")}</Label>
              <select name="qualificationRegionalAustralia" value={qualificationRegionalAustralia} onChange={(e) => setQualificationRegionalAustralia(e.target.value)} className={selectClassName}>
                <option className="bg-gray-900 text-white" value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option className="bg-gray-900 text-white" value="yes">{txt("Evet", "Yes", "是")}</option>
                <option className="bg-gray-900 text-white" value="no">{txt("Hayır", "No", "否")}</option>
              </select>
            </div>
          )}

          {/* Recognition of an overseas degree can only be answered once a skills assessment exists: whether the
              assessment (or the relevant authority) recognised the degree as comparable to the Australian level. */}
          {selectedCountryIsAU && qualificationAwardedInAustralia === "no" && skillsAssessmentYes && (
            <div className="space-y-2">
              <Label htmlFor="waitlist-qualification-recognized">
                {txt(
                  "Beceri değerlendirmeniz (veya ilgili kurum) derecenizi Avustralya seviyesiyle karşılaştırılabilir olarak tanıdı mı?",
                  "Did your skills assessment (or the relevant authority) recognise your degree as comparable to the Australian level?",
                  "您的技能评估（或相关机构）是否认可您的学位与澳大利亚水平相当？"
                )}
              </Label>
              <select id="waitlist-qualification-recognized" name="isQualificationRecognized" value={isQualificationRecognized} onChange={(e) => setIsQualificationRecognized(e.target.value)} className={selectClassName}>
                <option className="bg-gray-900 text-white" value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option className="bg-gray-900 text-white" value="yes">{txt("Evet", "Yes", "是")}</option>
                <option className="bg-gray-900 text-white" value="no">{txt("Hayır", "No", "否")}</option>
              </select>
            </div>
          )}

          {/* PhD / Master's (Research) completed in Australia: the specialist education (STEM) points need a STEM field. */}
          {selectedCountryIsAU && qualificationAwardedInAustralia === "yes" && isResearchOrDoctorateQualification && (
            <div className="flex items-start gap-3 py-1">
              <input
                id="waitlist-specialist-stem"
                type="checkbox"
                checked={specialistEducationStemResponse === "yes"}
                onChange={(e) => setSpecialistEducationStemResponse(e.target.checked ? "yes" : "no")}
                className="mt-1 size-4 accent-[#53917E]"
              />
              <Label htmlFor="waitlist-specialist-stem" className="text-sm font-normal leading-snug">
                {txt(
                  "Bu bir STEM derecesi mi? (Fen, Teknoloji, Mühendislik, Matematik)",
                  "Is this a STEM degree? (Science, Tech, Engineering, Math)",
                  "这是 STEM 学位吗？（科学、技术、工程、数学）"
                )}
              </Label>
              <input type="hidden" name="specialistEducationStemResponse" value={specialistEducationStemResponse === "yes" ? "yes" : "no"} />
            </div>
          )}

          {selectedCountryIsAU && ["482", "186", "494", "not_sure"].includes(props.visaInterest) && (
            <div className="space-y-2">
              <Label htmlFor="waitlist-salary-aud">{txt("Yıllık maaş (AUD, isteğe bağlı)", "Annual salary (AUD, optional)", "年薪（AUD，可选）")}</Label>
              <Input id="waitlist-salary-aud" name="annualSalaryAud" type="number" min={0} step={1} inputMode="numeric" value={annualSalaryAud} onChange={(e) => setAnnualSalaryAud(e.target.value)} {...noAutofill("annualSalaryAud")} className={fieldClassName} placeholder={txt("Örn: 85000", "E.g., 85000", "例如：85000")} autoComplete="off" />
              <ErrorText message={state.errors?.annualSalaryAud} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-offshore-experience-years">{selectedCountryIsCA ? txt("Kanada dışı nitelikli iş deneyimi (yıl, yoksa 0)", "Skilled work experience outside Canada (years; 0 if none)", "加拿大境外技术工作经验（年；没有请填 0）") : txt("Avustralya dışı deneyim (yıl)", "Experience outside Australia (years)", "澳大利亚境外经验")}</Label>
              <Input id="waitlist-offshore-experience-years" name="offshoreExperienceYears" type="number" min={0} step="0.5" inputMode="decimal" {...noAutofill("offshoreExperienceYears")} className={fieldClassName} placeholder={txt("Örn: 5", "E.g., 5", "例如：5")} />
              <p className="text-xs text-gray-400">{experienceHelpText}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlist-onshore-experience-years">{selectedCountryIsCA ? txt("Kanada içi nitelikli iş deneyimi (yıl, yoksa 0)", "Skilled work experience in Canada (years; 0 if none)", "加拿大境内技术工作经验（年；没有请填 0）") : txt("Avustralya içi deneyim (yıl)", "Experience in Australia (years)", "澳大利亚境内经验")}</Label>
              <Input id="waitlist-onshore-experience-years" name="onshoreExperienceYears" type="number" min={0} step="0.5" inputMode="decimal" {...noAutofill("onshoreExperienceYears")} className={fieldClassName} placeholder={txt("Örn: 2", "E.g., 2", "例如：2")} />
              <p className="text-xs text-gray-400">{experienceHelpText}</p>
            </div>
          </div>

          {!selectedCountryIsCA && (
          <div className="space-y-2">
            <Label htmlFor="waitlist-sponsor">{selectedCountryIsCA ? txt("Medeni durum", "Marital status", "婚姻状况") : txt("Partner puanı için ilişki durumu", "Relationship information for partner points", "伴侣积分相关情况")}<RequiredMark /></Label>
            <Select value={sponsorFamilyStatus} onValueChange={setSponsorFamilyStatus}>
              <SelectTrigger id="waitlist-sponsor" className={`${fieldClassName} h-auto min-h-11 whitespace-normal [&>span]:text-left`}>
                <SelectValue placeholder={txt("Seçin", "Select", "请选择")} />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">{sponsorFamilyOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="sponsorOrFamily" value={sponsorFamilyStatus} />
          </div>
          )}
        </>
      )}

      {!isPartner && (
        <>
          <div className="space-y-2">
            <Label htmlFor="waitlist-graduate-visa-intent">{txt("Mezun vizesi hedefliyor musunuz?", "Graduate visa intent?", "毕业生签证意向？")}</Label>
            <select id="waitlist-graduate-visa-intent" name="hasGraduateVisaPathwayIntent" defaultValue="" className={selectClassName}>
              <option className="bg-gray-900 text-white" value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option className="bg-gray-900 text-white" value="yes">{txt("Evet", "Yes", "是")}</option>
              <option className="bg-gray-900 text-white" value="no">{txt("Hayır", "No", "否")}</option>
            </select>
          </div>
        </>
      )}

      {state.status === "success" && state.message && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>}
      {state.status === "error" && state.message && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
    </>
  );
}
