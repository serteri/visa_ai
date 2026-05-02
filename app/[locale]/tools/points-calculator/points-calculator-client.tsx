"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// ─── Point tables ─────────────────────────────────────────────────────────────

const AGE_OPTIONS = [
  { label: "18 – 24 years", value: "18-24", points: 25 },
  { label: "25 – 32 years", value: "25-32", points: 30 },
  { label: "33 – 39 years", value: "33-39", points: 25 },
  { label: "40 – 44 years", value: "40-44", points: 15 },
] as const;

const ENGLISH_OPTIONS = [
  { label: "Competent English (IELTS 6 / PTE 50)", value: "competent", points: 0 },
  { label: "Proficient English (IELTS 7 / PTE 65)", value: "proficient", points: 10 },
  { label: "Superior English (IELTS 8 / PTE 79)", value: "superior", points: 20 },
] as const;

const EXPERIENCE_OPTIONS = [
  { label: "Less than 3 years", value: "lt3", points: 0 },
  { label: "3 – 4 years", value: "3-4", points: 5 },
  { label: "5 – 7 years", value: "5-7", points: 10 },
  { label: "8+ years", value: "8+", points: 15 },
] as const;

const MARITAL_OPTIONS = [
  { label: "Single / Partner has no skilled visa", value: "single", points: 10 },
  { label: "Married – Partner holds skilled visa", value: "married-skilled", points: 10 },
  { label: "Married – Partner has Competent English only", value: "married-competent", points: 5 },
  { label: "Married – Partner does not meet English requirement", value: "married-other", points: 0 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pointsFor<T extends { value: string; points: number }>(
  options: readonly T[],
  value: string
): number {
  return options.find((o) => o.value === value)?.points ?? 0;
}

function scoreColor(score: number): string {
  if (score >= 80) return "from-emerald-400 to-teal-500";
  if (score >= 65) return "from-blue-400 to-indigo-500";
  if (score >= 50) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-pink-500";
}

// ─── Select component ─────────────────────────────────────────────────────────

function FieldSelect<T extends { label: string; value: string; points: number }>({
  id,
  label,
  sublabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  sublabel?: string;
  options: readonly T[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
        {sublabel && (
          <span className="ml-1.5 text-xs font-normal text-slate-400">{sublabel}</span>
        )}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white/80 px-4 py-3 pr-10 text-sm text-slate-800 shadow-sm backdrop-blur-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="" disabled>
            Select an option…
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
              {o.points > 0 ? ` (+${o.points} pts)` : o.points === 0 ? " (+0 pts)" : ""}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PointsCalculatorClient({ locale }: { locale: string }) {
  const [age, setAge] = useState("");
  const [english, setEnglish] = useState("");
  const [experience, setExperience] = useState("");
  const [marital, setMarital] = useState("");

  const totalPoints = useMemo(() => {
    return (
      pointsFor(AGE_OPTIONS, age) +
      pointsFor(ENGLISH_OPTIONS, english) +
      pointsFor(EXPERIENCE_OPTIONS, experience) +
      pointsFor(MARITAL_OPTIONS, marital)
    );
  }, [age, english, experience, marital]);

  const hasAnySelection = age || english || experience || marital;
  const allSelected = age && english && experience && marital;

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20">
      {/* Ambient gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Free Tool · 2026 DHA Data
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Australia Visa{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Points Calculator
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
            Instantly estimate your skilled migration points for subclass{" "}
            <strong>189, 190 &amp; 491</strong> visas. Select each factor below.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── Left: Form ──────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.05)] backdrop-blur-xl sm:p-8">
              <h2 className="mb-6 text-lg font-bold text-slate-800">
                Your Profile Factors
              </h2>

              <div className="flex flex-col gap-6">
                <FieldSelect
                  id="age"
                  label="Age at time of invitation"
                  options={AGE_OPTIONS}
                  value={age}
                  onChange={setAge}
                />
                <FieldSelect
                  id="english"
                  label="English Proficiency"
                  sublabel="(IELTS / PTE / OET / TOEFL)"
                  options={ENGLISH_OPTIONS}
                  value={english}
                  onChange={setEnglish}
                />
                <FieldSelect
                  id="experience"
                  label="Skilled Work Experience"
                  sublabel="(Overseas — in your nominated occupation)"
                  options={EXPERIENCE_OPTIONS}
                  value={experience}
                  onChange={setExperience}
                />
                <FieldSelect
                  id="marital"
                  label="Marital / Partner Status"
                  options={MARITAL_OPTIONS}
                  value={marital}
                  onChange={setMarital}
                />
              </div>

              <p className="mt-6 text-xs text-slate-400">
                * This calculator covers only 4 of the ~20 available point factors. Australian
                qualifications, NAATI credits, state nominations, and occupation-specific rules are
                not included here.
              </p>
            </div>
          </div>

          {/* ── Right: Score + CTA ──────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:col-span-2 lg:sticky lg:top-28 lg:self-start">
            {/* Score card */}
            <div className="rounded-2xl border border-gray-100 bg-white/60 p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.05)] backdrop-blur-xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
                Estimated Points
              </p>

              <div
                className={`bg-gradient-to-br ${
                  hasAnySelection ? scoreColor(totalPoints) : "from-slate-300 to-slate-400"
                } inline-block bg-clip-text text-8xl font-black text-transparent leading-none`}
              >
                {hasAnySelection ? totalPoints : "–"}
              </div>

              {hasAnySelection && (
                <p className="mt-3 text-xs text-slate-400">
                  out of a possible ~85 pts (basic factors only)
                </p>
              )}

              {!hasAnySelection && (
                <p className="mt-3 text-xs text-slate-400">
                  Select your factors on the left to see your score.
                </p>
              )}

              {/* Mini breakdown */}
              {hasAnySelection && (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-left text-xs text-slate-600 space-y-1.5">
                  {[
                    { label: "Age", val: age, opts: AGE_OPTIONS },
                    { label: "English", val: english, opts: ENGLISH_OPTIONS },
                    { label: "Experience", val: experience, opts: EXPERIENCE_OPTIONS },
                    { label: "Marital status", val: marital, opts: MARITAL_OPTIONS },
                  ].map(({ label, val, opts }) => {
                    const pts = val
                      ? pointsFor(opts as typeof AGE_OPTIONS, val)
                      : null;
                    return (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-semibold">
                          {pts !== null ? `+${pts}` : "–"}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-800">
                    <span>Total</span>
                    <span>{totalPoints} pts</span>
                  </div>
                </div>
              )}
            </div>

            {/* CTA / Warning card */}
            <div className="relative rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-[0_0_40px_rgba(245,158,11,0.15)] backdrop-blur-xl">
              {/* Glow ring */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-amber-300/60"
              />

              <p className="mb-3 text-sm font-bold text-amber-800">
                ⚠️ This is just a basic estimate.
              </p>
              <p className="mb-5 text-sm leading-relaxed text-amber-700">
                State nominations (190/491), NAATI, and hidden occupation limits can{" "}
                <strong>drastically change</strong> your real outcome. Invitation cutoffs shift
                every round — your true position may look very different.
              </p>

              <Link
                href={`/${locale}/full-check`}
                className="group block w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-center text-sm font-bold text-white shadow-md transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] active:scale-[0.98]"
              >
                Unlock Your 7-Page Full Readiness Report &amp; Risk Analysis{" "}
                <span className="inline-block transition-transform group-hover:translate-x-0.5">
                  ➔
                </span>
              </Link>

              {allSelected && totalPoints >= 65 && (
                <p className="mt-3 text-center text-xs text-amber-600">
                  Your estimated score looks competitive — find out your real risk profile.
                </p>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                2026 DHA Data
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Free · No signup
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Instant results
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
