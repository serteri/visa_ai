"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileCheck2,
  GraduationCap,
  Landmark,
  Loader2,
  Lock,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskStatus = "not-started" | "in-progress" | "completed";

type UploadedFile = { name: string; url: string };

type TaskState = {
  status: TaskStatus;
  targetDate: string;
  notes: string;
  uploadedFiles: UploadedFile[];
};

type JourneyState = Record<string, TaskState>;

type ChecklistItem = {
  id: string;
  label: string;
  substeps: string[];
};

type Phase = {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ChecklistItem[];
};

const tx = (locale: string, en: string, tr: string, zh: string) =>
  locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;

const STORAGE_KEY = "logivisa-journey-v1";

const DEFAULT_TASK_STATE: TaskState = { status: "not-started", targetDate: "", notes: "", uploadedFiles: [] };

const INITIAL_COMPLETED_IDS = ["pte", "passport", "naati"];

const STATUS_WEIGHT: Record<TaskStatus, number> = {
  "not-started": 0,
  "in-progress": 0.5,
  completed: 1,
};

function buildInitialState(itemIds: string[]): JourneyState {
  const state: JourneyState = {};
  for (const id of itemIds) {
    state[id] = INITIAL_COMPLETED_IDS.includes(id)
      ? { ...DEFAULT_TASK_STATE, status: "completed" }
      : { ...DEFAULT_TASK_STATE };
  }
  return state;
}

// Guards against older localStorage payloads (pre-uploadedFiles, or a stale
// shape from a previous iteration of this page) so a leftover record never
// crashes render -- every field is re-defaulted rather than trusted as-is.
function normalizeState(raw: Partial<JourneyState> | null | undefined, itemIds: string[]): JourneyState {
  const state: JourneyState = {};
  for (const id of itemIds) {
    const existing = raw?.[id];
    state[id] = {
      status: existing?.status ?? DEFAULT_TASK_STATE.status,
      targetDate: existing?.targetDate ?? DEFAULT_TASK_STATE.targetDate,
      notes: existing?.notes ?? DEFAULT_TASK_STATE.notes,
      uploadedFiles: Array.isArray(existing?.uploadedFiles) ? existing.uploadedFiles : [],
    };
  }
  return state;
}

function StatusBadge({ status, locale }: { status: TaskStatus; locale: string }) {
  const config = {
    "not-started": {
      icon: Circle,
      label: tx(locale, "Not Started", "Başlamadı", "未开始"),
      className: "border-white/15 bg-white/5 text-[var(--color-ash-gray)]",
    },
    "in-progress": {
      icon: Clock,
      label: tx(locale, "In Progress", "Devam Ediyor", "进行中"),
      className: "border-[var(--color-saffron-spark)]/40 bg-[var(--color-saffron-spark)]/10 text-[var(--color-saffron-spark)]",
    },
    completed: {
      icon: CheckCircle2,
      label: tx(locale, "Completed", "Tamamlandı", "已完成"),
      className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export function JourneyDashboard({ locale }: { locale: string }) {
  const phases: Phase[] = useMemo(
    () => [
      {
        id: "preparation",
        title: tx(locale, "Preparation", "Hazırlık", "准备阶段"),
        icon: GraduationCap,
        items: [
          {
            id: "pte",
            label: tx(locale, "PTE Academic completed", "PTE Academic tamamlandı", "完成 PTE Academic 考试"),
            substeps: [
              tx(locale, "Book your test date at a Pearson test center", "Pearson test merkezinde sınav tarihinizi ayırtın", "在Pearson考试中心预约考试日期"),
              tx(locale, "Complete at least 3 full practice tests", "En az 3 tam deneme sınavı tamamlayın", "完成至少3次完整模拟考试"),
              tx(locale, "Focus on Speaking & Writing repeat-sentence drills", "Konuşma ve Yazma bölümlerinde tekrar cümle alıştırmalarına odaklanın", "重点练习口语和写作的重复句型"),
              tx(locale, "Aim for 79+ across all four skills", "Dört beceride de 79+ hedefleyin", "四项均争取达到79分以上"),
            ],
          },
          {
            id: "passport",
            label: tx(locale, "Passport valid for 12+ months", "Pasaport 12+ ay geçerli", "护照有效期12个月以上"),
            substeps: [
              tx(locale, "Check your passport expiry date", "Pasaportunuzun son kullanma tarihini kontrol edin", "检查您护照的有效期"),
              tx(locale, "Renew it if less than 12 months remain", "12 aydan az kaldıysa yenileyin", "若剩余不足12个月请及时续签"),
              tx(locale, "Make certified copies of the bio page", "Kimlik sayfasının onaylı kopyalarını çıkarın", "准备护照个人信息页的认证复印件"),
            ],
          },
          {
            id: "naati",
            label: tx(locale, "NAATI CCL passed", "NAATI CCL geçildi", "通过 NAATI CCL 考试"),
            substeps: [
              tx(locale, "Confirm your language is on NAATI's recognized list", "Dilinizin NAATI'nin tanıdığı diller listesinde olduğunu doğrulayın", "确认您的语言在NAATI认可语言列表中"),
              tx(locale, "Book the CCL dialogue interpreting exam", "CCL diyalog tercümanlık sınavına kaydolun", "预约CCL对话口译考试"),
              tx(locale, "Practice with sample dialogues and terminology", "Örnek diyaloglar ve terminoloji ile pratik yapın", "练习样本对话和专业术语"),
            ],
          },
        ],
      },
      {
        id: "assessment",
        title: tx(locale, "Skills Assessment", "Mesleki Denklik", "职业评估"),
        icon: Landmark,
        items: [
          {
            id: "translation",
            label: tx(locale, "Document translation done", "Belge tercümeleri tamamlandı", "文件翻译已完成"),
            substeps: [
              tx(locale, "Identify all documents requiring translation", "Tercüme gerektiren tüm belgeleri belirleyin", "确定所有需要翻译的文件"),
              tx(locale, "Use a NAATI-certified translator", "NAATI onaylı bir tercüman kullanın", "使用NAATI认证翻译人员"),
              tx(locale, "Verify certified translations match the originals", "Onaylı tercümelerin orijinalle eşleştiğini doğrulayın", "核实认证翻译件与原件一致"),
            ],
          },
          {
            id: "lodgement",
            label: tx(locale, "Application lodged with authority", "Kuruma başvuru yapıldı", "已向评估机构提交申请"),
            substeps: [
              tx(locale, "Confirm your correct ANZSCO code and assessing authority", "Doğru ANZSCO kodunuzu ve değerlendirme kurumunuzu teyit edin", "确认正确的ANZSCO代码和评估机构"),
              tx(locale, "Prepare employment references and qualification evidence", "İstihdam referanslarını ve nitelik kanıtlarını hazırlayın", "准备工作证明和学历证明材料"),
              tx(locale, "Submit the application and pay the assessment fee", "Başvuruyu gönderin ve değerlendirme ücretini ödeyin", "提交申请并支付评估费用"),
            ],
          },
          {
            id: "outcome",
            label: tx(locale, "Positive outcome received", "Olumlu sonuç alındı", "收到正面评估结果"),
            substeps: [
              tx(locale, "Track processing status on the authority's portal", "Kurumun portalından işlem durumunu takip edin", "在评估机构官网追踪申请进度"),
              tx(locale, "Respond promptly to any requests for more information", "Ek bilgi taleplerine hızlıca yanıt verin", "及时回复任何补充材料请求"),
              tx(locale, "Save the positive outcome letter for your EOI", "Olumlu sonuç mektubunu EOI için saklayın", "保存正面评估结果信，用于EOI"),
            ],
          },
        ],
      },
      {
        id: "post-invitation",
        title: tx(locale, "Post-Invitation", "Davet Sonrası", "获邀之后"),
        icon: Send,
        items: [
          {
            id: "visa-lodged",
            label: tx(locale, "Visa application lodged", "Vize başvurusu yapıldı", "已提交签证申请"),
            substeps: [
              tx(locale, "Submit your Expression of Interest (EOI) via SkillSelect", "SkillSelect üzerinden İlgi Beyanınızı (EOI) gönderin", "通过SkillSelect提交意向书（EOI）"),
              tx(locale, "Accept the invitation within 60 days", "Daveti 60 gün içinde kabul edin", "在60天内接受邀请"),
              tx(locale, "Lodge the visa application with all required documents", "Gerekli tüm belgelerle vize başvurusunu yapın", "提交包含所有材料的签证申请"),
            ],
          },
          {
            id: "form80",
            label: tx(locale, "Form 80 uploaded", "Form 80 yüklendi", "已上传 Form 80"),
            substeps: [
              tx(locale, "Download Form 80 from the Department of Home Affairs", "Form 80'i İçişleri Bakanlığı sitesinden indirin", "从内政部网站下载Form 80表格"),
              tx(locale, "Complete your personal history and travel details", "Kişisel geçmiş ve seyahat bilgilerini doldurun", "填写个人经历和旅行记录"),
              tx(locale, "Upload the signed form to ImmiAccount", "İmzalı formu ImmiAccount'a yükleyin", "将签署的表格上传至ImmiAccount"),
            ],
          },
          {
            id: "medicals",
            label: tx(locale, "Medicals & AFP checks done", "Sağlık ve AFP kontrolleri tamamlandı", "已完成体检与AFP无犯罪证明"),
            substeps: [
              tx(locale, "Book your medical exam via My Health Declarations", "My Health Declarations üzerinden sağlık muayenenizi ayırtın", "通过My Health Declarations预约体检"),
              tx(locale, "Apply for an AFP National Police Check", "AFP Ulusal Sabıka Kaydı için başvurun", "申请AFP无犯罪记录证明"),
              tx(locale, "Upload results once received", "Sonuçları aldığınızda yükleyin", "收到结果后上传"),
            ],
          },
        ],
      },
    ],
    [locale]
  );

  const allItemIds = useMemo(() => phases.flatMap((phase) => phase.items.map((item) => item.id)), [phases]);

  const [mounted, setMounted] = useState(false);
  const [taskState, setTaskState] = useState<JourneyState>(() => buildInitialState(allItemIds));
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Load any saved progress from Local Storage once mounted -- keeping the
  // first client render identical to the server-rendered default above is
  // what avoids a hydration mismatch here.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<JourneyState>;
        setTaskState((prev) => normalizeState({ ...prev, ...saved }, allItemIds));
      }
    } catch {
      // ignore malformed local storage payloads
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(taskState));
  }, [taskState, mounted]);

  const updateTask = (id: string, patch: Partial<TaskState>) => {
    setTaskState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? DEFAULT_TASK_STATE), ...patch },
    }));
  };

  const handleResetProgress = () => {
    const confirmed = window.confirm(
      tx(
        locale,
        "Reset all progress? This clears every status, date, note, and uploaded file on this device.",
        "Tüm ilerleme sıfırlansın mı? Bu cihazdaki tüm durum, tarih, not ve yüklenen dosyalar silinecek.",
        "确定要重置所有进度吗？这将清除此设备上的所有状态、日期、笔记和已上传的文件。"
      )
    );
    if (!confirmed) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setTaskState(buildInitialState(allItemIds));
    setUploadErrors({});
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    setUploadErrors((prev) => ({ ...prev, [itemId]: "" }));
    setUploadingId(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/journey-upload", { method: "POST", body: formData });
      const data = (await res.json()) as { name?: string; url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed. Please try again.");
      }
      setTaskState((prev) => {
        const current = prev[itemId] ?? DEFAULT_TASK_STATE;
        return {
          ...prev,
          [itemId]: {
            ...current,
            uploadedFiles: [...current.uploadedFiles, { name: data.name || file.name, url: data.url! }],
          },
        };
      });
    } catch (error) {
      setUploadErrors((prev) => ({
        ...prev,
        [itemId]: error instanceof Error ? error.message : "Upload failed. Please try again.",
      }));
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveFile = (itemId: string, index: number) => {
    setTaskState((prev) => {
      const current = prev[itemId] ?? DEFAULT_TASK_STATE;
      return {
        ...prev,
        [itemId]: { ...current, uploadedFiles: current.uploadedFiles.filter((_, i) => i !== index) },
      };
    });
  };

  const totalWeight = allItemIds.reduce((sum, id) => sum + STATUS_WEIGHT[(taskState[id] ?? DEFAULT_TASK_STATE).status], 0);
  const progress = Math.round((totalWeight / allItemIds.length) * 100);

  const currentPhase =
    phases.find((phase) => phase.items.some((item) => (taskState[item.id] ?? DEFAULT_TASK_STATE).status !== "completed")) ??
    phases[phases.length - 1];

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: "not-started", label: tx(locale, "Not Started", "Başlamadı", "未开始") },
    { value: "in-progress", label: tx(locale, "In Progress", "Devam Ediyor", "进行中") },
    { value: "completed", label: tx(locale, "Completed", "Tamamlandı", "已完成") },
  ];

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
              "A free planner to manage every stage of your PR journey — set a status, a target date, and keep your notes and document links in one place.",
              "PR yolculuğunuzun her aşamasını yönetmek için ücretsiz bir planlayıcı — durum belirleyin, hedef tarih koyun, notlarınızı ve belge linklerinizi tek yerde tutun.",
              "一份免费的规划工具，帮您管理PR旅程的每个阶段——设置状态、目标日期，并将笔记和文件链接集中保存。"
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
          {phases.map((phase) => {
            const Icon = phase.icon;
            const completedInPhase = phase.items.filter(
              (item) => (taskState[item.id] ?? DEFAULT_TASK_STATE).status === "completed"
            ).length;

            return (
              <div key={phase.id}>
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-electric-iris)]/15 text-[var(--color-electric-iris)]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h2 className="text-xl font-bold text-white">{phase.title}</h2>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-ash-gray)]">
                        {completedInPhase}/{phase.items.length}
                      </span>
                    </div>

                    <Accordion className="mt-4 divide-y divide-white/10">
                      {phase.items.map((item) => {
                        const state = taskState[item.id] ?? DEFAULT_TASK_STATE;
                        return (
                          <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger className="text-white hover:text-[var(--color-electric-iris)]">
                              <span className="flex flex-wrap items-center gap-3">
                                <span className="text-base font-semibold text-white">{item.label}</span>
                                <StatusBadge status={state.status} locale={locale} />
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid gap-5 rounded-xl border border-white/10 bg-black/30 p-4 sm:grid-cols-2 sm:p-5">
                                <div>
                                  <Label className="text-xs font-bold uppercase tracking-wide text-[var(--color-ash-gray)]">
                                    {tx(locale, "Status", "Durum", "状态")}
                                  </Label>
                                  <Select
                                    value={state.status}
                                    onValueChange={(value) => updateTask(item.id, { status: value as TaskStatus })}
                                  >
                                    <SelectTrigger className="mt-1.5 border border-white/15 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs font-bold uppercase tracking-wide text-[var(--color-ash-gray)]">
                                    {tx(locale, "Target Date", "Hedef Tarih", "目标日期")}
                                  </Label>
                                  <Input
                                    type="date"
                                    value={state.targetDate}
                                    onChange={(e) => updateTask(item.id, { targetDate: e.target.value })}
                                    className="mt-1.5 h-10 border-white/15 text-white"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <Label className="text-xs font-bold uppercase tracking-wide text-[var(--color-ash-gray)]">
                                    {tx(locale, "Document Link / Notes", "Belge Linki / Notlar", "文件链接 / 笔记")}
                                  </Label>
                                  <Textarea
                                    value={state.notes}
                                    onChange={(e) => updateTask(item.id, { notes: e.target.value })}
                                    placeholder={tx(
                                      locale,
                                      "Paste a Google Drive link or add your notes here...",
                                      "Google Drive linkinizi yapıştırın veya notlarınızı buraya ekleyin...",
                                      "粘贴Google Drive链接或在此添加笔记..."
                                    )}
                                    className="mt-1.5 border-white/15 text-white"
                                  />

                                  <FileDropzone
                                    itemId={item.id}
                                    locale={locale}
                                    uploading={uploadingId === item.id}
                                    error={uploadErrors[item.id]}
                                    onFile={(file) => handleFileUpload(item.id, file)}
                                  />

                                  {state.uploadedFiles.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {state.uploadedFiles.map((file, index) => (
                                        <span
                                          key={`${file.url}-${index}`}
                                          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-1.5 text-xs font-medium text-gray-200"
                                        >
                                          <Paperclip className="h-3 w-3 shrink-0 text-[var(--color-ash-gray)]" />
                                          <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="max-w-[160px] truncate hover:text-[var(--color-electric-iris)]"
                                          >
                                            {file.name}
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFile(item.id, index)}
                                            aria-label={tx(locale, "Remove file", "Dosyayı kaldır", "移除文件")}
                                            className="rounded-full p-0.5 text-[var(--color-ash-gray)] hover:bg-white/10 hover:text-white"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="sm:col-span-2">
                                  <Label className="text-xs font-bold uppercase tracking-wide text-[var(--color-ash-gray)]">
                                    {tx(locale, "Sub-steps", "Alt Adımlar", "子步骤")}
                                  </Label>
                                  <ol className="mt-2 space-y-1.5">
                                    {item.substeps.map((step, i) => (
                                      <li key={step} className="flex gap-2 text-sm leading-6 text-gray-300">
                                        <span className="shrink-0 font-semibold text-[var(--color-electric-iris)]">
                                          {i + 1}.
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
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

        <div className="mt-10 flex justify-center border-t border-white/10 pt-8">
          <button
            type="button"
            onClick={handleResetProgress}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {tx(locale, "Reset Progress", "İlerlemeyi Sıfırla", "重置进度")}
          </button>
        </div>
      </div>
    </main>
  );
}

function FileDropzone({
  itemId,
  locale,
  uploading,
  error,
  onFile,
}: {
  itemId: string;
  locale: string;
  uploading: boolean;
  error?: string;
  onFile: (file: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `journey-upload-${itemId}`;

  return (
    <div className="mt-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-center text-xs transition-colors ${
          dragOver ? "border-[var(--color-electric-iris)] bg-[var(--color-electric-iris)]/10" : "border-white/20"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <span className="flex items-center gap-2 text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tx(locale, "Uploading...", "Yükleniyor...", "上传中...")}
          </span>
        ) : (
          <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 text-gray-300 hover:text-white">
            <UploadCloud className="h-4 w-4 text-[var(--color-ash-gray)]" />
            {tx(
              locale,
              "Click to upload or drag & drop a document",
              "Yüklemek için tıklayın veya belgeyi sürükleyip bırakın",
              "点击上传或拖放文件到此处"
            )}
          </label>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
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
