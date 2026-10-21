"use client";

/**
 * The Canada Assessment's Comprehensive Ranking System questions (lib/points/canada-crs-intake.ts). Every factor the verified implementation can score is
 * asked here; a question left unanswered leaves that factor "not calculated" (the form requires the answers so the figure can be complete).
 * The Canada Assessment and report are English-only in this release, so this block is English whatever the page language.
 * Also mirrors the answers into the older single fields the rest of the product reads (English level, education, marital status).
 */
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  ABILITIES, CRS_CANADIAN_STUDY, CRS_CLB_LEVELS, CRS_CREDENTIAL_COUNTS, CRS_EDUCATION_LEVELS, CRS_FIELD, CRS_LABELS, CRS_SECOND_BANDS, CRS_SPOUSE_EDUCATION_LEVELS, CRS_SPOUSE_WORK,
  legacyEducationLevel, legacyEnglishLevel, legacySponsorOrFamily, type Ability,
} from "@/lib/points/canada-crs-intake";

type Errors = Record<string, string> | undefined;
type Levels = Record<Ability, string>;
const blank = (): Levels => ({ speaking: "", listening: "", reading: "", writing: "" });
const cap = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

function Pick({ id, label, value, onChange, options, error, selectClassName }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]>; error?: string; selectClassName: string;
}) {
  return (
    <div className="space-y-1" data-field-error={error || undefined}>
      <Label htmlFor={id} className="text-sm">{label}<span className="ml-1 text-red-700" aria-hidden="true">*</span></Label>
      <select id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClassName} ${error ? "border-red-500" : ""}`}>
        <option className="bg-gray-900 text-white" value="" disabled hidden>Select</option>
        {options.map(([v, l]) => <option key={v} className="bg-gray-900 text-white" value={v}>{l}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const YES_NO_OPTIONS = [["yes", "Yes"], ["no", "No"]] as const;

export function CanadaCrsFields({ selectClassName, errors, setEnglishLevel, setQualificationLevel, setSponsorFamilyStatus }: {
  selectClassName: string;
  errors: Errors;
  setEnglishLevel: (v: string) => void;
  setQualificationLevel: (v: string) => void;
  setSponsorFamilyStatus: (v: string) => void;
}) {
  const [spouse, setSpouse] = useState("");
  const [first, setFirst] = useState<Levels>(blank());
  const [secondMode, setSecondMode] = useState("");
  const [second, setSecond] = useState<Levels>(blank());
  const [education, setEducation] = useState("");
  const [credentials, setCredentials] = useState("");
  const [certificate, setCertificate] = useState("");
  const [sibling, setSibling] = useState("");
  const [study, setStudy] = useState("");
  const [nomination, setNomination] = useState("");
  const [spouseEducation, setSpouseEducation] = useState("");
  const [spouseLang, setSpouseLang] = useState<Levels>(blank());
  const [spouseWork, setSpouseWork] = useState("");

  // The older single fields the rest of the product reads.
  useEffect(() => { setEnglishLevel(legacyEnglishLevel(first)); }, [first, setEnglishLevel]);
  useEffect(() => { setQualificationLevel(legacyEducationLevel(education)); }, [education, setQualificationLevel]);
  useEffect(() => { setSponsorFamilyStatus(legacySponsorOrFamily(spouse)); }, [spouse, setSponsorFamilyStatus]);

  const clbOptions = CRS_CLB_LEVELS.map((v) => [v, CRS_LABELS.clb[v]] as const);
  const abilityLabel = (a: Ability) => cap(a);
  const e = (name: string) => errors?.[name];
  const abilitySelects = (prefix: (a: Ability) => string, values: Levels, set: (v: Levels) => void, options: ReadonlyArray<readonly [string, string]>, who: string) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {ABILITIES.map((a) => (
        <Pick key={a} id={prefix(a)} label={`${who}${abilityLabel(a)}`} value={values[a]} onChange={(v) => set({ ...values, [a]: v })} options={options} error={e(prefix(a))} selectClassName={selectClassName} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5 rounded-lg border border-slate-200 p-4" data-testid="canada-crs-fields">
      <div>
        <p className="text-sm font-semibold text-slate-900">Comprehensive Ranking System (CRS) questions</p>
        <p className="mt-1 text-xs text-slate-600">
          These answers let the report calculate the CRS score under IRCC&apos;s published criteria. The Canada Assessment and report are in English. A factor you leave unanswered is shown as not calculated.
        </p>
      </div>

      <Pick id={CRS_FIELD.spouse} label="Will a spouse or common-law partner accompany you to Canada?" value={spouse} onChange={setSpouse} options={YES_NO_OPTIONS} error={e(CRS_FIELD.spouse)} selectClassName={selectClassName} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-900">Your English test results (CELPIP, IELTS General Training or PTE Core), as CLB levels</p>
        {abilitySelects(CRS_FIELD.firstLanguage, first, setFirst, clbOptions, "")}
      </div>

      <Pick id={CRS_FIELD.education} label="Your highest level of education" value={education} onChange={setEducation} options={CRS_EDUCATION_LEVELS.map((v) => [v, CRS_LABELS.education[v]] as const)} error={e(CRS_FIELD.education)} selectClassName={selectClassName} />
      <Pick id={CRS_FIELD.credentials} label="How many post-secondary credentials (certificate, diploma or degree of one year or more) do you hold?" value={credentials} onChange={setCredentials} options={CRS_CREDENTIAL_COUNTS.map((v) => [v, CRS_LABELS.credentials[v]] as const)} error={e(CRS_FIELD.credentials)} selectClassName={selectClassName} />

      <div className="space-y-2">
        <Pick id={CRS_FIELD.secondLanguage} label="Do you have French test results (TEF Canada or TCF Canada)?" value={secondMode} onChange={setSecondMode} options={[["none", "No French results"], ["tested", "Yes, I have French results"]] as const} error={e(CRS_FIELD.secondLanguage)} selectClassName={selectClassName} />
        {secondMode === "tested" && abilitySelects(CRS_FIELD.secondLanguageAbility, second, setSecond, CRS_SECOND_BANDS.map((v) => [v, CRS_LABELS.secondBand[v]] as const), "French: ")}
      </div>

      <Pick id={CRS_FIELD.certificateOfQualification} label="Do you hold a certificate of qualification in a skilled trade, issued by a Canadian province, territory or federal authority?" value={certificate} onChange={setCertificate} options={YES_NO_OPTIONS} error={e(CRS_FIELD.certificateOfQualification)} selectClassName={selectClassName} />
      <Pick id={CRS_FIELD.sibling} label="Do you have a brother or sister in Canada who is a citizen or permanent resident and 18 or older?" value={sibling} onChange={setSibling} options={YES_NO_OPTIONS} error={e(CRS_FIELD.sibling)} selectClassName={selectClassName} />
      <Pick id={CRS_FIELD.canadianStudy} label="Have you completed post-secondary study in Canada?" value={study} onChange={setStudy} options={CRS_CANADIAN_STUDY.map((v) => [v, CRS_LABELS.canadianStudy[v]] as const)} error={e(CRS_FIELD.canadianStudy)} selectClassName={selectClassName} />
      <Pick id={CRS_FIELD.provincialNomination} label="Do you hold a provincial or territorial nomination?" value={nomination} onChange={setNomination} options={YES_NO_OPTIONS} error={e(CRS_FIELD.provincialNomination)} selectClassName={selectClassName} />

      {spouse === "yes" && (
        <div className="space-y-4 border-t border-slate-200 pt-4" data-testid="canada-crs-spouse">
          <p className="text-sm font-medium text-slate-900">Your spouse or common-law partner</p>
          <Pick id={CRS_FIELD.spouseEducation} label="Their highest level of education" value={spouseEducation} onChange={setSpouseEducation} options={CRS_SPOUSE_EDUCATION_LEVELS.map((v) => [v, CRS_LABELS.spouseEducation[v]] as const)} error={e(CRS_FIELD.spouseEducation)} selectClassName={selectClassName} />
          <p className="text-sm text-slate-700">Their English test results, as CLB levels</p>
          {abilitySelects(CRS_FIELD.spouseLanguage, spouseLang, setSpouseLang, clbOptions, "")}
          <Pick id={CRS_FIELD.spouseCanadianWork} label="Their skilled work experience in Canada" value={spouseWork} onChange={setSpouseWork} options={CRS_SPOUSE_WORK.map((v) => [v, CRS_LABELS.spouseWork[v]] as const)} error={e(CRS_FIELD.spouseCanadianWork)} selectClassName={selectClassName} />
        </div>
      )}
    </div>
  );
}
