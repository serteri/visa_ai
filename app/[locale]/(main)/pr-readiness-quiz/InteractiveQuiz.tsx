"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { useTranslation } from "@/contexts/language-context";

type QuizStep = "quiz" | "loading" | "result";

export function InteractiveQuiz({ locale: _locale }: { locale: string }) {
  const { t } = useTranslation();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const [quizStep, setQuizStep] = useState<QuizStep>("quiz");

  const QUESTIONS = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    return {
      id: n,
      category: t(`quiz.q${n}.category`),
      question: t(`quiz.q${n}.text`),
      hint: t(`quiz.q${n}.hint`),
      options: [
        { key: "A", label: t(`quiz.q${n}.a`), value: "a" },
        { key: "B", label: t(`quiz.q${n}.b`), value: "b" },
        { key: "C", label: t(`quiz.q${n}.c`), value: "c" },
        { key: "D", label: t(`quiz.q${n}.d`), value: "d" },
      ],
    };
  });

  useEffect(() => {
    if (quizStep === "loading") {
      const timer = setTimeout(() => setQuizStep("result"), 2300);
      return () => clearTimeout(timer);
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
      {/* Thin progress bar above everything */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mx-auto max-w-xl px-4 sm:px-6">
        {/* Category badge + step counter */}
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

        {/* Fading content wrapper */}
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

        <p className="mt-10 text-center text-xs text-slate-700">{t("quiz.progress.hint")}</p>
      </div>
    </main>
  );
}

function LoadingView() {
  const { t } = useTranslation();
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timer = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
      400,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <Loader2 className="h-16 w-16 animate-spin text-cyan-400" />
        </div>

        <div>
          <p className="text-lg font-semibold text-white sm:text-xl">
            {t("quiz.loading.title")}
            {dots}
          </p>
          <p className="mt-2 text-sm text-slate-500">{t("quiz.loading.subtitle")}</p>
        </div>

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
  const { t } = useTranslation();

  const stats = [
    { value: "8", label: t("quiz.result.stat1Label") },
    { value: "12", label: t("quiz.result.stat2Label") },
    { value: "3", label: t("quiz.result.stat3Label") },
  ];

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
              {t("quiz.result.badge")}
            </div>

            {/* Headline — split into three parts for gradient highlight */}
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[1.75rem]">
              {t("quiz.result.headlinePart1")}
              <span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent">
                {t("quiz.result.headlinePart2")}
              </span>
              {t("quiz.result.headlinePart3")}
            </h1>

            {/* Body */}
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              {t("quiz.result.body")}
            </p>

            <div className="my-6 h-px w-full bg-white/[0.08]" />

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-3 text-center">
              {stats.map((stat) => (
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
              <span>{t("quiz.result.cta")}</span>
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <p className="mt-4 text-center text-xs text-slate-400">{t("quiz.result.trust")}</p>

            {/* MARA disclaimer */}
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
              {t("quiz.result.disclaimer")}
            </p>
          </div>
        </div>

        {/* Share nudge */}
        <p className="mt-6 text-center text-sm text-slate-300">{t("quiz.result.share")}</p>
      </div>
    </main>
  );
}
