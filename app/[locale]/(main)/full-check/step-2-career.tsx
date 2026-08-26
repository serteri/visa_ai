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
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/language-context";
import { getSkilledListMembership } from "@/lib/readiness/occupation-eligibility";

interface Step2Props {
  locale: string;
  selectedCountry: string;
  isPartner: boolean;
  nocSearch: string; setNocSearch: (v: string) => void;
  nocCode: string; setNocCode: (v: string) => void;
  nocTeer: number | null; setNocTeer: (v: number | null) => void;
  nocResults: any[]; setNocResults: (v: any[]) => void;
  nocOpen: boolean; setNocOpen: (v: boolean) => void;
  searchNoc: (q: string) => any[];
  anzscoSearch: string; setAnzscoSearch: (v: string) => void;
  anzscoCode: string; setAnzscoCode: (v: string) => void;
  resolvedAnzscoEntry: any;
  anzscoResults: any[]; setAnzscoResults: (v: any[]) => void;
  anzscoOpen: boolean; setAnzscoOpen: (v: boolean) => void;
  searchAnzsco: (q: string, locale: string) => any[];
  getLocalizedAnzscoTitle: (e: any, locale: string) => string;
  submittedOccupationValue: string;
  setOccupationModalOpen: (v: boolean) => void;
  relationshipType: string; setRelationshipType: (v: string) => void;
  cohabitationDuration: string; setCohabitationDuration: (v: string) => void;
  sponsorStatus: string; setSponsorStatus: (v: string) => void;
  previousSponsorship: string; setPreviousSponsorship: (v: string) => void;
  applicationLocationPreference: string; setApplicationLocationPreference: (v: string) => void;
  relationshipEvidence: string[]; setRelationshipEvidence: (v: string[]) => void;
  state: { errors?: Record<string, string> };
  fieldClassName: string; selectClassName: string;
  noAutofill: (name: string) => Record<string, string>;
}

export function Step2Career(props: Step2Props) {
  const { locale, selectedCountry, isPartner, state, fieldClassName, selectClassName, noAutofill } = props;
  const isTr = locale === "tr"; const isZh = locale === "zh-Hans";
  const txt = (tr: string, en: string, zh: string) => isTr ? tr : isZh ? zh : en;
  const {
    nocSearch, setNocSearch, nocCode, setNocCode, nocTeer, setNocTeer,
    nocResults, setNocResults, nocOpen, setNocOpen, searchNoc,
    anzscoSearch, setAnzscoSearch, anzscoCode, setAnzscoCode, resolvedAnzscoEntry,
    anzscoResults, setAnzscoResults, anzscoOpen, setAnzscoOpen, searchAnzsco,
    getLocalizedAnzscoTitle, submittedOccupationValue, setOccupationModalOpen,
    relationshipType, setRelationshipType, cohabitationDuration, setCohabitationDuration,
    sponsorStatus, setSponsorStatus, previousSponsorship, setPreviousSponsorship,
    applicationLocationPreference, setApplicationLocationPreference,
    relationshipEvidence, setRelationshipEvidence,
  } = props;

  const selectedCountryIsAU = selectedCountry === "AU";
  const selectedCountryIsCA = selectedCountry === "CA";

  return (
    <>
      {!isPartner && (
        <div className="space-y-2">
          <Label htmlFor="waitlist-occupation">
            {txt("Meslek", "Occupation", "职业")}<RequiredMark />
            {selectedCountryIsCA && <span className="ml-1.5 text-xs text-muted-foreground font-normal">({txt("NOC 2021 araması", "NOC 2021 search", "NOC 2021 搜索")})</span>}
          </Label>
          {selectedCountryIsCA ? (
            <div className="relative">
              <input id="waitlist-occupation" type="text" value={nocSearch} {...props.noAutofill("occupation")} onChange={(e) => { setNocSearch(e.target.value); setNocCode(""); setNocTeer(null); setNocResults(searchNoc(e.target.value)); setNocOpen(true); }} onBlur={() => setTimeout(() => setNocOpen(false), 150)} onFocus={() => { if (nocSearch.length >= 2) { setNocResults(searchNoc(nocSearch)); setNocOpen(true); } }} className={fieldClassName + " w-full"} placeholder={txt("Yazılım Mühendisi veya NOC kodu", "Software Engineer or NOC code", "软件工程师或 NOC 代码")} />
              <input type="hidden" name="occupation" value={nocSearch} />
              {nocCode && <><input type="hidden" name="nocCode" value={nocCode} /><p className="mt-1 text-xs text-emerald-700">{txt("Seçildi:", "Selected:", "已选：")} {nocCode} · TEER {nocTeer}</p></>}
              {nocOpen && nocResults.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg text-sm">
                  {nocResults.map((entry) => (
                    <li key={entry.code} onMouseDown={(e) => { e.preventDefault(); setNocSearch(entry.title); setNocCode(entry.code); setNocTeer(entry.teer); setNocOpen(false); setNocResults([]); }} className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-muted">
                      <span>{entry.title}</span><span className="shrink-0 text-xs text-muted-foreground">{entry.code} · TEER {entry.teer}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="relative">
              <input id="waitlist-occupation" type="text" value={anzscoSearch} {...noAutofill("occupation")} onChange={(e) => { setAnzscoSearch(e.target.value); setAnzscoCode(""); setAnzscoResults(searchAnzsco(e.target.value, locale)); setAnzscoOpen(true); }} onBlur={() => setTimeout(() => setAnzscoOpen(false), 150)} onFocus={() => { if (anzscoSearch.length >= 2) { setAnzscoResults(searchAnzsco(anzscoSearch, locale)); setAnzscoOpen(true); } }} className={fieldClassName + " w-full"} placeholder={txt("Yazılım Mühendisi", "Software Engineer", "软件工程师")} />
              <input type="hidden" name="occupation" value={submittedOccupationValue} />
              {resolvedAnzscoEntry && <p className="mt-1 text-xs text-emerald-700">{txt("Seçildi:", "Selected:", "已选：")} {resolvedAnzscoEntry.code} · {getLocalizedAnzscoTitle(resolvedAnzscoEntry, locale)}</p>}
              {anzscoOpen && anzscoResults.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg text-sm">
                  {anzscoResults.map((entry) => {
                    const nameStyle = entry.isOnSkilledList === false ? "text-muted-foreground" : "text-foreground font-medium";
                    return (
                      <li key={entry.code} onMouseDown={(e) => { e.preventDefault(); setAnzscoSearch(getLocalizedAnzscoTitle(entry, locale)); setAnzscoCode(entry.code); setAnzscoOpen(false); setAnzscoResults([]); }} className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-muted">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`${nameStyle} truncate`}>{getLocalizedAnzscoTitle(entry, locale)}</span>
                          {entry.isOnSkilledList === false && <Badge variant="outline" className="shrink-0 scale-90 border-gray-800 bg-black text-gray-500 font-normal">{txt("Nitelikli Listede Değil", "Not on Skilled List", "不在主要职业清单上")}</Badge>}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{entry.code}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {selectedCountryIsAU && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              {txt("Emin değil misiniz?", "Not sure?", "不确定？")}{" "}
              <button type="button" onClick={() => setOccupationModalOpen(true)} className="inline-flex items-center gap-0.5 text-indigo-500 underline-offset-2 hover:text-indigo-700 hover:underline">
                {txt("2026 Resmi Meslek Listesini İncele", "Check the 2026 Official Occupation List", "查看 2026 官方职业清单")}
              </button>
            </p>
          )}
          {((selectedCountryIsAU && resolvedAnzscoEntry && getSkilledListMembership(resolvedAnzscoEntry.code).length > 0) || (selectedCountryIsCA && nocCode && nocTeer !== null && nocTeer <= 5)) && (
            <div className="mt-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <Label className="text-sm font-semibold text-indigo-900">{txt("Beceri değerlendirmesi yaptınız mı?", "Have you completed a skills assessment?", "您是否已完成技能评估？")}</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="skillsAssessment" value="yes" className="accent-indigo-600" /><span className="text-sm font-medium">{txt("Evet", "Yes", "是")}</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="skillsAssessment" value="no" className="accent-indigo-600" defaultChecked /><span className="text-sm font-medium">{txt("Hayır / Henüz Yapılmadı", "No / Not Yet Done", "否 / 尚未完成")}</span></label>
              </div>
              <input type="hidden" name="skillsAssessment" value="no" />
            </div>
          )}
          <ErrorText message={state.errors?.occupation} />
        </div>
      )}

      {isPartner && (
        <div className="space-y-4 border-l-2 border-indigo-200 pl-4 py-1 my-4">
          <h3 className="text-sm font-semibold text-indigo-900">{txt("İlişki ve Sponsor Bilgileri", "Relationship & Sponsor Information", "关系与担保人信息")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{txt("İlişki Türü", "Relationship Type", "关系类型")}<RequiredMark /></Label>
              <select name="relationshipType" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} className={selectClassName} required>
                <option className="bg-gray-900 text-white" value="">Seçin</option>
                <option className="bg-gray-900 text-white" value="married">Evli / Married</option>
                <option className="bg-gray-900 text-white" value="de_facto">De facto</option>
                {selectedCountryIsAU && <option className="bg-gray-900 text-white" value="engaged">Nişanlı</option>}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{txt("Birlikte Yaşama Süresi", "Cohabitation Duration", "共同居住时间")}<RequiredMark /></Label>
              <select name="cohabitationDuration" value={cohabitationDuration} onChange={(e) => setCohabitationDuration(e.target.value)} className={selectClassName} required>
                <option className="bg-gray-900 text-white" value="">Seçin</option>
                <option className="bg-gray-900 text-white" value="less_than_12_months">12 aydan az</option>
                <option className="bg-gray-900 text-white" value="12_to_24_months">12 - 24 ay</option>
                <option className="bg-gray-900 text-white" value="more_than_2_years">2 yıldan fazla</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{txt("Sponsorun Statüsü", "Sponsor Status", "担保人身份")}<RequiredMark /></Label>
              <select name="sponsorStatus" value={sponsorStatus} onChange={(e) => setSponsorStatus(e.target.value)} className={selectClassName} required>
                <option className="bg-gray-900 text-white" value="">Seçin</option>
                <option className="bg-gray-900 text-white" value="citizen">Vatandaş</option>
                <option className="bg-gray-900 text-white" value="permanent_resident">Kalıcı Oturum (PR)</option>
                {selectedCountryIsAU && <option className="bg-gray-900 text-white" value="eligible_nz_citizen">Uygun NZ Vatandaşı</option>}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{txt("Önceki Sponsorluk", "Previous Sponsorship", "既往担保历史")}<RequiredMark /></Label>
              <select name="previousSponsorship" value={previousSponsorship} onChange={(e) => setPreviousSponsorship(e.target.value)} className={selectClassName} required>
                <option className="bg-gray-900 text-white" value="">Seçin</option>
                <option className="bg-gray-900 text-white" value="no">Hayır</option>
                <option className="bg-gray-900 text-white" value="yes_within_5_years">Evet (Son 5 yıl)</option>
                <option className="bg-gray-900 text-white" value="yes_longer">Evet (5+ yıl önce)</option>
              </select>
            </div>
          </div>
          {selectedCountryIsCA && (
            <div className="space-y-2">
              <Label>{txt("Başvuru Konumu", "Application Location", "申请地点")}<RequiredMark /></Label>
              <select name="applicationLocationPreference" value={applicationLocationPreference} onChange={(e) => setApplicationLocationPreference(e.target.value)} className={selectClassName} required>
                <option className="bg-gray-900 text-white" value="">Seçin</option>
                <option className="bg-gray-900 text-white" value="inland">Inland</option>
                <option className="bg-gray-900 text-white" value="outland">Outland</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{txt("İlişki Kanıtları", "Relationship Evidence", "关系证明")}</Label>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              {[{ v: "marriage_cert", e: "Marriage Certificate", t: "Evlilik Cüzdanı", z: "结婚证书" }, { v: "joint_bank", e: "Joint bank account", t: "Ortak banka hesabı", z: "联名银行账户" }, { v: "joint_lease", e: "Joint lease", t: "Ortak kira sözleşmesi", z: "联名租约" }, { v: "photos_social", e: "Photos & Social", t: "Fotoğraflar", z: "照片与社交" }, { v: "joint_children", e: "Joint children", t: "Ortak çocuk(lar)", z: "共同子女" }].map((item) => (
                <label key={item.v} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="relationshipEvidence" value={item.v} checked={relationshipEvidence.includes(item.v)} onChange={(e) => { setRelationshipEvidence(e.target.checked ? [...relationshipEvidence, item.v] : relationshipEvidence.filter((x) => x !== item.v)); }} className="rounded border-gray-300 text-indigo-600 h-4 w-4" />
                  <span>{txt(item.t, item.e, item.z)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
