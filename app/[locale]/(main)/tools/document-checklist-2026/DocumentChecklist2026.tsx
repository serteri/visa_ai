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

type CheckItem = {
  id: string;
  label: string;
  note?: string;
};

type Section = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  items: CheckItem[];
};

const SECTIONS: Section[] = [
  {
    id: "skills-assessment",
    icon: <FileText className="h-5 w-5" />,
    title: "Skills Assessment Evidence",
    subtitle: "Required by your assessing authority (ACS, VETASSESS, Engineers Australia, etc.)",
    color: "cyan",
    items: [
      { id: "sa-1", label: "Academic transcripts (certified copies of all degrees/diplomas)" },
      { id: "sa-2", label: "Degree certificates or graduation letters" },
      { id: "sa-3", label: "Detailed employment reference letters (on company letterhead, signed)" },
      { id: "sa-4", label: "Payslips or salary evidence for each role claimed" },
      { id: "sa-5", label: "Tax records or employment contracts to corroborate dates" },
      { id: "sa-6", label: "Professional registration or licence certificates (if applicable)" },
      { id: "sa-7", label: "Certified English translations of all non-English documents" },
      {
        id: "sa-8",
        label: "NAATI-certified translation for Mandarin / Turkish documents",
        note: "NAATI certification is required for documents submitted to Australian government bodies.",
      },
      { id: "sa-9", label: "Passport copies (bio page) for identity verification" },
      { id: "sa-10", label: "Statutory declaration if gaps in employment exist" },
    ],
  },
  {
    id: "employment",
    icon: <Briefcase className="h-5 w-5" />,
    title: "Employment Evidence",
    subtitle: "To support skilled work experience points claims and sponsor checks",
    color: "violet",
    items: [
      { id: "em-1", label: "Reference letter from each employer (dates, duties, job title, hours per week)" },
      { id: "em-2", label: "Separation certificate or resignation letter (if employment has ended)" },
      { id: "em-3", label: "Organisation chart showing your position (for senior roles)" },
      { id: "em-4", label: "Payslips — at least 3 consecutive months per role" },
      { id: "em-5", label: "Bank statements matching payslip deposits (last 6 months)" },
      { id: "em-6", label: "Employment contract or offer letter specifying ANZSCO-aligned duties" },
      {
        id: "em-7",
        label: "ABN registration or business registration certificate (if self-employed)",
        note: "Self-employment evidence requirements differ per assessing body — check your authority's guidelines.",
      },
      { id: "em-8", label: "LinkedIn profile printout (supplementary, not a substitute)" },
      { id: "em-9", label: "Overseas work: apostille or authentication by competent authority" },
    ],
  },
  {
    id: "points-claims",
    icon: <BarChart2 className="h-5 w-5" />,
    title: "Points Test Claims",
    subtitle: "Documents needed to substantiate each points factor in your EOI",
    color: "emerald",
    items: [
      { id: "pt-1", label: "English test results — IELTS, PTE, TOEFL or OET (within 3 years)" },
      {
        id: "pt-2",
        label: "Superior English (8+ on all IELTS bands) — official test report form",
        note: "Competent English (6+) vs. Proficient (7+) vs. Superior (8+) carry different point values.",
      },
      { id: "pt-3", label: "Age: valid passport showing date of birth" },
      { id: "pt-4", label: "Australian study: completion letter + transcript from CRICOS-registered provider" },
      { id: "pt-5", label: "Specialist education (doctorate): official award letter" },
      { id: "pt-6", label: "Australian work experience: ATO income statements or myGov records" },
      { id: "pt-7", label: "Overseas work experience: same evidence as Skills Assessment section" },
      { id: "pt-8", label: "State / territory nomination letter (subclass 190 or 491)" },
      { id: "pt-9", label: "Partner skills: partner's positive skills assessment + English evidence" },
      { id: "pt-10", label: "Community language: NAATI accreditation certificate (if claiming +5 pts)" },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "Can I apply for a Subclass 600 Tourist Visa while waiting for my skilled visa?",
    a: "Yes, but be cautious. Holding a tourist visa does not affect your EOI or skills assessment. However, if you intend to stay in Australia long-term, the Department may view frequent tourist visa applications as inconsistent with a genuine temporary stay. Apply with clear travel purpose documentation.",
  },
  {
    q: "Does a skills assessment automatically mean I'll be invited?",
    a: "No. A positive skills assessment makes you eligible to submit an Expression of Interest (EOI), but invitation depends on your points score relative to others in the pool. Many occupations require 90–100+ points for a realistic chance.",
  },
  {
    q: "How long are skills assessments valid?",
    a: "Most assessing authorities issue assessments valid for 3 years. ACS assessments expire after 3 years from the date of issue. Check your specific authority's rules.",
  },
  {
    q: "What if my documents are in a language other than English?",
    a: "All documents must be accompanied by an English translation by a NAATI-certified translator. Self-translations are not accepted. Allow 2–4 weeks for NAATI translation turnaround.",
  },
  {
    q: "Do I need all these documents before lodging an EOI?",
    a: "No. You submit an EOI based on your claimed information. Documents are only verified after you receive an invitation and lodge the actual visa application. However, you must have evidence available before claiming points.",
  },
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

function ChecklistSection({ section, checked, onToggle }: {
  section: Section;
  checked: Set<string>;
  onToggle: (id: string) => void;
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
            <span className="font-semibold text-white text-base">{section.title}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
              {done}/{section.items.length}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5 hidden sm:block">{section.subtitle}</p>
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
                      {item.label}
                    </span>
                    {item.note && (
                      <p className="text-xs text-slate-500 mt-1 flex gap-1.5 items-start">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
                        {item.note}
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-slate-200">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-500" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function DocumentChecklist2026({ locale }: { locale: string }) {
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
            Free · Updated for 2026
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Australian PR{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Document Checklist
            </span>{" "}
            2026
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
            Everything you need to gather before lodging a skilled migration visa.
            Tick off items as you collect them — your progress is saved automatically.
          </p>

          {/* Overall progress */}
          <div className="mt-8 bg-slate-900 border border-slate-700/50 rounded-2xl p-5 text-left max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Overall Progress</span>
              <span className="text-sm font-bold text-white">
                {totalDone}/{totalItems} items
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
                ? "Just getting started — keep going!"
                : overallPct < 70
                ? "Good progress — you're building momentum."
                : overallPct < 100
                ? "Almost there! Nearly document-ready."
                : "Checklist complete — you're document-ready!"}
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
                <p className="text-sm font-semibold text-amber-300 mb-1">Subclass 600 Visitors</p>
                <p className="text-sm text-amber-200/70">
                  If you are currently in Australia on a Subclass 600 Tourist Visa, you may still
                  gather documents and undergo skills assessment — but you cannot lodge most skilled
                  visa applications onshore on a tourist visa. Plan your pathway carefully.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
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
              Next Step
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Know exactly where{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                your profile stands
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-7 max-w-sm mx-auto">
              Documents are just one piece. Take the free PR Readiness Quiz to find out your
              estimated points score, strongest visa pathways, and hidden risks — in under 3 minutes.
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold px-8 py-3 rounded-xl text-base shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Link href={quizLink} className="flex items-center gap-2">
                Take the Free PR Quiz
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-slate-500 mt-4">Free · No signup required · 3 minutes</p>
          </div>
        </div>
      </section>

      {/* MARA disclaimer */}
      <footer className="px-4 pb-10 text-center">
        <p className="text-xs text-slate-600 max-w-xl mx-auto">
          This checklist is for general informational purposes only and does not constitute
          immigration advice. Requirements vary by visa subclass and assessing authority.
          Consult a registered MARA agent for advice specific to your circumstances.
        </p>
      </footer>
    </main>
  );
}
