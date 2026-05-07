import Link from "next/link";
import { Lock, Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import sponsorshipData from "@/src/data/state-sponsorship.json";

type StateDemandRadarProps = {
  locale: string;
  occupationName: string;
  occupationId: string;
};

type StateStatus = "High Demand" | "Open" | "Onshore Only" | "Regional Opportunity" | "Closed";

type StateRecord = {
  code: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
  name: string;
  status: StateStatus;
};

type OccupationStateRecord = {
  anzscoCode: string;
  occupationName: string;
  states: StateRecord[];
};

type SponsorshipDataset = {
  updatedAt: string;
  occupations: OccupationStateRecord[];
};

const tx = (locale: string, zh: string, tr: string, en: string) =>
  locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;

function getStatusStyle(status: StateStatus) {
  if (status === "High Demand") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "Open") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "Onshore Only") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  if (status === "Regional Opportunity") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (status === "Closed") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-800";
}

function getStatusLabel(locale: string, status: StateStatus): string {
  if (locale === "tr") {
    if (status === "High Demand") return "Yuksek Talep";
    if (status === "Open") return "Acik";
    if (status === "Onshore Only") return "Sadece Onshore";
    if (status === "Regional Opportunity") return "Regional Firsat";
    return "Kapali";
  }

  if (locale === "zh-Hans") {
    if (status === "High Demand") return "高需求";
    if (status === "Open") return "开放";
    if (status === "Onshore Only") return "仅限境内";
    if (status === "Regional Opportunity") return "偏远机会";
    return "关闭";
  }

  return status;
}

function extractAnzscoCode(occupationId: string): string {
  const code = occupationId.match(/^(\d{6})/)?.[1];
  return code ?? occupationId;
}

function sortByPriority(states: StateRecord[]): StateRecord[] {
  const rank: Record<StateStatus, number> = {
    "High Demand": 5,
    Open: 4,
    "Regional Opportunity": 3,
    "Onshore Only": 2,
    Closed: 1,
  };

  return [...states].sort((a, b) => {
    const scoreDiff = rank[b.status] - rank[a.status];
    if (scoreDiff !== 0) return scoreDiff;
    return a.code.localeCompare(b.code);
  });
}

export function StateDemandRadar({ locale, occupationName, occupationId }: StateDemandRadarProps) {
  const dataset = sponsorshipData as SponsorshipDataset;
  const anzscoCode = extractAnzscoCode(occupationId);
  const occupationEntry = dataset.occupations.find((item) => item.anzscoCode === anzscoCode);
  const fullCheckHref = `/en/full-check?occupation=${encodeURIComponent(occupationId)}`;

  if (!occupationEntry) {
    return (
      <Card className="border-cyan-300/90 bg-gradient-to-br from-white via-cyan-50/50 to-emerald-50/50 shadow-2xl shadow-cyan-900/10">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {tx(
              locale,
              `${occupationName} 的州担保需求雷达`,
              `${occupationName} icin Eyalet Sponsorluk Radari`,
              `State Sponsorship Radar for ${occupationName}`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            {tx(
              locale,
              "该职业的实时数据正在更新中。请运行完整 AI 检查以获取实时状态。",
              "Bu meslek icin canli veri su anda guncelleniyor. Gercek zamanli durum icin tam AI kontrolu calistirin.",
              "Live data is currently being updated for this occupation. Run a full AI check for real-time status."
            )}
          </p>
          <Button asChild size="lg" className="h-12 rounded-xl bg-cyan-600 px-7 text-base font-bold hover:bg-cyan-500">
            <Link href={fullCheckHref}>Check Your Full State Matching Report</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sortedStates = sortByPriority(occupationEntry.states);
  const preferredVisible = sortedStates.filter((item) => item.status === "High Demand" || item.status === "Open");
  const visibleStates = preferredVisible.length >= 3
    ? preferredVisible.slice(0, 3)
    : [...preferredVisible, ...sortedStates.filter((item) => !preferredVisible.some((v) => v.code === item.code))].slice(0, 3);
  const hiddenStates = sortedStates.filter((item) => !visibleStates.some((v) => v.code === item.code));

  return (
    <Card className="border-cyan-300/90 bg-gradient-to-br from-white via-cyan-50/50 to-emerald-50/50 shadow-2xl shadow-cyan-900/10">
      <CardHeader className="space-y-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
          <Radar className="size-3.5" />
          State Demand Intelligence
        </div>
        <CardTitle className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {tx(
            locale,
            `${occupationName} 的州担保需求雷达`,
            `${occupationName} icin Eyalet Sponsorluk Radari`,
            `State Sponsorship Radar for ${occupationName}`
          )}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {tx(
            locale,
            "来自澳大利亚各州和领地的实时需求信号。",
            "Avustralya eyaletleri ve bolgelerinden canli talep sinyalleri.",
            "Live demand signals from Australian states & territories."
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {visibleStates.map((state) => (
            <div key={state.code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">{state.code}</p>
                <Badge className={`border ${getStatusStyle(state.status)}`}>{getStatusLabel(locale, state.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">{state.name}</p>
              <p className="mt-3 text-xs text-slate-500">
                {tx(
                  locale,
                  `${state.name} 信号显示当前状态为 ${getStatusLabel(locale, state.status)}。`,
                  `${state.name} sinyali su an ${getStatusLabel(locale, state.status)} durumunu gosteriyor.`,
                  `${state.name} currently shows a ${getStatusLabel(locale, state.status)} signal.`
                )}
              </p>
            </div>
          ))}
        </div>

        {hiddenStates.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="pointer-events-none select-none blur-md">
              <div className="grid gap-3 sm:grid-cols-3">
                {hiddenStates.map((state) => (
                  <div key={state.code} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-900">{state.code}</p>
                      <Badge className={`border ${getStatusStyle(state.status)}`}>{getStatusLabel(locale, state.status)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{state.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-lg rounded-2xl border border-cyan-200 bg-white p-5 text-center shadow-xl shadow-cyan-900/15 sm:p-6">
                <Lock className="mx-auto size-7 text-cyan-700" />
                <p className="mt-3 text-sm text-slate-600">
                  {tx(
                    locale,
                    `另外 ${hiddenStates.length} 个州信号已锁定。`,
                    `${hiddenStates.length} ek eyalet sinyali kilitli.`,
                    `${hiddenStates.length} more state signals are locked.`
                  )}
                </p>
                <Button asChild size="lg" className="mt-4 h-12 rounded-xl bg-cyan-600 px-7 text-base font-bold hover:bg-cyan-500">
                  <Link href={fullCheckHref}>
                    {tx(
                      locale,
                      "解锁完整州矩阵并检查资格",
                      "Tam Eyalet Matrisini Ac ve Uygunlugu Kontrol Et",
                      "Unlock Full State Matrix & Check Eligibility"
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
