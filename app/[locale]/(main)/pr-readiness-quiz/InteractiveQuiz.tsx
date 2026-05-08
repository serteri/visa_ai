"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

const QUESTIONS = [
  {
    id: 1,
    category: "Age & Timing",
    question: "How old are you right now?",
    hint: "Age is worth up to 30 points — the single largest category in Australia's points test.",
    options: [
      { key: "A", label: "18–24 years old", value: "a" },
      { key: "B", label: "25–32 years old", value: "b" },
      { key: "C", label: "33–39 years old", value: "c" },
      { key: "D", label: "40–44 years old", value: "d" },
    ],
  },
  {
    id: 2,
    category: "English Level",
    question: "What is your current English proficiency?",
    hint: "Upgrading from Competent to Superior English alone can add 20 points to your PR application.",
    options: [
      { key: "A", label: "Still improving — below IELTS 7.0", value: "a" },
      { key: "B", label: "IELTS 7.0+ in all bands (Proficient, +10 pts)", value: "b" },
      { key: "C", label: "IELTS 8.0+ in all bands (Superior, +20 pts)", value: "c" },
      { key: "D", label: "Native English speaker", value: "d" },
    ],
  },
  {
    id: 3,
    category: "Occupation Eligibility",
    question: "Is your occupation on Australia's skilled occupation list?",
    hint: "Only MLTSSL or STSOL occupations are eligible for General Skilled Migration pathways.",
    options: [
      { key: "A", label: "I've never heard of the MLTSSL list", value: "a" },
      { key: "B", label: "I think so, but haven't confirmed with an assessing body", value: "b" },
      { key: "C", label: "Yes — I have a positive skills assessment", value: "c" },
      { key: "D", label: "My occupation is only on a state-specific list", value: "d" },
    ],
  },
  {
    id: 4,
    category: "Regional Openness",
    question: "How open are you to living in regional Australia?",
    hint: "A 491 regional nomination adds 15 bonus points — often the difference between waiting years and getting invited now.",
    options: [
      { key: "A", label: "Not a chance — Sydney or Melbourne only", value: "a" },
      { key: "B", label: "Maybe, if it genuinely speeds up my PR", value: "b" },
      { key: "C", label: "Genuinely open to it for 2–3 years", value: "c" },
      { key: "D", label: "I'm already living in or near a regional area", value: "d" },
    ],
  },
  {
    id: 5,
    category: "Partner Status",
    question: "What is your partner's migration situation?",
    hint: "A partner with a valid skills assessment and Competent English adds 5 bonus points to your profile.",
    options: [
      { key: "A", label: "I'm applying as a single applicant", value: "a" },
      { key: "B", label: "My partner hasn't completed a skills assessment", value: "b" },
      { key: "C", label: "My partner has a skills assessment & Competent English", value: "c" },
      { key: "D", label: "This doesn't apply to my situation", value: "d" },
    ],
  },
  {
    id: 6,
    category: "Work Experience",
    question: "How many total years of skilled work experience do you have?",
    hint: "8+ years overseas earns 15 points. 5+ years of Australian skilled work earns 20 points.",
    options: [
      { key: "A", label: "Less than 1 year", value: "a" },
      { key: "B", label: "1–3 years", value: "b" },
      { key: "C", label: "3–8 years", value: "c" },
      { key: "D", label: "8+ years", value: "d" },
    ],
  },
  {
    id: 7,
    category: "Pathway Strategy",
    question: "Have you researched state or territory nomination?",
    hint: "190 nomination adds 5 points. 491 regional nomination adds 15. Most applicants skip this critical research.",
    options: [
      { key: "A", label: "Not at all — I haven't looked into it", value: "a" },
      { key: "B", label: "I've heard of it but don't know my options", value: "b" },
      { key: "C", label: "I've researched 1–2 states that match my profile", value: "c" },
      { key: "D", label: "I've already applied or received a state nomination", value: "d" },
    ],
  },
  {
    id: 8,
    category: "Your Biggest Fear",
    question: "What worries you most about your PR journey?",
    hint: "Your answer calibrates the single biggest risk factor LogiVisa AI will flag in your result.",
    options: [
      { key: "A", label: "I don't know if I actually have enough points", value: "a" },
      { key: "B", label: "My occupation might not be eligible for PR", value: "b" },
      { key: "C", label: "The process feels too slow and too expensive", value: "c" },
      { key: "D", label: "I'm scared of picking the wrong visa and wasting time", value: "d" },
    ],
  },
];

type QuizStep = "quiz" | "loading" | "result";

export function InteractiveQuiz({ locale: _locale }: { locale: string }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const [quizStep, setQuizStep] = useState<QuizStep>("quiz");

  useEffect(() => {
    if (quizStep === "loading") {
      const t = setTimeout(() => setQuizStep("result"), 2300);
      return () => clearTimeout(t);
    }
  }, [quizStep]);

  function handleSelect(value: string) {
    if (selected !== null) return;
    setSelected(value);
    const newAnswers = [...answers, value];

    setTimeout(() => setFading(true), 180);
    setTimeout(() => {
      setAnswers(newAnswers);
      setSelected(null);
      setFading(false);
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ((q) => q + 1);
      } else {
        setQuizStep("loading");
      }
    }, 480);
  }

  if (quizStep === "loading") return <LoadingView />;
  if (quizStep === "result") return <ResultView />;

  const question = QUESTIONS[currentQ];
  const progressPct = (currentQ / QUESTIONS.length) * 100;

  return (
    <main className="relative min-h-screen bg-slate-950 pb-20 pt-24 sm:pt-28">
      {/* Thin progress bar pinned above everything */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mx-auto max-w-xl px-4 sm:px-6">
        {/* Category + counter */}
        <div className="mb-8 flex items-center justify-between">
          <span className="rounded-full border border-cyan-800/60 bg-cyan-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            {question.category}
          </span>
          <span className="text-xs font-medium tabular-nums text-slate-500">
            {currentQ + 1}
            <span className="mx-1 text-slate-700">/</span>
            {QUESTIONS.length}
          </span>
        </div>

        {/* Fading content block */}
        <div className={`transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`}>
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
            {question.question}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{question.hint}</p>

          <div className="mt-8 space-y-3">
            {question.options.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={selected !== null}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-150 sm:px-5 sm:py-4 ${
                    isSelected
                      ? "scale-[0.985] border-cyan-400 bg-cyan-400/10 text-white"
                      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-600/50 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-150 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400 text-slate-950"
                          : "border-slate-600 text-slate-500"
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm font-medium sm:text-base">{opt.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-700">
          Click an answer to advance automatically
        </p>
      </div>
    </main>
  );
}

function LoadingView() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
      400,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <Loader2 className="h-16 w-16 animate-spin text-cyan-400" />
        </div>

        <div>
          <p className="text-lg font-semibold text-white sm:text-xl">
            LogiVisa AI is analyzing your 8 data points{dots}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Cross-referencing your profile against current invitation rounds
          </p>
        </div>

        {/* Animated pips */}
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-5 animate-pulse rounded-full bg-cyan-500/60"
              style={{ animationDelay: `${i * 130}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function ResultView() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-16">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-cyan-500/[0.06] blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Glassmorphism card */}
        <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-white/[0.04] shadow-[0_0_90px_-20px_rgba(6,182,212,0.3)] backdrop-blur-sm ring-1 ring-white/[0.06]">
          {/* Top accent stripe */}
          <div className="h-[3px] w-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300" />

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
              Analysis Complete
            </div>

            {/* Headline */}
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[1.75rem]">
              You have{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent">
                hidden PR potential
              </span>
              , but your current strategy might be risking your chances.
            </h1>

            {/* Body */}
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              Based on your 8 answers, LogiVisa AI has identified gaps in your pathway strategy
              that most applicants never discover until it&apos;s too late. Your full report reveals
              your exact points score, your most likely invitation timeline, and the one move that
              could dramatically accelerate your PR.
            </p>

            <div className="my-6 h-px w-full bg-white/[0.08]" />

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Data Points", value: "8" },
                { label: "Pathways Checked", value: "12" },
                { label: "Risk Factors Found", value: "3" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-3"
                >
                  <p className="text-xl font-extrabold text-cyan-400 sm:text-2xl">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/en/full-check"
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-[1.02] hover:bg-cyan-400 hover:shadow-cyan-400/30 sm:text-base"
            >
              <span>Unlock Your Full AI Readiness Report &amp; Exact Points (Free)</span>
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <p className="mt-4 text-center text-xs text-slate-600">
              No credit card &middot; No sign-up required &middot; 2-minute report
            </p>
          </div>
        </div>

        {/* Share nudge */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Know someone on the PR journey?{" "}
          <span className="font-semibold text-slate-400">Share this quiz with them.</span>
        </p>
      </div>
    </main>
  );
}
