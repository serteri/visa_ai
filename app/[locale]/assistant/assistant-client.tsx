"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, Sparkles, FileText, Globe } from "lucide-react";
import {
  runAssistantMessage,
  runReadinessPreview,
  type ReadinessPreviewResult,
} from "@/app/[locale]/assistant/actions";
import type { GroundedAssistantResult } from "@/lib/ai/generate-grounded-answer";

type AssistantMessage =
  | {
      role: "user";
      text: string;
    }
  | {
      role: "assistant";
      text: string;
      result?: GroundedAssistantResult;
    };

const QUICK_PROMPTS_EN = [
  "I want to study in Australia",
  "I have an employer sponsor",
  "I want PR in Australia",
  "I am a civil engineer and want to migrate",
] as const;

const QUICK_PROMPTS_TR = [
  "Avustralya'da eğitim almak istiyorum",
  "İşveren sponsorum var",
  "Avustralya'da kalıcı oturum yollarını öğrenmek istiyorum",
  "İnşaat mühendisiyim ve göç yollarını araştırmak istiyorum",
] as const;

const QUICK_PROMPTS_ZH = [
  "我想在澳大利亚学习",
  "我有雇主担保",
  "我想在澳大利亚获得永久居民权",
  "我是土木工程师，想移民澳大利亚",
] as const;


type ReadinessPreviewForm = {
  mainGoal: string;
  currentCountry: string;
  passportCountry: string;
  age: string;
  occupation: string;
  englishLevel: string;
  sponsorFamily: string;
  preferredPathway: string;
  biggestConcern: string;
};

const EMPTY_PREVIEW_FORM: ReadinessPreviewForm = {
  mainGoal: "",
  currentCountry: "",
  passportCountry: "",
  age: "",
  occupation: "",
  englishLevel: "",
  sponsorFamily: "",
  preferredPathway: "",
  biggestConcern: "",
};

function getVisaInterestForReferral(sources: GroundedAssistantResult["sources"]): string {
  const subclasses = new Set(sources.map((source) => source.subclass));

  if (subclasses.has("820_801")) {
    return "820_801";
  }

  if (subclasses.has("491")) {
    const skilled = ["189", "190", "491"].filter((item) => subclasses.has(item));
    return skilled.length > 0 ? skilled.join(",") : "491";
  }

  if (subclasses.has("189") || subclasses.has("190")) {
    return "189,190";
  }

  if (subclasses.has("500") && subclasses.size === 1) {
    return "500";
  }

  if (subclasses.has("482") && subclasses.size === 1) {
    return "482";
  }

  return "not sure";
}

function buildAssistantReferralHref(input: {
  locale: "en" | "tr" | "zh-Hans";
  actionHref: string;
  latestUserQuestion: string;
  sources: GroundedAssistantResult["sources"];
}): string {
  if (!input.actionHref.endsWith("/agent-referral")) {
    return input.actionHref;
  }

  const visaInterest = getVisaInterestForReferral(input.sources);
  const params = new URLSearchParams({
    source: "assistant",
    visaInterest,
    message: input.latestUserQuestion,
  });

  return `/${input.locale}/agent-referral?${params.toString()}`;
}

function buildFullCheckHref(locale: "en" | "tr" | "zh-Hans", form: ReadinessPreviewForm): string {
  const params = new URLSearchParams({
    source: "readiness-preview",
  });

  if (form.mainGoal.trim()) params.set("goal", form.mainGoal.trim());
  if (form.occupation.trim()) params.set("occupation", form.occupation.trim());
  if (form.preferredPathway.trim()) params.set("preferredPathway", form.preferredPathway.trim());
  if (form.biggestConcern.trim()) params.set("biggestConcern", form.biggestConcern.trim());
  if (form.currentCountry.trim()) params.set("currentCountry", form.currentCountry.trim());

  return `/${locale}/full-check?${params.toString()}`;
}

export function AssistantClient({
  locale,
  initialMode = "simple",
}: {
  locale: "en" | "tr" | "zh-Hans";
  initialMode?: "simple" | "premium";
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (zh: string, tr: string, en: string) => (isTr ? tr : isZh ? zh : en);
  const mode = initialMode;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [previewForm, setPreviewForm] = useState<ReadinessPreviewForm>(EMPTY_PREVIEW_FORM);
  const [previewResult, setPreviewResult] = useState<ReadinessPreviewResult | null>(null);
  const [previewSending, setPreviewSending] = useState(false);
  const fullCheckHref = buildFullCheckHref(locale, previewForm);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: tx(
        "我可以帮助您基于一般信息探索签证路径。",
        "Genel bilgiye dayalı vize yollarını keşfetmenize yardımcı olabilirim.",
        "I can help you explore visa pathways based on general information."
      ),
    },
  ]);

  async function submitMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || sending) return;

    setSending(true);
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");

    try {
      const result = await runAssistantMessage({ locale, message });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.answer,
          result,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: tx(
            "当前无法生成回复。我仍可以帮您基于一般信息探索路径，您也可考虑和注册移民顾问交流。",
            "Şu anda yanıt oluşturulamadı. Genel bilgiye dayalı yolları keşfetmenize yardımcı olabilirim ve kayıtlı bir göç danışmanı ile görüşmeyi değerlendirebilirsiniz.",
            "A response could not be generated right now. I can still help you explore pathways based on general information, and you may consider speaking with a registered migration agent."
          ),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function updatePreviewField(field: keyof ReadinessPreviewForm, value: string) {
    setPreviewForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onPreviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewSending) return;

    setPreviewSending(true);
    try {
      const result = await runReadinessPreview({
        locale,
        ...previewForm,
      });
      setPreviewResult(result);
    } finally {
      setPreviewSending(false);
    }
  }

  function PreviewList({ title, items }: { title: string; items: string[] }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  const quickPrompts = isZh ? QUICK_PROMPTS_ZH : isTr ? QUICK_PROMPTS_TR : QUICK_PROMPTS_EN;

  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-zinc-950">
      {/* Top Banner / Mode Switcher */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              {tx("AI 签证助手", "AI Vize Asistanı", "AI Visa Assistant")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tx("受控信息提供", "Kontrollü Bilgi Sağlayıcı", "Controlled Information Provider")}
            </p>
          </div>
        </div>
        
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-zinc-900">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={`h-8 rounded-md px-3 text-xs transition-all ${mode === "simple" ? "bg-white shadow-sm dark:bg-zinc-800" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            <Link href={`/${locale}/assistant`}>
              {tx("聊天", "Sohbet", "Chat")}
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={`h-8 rounded-md px-3 text-xs transition-all ${mode === "premium" ? "bg-white shadow-sm dark:bg-zinc-800" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            <Link href={`/${locale}/assistant?mode=premium`} className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              {tx("深度预览", "Derin İnceleme", "Deep Preview")}
            </Link>
          </Button>
        </div>
      </div>

      {mode === "simple" ? (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto pb-8 pt-8">
            <div className="mx-auto max-w-3xl px-4 space-y-8">
              {messages.map((message, idx) => (
                <div key={`${message.role}-${idx}`} className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  
                  {message.role === "assistant" && (
                    <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                      <Bot className="size-5" />
                    </div>
                  )}

                  <div className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm transition-all ${
                    message.role === "user" 
                      ? "bg-indigo-600 text-white rounded-br-sm" 
                      : "bg-white border border-slate-100 dark:bg-zinc-900 dark:border-zinc-800 text-slate-800 dark:text-slate-200 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.text}</p>
                    
                    {message.role === "assistant" && message.result && (
                      <div className="mt-5 space-y-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                        {message.result.sources.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {tx("参考资料", "Kaynaklar", "Sources")}
                            </p>
                            <div className="flex flex-col gap-2">
                              {message.result.sources.map((source) => (
                                <div key={`${source.subclass}-${source.detailUrl}`} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                                  <FileText className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      {source.subclass} - {source.visaName}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <Link href={source.detailUrl} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                                        {tx("详情", "Detay", "Details")}
                                      </Link>
                                      {source.sourceUrl && (
                                        <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                          <Globe className="size-3" />
                                          {tx("官方", "Resmi", "Official")}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.result.nextActions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {message.result.nextActions.map((action) => {
                              const latestUserQuestion = messages
                                .slice(0, idx)
                                .reverse()
                                .find((item): item is Extract<AssistantMessage, { role: "user" }> => item.role === "user")
                                ?.text ?? "";

                              const href = buildAssistantReferralHref({
                                locale,
                                actionHref: action.href,
                                latestUserQuestion,
                                sources: message.result?.sources ?? [],
                              });

                              return (
                                <Button key={action.href + action.label} asChild size="sm" variant="secondary" className="rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50">
                                  <Link href={href}>{action.label}</Link>
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {message.role === "user" && (
                    <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow-sm dark:bg-zinc-800 dark:text-slate-300">
                      <span className="text-sm font-bold uppercase">U</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Disclaimer at bottom of chat */}
            <div className="mx-auto mt-10 max-w-2xl px-6 text-center text-xs text-slate-400 dark:text-slate-500 pb-4">
              {tx(
                "AI 可以犯错。本助手仅提供一般信息，不构成移民或法律建议。",
                "Yapay zeka hata yapabilir. Bu asistan yalnızca genel bilgi sunar, göç veya hukuki tavsiye değildir.",
                "AI can make mistakes. This assistant provides general information only, not migration or legal advice."
              )}
            </div>
          </div>

          {/* Fixed Input Area */}
          <div className="bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pb-6 pt-10 dark:from-zinc-950 dark:via-zinc-950">
            <div className="mx-auto max-w-3xl px-4">
              {messages.length === 1 && (
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={sending}
                      onClick={() => void submitMessage(prompt)}
                      className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white hover:text-indigo-600 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-zinc-900"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              
              <form onSubmit={onSubmit} className="relative flex w-full items-end gap-2">
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      tx(
                        "询问任何关于签证的问题...",
                        "Vizeler hakkında herhangi bir şey sorun...",
                        "Ask anything about visas..."
                      )
                    }
                    className="h-14 w-full rounded-2xl border-slate-200 bg-white pl-5 pr-14 text-base shadow-2xl transition-all focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={sending || !input.trim()}
                    className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-indigo-600 text-white shadow-md transition-all hover:scale-105 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Premium Preview Mode */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {tx("AI 准备度预览", "AI Hazırlık İncelemesi", "AI Readiness Review")}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {tx(
                  "基于有限输入快速预览可能的路径。",
                  "Sınırlı girdilere dayalı olası yollar için hızlı bir ön izleme.",
                  "Quick preview of possible pathways based on limited input."
                )}
              </p>
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={onPreviewSubmit} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="preview-main-goal">{tx("主要目标", "Ana hedef", "Main goal")}</Label>
                      <Textarea
                        id="preview-main-goal"
                        value={previewForm.mainGoal}
                        onChange={(event) => updatePreviewField("mainGoal", event.target.value)}
                        placeholder={tx("例：比较配偶和技能移民的可能路径", "Orn: Partner ve yetenekli yolları karşılaştır", "Example: compare partner and skilled possible pathways")}
                        rows={3}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-current-country">{tx("当前所在国", "Bulunduğunuz ülke", "Current country")}</Label>
                      <Input
                        id="preview-current-country"
                        value={previewForm.currentCountry}
                        onChange={(event) => updatePreviewField("currentCountry", event.target.value)}
                        placeholder="Australia, Turkiye, India..."
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-passport-country">{tx("护照国", "Pasaport ülkesi", "Passport country")}</Label>
                      <Input
                        id="preview-passport-country"
                        value={previewForm.passportCountry}
                        onChange={(event) => updatePreviewField("passportCountry", event.target.value)}
                        placeholder={tx("护照国", "Pasaport ülkesi", "Passport country")}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-age">{tx("年龄", "Yaş", "Age")}</Label>
                      <Input
                        id="preview-age"
                        value={previewForm.age}
                        onChange={(event) => updatePreviewField("age", event.target.value)}
                        placeholder={tx("年龄", "Yaş", "Age")}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-occupation">{tx("职业或学历背景", "Meslek veya eğitim geçmişi", "Occupation")}</Label>
                      <Input
                        id="preview-occupation"
                        value={previewForm.occupation}
                        onChange={(event) => updatePreviewField("occupation", event.target.value)}
                        placeholder={tx("职业或学历背景", "Meslek veya eğitim geçmişiniz", "Occupation or study background")}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-english">{tx("英语水平", "İngilizce seviyesi", "English level")}</Label>
                      <Input
                        id="preview-english"
                        value={previewForm.englishLevel}
                        onChange={(event) => updatePreviewField("englishLevel", event.target.value)}
                        placeholder={tx("不确定/能勝任/雅思或PTE成绩...", "Emin değilim, yetkin, IELTS/PTE skoru...", "Not sure, competent, IELTS/PTE score...")}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-sponsor-family">{tx("担保或家庭情况", "Avustralya'da sponsor, partner veya aile", "Sponsor / partner / family in Australia")}</Label>
                      <Input
                        id="preview-sponsor-family"
                        value={previewForm.sponsorFamily}
                        onChange={(event) => updatePreviewField("sponsorFamily", event.target.value)}
                        placeholder={tx("雇主担保/配偶/家人/无...", "İşveren sponsoru, partner, aile, yok...", "Employer sponsor, partner, family, none...")}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preview-pathway">{tx("意向路径（如知道）", "Biliniyorsa tercih edilen vize yolu", "Preferred pathway if known")}</Label>
                      <Input
                        id="preview-pathway"
                        value={previewForm.preferredPathway}
                        onChange={(event) => updatePreviewField("preferredPathway", event.target.value)}
                        placeholder="500, 482, 189, 190, 491, 820/801, not sure"
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="preview-concern">{tx("最大担忧", "En büyük endişe", "Biggest concern")}</Label>
                      <Textarea
                        id="preview-concern"
                        value={previewForm.biggestConcern}
                        onChange={(event) => updatePreviewField("biggestConcern", event.target.value)}
                        placeholder={tx("例：文件、时间安排、英语成绩、担保、关系证明...", "Orn: belgeler, zamanlama, İngilizce skoru, sponsor, ilişki kanıtı", "Example: documents, timing, English score, sponsor, relationship evidence")}
                        rows={3}
                        className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" disabled={previewSending} className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">
                    {previewSending
                      ? tx("生成中...", "Oluşturuluyor...", "Generating...")
                      : tx("生成预览", "Ön inceleme oluştur", "Generate preview review")}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {previewResult && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <PreviewList
                    title={tx("可能的签证路径", "Olası vize yolları", "Possible pathway areas")}
                    items={previewResult.possiblePathwayAreas}
                  />
                  <PreviewList
                    title={tx("缺少的信息", "Eksik bilgiler", "Missing information")}
                    items={previewResult.missingInformation}
                  />
                  <PreviewList
                    title={tx("基本风险信号", "Temel risk sinyalleri", "Basic risk signals")}
                    items={previewResult.basicRiskSignals}
                  />
                </div>

                <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-8 shadow-sm dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-purple-950/20 text-center">
                  <h3 className="mb-4 text-xl font-bold text-indigo-950 dark:text-indigo-200">
                    {tx("进入完整准备度报告？", "Tam vize hazırlık raporuna geçmek ister misiniz?", "Move to the full readiness report?")}
                  </h3>
                  <p className="mb-6 text-indigo-700 dark:text-indigo-400 max-w-2xl mx-auto">
                    {tx("生成完整准备度报告以获得结构化分析。", "Yapısal analiz için tam hazırlık raporu oluşturun.", "Generate a full readiness report for a structured analysis.")}
                  </p>
                  <Button asChild size="lg" className="rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700">
                    <Link href={fullCheckHref}>
                      {tx("前往完整报告", "Tam rapora devam et", "Continue to full report")}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
