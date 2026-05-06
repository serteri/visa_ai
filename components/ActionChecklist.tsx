"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LodgementReadyChecklist } from "@/lib/readiness/types";

type ActionChecklistProps = {
  locale: string;
  checklist: LodgementReadyChecklist;
};

function getPriorityTone(priority: "urgent" | "important" | "recommended") {
  if (priority === "urgent") {
    return {
      dot: "bg-red-500",
      badge: "border-red-200 bg-red-50 text-red-900",
      label: "🔴",
    };
  }
  if (priority === "important") {
    return {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-900",
      label: "🟡",
    };
  }
  return {
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
    label: "🟢",
  };
}

export function ActionChecklist({ locale, checklist }: ActionChecklistProps) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  if (!checklist.items.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("Lodgement-Ready Checklist", "Lodgement-Ready Checklist", "递交准备行动清单")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{checklist.note}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklist.items.map((item) => {
          const tone = getPriorityTone(item.priority);
          const checked = completedIds.includes(item.id);

          return (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                checked ? "border-emerald-200 bg-emerald-50/70" : "border-border/70 bg-background"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  setCompletedIds((prev) =>
                    prev.includes(item.id)
                      ? prev.filter((value) => value !== item.id)
                      : [...prev, item.id]
                  );
                }}
                className="mt-1 h-4 w-4 rounded border-border text-primary"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone.badge}`}>
                    {tone.label}
                  </span>
                  <p className={`text-sm font-semibold ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.title}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            </label>
          );
        })}
      </CardContent>
    </Card>
  );
}