"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function RequiredMark() {
  return <span className="text-red-500 ml-1" aria-hidden="true">*</span>;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/contexts/language-context";

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
  isQualificationRecognized: string; setIsQualificationRecognized: (v: string) => void;
  isResearchOrDoctorateQualification: boolean;
  annualSalaryAud: string; setAnnualSalaryAud: (v: string) => void;
  sponsorFamilyStatus: string; setSponsorFamilyStatus: (v: string) => void;
  sponsorFamilyOptions: { value: string; label: string }[];
  experienceHelpText: string;
  budgetCurrency: string;
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
    isQualificationRecognized, setIsQualificationRecognized,
    isResearchOrDoctorateQualification,
    annualSalaryAud, setAnnualSalaryAud,
    sponsorFamilyStatus, setSponsorFamilyStatus, sponsorFamilyOptions,
    experienceHelpText, budgetCurrency,
  } = props;

  const selectedCountryIsAU = selectedCountry === "AU";
  const selectedCountryIsCA = selectedCountry === "CA";

  return (
    <>
      {!isPartner && (
        <>
          <div className="space-y-2">
            <Label htmlFor="waitlist-english">{txt("İngilizce seviyesi", "English level", "英语水平")}<RequiredMark /></Label>
            <Select value={englishLevel} onValueChange={setEnglishLevel}>
              <SelectTrigger id="waitlist-english" className={fieldClassName}>
                <SelectValue placeholder={txt("Seçin", "Select", "请选择")} />
              </SelectTrigger>
              <SelectContent>{englishLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="englishLevel" value={englishLevel} />
            <ErrorText message={state.errors?.englishLevel} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-education">{txt("En yüksek eğitim seviyesi", "Highest Education Level", "最高学历")}<RequiredMark /></Label>
            <Select value={qualificationLevel} onValueChange={setQualificationLevel}>
              <SelectTrigger id="waitlist-education" className={fieldClassName}>
                <SelectValue placeholder={txt("Seçin", "Select", "请选择")} />
              </SelectTrigger>
              <SelectContent>{educationOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="qualificationLevel" value={qualificationLevel} />
            <ErrorText message={state.errors?.qualificationLevel} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-qualification-awarded-in-australia">
              {selectedCountryIsCA ? txt("ECA denkliği aldınız mı?", "Did you obtain an ECA?", "您是否获得了 ECA？") : txt("Avustralya kurumunda mı tamamladınız?", "Completed at Australian institution?", "在澳大利亚机构完成？")}
              <RequiredMark />
            </Label>
            <select id="waitlist-qualification-awarded-in-australia" name="qualificationAwardedInAustralia" value={qualificationAwardedInAustralia} onChange={(e) => { const v = e.target.value; setQualificationAwardedInAustralia(v); if (v !== "yes") { setQualificationRegionalAustralia(""); setSpecialistEducationStemResponse(""); } }} className={selectClassName}>
              <option value="yes">{txt("Evet", "Yes", "是")}</option>
              <option value="no">{txt("Hayır", "No", "否")}</option>
            </select>
            <ErrorText message={state.errors?.qualificationAwardedInAustralia} />
          </div>

          {selectedCountryIsAU && qualificationAwardedInAustralia === "yes" && (
            <div className="space-y-2">
              <Label>{txt("Bölgesel kampüs mü?", "Regional campus?", "偏远地区校区？")}</Label>
              <select name="qualificationRegionalAustralia" value={qualificationRegionalAustralia} onChange={(e) => setQualificationRegionalAustralia(e.target.value)} className={selectClassName}>
                <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option value="yes">{txt("Evet", "Yes", "是")}</option>
                <option value="no">{txt("Hayır", "No", "否")}</option>
              </select>
            </div>
          )}

          {selectedCountryIsAU && qualificationAwardedInAustralia === "no" && (
            <div className="space-y-2">
              <Label>{txt("Yabancı diploma tanındı mı?", "Overseas qualification recognized?", "海外学历已获认可？")}<RequiredMark /></Label>
              <select name="isQualificationRecognized" value={isQualificationRecognized} onChange={(e) => setIsQualificationRecognized(e.target.value)} className={selectClassName}>
                <option value="yes">{txt("Evet", "Yes", "是")}</option>
                <option value="no">{txt("Hayır", "No", "否")}</option>
              </select>
            </div>
          )}

          {selectedCountryIsAU && qualificationAwardedInAustralia === "yes" && isResearchOrDoctorateQualification && (
            <div className="space-y-2">
              <Label>{txt("STEM alanında mı?", "In a STEM field?", "STEM领域？")}</Label>
              <select name="specialistEducationStemResponse" value={specialistEducationStemResponse} onChange={(e) => setSpecialistEducationStemResponse(e.target.value)} className={selectClassName}>
                <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option value="yes">{txt("Evet", "Yes", "是")}</option>
                <option value="no">{txt("Hayır", "No", "否")}</option>
                <option value="not_sure">{txt("Emin değilim", "Not sure", "不确定")}</option>
              </select>
            </div>
          )}

          {selectedCountryIsAU && (
            <div className="space-y-2">
              <Label htmlFor="waitlist-salary-aud">{txt("Yıllık Maaş (AUD)", "Annual Salary (AUD)", "年薪（AUD）")}<RequiredMark /></Label>
              <Input id="waitlist-salary-aud" name="annualSalaryAud" type="number" min={0} step={1} inputMode="numeric" value={annualSalaryAud} onChange={(e) => setAnnualSalaryAud(e.target.value)} {...noAutofill("annualSalaryAud")} className={fieldClassName} placeholder="E.g., 85000" />
              <ErrorText message={state.errors?.annualSalaryAud} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-offshore-experience-years">{selectedCountryIsCA ? txt("Kanada dışı deneyim (yıl)", "Experience outside Canada (years)", "加拿大境外经验") : txt("Avustralya dışı deneyim (yıl)", "Experience outside Australia (years)", "澳大利亚境外经验")}</Label>
              <Input id="waitlist-offshore-experience-years" name="offshoreExperienceYears" type="number" min={0} step="0.5" inputMode="decimal" {...noAutofill("offshoreExperienceYears")} className={fieldClassName} placeholder="E.g., 5" />
              <p className="text-xs text-muted-foreground">{experienceHelpText}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlist-onshore-experience-years">{selectedCountryIsCA ? txt("Kanada içi deneyim (yıl)", "Experience in Canada (years)", "加拿大境内经验") : txt("Avustralya içi deneyim (yıl)", "Experience in Australia (years)", "澳大利亚境内经验")}</Label>
              <Input id="waitlist-onshore-experience-years" name="onshoreExperienceYears" type="number" min={0} step="0.5" inputMode="decimal" {...noAutofill("onshoreExperienceYears")} className={fieldClassName} placeholder="E.g., 2" />
              <p className="text-xs text-muted-foreground">{experienceHelpText}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-sponsor">{selectedCountryIsCA ? txt("Medeni durum", "Marital status", "婚姻状况") : txt("Sponsor veya aile durumu", "Sponsor or family status", "担保或家庭情况")}<RequiredMark /></Label>
            <Select value={sponsorFamilyStatus} onValueChange={setSponsorFamilyStatus}>
              <SelectTrigger id="waitlist-sponsor" className={fieldClassName}>
                <SelectValue placeholder={txt("Seçin", "Select", "请选择")} />
              </SelectTrigger>
              <SelectContent>{sponsorFamilyOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <input type="hidden" name="sponsorOrFamily" value={sponsorFamilyStatus} />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="waitlist-concern">{txt("En büyük endişe", "Biggest concern", "最大担忧")}</Label>
        <Input id="waitlist-concern" name="biggestConcern" {...noAutofill("biggestConcern")} className={fieldClassName} placeholder={txt("Belgeler, Puan, Dil testi", "Documents, Points, English test", "材料、分数、英语考试")} />
      </div>

      {!isPartner && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-english-test-taken">{txt("İngilizce testi alındı mı?", "English test taken?", "英语考试？")}</Label>
              <select id="waitlist-english-test-taken" name="englishTestTaken" defaultValue="" className={selectClassName}>
                <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option value="yes">{txt("Evet", "Yes", "是")}</option>
                <option value="no">{txt("Hayır", "No", "否")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlist-occupation-confirmed">{txt("Meslek net mi?", "Occupation confirmed?", "职业已确认？")}</Label>
              <select id="waitlist-occupation-confirmed" name="occupationConfirmed" defaultValue="" className={selectClassName}>
                <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option value="yes">{txt("Evet", "Yes", "是")}</option>
                <option value="no">{txt("Hayır", "No", "否")}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-graduate-visa-intent">{txt("Mezun vizesi hedefliyor musunuz?", "Graduate visa intent?", "毕业生签证意向？")}</Label>
            <select id="waitlist-graduate-visa-intent" name="hasGraduateVisaPathwayIntent" defaultValue="" className={selectClassName}>
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="yes">{txt("Evet", "Yes", "是")}</option>
              <option value="no">{txt("Hayır", "No", "否")}</option>
            </select>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="waitlist-budget-range">{txt("Bütçe aralığı", "Budget range", "预算范围")}</Label>
          <Input id="waitlist-budget-range" name="estimatedBudgetRange" {...noAutofill("estimatedBudgetRange")} className={fieldClassName} placeholder={`E.g., 10k-20k ${budgetCurrency}`} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="waitlist-timeline">{txt("Zamanlama", "Timeline", "时间规划")}</Label>
          <select id="waitlist-timeline" name="timeline" defaultValue="" className={selectClassName}>
            <option value="">Belirtmek istemiyorum</option>
            <option value="0-6">0-6 ay</option>
            <option value="6-12">6-12 ay</option>
            <option value="12+">12+ ay</option>
          </select>
        </div>
      </div>

      {state.status === "success" && state.message && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>}
      {state.status === "error" && state.message && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
    </>
  );
}
