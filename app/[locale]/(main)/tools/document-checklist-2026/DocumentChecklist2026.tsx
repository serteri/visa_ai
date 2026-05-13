"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  FileText,
  Briefcase,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/language-context";

type CheckItem = {
  id: string;
  labelKey: string;
  noteKey?: string;
};

type Section = {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  subtitleKey: string;
  color: string;
  items: CheckItem[];
};

const SECTIONS: Section[] = [
  {
    id: "skills-assessment",
    icon: <FileText className="h-5 w-5" />,
    titleKey: "dc.section.skillsAssessmentTitle",
    subtitleKey: "dc.section.skillsAssessmentSubtitle",
    color: "cyan",
    items: [
      { id: "sa-1", labelKey: "dc.checklist.sa1" },
      { id: "sa-2", labelKey: "dc.checklist.sa2" },
      { id: "sa-3", labelKey: "dc.checklist.sa3" },
      { id: "sa-4", labelKey: "dc.checklist.sa4" },
      { id: "sa-5", labelKey: "dc.checklist.sa5" },
      { id: "sa-6", labelKey: "dc.checklist.sa6" },
      { id: "sa-7", labelKey: "dc.checklist.sa7" },
      {
        id: "sa-8",
        labelKey: "dc.checklist.sa8",
        noteKey: "dc.checklist.sa8note",
      },
      { id: "sa-9", labelKey: "dc.checklist.sa9" },
      { id: "sa-10", labelKey: "dc.checklist.sa10" },
    ],
  },
  {
    id: "employment",
    icon: <Briefcase className="h-5 w-5" />,
    titleKey: "dc.section.employmentTitle",
    subtitleKey: "dc.section.employmentSubtitle",
    color: "violet",
    items: [
      { id: "em-1", labelKey: "dc.checklist.em1" },
      { id: "em-2", labelKey: "dc.checklist.em2" },
      { id: "em-3", labelKey: "dc.checklist.em3" },
      { id: "em-4", labelKey: "dc.checklist.em4" },
      { id: "em-5", labelKey: "dc.checklist.em5" },
      { id: "em-6", labelKey: "dc.checklist.em6" },
      {
        id: "em-7",
        labelKey: "dc.checklist.em7",
        noteKey: "dc.checklist.em7note",
      },
      { id: "em-8", labelKey: "dc.checklist.em8" },
      { id: "em-9", labelKey: "dc.checklist.em9" },
    ],
  },
  {
    id: "points-claims",
    icon: <BarChart2 className="h-5 w-5" />,
    titleKey: "dc.section.pointsClaimsTitle",
    subtitleKey: "dc.section.pointsClaimsSubtitle",
    color: "emerald",
    items: [
      { id: "pt-1", labelKey: "dc.checklist.pt1" },
      {
        id: "pt-2",
        labelKey: "dc.checklist.pt2",
        noteKey: "dc.checklist.pt2note",
      },
      { id: "pt-3", labelKey: "dc.checklist.pt3" },
      { id: "pt-4", labelKey: "dc.checklist.pt4" },
      { id: "pt-5", labelKey: "dc.checklist.pt5" },
      { id: "pt-6", labelKey: "dc.checklist.pt6" },
      { id: "pt-7", labelKey: "dc.checklist.pt7" },
      { id: "pt-8", labelKey: "dc.checklist.pt8" },
      { id: "pt-9", labelKey: "dc.checklist.pt9" },
      { id: "pt-10", labelKey: "dc.checklist.pt10" },
    ],
  },
];

const FAQ_ITEMS = [
  { q: "dc.faq.q1", a: "dc.faq.a1" },
  { q: "dc.faq.q2", a: "dc.faq.a2" },
  { q: "dc.faq.q3", a: "dc.faq.a3" },
  { q: "dc.faq.q4", a: "dc.faq.a4" },
  { q: "dc.faq.q5", a: "dc.faq.a5" },
];

function colorClasses(color: string) {
  switch (color) {
    case "cyan":
      return {
        iconBg: "bg-cyan-500/10 text-cyan-400",
        border: "border-cyan-500/20",
        badge: "bg-cyan-500/10 text-cyan-400",
        progress: "bg-cyan-500",
      };
    case "violet":
      return {
        iconBg: "bg-violet-500/10 text-violet-400",
        border: "border-violet-500/20",
        badge: "bg-violet-500/10 text-violet-400",
        progress: "bg-violet-500",
      };
    case "emerald":
      return {
        iconBg: "bg-emerald-500/10 text-emerald-400",
        border: "border-emerald-500/20",
        badge: "bg-emerald-500/10 text-emerald-400",
        progress: "bg-emerald-500",
      };
    default:
      return {
        iconBg: "bg-slate-500/10 text-slate-400",
        border: "border-slate-500/20",
        badge: "bg-slate-500/10 text-slate-400",
        progress: "bg-slate-500",
      };
  }
}

function ChecklistSection({ section, checked, onToggle, t }: {
  section: Section;
  checked: Set<string>;
  onToggle: (id: string) => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(true);
  const done = section.items.filter((i) => checked.has(i.id)).length;
  const pct = Math.round((done / section.items.length) * 100);
  const c = colorClasses(section.color);

  return (
    <div className={`rounded-2xl border ${c.border} bg-slate-900/60 overflow-hidden`}>
      <button
        className="w-full flex items-center gap-4 p-5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`flex-shrink-0 rounded-xl p-2.5 ${c.iconBg}`}>{section.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-base">{t(section.titleKey)}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
              {done}/{section.items.length}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5 hidden sm:block">{t(section.subtitleKey)}</p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800 w-full">
            <div
              className={`h-full rounded-full transition-all duration-500 ${c.progress}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="flex-shrink-0 text-slate-500 ml-2">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <ul className="px-5 pb-5 space-y-2">
          {section.items.map((item) => {
            const isDone = checked.has(item.id);
            return (
              <li key={item.id}>
                <button
                  onClick={() => onToggle(item.id)}
                  className="w-full flex items-start gap-3 group text-left"
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    )}
                  </span>
                  <div>
                    <span
                      className={`text-sm leading-snug transition-colors ${
                        isDone ? "line-through text-slate-500" : "text-slate-200"
                      }`}
                    >
                      {t(item.labelKey)}
                    </span>
                    {item.noteKey && (
                      <p className="text-xs text-slate-500 mt-1 flex gap-1.5 items-start">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
                        {t(item.noteKey)}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FaqItem({ q, a, t }: { q: string; a: string; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-slate-200">{t(q)}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-500" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-400 leading-relaxed">{t(a)}</p>
        </div>
      )}
    </div>
  );
}

export function DocumentChecklist2026({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const totalDone = checked.size;
  const overallPct = Math.round((totalDone / totalItems) * 100);

  const quizLink = `/${locale}/pr-readiness-quiz`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="pt-28 pb-14 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("dc.badge", "Free · Updated for 2026")}
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">
            {t("dc.titlePrefix", "Australian PR")}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {t("dc.titleHighlight", "Document Checklist")}
            </span>{" "}
            2026
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
            {t("dc.subtitle", "Everything you need to gather before lodging a skilled migration visa. Tick off items as you collect them — your progress is saved automatically.")}
          </p>

          {/* Overall progress */}
          <div className="mt-8 bg-slate-900 border border-slate-700/50 rounded-2xl p-5 text-left max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">{t("dc.overallProgress", "Overall Progress")}</span>
              <span className="text-sm font-bold text-white">
                {totalDone}/{totalItems} {t("dc.items", "items")}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {overallPct < 30
                ? t("dc.progressStart", "Just getting started — keep going!")
                : overallPct < 70
                ? t("dc.progressMid", "Good progress — you're building momentum.")
                : overallPct < 100
                ? t("dc.progressAlmost", "Almost there! Nearly document-ready.")
                : t("dc.progressDone", "Checklist complete — you're document-ready!")}
            </p>
          </div>
        </div>
      </section>

      {/* Checklist sections */}
      <section className="px-4 pb-16">
        <div className="max-w-2xl mx-auto space-y-4">
          {SECTIONS.map((section) => (
            <ChecklistSection
              key={section.id}
              section={section}
              checked={checked}
              onToggle={toggle}
              t={t}
            />
          ))}
        </div>
      </section>

      {/* Subclass 600 FAQ disclaimer */}
      <section className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300 mb-1">{t("dc.subclass600Title", "Subclass 600 Visitors")}</p>
                <p className="text-sm text-amber-200/70">
                  {t("dc.subclass600Text", "If you are currently in Australia on a Subclass 600 Tourist Visa, you may still gather documents and undergo skills assessment — but you cannot lodge most skilled visa applications onshore on a tourist visa. Plan your pathway carefully.")}
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">{t("dc.faqTitle", "Frequently Asked Questions")}</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="max-w-xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-950/40 to-violet-950/30 border border-cyan-500/20 p-8 sm:p-10">
            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">
              {t("dc.nextStep", "Next Step")}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {t("dc.ctaTitlePrefix", "Know exactly where")}{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                {t("dc.ctaTitleHighlight", "your profile stands")}
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-7 max-w-sm mx-auto">
              {t("dc.ctaText", "Documents are just one piece. Take the free PR Readiness Quiz to find out your estimated points score, strongest visa pathways, and hidden risks — in under 3 minutes.")}
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold px-8 py-3 rounded-xl text-base shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Link href={quizLink} className="flex items-center gap-2">
                {t("dc.ctaButton", "Take the Free PR Quiz")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-slate-500 mt-4">{t("dc.ctaCaption", "Free · No signup required · 3 minutes")}</p>
          </div>
        </div>
      </section>

      {/* MARA disclaimer */}
      <footer className="px-4 pb-10 text-center">
        <p className="text-xs text-slate-600 max-w-xl mx-auto">
          {t("dc.disclaimer", "This checklist is for general informational purposes only and does not constitute immigration advice. Requirements vary by visa subclass and assessing authority. Consult a registered MARA agent for advice specific to your circumstances.")}
        </p>
      </footer>
    </main>
  );
}
