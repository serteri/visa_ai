"use client";

import { useReducer, useMemo, useState } from "react";
import { Info, Check, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/contexts/language-context";
import { calculateCanadaCRS } from "@/lib/points/calculate-canada-crs";
import type { CanadaCRSInput, CanadaAgeBracket, CanadaEducationLevel, CLBLevel, SecondLanguageCLBBand, CanadianWorkExperienceYears } from "@/lib/points/canada-types";

// Option lists mapping to keys in express-entry.json and language contexts

const AGE_OPTIONS = [
  { value: "not_selected", label: "Select your age" },
  { value: "17_or_less", label: "17 or less" },
  { value: "18", label: "18" },
  { value: "19", label: "19" },
  { value: "20_29", label: "20 - 29 (Max Points)" },
  { value: "30", label: "30" },
  { value: "31", label: "31" },
  { value: "32", label: "32" },
  { value: "33", label: "33" },
  { value: "34", label: "34" },
  { value: "35", label: "35" },
  { value: "36", label: "36" },
  { value: "37", label: "37" },
  { value: "38", label: "38" },
  { value: "39", label: "39" },
  { value: "40", label: "40" },
  { value: "41", label: "41" },
  { value: "42", label: "42" },
  { value: "43", label: "43" },
  { value: "44", label: "44" },
  { value: "45_or_more", label: "45 or more" },
] as const;

const EDUCATION_OPTIONS = [
  { value: "not_selected", label: "Select your education level" },
  { value: "less_than_secondary", label: "Less than secondary school (High school)" },
  { value: "secondary_diploma", label: "Secondary school (High school graduation)" },
  { value: "one_year_post_secondary", label: "One-year program at a college or university" },
  { value: "two_year_post_secondary", label: "Two-year program at a college or university" },
  { value: "bachelors_or_3yr_program", label: "Bachelor's degree OR a three-year program" },
  { value: "two_or_more_credentials_one_3yr_plus", label: "Two or more certificates/degrees (one must be 3+ years)" },
  { value: "masters_or_professional_degree", label: "Master's degree OR professional degree (Medicine, Law, etc.)" },
  { value: "doctoral_phd", label: "Doctoral level (PhD)" },
] as const;

const CLB_OPTIONS = [
  { value: "not_selected", label: "Select your score" },
  { value: "less_than_CLB4", label: "CLB 4 or less" },
  { value: "CLB_4_5", label: "CLB 5" },
  { value: "CLB_6", label: "CLB 6" },
  { value: "CLB_7", label: "CLB 7" },
  { value: "CLB_8", label: "CLB 8" },
  { value: "CLB_9", label: "CLB 9" },
  { value: "CLB_10_plus", label: "CLB 10 or more" },
] as const;

const SECOND_LANG_OPTIONS = [
  { value: "none", label: "No second official language exam results" },
  { value: "CLB4_or_less", label: "CLB 4 or less" },
  { value: "CLB5_6", label: "CLB 5 or 6" },
  { value: "CLB7_8", label: "CLB 7 or 8" },
  { value: "CLB9_plus", label: "CLB 9 or more" },
] as const;

const WORK_EXP_OPTIONS = [
  { value: "none_or_less_than_1yr", label: "None or less than 1 year" },
  { value: "1_year", label: "1 year" },
  { value: "2_years", label: "2 years" },
  { value: "3_years", label: "3 years" },
  { value: "4_years", label: "4 years" },
  { value: "5_plus_years", label: "5 years or more" },
] as const;

const FOREIGN_EXP_OPTIONS = [
  { value: "none", label: "No foreign experience / Less than 1 year" },
  { value: "1_2_years", label: "1 to 2 years" },
  { value: "3_plus_years", label: "3 years or more" },
] as const;

const CANADIAN_STUDY_OPTIONS = [
  { value: "none", label: "No Canadian post-secondary credentials" },
  { value: "one_to_two_year_credential", label: "1 or 2 years post-secondary credential" },
  { value: "three_year_plus_credential", label: "3+ years credential (or Master's/PhD)" },
] as const;

const FRENCH_OPTIONS = [
  { value: "none", label: "No French ability or French under NCLC 7" },
  { value: "NCLC7_plus_english_CLB4_or_less", label: "NCLC 7+ French AND English CLB 4 or less (or no IELTS)" },
  { value: "NCLC7_plus_english_CLB5_plus", label: "NCLC 7+ French AND English CLB 5 or more" },
] as const;

// ─── REDUCER ───

type FormState = CanadaCRSInput;

const INIT: FormState = {
  hasSpouseOrPartner: false,
  age: "not_selected",
  education: "not_selected",
  firstLanguageAbilityScores: {
    speaking: "not_selected",
    listening: "not_selected",
    reading: "not_selected",
    writing: "not_selected",
  },
  secondLanguageBand: "none",
  canadianWorkExperience: "none_or_less_than_1yr",
  postSecondaryCredentialCount: "none",
  foreignWorkExperienceYears: "none",
  hasCertificateOfQualification: false,
  hasSiblingInCanada: false,
  frenchAbility: "none",
  canadianPostSecondaryCredentialYears: "none",
  hasProvincialNomination: false,
};

type Action =
  | { type: "SET_FIELD"; field: keyof FormState; value: any }
  | { type: "SET_LANG_SCORE"; ability: "speaking" | "listening" | "reading" | "writing"; value: CLBLevel };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_LANG_SCORE":
      return {
        ...state,
        firstLanguageAbilityScores: {
          ...state.firstLanguageAbilityScores,
          [action.ability]: action.value,
        },
      };
    default:
      return state;
  }
}

// ─── UI primitives ─────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number | string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
            {step}
          </span>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-6 pt-5 dark:border-zinc-800">
          <div className="flex flex-col gap-5">{children}</div>
        </div>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold leading-snug text-slate-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 shadow-sm transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <ChevronIcon open={false} />
        </div>
      </div>
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold leading-snug text-slate-700 dark:text-zinc-300">
        {label}
      </span>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
              value === v
                ? "border-rose-500 bg-rose-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  pts,
}: {
  label: string;
  pts: number | null;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-slate-500 dark:text-zinc-400">{label}</span>
      <span
        className={`shrink-0 font-bold tabular-nums ${
          pts === null
            ? "text-slate-300 dark:text-zinc-650"
            : pts > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-400 dark:text-zinc-500"
        }`}
      >
        {pts === null ? "–" : `+${pts}`}
      </span>
    </div>
  );
}

// ─── MAIN CLIENT COMPONENT ───

export function CanadaPointsCalculatorClient({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [form, dispatch] = useReducer(reducer, INIT);

  const calc = useMemo(() => calculateCanadaCRS(form), [form]);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  function setField(field: keyof FormState, value: any) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  function setLanguage(ability: "speaking" | "listening" | "reading" | "writing", value: CLBLevel) {
    dispatch({ type: "SET_LANG_SCORE", ability, value });
  }

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-rose-600 dark:border-rose-950/30 dark:bg-rose-950/20 dark:text-rose-400">
            Canada CRS Calculator
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {isTr ? "Kanada Express Entry CRS Hesaplayıcı" : isZh ? "加拿大 CRS 分数评估器" : "Canada CRS Points Calculator"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 dark:text-slate-400">
            {isTr 
              ? "Kapsamlı Sıralama Sistemi (CRS) kullanarak Express Entry havuzundaki tahmini yerinizi öğrenin."
              : isZh
              ? "快速计算您的联邦快速通道移民 CRS 分数，评估您的 PR 获邀概率。"
              : "Evaluate your Comprehensive Ranking System (CRS) score based on official IRCC draw criteria."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Form Content */}
          <div className="flex flex-col gap-3 lg:col-span-3">
            {/* Step 1: Relationship */}
            <Section step={1} title={isTr ? "Medeni Durum" : isZh ? "婚姻状况" : "Marital Status"}>
              <YesNoField
                label={isTr ? "Eşiniz veya partneriniz sizinle birlikte Kanada'ya göç edecek mi?" : isZh ? "您的配偶或同居伴侣是否与您一同申请？" : "Will your spouse or partner accompany you to Canada?"}
                value={form.hasSpouseOrPartner}
                onChange={(v) => setField("hasSpouseOrPartner", v)}
              />
            </Section>

            {/* Step 2: Age */}
            <Section step={2} title={isTr ? "Yaş" : isZh ? "年龄" : "Age"}>
              <SelectField
                id="age"
                label={isTr ? "Yaş aralığınızı seçin" : isZh ? "选择您的年龄段" : "Select your age bracket"}
                options={AGE_OPTIONS}
                value={form.age}
                onChange={(v) => setField("age", v)}
              />
            </Section>

            {/* Step 3: Education */}
            <Section step={3} title={isTr ? "Eğitim Düzeyi" : isZh ? "学历学位" : "Level of Education"}>
              <SelectField
                id="education"
                label={isTr ? "Tamamladığınız en yüksek eğitim derecesi (ECA onaylı olmalıdır)" : isZh ? "您已获得的最高学位（加拿大同等学历认证）" : "Highest degree or credential completed"}
                options={EDUCATION_OPTIONS}
                value={form.education}
                onChange={(v) => setField("education", v)}
              />
              <SelectField
                id="postSecondaryCount"
                label={isTr ? "Kaç adet yükseköğrenim diplomanız var?" : isZh ? "您获得过几个高等学历证书？" : "How many post-secondary credentials do you have?"}
                options={[
                  { value: "none", label: "None / High School only" },
                  { value: "one", label: "One credential" },
                  { value: "two_or_more", label: "Two or more post-secondary credentials" },
                ]}
                value={form.postSecondaryCredentialCount}
                onChange={(v) => setField("postSecondaryCredentialCount", v)}
              />
            </Section>

            {/* Step 4: First Language */}
            <Section step={4} title={isTr ? "Birinci Dil Skoru (İngilizce/Fransızca)" : isZh ? "第一外语（英语/法语）" : "First Official Language Score"}>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">
                Provide your IELTS / CELPIP / PTE language score equivalents in Canadian Language Benchmark (CLB) levels.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  id="lang-speaking"
                  label="Speaking"
                  options={CLB_OPTIONS}
                  value={form.firstLanguageAbilityScores.speaking}
                  onChange={(v) => setLanguage("speaking", v as CLBLevel)}
                />
                <SelectField
                  id="lang-listening"
                  label="Listening"
                  options={CLB_OPTIONS}
                  value={form.firstLanguageAbilityScores.listening}
                  onChange={(v) => setLanguage("listening", v as CLBLevel)}
                />
                <SelectField
                  id="lang-reading"
                  label="Reading"
                  options={CLB_OPTIONS}
                  value={form.firstLanguageAbilityScores.reading}
                  onChange={(v) => setLanguage("reading", v as CLBLevel)}
                />
                <SelectField
                  id="lang-writing"
                  label="Writing"
                  options={CLB_OPTIONS}
                  value={form.firstLanguageAbilityScores.writing}
                  onChange={(v) => setLanguage("writing", v as CLBLevel)}
                />
              </div>
            </Section>

            {/* Step 5: Second Language */}
            <Section step={5} title={isTr ? "İkinci Dil (Opsiyonel)" : isZh ? "第二外语（选填）" : "Second Language"}>
              <SelectField
                id="secondLanguageBand"
                label="Second official language test band (if any)"
                options={SECOND_LANG_OPTIONS}
                value={form.secondLanguageBand}
                onChange={(v) => setField("secondLanguageBand", v)}
              />
            </Section>

            {/* Step 6: Canadian Work Experience */}
            <Section step={6} title={isTr ? "Kanada İş Deneyimi" : isZh ? "加拿大工作经历" : "Canadian Work Experience"}>
              <SelectField
                id="canadianWorkExperience"
                label="Years of skilled work experience in Canada (TEER 0/1/2/3 only)"
                options={WORK_EXP_OPTIONS}
                value={form.canadianWorkExperience}
                onChange={(v) => setField("canadianWorkExperience", v as CanadianWorkExperienceYears)}
              />
            </Section>

            {/* Step 7: Foreign Work Experience */}
            <Section step={7} title={isTr ? "Yurtdışı İş Deneyimi" : isZh ? "海外工作经历" : "Foreign Work Experience"}>
              <SelectField
                id="foreignWorkExperienceYears"
                label="Continuous foreign skilled work experience in the last 10 years"
                options={FOREIGN_EXP_OPTIONS}
                value={form.foreignWorkExperienceYears}
                onChange={(v) => setField("foreignWorkExperienceYears", v)}
              />
            </Section>

            {/* Step 8: Additional Adaptation Factors */}
            <Section step={8} title={isTr ? "Ek Puan Faktörleri" : isZh ? "其他加分项" : "Additional Points Factors"}>
              <div className="flex flex-col gap-4">
                <YesNoField
                  label="Do you have a certificate of qualification from a Canadian province, territory or federal government body?"
                  value={form.hasCertificateOfQualification}
                  onChange={(v) => setField("hasCertificateOfQualification", v)}
                />
                <YesNoField
                  label="Do you or your partner have a sibling living in Canada who is 18+ and a Canadian citizen or PR?"
                  value={form.hasSiblingInCanada}
                  onChange={(v) => setField("hasSiblingInCanada", v)}
                />
                <SelectField
                  id="frenchAbility"
                  label="Do you have strong French language skills (NCLC 7 or higher)?"
                  options={FRENCH_OPTIONS}
                  value={form.frenchAbility}
                  onChange={(v) => setField("frenchAbility", v)}
                />
                <SelectField
                  id="canadianPostSecondaryCredentialYears"
                  label="Did you study in Canada at a post-secondary institution?"
                  options={CANADIAN_STUDY_OPTIONS}
                  value={form.canadianPostSecondaryCredentialYears}
                  onChange={(v) => setField("canadianPostSecondaryCredentialYears", v)}
                />
                <YesNoField
                  label="Do you have a nomination certificate from a Canadian province or territory (PNP nomination)?"
                  value={form.hasProvincialNomination}
                  onChange={(v) => setField("hasProvincialNomination", v)}
                />
              </div>
            </Section>
          </div>

          {/* Sticky score sidebar */}
          <div className="flex flex-col gap-5 lg:col-span-2 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                CRS TOTAL POINTS
              </p>
              <div className="mt-1 bg-gradient-to-br from-rose-500 to-red-650 inline-block bg-clip-text text-[5rem] font-black leading-none text-transparent">
                {calc.totalScore}
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-4 dark:bg-zinc-950">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  CRS Breakdown
                </p>
                <div className="flex flex-col gap-2.5">
                  <ScoreRow label="A. Core / Human Capital Factors" pts={calc.breakdown.coreHumanCapital.total} />
                  <div className="pl-3 flex flex-col gap-1 border-l border-rose-200">
                    <ScoreRow label="Age points" pts={calc.breakdown.coreHumanCapital.age} />
                    <ScoreRow label="Education level" pts={calc.breakdown.coreHumanCapital.education} />
                    <ScoreRow label="First official language" pts={calc.breakdown.coreHumanCapital.firstLanguage} />
                    <ScoreRow label="Second official language" pts={calc.breakdown.coreHumanCapital.secondLanguage} />
                    <ScoreRow label="Canadian work experience" pts={calc.breakdown.coreHumanCapital.canadianWorkExperience} />
                  </div>
                  <ScoreRow label="B. Spouse / Common-Law Partner Factors" pts={calc.breakdown.spouseFactors.total} />
                  <ScoreRow label="C. Skill Transferability (Max 100)" pts={calc.breakdown.skillTransferability.total} />
                  <ScoreRow label="D. Additional Points (Max 600)" pts={calc.breakdown.additionalPoints.total} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Total Score</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {calc.totalScore} / {calc.maxScore}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                {isTr
                  ? `Toplam puanınız, Express Entry havuzundaki sıralamanızı belirleyen CRS skorudur (en yüksek olası skor ${calc.maxScore}'dur, ancak pratikte çoğu davet 300-600 puan aralığında verilir). Hangi puanın gerektiği her çekilişte değişir; en güncel kesme puanlarını IRCC'nin resmi Express Entry çekiliş duyurularından kontrol edebilirsiniz.`
                  : isZh
                  ? `您的总分是用于在Express Entry候选池中排名的CRS分数（理论最高分为${calc.maxScore}，但实际邀请通常在300-600分之间）。每次抽签所需的分数都会变化；请查阅IRCC官方Express Entry抽签公告以获取最新的分数线。`
                  : `Your total is the CRS score used to rank you in the Express Entry pool (the theoretical maximum is ${calc.maxScore}, though in practice most invitations are issued in the 300-600 range). The score needed changes with every draw — check IRCC's official Express Entry round results for the latest cutoffs.`}
              </p>
              <p className="mt-3 text-[10px] text-slate-400 dark:text-zinc-500 italic">
                Verified against 2026 IRCC Comprehensive Ranking System rules. Last configuration update: {calc.configVersion}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
