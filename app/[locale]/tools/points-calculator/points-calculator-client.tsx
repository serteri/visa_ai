"use client";

import Link from "next/link";
import { useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";

// ─── DHA point tables ──────────────────────────────────────────────────────────

const AGE = [
  { label: "18 – 24 years old", value: "18-24", points: 25 },
  { label: "25 – 32 years old", value: "25-32", points: 30 },
  { label: "33 – 39 years old", value: "33-39", points: 25 },
  { label: "40 – 44 years old", value: "40-44", points: 15 },
] as const;

const ENGLISH = [
  { label: "Competent English (IELTS 6.0 / PTE 50)", value: "competent", points: 0 },
  { label: "Proficient English (IELTS 7.0 / PTE 65)", value: "proficient", points: 10 },
  { label: "Superior English (IELTS 8.0 / PTE 79)", value: "superior", points: 20 },
] as const;

const OVERSEAS_EXP = [
  { label: "Less than 3 years", value: "lt3", points: 0 },
  { label: "3 – 4 years", value: "3-4", points: 5 },
  { label: "5 – 7 years", value: "5-7", points: 10 },
  { label: "8 years or more", value: "8+", points: 15 },
] as const;

const AUS_EXP = [
  { label: "Less than 1 year", value: "lt1", points: 0 },
  { label: "1 – 2 years", value: "1-2", points: 5 },
  { label: "3 – 4 years", value: "3-4", points: 10 },
  { label: "5 – 7 years", value: "5-7", points: 15 },
  { label: "8 years or more", value: "8+", points: 20 },
] as const;

const EDUCATION = [
  { label: "Doctorate degree", value: "phd", points: 20 },
  { label: "At least a Bachelor's or Master's degree", value: "bachelor-master", points: 15 },
  { label: "Diploma or trade qualification", value: "diploma-trade", points: 10 },
] as const;

const PARTNER = [
  {
    label: "I do not have a spouse or de facto partner applying with me",
    value: "single",
    points: 10,
  },
  {
    label: "Partner has a suitable skills assessment and at least Competent English",
    value: "skilled-english",
    points: 10,
  },
  {
    label: "Partner has at least Competent English but no suitable skills assessment",
    value: "competent-only",
    points: 5,
  },
  {
    label: "Partner does not have at least Competent English",
    value: "no-english",
    points: 0,
  },
] as const;

// ─── State & reducer ───────────────────────────────────────────────────────────

type StrField =
  | "subclass"
  | "age"
  | "english"
  | "overseasExp"
  | "ausExp"
  | "education"
  | "partner";

type BoolField =
  | "ausStudy"
  | "specialistEdu"
  | "naati"
  | "regionalStudy"
  | "professionalYear"
  | "nomination";

type FormState = Record<StrField, string> & Record<BoolField, boolean | null>;

const INIT: FormState = {
  subclass: "",
  age: "",
  english: "",
  overseasExp: "",
  ausExp: "",
  education: "",
  partner: "",
  ausStudy: null,
  specialistEdu: null,
  naati: null,
  regionalStudy: null,
  professionalYear: null,
  nomination: null,
};

type Action =
  | { kind: "str"; field: StrField; value: string }
  | { kind: "bool"; field: BoolField; value: boolean };

function reducer(state: FormState, action: Action): FormState {
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
  const age = lookup(AGE, form.age);
  const english = lookup(ENGLISH, form.english);

  const rawOverseas = lookup(OVERSEAS_EXP, form.overseasExp);
  const rawAus = lookup(AUS_EXP, form.ausExp);
  const expRaw = rawOverseas + rawAus;
  // DHA rule: combined skilled employment cannot exceed 20 pts
  const exp = Math.min(expRaw, 20);
  const isCapped = expRaw > 20;

  const education = lookup(EDUCATION, form.education);
  const ausStudy = form.ausStudy === true ? 5 : 0;
  const specialistEdu = form.specialistEdu === true ? 10 : 0;
  const naati = form.naati === true ? 5 : 0;
  const regionalStudy = form.regionalStudy === true ? 5 : 0;
  const partner = lookup(PARTNER, form.partner);
  const professionalYear = form.professionalYear === true ? 5 : 0;

  // Nomination points depend on the chosen subclass
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
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SelectField({
  id,
  label,
  hint,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  options: readonly { label: string; value: string; points: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
        {hint && (
          <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
        )}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="" disabled>
            Select an option…
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
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {hint && (
          <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
        )}
      </span>
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
            {v ? "Yes" : "No"}
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

export function PointsCalculatorClient({ locale }: { locale: string }) {
  const [form, dispatch] = useReducer(reducer, INIT);

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
    form.subclass === "190" ? "State / territory nomination" : "Nomination or sponsorship";

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20">
      {/* Ambient blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-200/25 blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Free Tool · Official 2026 DHA Points Table
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Australia Visa{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Points Test Calculator
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
            Calculate your skilled migration score for subclass{" "}
            <strong>189, 190 &amp; 491</strong> using all official DHA factors.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── LEFT: Form ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 lg:col-span-3">

            {/* Step 1: Visa subclass */}
            <Section step={1} title="Select visa subclass">
              <div className="flex flex-col gap-2 sm:flex-row">
                {(
                  [
                    { value: "189", sub: "Skilled Independent" },
                    { value: "190", sub: "Skilled Nominated" },
                    { value: "491", sub: "Skilled Work Regional" },
                  ] as const
                ).map(({ value, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => dispatch({ kind: "str", field: "subclass", value })}
                    className={`flex-1 rounded-xl border px-4 py-3 text-center transition ${
                      form.subclass === value
                        ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                        : "border-gray-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="block text-lg font-extrabold">{value}</span>
                    <span className="block text-xs font-normal opacity-80">{sub}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Step 2: Age */}
            <Section step={2} title="Age">
              <SelectField
                id="age"
                label="Which age band do you fit into?"
                options={AGE}
                value={form.age}
                onChange={str("age")}
              />
            </Section>

            {/* Step 3: English */}
            <Section step={3} title="English Language Requirements">
              <SelectField
                id="english"
                label="How would you rate your English language ability?"
                hint="(IELTS / PTE / OET / TOEFL iBT)"
                options={ENGLISH}
                value={form.english}
                onChange={str("english")}
              />
            </Section>

            {/* Step 4: Overseas experience */}
            <Section step={4} title="Skilled Employment — Overseas">
              <SelectField
                id="overseasExp"
                label="How many years of skilled employment outside Australia in your nominated occupation?"
                options={OVERSEAS_EXP}
                value={form.overseasExp}
                onChange={str("overseasExp")}
              />
            </Section>

            {/* Step 5: Australian experience */}
            <Section step={5} title="Skilled Employment — Australia">
              <SelectField
                id="ausExp"
                label="How many years of skilled employment in Australia in your nominated occupation?"
                options={AUS_EXP}
                value={form.ausExp}
                onChange={str("ausExp")}
              />
              {calc.isCapped && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  <strong>DHA Cap Applied:</strong> Your combined overseas + Australian employment (
                  {calc.rawOverseas + calc.rawAus} pts) has been capped at{" "}
                  <strong>20 pts</strong> per official DHA rules.
                </div>
              )}
            </Section>

            {/* Step 6: Education */}
            <Section step={6} title="Educational Qualifications">
              <SelectField
                id="education"
                label="What is your highest educational qualification assessed by a relevant assessing authority?"
                options={EDUCATION}
                value={form.education}
                onChange={str("education")}
              />
            </Section>

            {/* Step 7: Australian study */}
            <Section step={7} title="Australian Study Requirement">
              <YesNoField
                label="Have you completed at least 2 years of study in Australia leading to your qualification?"
                hint="(+5 pts)"
                value={form.ausStudy}
                onChange={bool("ausStudy")}
              />
            </Section>

            {/* Step 8: Specialist education */}
            <Section step={8} title="Specialist Education Qualification">
              <YesNoField
                label="Do you have a Master's by research or a Doctoral degree from an Australian institution in a STEM field?"
                hint="(+10 pts)"
                value={form.specialistEdu}
                onChange={bool("specialistEdu")}
              />
            </Section>

            {/* Step 9: NAATI */}
            <Section step={9} title="Credentialled Community Language">
              <YesNoField
                label="Do you hold a Credentialled Community Language (NAATI) credential?"
                hint="(+5 pts)"
                value={form.naati}
                onChange={bool("naati")}
              />
            </Section>

            {/* Step 10: Regional study */}
            <Section step={10} title="Study in Regional Australia">
              <YesNoField
                label="Have you or your partner studied for at least 2 years in a regional area of Australia?"
                hint="(+5 pts)"
                value={form.regionalStudy}
                onChange={bool("regionalStudy")}
              />
            </Section>

            {/* Step 11: Partner skills */}
            <Section step={11} title="Partner Skills">
              <SelectField
                id="partner"
                label="What is your partner's situation?"
                options={PARTNER}
                value={form.partner}
                onChange={str("partner")}
              />
            </Section>

            {/* Step 12: Professional year */}
            <Section step={12} title="Professional Year in Australia">
              <YesNoField
                label="Have you completed a Professional Year in Australia?"
                hint="(+5 pts)"
                value={form.professionalYear}
                onChange={bool("professionalYear")}
              />
            </Section>

            {/* Step 13: Nomination (conditional — 190 or 491 only) */}
            {showNomination && (
              <Section
                step={13}
                title={
                  form.subclass === "190"
                    ? "State / Territory Nomination"
                    : "Nomination or Regional Sponsorship"
                }
              >
                <YesNoField
                  label={
                    form.subclass === "190"
                      ? "Have you been nominated by a State or Territory government agency?"
                      : "Have you been nominated by a State or Territory government agency, or sponsored by an eligible relative living in a designated regional area of Australia?"
                  }
                  hint={form.subclass === "190" ? "(+5 pts)" : "(+15 pts)"}
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
                Your total points summary
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
                  Answer the questions on the left to see your score.
                </p>
              )}

              {/* Breakdown */}
              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Breakdown
                </p>
                <div className="flex flex-col gap-2.5">
                  <ScoreRow label="Age" pts={form.age ? calc.age : null} />
                  <ScoreRow
                    label="English language"
                    pts={form.english ? calc.english : null}
                  />
                  <ScoreRow
                    label="Skilled employment (combined)"
                    pts={form.overseasExp || form.ausExp ? calc.exp : null}
                    note={
                      calc.isCapped
                        ? `Cap applied — raw total was ${calc.rawOverseas + calc.rawAus} pts`
                        : undefined
                    }
                  />
                  <ScoreRow
                    label="Educational qualifications"
                    pts={form.education ? calc.education : null}
                  />
                  <ScoreRow
                    label="Australian study requirement"
                    pts={form.ausStudy !== null ? calc.ausStudy : null}
                  />
                  <ScoreRow
                    label="Specialist education"
                    pts={form.specialistEdu !== null ? calc.specialistEdu : null}
                  />
                  <ScoreRow
                    label="Community language (NAATI)"
                    pts={form.naati !== null ? calc.naati : null}
                  />
                  <ScoreRow
                    label="Regional study"
                    pts={form.regionalStudy !== null ? calc.regionalStudy : null}
                  />
                  <ScoreRow
                    label="Partner skills"
                    pts={form.partner ? calc.partner : null}
                  />
                  <ScoreRow
                    label="Professional Year"
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
                  <span className="text-xs font-bold text-slate-700">Total</span>
                  <span className="text-sm font-black text-slate-900">
                    {hasAny ? `${calc.total} pts` : "–"}
                  </span>
                </div>
              </div>
            </div>

            {/* Marketing hook */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                <span className="font-bold text-slate-800">
                  ⚠️ Points are assessed at the time of invitation.
                </span>{" "}
                Hidden occupation limits and competition can{" "}
                <strong>drastically change</strong> your real outcome.
              </p>
              <Link
                href={`/${locale}/full-check`}
                className="group block w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-center text-sm font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_4px_20px_rgba(99,102,241,0.35)] active:scale-[0.98]"
              >
                Unlock Full 7-Page Readiness &amp; Risk Report{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">
                  ➔
                </span>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
              {["Official DHA factors", "Free · No signup", "Instant results"].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t}
                </span>
              ))}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
