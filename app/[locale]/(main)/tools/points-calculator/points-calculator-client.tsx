"use client";

import Link from "next/link";
import { Info, Save, Check } from "lucide-react";
import { useMemo, useReducer, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import type { Occupation } from "@/lib/occupations";
import { useTranslation } from "@/contexts/language-context";
import { saveCalculation } from "@/app/[locale]/(main)/dashboard/actions";

// ─── DHA point tables (values + points only — labels come from translations) ──

const AGE_VALUES = [
  { value: "18-24", points: 25, key: "pc.age.18-24" },
  { value: "25-32", points: 30, key: "pc.age.25-32" },
  { value: "33-39", points: 25, key: "pc.age.33-39" },
  { value: "40-44", points: 15, key: "pc.age.40-44" },
] as const;

const ENGLISH_VALUES = [
  { value: "competent", points: 0, key: "pc.english.competent" },
  { value: "proficient", points: 10, key: "pc.english.proficient" },
  { value: "superior", points: 20, key: "pc.english.superior" },
] as const;

const OVERSEAS_EXP_VALUES = [
  { value: "lt3", points: 0, key: "pc.overseasExp.lt3" },
  { value: "3-4", points: 5, key: "pc.overseasExp.3-4" },
  { value: "5-7", points: 10, key: "pc.overseasExp.5-7" },
  { value: "8+", points: 15, key: "pc.overseasExp.8+" },
] as const;

const AUS_EXP_VALUES = [
  { value: "lt1", points: 0, key: "pc.ausExp.lt1" },
  { value: "1-2", points: 5, key: "pc.ausExp.1-2" },
  { value: "3-4", points: 10, key: "pc.ausExp.3-4" },
  { value: "5-7", points: 15, key: "pc.ausExp.5-7" },
  { value: "8+", points: 20, key: "pc.ausExp.8+" },
] as const;

const EDUCATION_VALUES = [
  { value: "phd", points: 20, key: "pc.education.phd" },
  { value: "bachelor-master", points: 15, key: "pc.education.bachelor-master" },
  { value: "diploma-trade", points: 10, key: "pc.education.diploma-trade" },
] as const;

const PARTNER_VALUES = [
  { value: "single", points: 10, key: "pc.partner.single" },
  { value: "skilled-english", points: 10, key: "pc.partner.skilled-english" },
  { value: "competent-only", points: 5, key: "pc.partner.competent-only" },
  { value: "no-english", points: 0, key: "pc.partner.no-english" },
] as const;

// ─── State & reducer ───────────────────────────────────────────────────────────

type StrField =
  | "subclass" | "age" | "english"
  | "overseasExp" | "ausExp" | "education" | "partner";

type BoolField =
  | "ausStudy" | "specialistEdu" | "naati"
  | "regionalStudy" | "professionalYear" | "nomination";

type FormState = Record<StrField, string> & Record<BoolField, boolean | null>;

const INIT: FormState = {
  subclass: "", age: "", english: "",
  overseasExp: "", ausExp: "", education: "", partner: "",
  ausStudy: null, specialistEdu: null, naati: null,
  regionalStudy: null, professionalYear: null, nomination: null,
};

type Action =
  | { kind: "str"; field: StrField; value: string }
  | { kind: "bool"; field: BoolField; value: boolean };

function reducer(state: FormState, action: Action): FormState {
  if (action.kind === "str" && action.field === "subclass") {
    return { ...state, subclass: action.value, nomination: null };
  }
  return { ...state, [action.field]: action.value };
}

// ─── Score calculation ─────────────────────────────────────────────────────────

function lookup<T extends { value: string; points: number }>(
  table: readonly T[],
  value: string
): number {
  return table.find((r) => r.value === value)?.points ?? 0;
}

function calculate(form: FormState) {
  const age = lookup(AGE_VALUES, form.age);
  const english = lookup(ENGLISH_VALUES, form.english);

  const rawOverseas = lookup(OVERSEAS_EXP_VALUES, form.overseasExp);
  const rawAus = lookup(AUS_EXP_VALUES, form.ausExp);
  const expRaw = rawOverseas + rawAus;
  const exp = Math.min(expRaw, 20);
  const isCapped = expRaw > 20;

  const education = lookup(EDUCATION_VALUES, form.education);
  const ausStudy = form.ausStudy === true ? 5 : 0;
  const specialistEdu = form.specialistEdu === true ? 10 : 0;
  const naati = form.naati === true ? 5 : 0;
  const regionalStudy = form.regionalStudy === true ? 5 : 0;
  const partner = lookup(PARTNER_VALUES, form.partner);
  const professionalYear = form.professionalYear === true ? 5 : 0;

  const nomination =
    form.nomination === true
      ? form.subclass === "190"
        ? 5
        : form.subclass === "491"
          ? 15
          : 0
      : 0;

  const total =
    age + english + exp +
    education + ausStudy + specialistEdu +
    naati + regionalStudy + partner + professionalYear + nomination;

  return {
    age, english,
    rawOverseas, rawAus, exp, isCapped,
    education, ausStudy, specialistEdu,
    naati, regionalStudy, partner, professionalYear,
    nomination, total,
  };
}

function scoreGradient(n: number): string {
  if (n >= 90) return "from-emerald-400 to-teal-500";
  if (n >= 75) return "from-blue-500 to-indigo-600";
  if (n >= 65) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-pink-600";
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

function InfoCallout({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-700">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
      <span>{text}</span>
    </div>
  );
}

// ─── Field components ──────────────────────────────────────────────────────────

function SelectField({
  id,
  label,
  hint,
  tooltip,
  selectPlaceholder,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  tooltip?: string;
  selectPlaceholder: string;
  options: readonly { label: string; value: string; points: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <label
          htmlFor={id}
          className="flex-1 text-sm font-semibold leading-snug text-slate-700"
        >
          {label}
          {hint && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
          )}
        </label>
        {tooltip && (
          <button
            type="button"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            onClick={(e) => { e.stopPropagation(); setTipOpen((o) => !o); }}
            aria-label="More information"
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
              tipOpen
                ? "bg-blue-500 text-white"
                : "bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
            }`}
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {tooltip && tipOpen && <InfoCallout text={tooltip} />}

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="" disabled>
            {selectPlaceholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} (+{o.points} pts)
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
  hint,
  tooltip,
  yesLabel,
  noLabel,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  tooltip?: string;
  yesLabel: string;
  noLabel: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm font-semibold leading-snug text-slate-700">
          {label}
          {hint && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
          )}
        </span>
        {tooltip && (
          <button
            type="button"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            onClick={(e) => { e.stopPropagation(); setTipOpen((o) => !o); }}
            aria-label="More information"
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
              tipOpen
                ? "bg-blue-500 text-white"
                : "bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
            }`}
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {tooltip && tipOpen && <InfoCallout text={tooltip} />}

      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
              value === v
                ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {v ? yesLabel : noLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number | string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {step}
          </span>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-6 pt-5">
          <div className="flex flex-col gap-5">{children}</div>
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  pts,
  note,
}: {
  label: string;
  pts: number | null;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <div>
        <span className="text-slate-500">{label}</span>
        {note && (
          <span className="block text-[10px] font-semibold text-amber-500">{note}</span>
        )}
      </div>
      <span
        className={`shrink-0 font-bold tabular-nums ${
          pts === null
            ? "text-slate-300"
            : pts > 0
              ? "text-blue-600"
              : "text-slate-400"
        }`}
      >
        {pts === null ? "–" : `+${pts}`}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PointsCalculatorClient({ locale, hideHeader, occupation }: { locale: string; hideHeader?: boolean; occupation?: Occupation }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [form, dispatch] = useReducer(reducer, INIT);
  const [isSaved, setIsSaved] = useState(false);
  const [, startSave] = useTransition();

  function str(field: StrField) {
    return (value: string) => dispatch({ kind: "str", field, value });
  }
  function bool(field: BoolField) {
    return (value: boolean) => dispatch({ kind: "bool", field, value });
  }

  const calc = useMemo(() => calculate(form), [form]);

  const showNomination = form.subclass === "190" || form.subclass === "491";

  const hasAny =
    !!form.age ||
    !!form.english ||
    !!form.overseasExp ||
    !!form.ausExp ||
    !!form.education ||
    !!form.partner ||
    form.ausStudy !== null ||
    form.specialistEdu !== null ||
    form.naati !== null ||
    form.regionalStudy !== null ||
    form.professionalYear !== null ||
    (showNomination && form.nomination !== null);

  const nominationLabel =
    form.subclass === "190"
      ? t("pc.score.nomination190")
      : t("pc.score.nomination491");

  // Translated option arrays (built inside component to access t())
  const AGE = AGE_VALUES.map((o) => ({ ...o, label: t(o.key) }));
  const ENGLISH = ENGLISH_VALUES.map((o) => ({ ...o, label: t(o.key) }));
  const OVERSEAS_EXP = OVERSEAS_EXP_VALUES.map((o) => ({ ...o, label: t(o.key) }));
  const AUS_EXP = AUS_EXP_VALUES.map((o) => ({ ...o, label: t(o.key) }));
  const EDUCATION = EDUCATION_VALUES.map((o) => ({ ...o, label: t(o.key) }));
  const PARTNER = PARTNER_VALUES.map((o) => ({ ...o, label: t(o.key) }));

  const TIPS = {
    ausStudy: t("pc.tips.ausStudy"),
    naati: t("pc.tips.naati"),
    partner: t("pc.tips.partner"),
    professionalYear: t("pc.tips.professionalYear"),
  };

  const activeRisks: string[] = [];
  if (occupation && calc.total < occupation.recentCutoff) {
    activeRisks.push(
      t("pc.insights.marketReality")
        .replace("{title}", occupation.title)
        .replace("{cutoff}", String(occupation.recentCutoff))
    );
  }
  if (form.age === "25-32") {
    activeRisks.push(t("pc.insights.ageCliff"));
  }
  if (occupation?.experienceRisk && (calc.rawOverseas > 0 || calc.rawAus > 0)) {
    activeRisks.push(t("pc.insights.experienceDeduction"));
  }
  if (showNomination && form.nomination) {
    activeRisks.push(t("pc.insights.stateNomination"));
  }

  const selectPlaceholder = t("pc.selectOption");
  const yesLabel = t("pc.yes");
  const noLabel = t("pc.no");

  return (
    <main className={`min-h-screen bg-slate-50 ${hideHeader ? "pt-8" : "pt-28"} pb-20`}>
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-200/25 blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        {!hideHeader && (
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
              {t("pc.header.badge")}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {t("pc.header.title").split("Points Test")[0]}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {/* render the "Points Test Calculator" part with gradient for EN; for other locales render all as gradient */}
                {locale === "en"
                  ? "Points Test Calculator"
                  : t("pc.header.title")}
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
              {t("pc.header.subtitle")}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── LEFT: Form ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 lg:col-span-3">

            {/* Step 1: Visa subclass */}
            <Section step={1} title={t("pc.step1.title")}>
              <div className="flex flex-col gap-2 sm:flex-row">
                {(
                  [
                    { value: "189", subKey: "pc.subclass.189" },
                    { value: "190", subKey: "pc.subclass.190" },
                    { value: "491", subKey: "pc.subclass.491" },
                  ] as const
                ).map(({ value, subKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => dispatch({ kind: "str", field: "subclass", value })}
                    className={`flex-1 whitespace-normal rounded-xl border px-3 py-3 text-center text-sm font-semibold leading-snug transition ${
                      form.subclass === value
                        ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                        : "border-gray-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="font-extrabold">{value}</span>
                    <span className="mx-1 opacity-60">—</span>
                    <span className="break-words">{t(subKey)}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Step 2: Age */}
            <Section step={2} title={t("pc.step2.title")}>
              <SelectField
                id="age"
                label={t("pc.step2.label")}
                selectPlaceholder={selectPlaceholder}
                options={AGE}
                value={form.age}
                onChange={str("age")}
              />
            </Section>

            {/* Step 3: English */}
            <Section step={3} title={t("pc.step3.title")}>
              <SelectField
                id="english"
                label={t("pc.step3.label")}
                hint={t("pc.step3.hint")}
                selectPlaceholder={selectPlaceholder}
                options={ENGLISH}
                value={form.english}
                onChange={str("english")}
              />
            </Section>

            {/* Step 4: Overseas experience */}
            <Section step={4} title={t("pc.step4.title")}>
              <SelectField
                id="overseasExp"
                label={t("pc.step4.label")}
                selectPlaceholder={selectPlaceholder}
                options={OVERSEAS_EXP}
                value={form.overseasExp}
                onChange={str("overseasExp")}
              />
            </Section>

            {/* Step 5: Australian experience */}
            <Section step={5} title={t("pc.step5.title")}>
              <SelectField
                id="ausExp"
                label={t("pc.step5.label")}
                selectPlaceholder={selectPlaceholder}
                options={AUS_EXP}
                value={form.ausExp}
                onChange={str("ausExp")}
              />
              {calc.isCapped && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  {t("pc.dhaCap").replace("{raw}", String(calc.rawOverseas + calc.rawAus))}
                </div>
              )}
            </Section>

            {/* Step 6: Education */}
            <Section step={6} title={t("pc.step6.title")}>
              <SelectField
                id="education"
                label={t("pc.step6.label")}
                selectPlaceholder={selectPlaceholder}
                options={EDUCATION}
                value={form.education}
                onChange={str("education")}
              />
            </Section>

            {/* Step 7: Australian study */}
            <Section step={7} title={t("pc.step7.title")}>
              <YesNoField
                label={t("pc.step7.label")}
                hint="(+5 pts)"
                tooltip={TIPS.ausStudy}
                yesLabel={yesLabel}
                noLabel={noLabel}
                value={form.ausStudy}
                onChange={bool("ausStudy")}
              />
            </Section>

            {/* Step 8: Specialist education */}
            <Section step={8} title={t("pc.step8.title")}>
              <YesNoField
                label={t("pc.step8.label")}
                hint="(+10 pts)"
                yesLabel={yesLabel}
                noLabel={noLabel}
                value={form.specialistEdu}
                onChange={bool("specialistEdu")}
              />
            </Section>

            {/* Step 9: NAATI */}
            <Section step={9} title={t("pc.step9.title")}>
              <YesNoField
                label={t("pc.step9.label")}
                hint="(+5 pts)"
                tooltip={TIPS.naati}
                yesLabel={yesLabel}
                noLabel={noLabel}
                value={form.naati}
                onChange={bool("naati")}
              />
            </Section>

            {/* Step 10: Regional study */}
            <Section step={10} title={t("pc.step10.title")}>
              <YesNoField
                label={t("pc.step10.label")}
                hint="(+5 pts)"
                yesLabel={yesLabel}
                noLabel={noLabel}
                value={form.regionalStudy}
                onChange={bool("regionalStudy")}
              />
            </Section>

            {/* Step 11: Partner skills */}
            <Section step={11} title={t("pc.step11.title")}>
              <SelectField
                id="partner"
                label={t("pc.step11.label")}
                tooltip={TIPS.partner}
                selectPlaceholder={selectPlaceholder}
                options={PARTNER}
                value={form.partner}
                onChange={str("partner")}
              />
            </Section>

            {/* Step 12: Professional year */}
            <Section step={12} title={t("pc.step12.title")}>
              <YesNoField
                label={t("pc.step12.label")}
                hint="(+5 pts)"
                tooltip={TIPS.professionalYear}
                yesLabel={yesLabel}
                noLabel={noLabel}
                value={form.professionalYear}
                onChange={bool("professionalYear")}
              />
            </Section>

            {/* Step 13: Nomination — only for 190 / 491 */}
            {showNomination && (
              <Section
                step={13}
                title={
                  form.subclass === "190"
                    ? t("pc.step13a.title")
                    : t("pc.step13b.title")
                }
              >
                <YesNoField
                  label={
                    form.subclass === "190"
                      ? t("pc.step13a.label")
                      : t("pc.step13b.label")
                  }
                  hint={form.subclass === "190" ? "(+5 pts)" : "(+15 pts)"}
                  yesLabel={yesLabel}
                  noLabel={noLabel}
                  value={form.nomination}
                  onChange={bool("nomination")}
                />
              </Section>
            )}

          </div>

          {/* ── RIGHT: Sticky score summary ────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:col-span-2 lg:sticky lg:top-28 lg:self-start">

            {/* Score card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {t("pc.summary.title")}
              </p>

              <div
                className={`mt-1 bg-gradient-to-br ${
                  hasAny ? scoreGradient(calc.total) : "from-slate-300 to-slate-400"
                } inline-block bg-clip-text text-[5rem] font-black leading-none text-transparent`}
              >
                {hasAny ? calc.total : "–"}
              </div>

              {!hasAny && (
                <p className="mt-1 text-xs text-slate-400">
                  {t("pc.summary.hint")}
                </p>
              )}

              {/* Breakdown */}
              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {t("pc.summary.breakdown")}
                </p>
                <div className="flex flex-col gap-2.5">
                  <ScoreRow label={t("pc.score.age")} pts={form.age ? calc.age : null} />
                  <ScoreRow
                    label={t("pc.score.english")}
                    pts={form.english ? calc.english : null}
                  />
                  <ScoreRow
                    label={t("pc.score.employment")}
                    pts={form.overseasExp || form.ausExp ? calc.exp : null}
                    note={
                      calc.isCapped
                        ? t("pc.score.capNote").replace("{raw}", String(calc.rawOverseas + calc.rawAus))
                        : undefined
                    }
                  />
                  <ScoreRow
                    label={t("pc.score.education")}
                    pts={form.education ? calc.education : null}
                  />
                  <ScoreRow
                    label={t("pc.score.ausStudy")}
                    pts={form.ausStudy !== null ? calc.ausStudy : null}
                  />
                  <ScoreRow
                    label={t("pc.score.specialistEdu")}
                    pts={form.specialistEdu !== null ? calc.specialistEdu : null}
                  />
                  <ScoreRow
                    label={t("pc.score.naati")}
                    pts={form.naati !== null ? calc.naati : null}
                  />
                  <ScoreRow
                    label={t("pc.score.regionalStudy")}
                    pts={form.regionalStudy !== null ? calc.regionalStudy : null}
                  />
                  <ScoreRow
                    label={t("pc.score.partner")}
                    pts={form.partner ? calc.partner : null}
                  />
                  <ScoreRow
                    label={t("pc.score.professionalYear")}
                    pts={form.professionalYear !== null ? calc.professionalYear : null}
                  />
                  {showNomination && (
                    <ScoreRow
                      label={nominationLabel}
                      pts={form.nomination !== null ? calc.nomination : null}
                    />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-xs font-bold text-slate-700">{t("pc.summary.total")}</span>
                  <span className="text-sm font-black text-slate-900">
                    {hasAny ? `${calc.total} ${t("pc.summary.pts")}` : "–"}
                  </span>
                </div>
              </div>

              {/* Save to Dashboard */}
              {hasAny && isSignedIn && (
                <button
                  type="button"
                  disabled={isSaved}
                  onClick={() => {
                    setIsSaved(true);
                    startSave(async () => {
                      await saveCalculation({
                        visaSubclass: form.subclass || undefined,
                        totalPoints: calc.total,
                        breakdown: calc as unknown as Record<string, unknown>,
                      });
                    });
                  }}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition ${
                    isSaved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {isSaved ? (
                    <><Check className="h-3.5 w-3.5" /> Saved to Dashboard</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Save to Dashboard</>
                  )}
                </button>
              )}
            </div>

            {/* Insights & Risks */}
            {activeRisks.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-red-900">
                  <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {t("pc.insights.title")}
                </h3>
                <div className="flex flex-col gap-2">
                  {activeRisks.map((risk, idx) => {
                    const parts = risk.split(": ");
                    const label = parts[0];
                    const description = parts.slice(1).join(": ");
                    const isAge = label.includes("Age") || label.includes("Yaş") || label.includes("年龄");
                    const isState = label.includes("State") || label.includes("Eyalet") || label.includes("州");

                    let colorClass = "text-red-800 border-red-100 bg-white/60";
                    if (isAge) colorClass = "text-amber-800 border-amber-200 bg-white/60";
                    else if (isState) colorClass = "text-blue-800 border-blue-200 bg-white/60";

                    return (
                      <div key={idx} className={`rounded-lg border p-3 text-sm ${colorClass}`}>
                        <strong>{label}:</strong> {description}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 border-t border-red-200/50 pt-4">
                  <p className="text-xs italic leading-relaxed text-red-900/60">
                    {t("pc.insights.maraDisclaimer")}
                  </p>
                </div>
              </div>
            )}

            {/* Premium Marketing Hook */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-[1px] shadow-lg">
              <div className="relative rounded-[11px] bg-slate-900 p-6 text-center">
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-[40px]" />
                <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-500/20 blur-[40px]" />

                <p className="relative z-10 mb-4 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  {t("pc.insights.hookSubtitle")}
                </p>
                <Link
                  href={`/${locale}/full-check`}
                  className="group relative z-10 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98]"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                  </span>
                  {t("pc.insights.hookCta")}
                  <span className="inline-block transition-transform group-hover:translate-x-1">➔</span>
                </Link>
              </div>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
              {([t("pc.trust.dha"), t("pc.trust.free"), t("pc.trust.instant")] as string[]).map((label) => (
                <span key={label} className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {label}
                </span>
              ))}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
