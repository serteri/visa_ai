"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileCheck2, GraduationCap, Landmark, Lock, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

type ChecklistItem = {
  id: string;
  label: string;
};

type Phase = {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ChecklistItem[];
};

const tx = (locale: string, en: string, tr: string, zh: string) =>
  locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;

export function JourneyDashboard({ locale }: { locale: string }) {
  const phases: Phase[] = useMemo(
    () => [
      {
        id: "preparation",
        title: tx(locale, "Preparation", "Hazırlık", "准备阶段"),
        icon: GraduationCap,
        items: [
          { id: "pte", label: tx(locale, "PTE Academic completed", "PTE Academic tamamlandı", "完成 PTE Academic 考试") },
          { id: "passport", label: tx(locale, "Passport valid for 12+ months", "Pasaport 12+ ay geçerli", "护照有效期12个月以上") },
          { id: "naati", label: tx(locale, "NAATI CCL passed", "NAATI CCL geçildi", "通过 NAATI CCL 考试") },
        ],
      },
      {
        id: "assessment",
        title: tx(locale, "Skills Assessment", "Mesleki Denklik", "职业评估"),
        icon: Landmark,
        items: [
          { id: "translation", label: tx(locale, "Document translation done", "Belge tercümeleri tamamlandı", "文件翻译已完成") },
          { id: "lodgement", label: tx(locale, "Application lodged with authority", "Kuruma başvuru yapıldı", "已向评估机构提交申请") },
          { id: "outcome", label: tx(locale, "Positive outcome received", "Olumlu sonuç alındı", "收到正面评估结果") },
        ],
      },
      {
        id: "post-invitation",
        title: tx(locale, "Post-Invitation", "Davet Sonrası", "获邀之后"),
        icon: Send,
        items: [
          { id: "visa-lodged", label: tx(locale, "Visa application lodged", "Vize başvurusu yapıldı", "已提交签证申请") },
          { id: "form80", label: tx(locale, "Form 80 uploaded", "Form 80 yüklendi", "已上传 Form 80") },
          { id: "medicals", label: tx(locale, "Medicals & AFP checks done", "Sağlık ve AFP kontrolleri tamamlandı", "已完成体检与AFP无犯罪证明") },
        ],
      },
    ],
    [locale]
  );

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({
    pte: true,
    passport: true,
    naati: true,
  });

  const allItems = phases.flatMap((phase) => phase.items);
  const checkedCount = allItems.filter((item) => checkedMap[item.id]).length;
  const progress = Math.round((checkedCount / allItems.length) * 100);

  const currentPhase =
    phases.find((phase) => phase.items.some((item) => !checkedMap[item.id])) ?? phases[phases.length - 1];

  const toggleItem = (id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="ambient-bg relative min-h-screen py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(128,82,255,0.16),transparent_55%)]" />

      <div className="section-shell relative max-w-4xl">
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric-iris)]/30 bg-[var(--color-electric-iris)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-electric-iris)]">
            <FileCheck2 className="h-3.5 w-3.5" />
            {tx(locale, "My Visa Journey", "Vize Yolculuğum", "我的签证旅程")}
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {tx(
              locale,
              "Track your Australian PR progress",
              "Avustralya PR sürecinizi takip edin",
              "追踪您的澳大利亚PR进度"
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-300">
            {tx(
              locale,
              "A free checklist to keep every stage of your PR journey organized, from preparation to visa grant.",
              "Hazırlıktan vize onayına kadar PR yolculuğunuzun her aşamasını düzenli tutan ücretsiz bir kontrol listesi.",
              "从准备阶段到签证获批，一份免费清单帮您理清PR旅程的每个阶段。"
            )}
          </p>
        </header>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-3xl font-bold text-white">{progress}%</span>
              <span className="text-sm font-medium text-[var(--color-ash-gray)]">
                {tx(locale, "Completed", "Tamamlandı", "已完成")}
              </span>
            </div>
            <Progress
              value={progress}
              className="mt-4 h-3 bg-white/10 [&>div]:bg-[var(--color-electric-iris)]"
            />
            <p className="mt-4 text-sm font-semibold text-gray-300">
              {tx(
                locale,
                `You're in the ${currentPhase.title} stage.`,
                `${currentPhase.title} aşamasındasınız.`,
                `您正处于${currentPhase.title}阶段。`
              )}
            </p>
          </CardContent>
        </Card>

        <div className="mt-10 space-y-6">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const completedInPhase = phase.items.filter((item) => checkedMap[item.id]).length;

            return (
              <div key={phase.id}>
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-electric-iris)]/15 text-[var(--color-electric-iris)]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-ash-gray)]">
                            {tx(locale, "Phase", "Aşama", "阶段")} {index + 1}
                          </span>
                          <h2 className="text-xl font-bold text-white">{phase.title}</h2>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-ash-gray)]">
                        {completedInPhase}/{phase.items.length}
                      </span>
                    </div>

                    <ul className="mt-6 space-y-4">
                      {phase.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3">
                          <Checkbox
                            checked={!!checkedMap[item.id]}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <span
                            className={cnLabel(!!checkedMap[item.id])}
                            onClick={() => toggleItem(item.id)}
                          >
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {phase.id === "assessment" && (
                  <div className="mt-6">
                    <PremiumUpsellCard locale={locale} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function cnLabel(checked: boolean) {
  return [
    "cursor-pointer select-none text-base leading-6 transition-colors",
    checked ? "text-gray-500 line-through" : "text-gray-200",
  ].join(" ");
}

function PremiumUpsellCard({ locale }: { locale: string }) {
  return (
    <Card className="overflow-hidden border-[var(--color-saffron-spark)]/30 bg-gradient-to-br from-[var(--color-electric-iris)]/20 via-black to-black">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-saffron-spark)]/40 bg-[var(--color-saffron-spark)]/10 text-[var(--color-saffron-spark)]">
            <Lock className="h-6 w-6" />
          </span>
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-saffron-spark)]">
              <Sparkles className="h-3.5 w-3.5" />
              {tx(locale, "Premium AI Strategy Report", "Premium AI Strateji Raporu", "Premium AI 策略报告")}
            </span>
            <p className="mt-2 max-w-md text-sm leading-6 text-gray-300">
              {tx(
                locale,
                "Generate your Premium Report to find out which state is actively seeking your occupation and your exact points score.",
                "Hangi eyaletin mesleğinizi aradığını ve net puanınızı öğrenmek için Premium Raporunuzu oluşturun.",
                "生成您的Premium报告，了解哪个州正在寻求您的职业以及您的确切积分。"
              )}
            </p>
          </div>
        </div>
        <Button
          asChild
          size="lg"
          className="w-full shrink-0 bg-[var(--color-saffron-spark)] text-black hover:opacity-90 sm:w-auto"
        >
          <Link href={`/${locale}/full-check`}>
            {tx(locale, "Unlock My Report", "Raporumu Aç", "解锁我的报告")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
