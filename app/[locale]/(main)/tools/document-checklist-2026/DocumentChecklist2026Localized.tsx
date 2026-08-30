'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import {
  ChevronDown,
  ChevronUp,
  Printer,
  AlertCircle,
  Info,
  Calendar,
  Stamp,
  Languages,
  LogIn,
  ArrowLeft,
} from 'lucide-react'
import { getChecklistContent, type ChecklistLocale, type VisaSubclass, type ChecklistDoc } from '@/lib/i18n/checklist-content'

type DocState = {
  checked: boolean
  expiryDate: string
  notes: string
}

type ChecklistState = Record<string, DocState>

const EMPTY: DocState = { checked: false, expiryDate: '', notes: '' }
const VISA_ORDER: VisaSubclass[] = ['189', '190', '491', '482', '485', '186']

// Case-file-toned category palette -- fixed hex, not theme-flipping --cf-*
// tokens, because these ten hues exist purely to let users tell document
// categories apart at a glance (a real UX function, not decoration), the
// same way the case-log's flag badges use fixed colors. header sits behind
// white text; light is the tint behind each category's white checklist rows.
const CAT_COLORS = [
  { header: 'bg-[#8C6530]', light: 'bg-[#F3EBDA]', border: 'border-[#D8C39E]' }, // brass
  { header: 'bg-[#7A3B2E]', light: 'bg-[#F3E4DE]', border: 'border-[#DDB5A6]' }, // rust
  { header: 'bg-[#4C6B57]', light: 'bg-[#E7EFE9]', border: 'border-[#B9D0C1]' }, // sage
  { header: 'bg-[#3D5875]', light: 'bg-[#E4EBF1]', border: 'border-[#AEC3D6]' }, // slate-blue
  { header: 'bg-[#7A5C3D]', light: 'bg-[#EFE7DA]', border: 'border-[#D3BE9C]' }, // ochre
  { header: 'bg-[#8A4A5C]', light: 'bg-[#F1E3E6]', border: 'border-[#D9AEB9]' }, // wine
  { header: 'bg-[#4A6B6B]', light: 'bg-[#E3EBEB]', border: 'border-[#AECACA]' }, // teal-muted
  { header: 'bg-[#5C5C7A]', light: 'bg-[#E7E7EF]', border: 'border-[#BEBED9]' }, // slate-violet
  { header: 'bg-[#7A5C5C]', light: 'bg-[#EFE7E7]', border: 'border-[#D3BEBE]' }, // clay
  { header: 'bg-[#5C7A4A]', light: 'bg-[#EAF0E4]', border: 'border-[#C3D9AE]' }, // olive
]

function getExpiryStatus(expiryDate: string, warningMonths = 6) {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  if (Number.isNaN(expiry.getTime())) return null
  const diffMs = expiry.getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86400000)
  const diffMonths = Math.round(diffDays / 30)
  if (diffDays < 0) return { status: 'expired' as const, diffDays, diffMonths }
  if (diffMonths < 3) return { status: 'danger' as const, diffDays, diffMonths }
  if (diffMonths < warningMonths) return { status: 'warning' as const, diffDays, diffMonths }
  return { status: 'ok' as const, diffDays, diffMonths }
}

function isVisaSubclass(value: string | undefined): value is VisaSubclass {
  return !!value && VISA_ORDER.includes(value as VisaSubclass)
}

function loadChecklistState(selectedVisa: VisaSubclass | null): ChecklistState {
  if (!selectedVisa || typeof window === 'undefined') return {}

  try {
    const saved = localStorage.getItem(`visa-checklist-${selectedVisa}`)
    return saved ? (JSON.parse(saved) as ChecklistState) : {}
  } catch {
    return {}
  }
}

// Shared across every subclass (not per-visa, unlike loadChecklistState above)
// since partner/dependant/residence facts don't change when switching which
// visa's checklist you're viewing.
const QUESTIONNAIRE_KEY = 'visa-checklist-questionnaire'

type QuestionnaireState = {
  partner: boolean
  dependantsUnder18: number
  dependantsOver18: number
  overseasResidence: boolean
}

const EMPTY_QUESTIONNAIRE: QuestionnaireState = {
  partner: false,
  dependantsUnder18: 0,
  dependantsOver18: 0,
  overseasResidence: false,
}

function loadQuestionnaire(): QuestionnaireState {
  if (typeof window === 'undefined') return EMPTY_QUESTIONNAIRE
  try {
    const saved = localStorage.getItem(QUESTIONNAIRE_KEY)
    return saved ? { ...EMPTY_QUESTIONNAIRE, ...(JSON.parse(saved) as Partial<QuestionnaireState>) } : EMPTY_QUESTIONNAIRE
  } catch {
    return EMPTY_QUESTIONNAIRE
  }
}

// Returns a locale-appropriate "not relevant" note if the document doesn't
// apply given the questionnaire answers, or null if it's relevant (or the
// document has no relevantWhen condition at all). Items are never hidden --
// only dimmed with this note -- so the user can always change an earlier
// answer and see the item reappear at full opacity.
function getIrrelevanceNote(doc: ChecklistDoc, q: QuestionnaireState, locale: ChecklistLocale): string | null {
  const rw = doc.relevantWhen
  if (!rw) return null
  if (rw.partner && !q.partner) {
    return locale === 'tr' ? 'İlgili değil: partneriniz yok' : locale === 'zh-Hans' ? '不适用：您没有伴侣' : 'Not relevant: no partner'
  }
  if (rw.dependantsUnder18 && q.dependantsUnder18 === 0) {
    return locale === 'tr' ? 'İlgili değil: 18 yaş altı bağımlınız yok' : locale === 'zh-Hans' ? '不适用：没有18岁以下受抚养子女' : 'Not relevant: no dependent children under 18'
  }
  if (rw.dependantsOver18 && q.dependantsOver18 === 0) {
    return locale === 'tr' ? 'İlgili değil: 18 yaş üstü bağımlınız yok' : locale === 'zh-Hans' ? '不适用：没有18岁及以上受抚养子女' : 'Not relevant: no dependent children 18 or over'
  }
  if (rw.overseasResidence && !q.overseasResidence) {
    return locale === 'tr' ? 'İlgili değil: son 10 yılda yurt dışında 12+ ay yaşamadınız' : locale === 'zh-Hans' ? '不适用：过去10年内海外居住未满12个月' : 'Not relevant: no 12+ month overseas residence in the last 10 years'
  }
  return null
}

const questionnaireText: Record<ChecklistLocale, {
  title: string
  subtitle: string
  partnerQ: string
  dependantsQ: string
  under18Label: string
  over18Label: string
  overseasQ: string
  yes: string
  no: string
}> = {
  en: {
    title: 'A few quick questions',
    subtitle: 'These help us dim documents that don’t apply to you. You can change your answers anytime.',
    partnerQ: 'Do you have a partner, and are they included in this application?',
    dependantsQ: 'Do you have dependent children? If so, how many?',
    under18Label: 'Under 18',
    over18Label: '18 or over',
    overseasQ: 'In the last 10 years, have you lived outside Australia for 12+ months in any single country?',
    yes: 'Yes',
    no: 'No',
  },
  tr: {
    title: 'Birkaç kısa soru',
    subtitle: 'Bu cevaplar size uymayan belgeleri soluklaştırmamıza yardımcı olur. Cevaplarınızı istediğiniz zaman değiştirebilirsiniz.',
    partnerQ: 'Partneriniz var mı ve başvuruya dahil mi?',
    dependantsQ: '18 yaş altı/üstü bağımlı çocuğunuz var mı? Varsa kaç?',
    under18Label: '18 yaş altı',
    over18Label: '18 yaş ve üstü',
    overseasQ: 'Son 10 yılda Avustralya dışında herhangi bir ülkede 12+ ay yaşadığınız oldu mu?',
    yes: 'Evet',
    no: 'Hayır',
  },
  'zh-Hans': {
    title: '几个简短问题',
    subtitle: '这些答案能帮助我们淡化不适用于您的材料。您可以随时修改答案。',
    partnerQ: '您有伴侣吗？伴侣是否包含在本次申请中？',
    dependantsQ: '您有受抚养子女吗？如果有，有几位？',
    under18Label: '18岁以下',
    over18Label: '18岁及以上',
    overseasQ: '过去10年内，您是否在澳大利亚以外的某个国家居住满12个月及以上？',
    yes: '是',
    no: '否',
  },
}

function ChecklistCard({
  doc,
  state,
  checked,
  onToggle,
  onExpiryChange,
  onToggleTip,
  onToggleNote,
  tipOpen,
  noteOpen,
  categoryLabel,
}: {
  doc: ChecklistDoc
  state: DocState
  checked: boolean
  onToggle: (value: boolean) => void
  onExpiryChange: (value: string) => void
  onToggleTip: () => void
  onToggleNote: () => void
  tipOpen: boolean
  noteOpen: boolean
  categoryLabel: string
}) {
  const expiryStatus = doc.expiryTracking && state.expiryDate ? getExpiryStatus(state.expiryDate, doc.warningMonths) : null

  return (
    <div className={`bg-[#ffffff] px-4 py-4 transition-opacity duration-150 ${checked ? 'opacity-55' : ''}`}>
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <input
            type="checkbox"
            id={`chk-${doc.id}`}
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-[#e2e8f0] accent-[#53917E]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`break-words text-sm font-semibold ${checked ? 'text-[#475569] line-through' : 'text-[#0f172a]'}`}>
                {doc.name}
              </span>
              {!doc.required && <span className="text-xs italic text-[#475569]">({categoryLabel})</span>}
              {doc.apostilleRequired && (
                <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                  <Stamp className="h-3 w-3" /> Apostille
                </span>
              )}
              {doc.naatiRequired && (
                <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                  <Languages className="h-3 w-3" /> NAATI
                </span>
              )}
            </div>
            <p className="mt-0.5 break-words text-xs whitespace-normal text-[#475569]">{doc.description}</p>
          </label>

          {doc.expiryTracking && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-[#475569]">
                <Calendar className="h-3.5 w-3.5" /> Expiry:
              </span>
              <input
                type="date"
                value={state.expiryDate}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#53917E1a]"
              />
              {expiryStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    expiryStatus.status === 'expired'
                      ? 'bg-amber-100 text-amber-700'
                      : expiryStatus.status === 'danger'
                        ? 'bg-amber-100 text-amber-700'
                        : expiryStatus.status === 'warning'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-[#53917E]/10 text-[#53917E]'
                  }`}
                >
                  {expiryStatus.status === 'expired'
                    ? `Expired (${Math.abs(expiryStatus.diffDays)} days ago)`
                    : expiryStatus.status === 'danger'
                      ? `⚠️ ${expiryStatus.diffDays} days left`
                      : expiryStatus.status === 'warning'
                        ? `${expiryStatus.diffMonths} months left`
                        : `✓ ${expiryStatus.diffMonths} months valid`}
                </span>
              )}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onToggleTip}
              className="flex items-center gap-1 text-xs text-[#53917E] transition-colors hover:opacity-80"
            >
              <Info className="h-3.5 w-3.5" />
              {tipOpen ? 'Hide tip' : 'Show tip'}
              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={onToggleNote}
              className="flex items-center gap-1 text-xs text-[#475569] transition-colors hover:text-[#0f172a]"
            >
              📝 {noteOpen ? 'Hide note' : state.notes ? 'Edit note' : 'Add note'}
              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {tipOpen && <div className="mt-2 rounded-lg border border-[#53917E1a] bg-[#53917E1a] px-3 py-2 text-xs leading-relaxed text-[#0f172a]">{doc.tips}</div>}

          {noteOpen && (
            <textarea
              value={state.notes}
              onChange={() => onToggleNote()}
              placeholder="Reference number, submission date, translation note..."
              rows={2}
              className="mt-2 w-full resize-none rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1.5 text-xs text-[#0f172a] placeholder:text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#53917E1a]"
            />
          )}

          {!noteOpen && state.notes && <p className="mt-1.5 truncate text-xs italic text-[#475569]">📝 {state.notes}</p>}
        </div>
      </div>
    </div>
  )
}

export function DocumentChecklist2026Localized({ locale, initialVisa }: { locale: ChecklistLocale; initialVisa?: string }) {
  const { data: session } = useSession()
  const pack = useMemo(() => getChecklistContent(locale), [locale])
  const [selectedVisa] = useState<VisaSubclass | null>(isVisaSubclass(initialVisa) ? initialVisa : null)
  const [docStates, setDocStates] = useState<ChecklistState>(() => loadChecklistState(isVisaSubclass(initialVisa) ? initialVisa : null))
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireState>(() => loadQuestionnaire())

  useEffect(() => {
    if (!selectedVisa) return
    localStorage.setItem(`visa-checklist-${selectedVisa}`, JSON.stringify(docStates))
  }, [docStates, selectedVisa])

  useEffect(() => {
    localStorage.setItem(QUESTIONNAIRE_KEY, JSON.stringify(questionnaire))
  }, [questionnaire])

  const qt = questionnaireText[locale] ?? questionnaireText.en

  const currentDocs = useMemo(() => (selectedVisa ? (pack.docs[selectedVisa] ?? []) : []), [pack.docs, selectedVisa])

  const categories = useMemo(() => {
    const map = new Map<string, ChecklistDoc[]>()
    for (const doc of currentDocs) {
      if (!map.has(doc.category)) map.set(doc.category, [])
      map.get(doc.category)!.push(doc)
    }
    return [...map.entries()]
  }, [currentDocs])

  const progress = useMemo(() => {
    const total = currentDocs.length
    const checked = currentDocs.filter((doc) => docStates[doc.id]?.checked).length
    const byCategory = categories.map(([cat, docs]) => ({
      cat,
      total: docs.length,
      checked: docs.filter((doc) => docStates[doc.id]?.checked).length,
    }))
    const expiryAlerts = currentDocs.flatMap((doc) => {
      if (!doc.expiryTracking || !docStates[doc.id]?.expiryDate) return []
      const status = getExpiryStatus(docStates[doc.id].expiryDate, doc.warningMonths)
      return status && status.status !== 'ok' ? [{ doc, status }] : []
    })
    return { total, checked, byCategory, expiryAlerts }
  }, [categories, currentDocs, docStates])

  const updateDoc = useCallback((id: string, patch: Partial<DocState>) => {
    setDocStates((prev) => ({ ...prev, [id]: { ...EMPTY, ...prev[id], ...patch } }))
  }, [])

  const toggleTip = useCallback((id: string) => {
    setExpandedTips((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleNote = useCallback((id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const backHref = `/${locale}/tools/document-checklist-2026`

  if (!selectedVisa) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 md:py-16">
          <div className="mb-8 text-center md:mb-10">
            <h1 className="cf-serif mb-3 text-2xl font-medium text-[#0f172a] md:text-3xl">{pack.pageTitle}</h1>
            <p className="mx-auto max-w-2xl text-base text-[#475569] md:text-lg">{pack.pageSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VISA_ORDER.map((visa) => (
              <Link
                key={visa}
                href={`/${locale}/tools/document-checklist-2026/${visa}`}
                className="group rounded-sm border-2 border-[#e2e8f0] bg-[#ffffff] p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="mb-3 text-3xl">📄</div>
                <div className="text-lg font-bold text-[#0f172a]">{pack.visaTitle[visa].title}</div>
                <div className="mt-1 text-sm text-[#475569]">{pack.visaTitle[visa].description}</div>
                <div className="mt-3 text-xs text-[#475569] transition-colors group-hover:text-[#0f172a]">{pack.viewChecklist}</div>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-[#475569]">{pack.autoSaveNotice}</p>
        </div>
      </div>
    )
  }

  const visaCopy = pack.visaTitle[selectedVisa]
  const pct = progress.total > 0 ? (progress.checked / progress.total) * 100 : 0

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-slate-50 shadow-sm print:hidden">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={backHref} className="flex shrink-0 items-center gap-1 text-sm text-[#475569] transition-colors hover:text-[#0f172a]">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{pack.backButton}</span>
              </Link>
              <span className="hidden text-[#e2e8f0] sm:inline">|</span>
              <span className="truncate text-sm font-semibold text-[#0f172a]">{visaCopy.title} — {visaCopy.description}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {progress.expiryAlerts.length > 0 && (
                <span className="hidden items-center gap-1 text-xs font-medium text-[#53917E] sm:flex">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {progress.expiryAlerts.length} warnings
                </span>
              )}
              <button onClick={() => window.print()} className="flex items-center gap-1 rounded border border-[#e2e8f0] px-2 py-1 text-xs text-[#475569] transition-colors hover:text-[#0f172a]">
                <Printer className="h-3.5 w-3.5" />
                <span className="ml-1 hidden sm:inline">{pack.printButton}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-2.5 flex-1" />
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[#0f172a]">
              {progress.checked} / {progress.total} {pack.savedSuffix}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {progress.byCategory.map(({ cat, total, checked }) => (
              <span key={cat} className="text-xs text-[#475569]">
                {checked === total ? '✅' : checked === 0 ? '❌' : '⚠️'} {pack.categories[cat] ?? cat}: {checked}/{total}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12">
        {!session && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#53917E1a] bg-[#53917E1a] px-4 py-3 print:hidden">
            <div className="flex items-center gap-2 text-sm text-[#0f172a]">
              <Info className="h-4 w-4 shrink-0" />
              <span className="break-words whitespace-normal">{pack.loginNotice}</span>
            </div>
            <a href={`/${locale}/sign-in`} className="flex shrink-0 items-center gap-1 rounded border border-[#53917E] px-2 py-1 text-xs font-medium whitespace-nowrap text-[#53917E] transition-colors hover:bg-[#53917E1a]">
              <LogIn className="h-3.5 w-3.5" /> {pack.loginButton}
            </a>
          </div>
        )}

        <div className="rounded-lg border border-[#53917E1a] bg-[#53917E1a] p-4 print:hidden">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
            <Info className="h-4 w-4 shrink-0" /> {qt.title}
          </h3>
          <p className="mb-3 text-xs text-slate-600">{qt.subtitle}</p>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm text-[#0f172a]">{qt.partnerQ}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionnaire((prev) => ({ ...prev, partner: true }))}
                  className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${questionnaire.partner ? 'border-[#53917E] bg-[#53917E] text-[#ffffff]' : 'border-slate-300 text-[#0f172a]'}`}
                >
                  {qt.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionnaire((prev) => ({ ...prev, partner: false }))}
                  className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${!questionnaire.partner ? 'border-[#53917E] bg-[#53917E] text-[#ffffff]' : 'border-slate-300 text-[#0f172a]'}`}
                >
                  {qt.no}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm text-[#0f172a]">{qt.dependantsQ}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  {qt.under18Label}
                  <input
                    type="number"
                    min={0}
                    value={questionnaire.dependantsUnder18}
                    onChange={(e) => setQuestionnaire((prev) => ({ ...prev, dependantsUnder18: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-16 rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#53917E1a]"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  {qt.over18Label}
                  <input
                    type="number"
                    min={0}
                    value={questionnaire.dependantsOver18}
                    onChange={(e) => setQuestionnaire((prev) => ({ ...prev, dependantsOver18: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-16 rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#53917E1a]"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm text-[#0f172a]">{qt.overseasQ}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionnaire((prev) => ({ ...prev, overseasResidence: true }))}
                  className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${questionnaire.overseasResidence ? 'border-[#53917E] bg-[#53917E] text-[#ffffff]' : 'border-slate-300 text-[#0f172a]'}`}
                >
                  {qt.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionnaire((prev) => ({ ...prev, overseasResidence: false }))}
                  className={`rounded border px-3 py-1 text-xs font-medium transition-colors ${!questionnaire.overseasResidence ? 'border-[#53917E] bg-[#53917E] text-[#ffffff]' : 'border-slate-300 text-[#0f172a]'}`}
                >
                  {qt.no}
                </button>
              </div>
            </div>
          </div>
        </div>

        {progress.expiryAlerts.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 print:hidden">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <AlertCircle className="h-4 w-4" /> {pack.expiryTitle}
            </h3>
            <div className="space-y-1.5">
              {progress.expiryAlerts.map(({ doc, status }) => (
                <div key={doc.id} className="flex items-baseline gap-2 text-sm">
                  <span>{status.status === 'expired' || status.status === 'danger' ? '🔴' : '🟠'}</span>
                  <span className="break-words font-medium text-[#0f172a]">{doc.name}</span>
                  <span className="text-xs text-[#475569]">
                    {status.diffDays < 0 ? `${Math.abs(status.diffDays)} days ago` : `${status.diffDays} days left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.map(([cat, docs], catIdx) => {
          const colors = CAT_COLORS[catIdx % CAT_COLORS.length]
          const catChecked = docs.filter((doc) => docStates[doc.id]?.checked).length

          return (
            <div key={cat} className={`overflow-hidden rounded-sm border ${colors.border} shadow-sm`}>
              <div className={`${colors.header} flex items-center justify-between px-4 py-3 text-[#ffffff]`}>
                <h2 className="text-sm font-bold uppercase tracking-wide">{pack.categories[cat] ?? cat}</h2>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{catChecked}/{docs.length}</span>
              </div>

              <div className={`${colors.light} divide-y divide-[#e2e8f0]`}>
                {docs.map((doc) => {
                  const state = docStates[doc.id] ?? EMPTY
                  const tipOpen = expandedTips.has(doc.id)
                  const noteOpen = expandedNotes.has(doc.id)
                  const irrelevanceNote = getIrrelevanceNote(doc, questionnaire, locale)

                  return (
                    <div key={doc.id} className={`bg-[#ffffff] px-4 py-4 transition-opacity duration-150 ${state.checked || irrelevanceNote ? 'opacity-55' : ''}`}>
                      <div className="flex gap-3">
                        <div className="shrink-0 pt-0.5">
                          <input
                            type="checkbox"
                            id={`chk-${doc.id}`}
                            checked={state.checked}
                            onChange={(e) => updateDoc(doc.id, { checked: e.target.checked })}
                            className="h-5 w-5 cursor-pointer rounded border-[#e2e8f0] accent-[#53917E]"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`break-words text-sm font-semibold whitespace-normal ${state.checked ? 'line-through text-[#475569]' : 'text-[#0f172a]'}`}>
                                {doc.name}
                              </span>
                              {!doc.required && <span className="text-xs italic text-[#475569]">(optional)</span>}
                              {doc.apostilleRequired && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                  <Stamp className="h-3 w-3" /> Apostille
                                </span>
                              )}
                              {doc.naatiRequired && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                                  <Languages className="h-3 w-3" /> NAATI
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 break-words whitespace-normal text-xs text-[#475569]">{doc.description}</p>
                            {irrelevanceNote && (
                              <p className="mt-0.5 break-words whitespace-normal text-xs italic text-[#53917E]">{irrelevanceNote}</p>
                            )}
                          </label>

                          {doc.expiryTracking && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-[#475569]">
                                <Calendar className="h-3.5 w-3.5" /> Expiry:
                              </span>
                              <input
                                type="date"
                                value={state.expiryDate}
                                onChange={(e) => updateDoc(doc.id, { expiryDate: e.target.value })}
                                className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#53917E1a]"
                              />
                              {getExpiryStatus(state.expiryDate, doc.warningMonths) && (() => {
                                const expiryStatus = getExpiryStatus(state.expiryDate, doc.warningMonths)!
                                return (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    expiryStatus.status === 'expired'
                                      ? 'bg-amber-100 text-amber-700'
                                      : expiryStatus.status === 'danger'
                                        ? 'bg-amber-100 text-amber-700'
                                        : expiryStatus.status === 'warning'
                                          ? 'bg-slate-100 text-slate-700'
                                          : 'bg-[#53917E]/10 text-[#53917E]'
                                  }`}>
                                    {expiryStatus.status === 'expired'
                                      ? `Expired (${Math.abs(expiryStatus.diffDays)} days ago)`
                                      : expiryStatus.status === 'danger'
                                        ? `⚠️ ${expiryStatus.diffDays} days left`
                                        : expiryStatus.status === 'warning'
                                          ? `${expiryStatus.diffMonths} months left`
                                          : `✓ ${expiryStatus.diffMonths} months valid`}
                                  </span>
                                )
                              })()}
                            </div>
                          )}

                          <div className="mt-2.5 flex flex-wrap gap-3">
                            <button type="button" onClick={() => toggleTip(doc.id)} className="flex items-center gap-1 text-xs text-[#53917E] transition-colors hover:opacity-80">
                              <Info className="h-3.5 w-3.5" />
                              {tipOpen ? 'Hide tip' : '💡 Tip'}
                              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button type="button" onClick={() => toggleNote(doc.id)} className="flex items-center gap-1 text-xs text-[#475569] transition-colors hover:text-[#0f172a]">
                              📝 {noteOpen ? 'Hide note' : state.notes ? 'Edit note' : 'Add note'}
                              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>

                          {tipOpen && <div className="mt-2 rounded-lg border border-[#53917E1a] bg-[#53917E1a] px-3 py-2 text-xs leading-relaxed text-[#0f172a]">{doc.tips}</div>}

                          {noteOpen && (
                            <textarea
                              value={state.notes}
                              onChange={(e) => updateDoc(doc.id, { notes: e.target.value })}
                              placeholder="Reference number, submission date, translation note..."
                              rows={2}
                              className="mt-2 w-full resize-none rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1.5 text-xs text-[#0f172a] placeholder:text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#53917E1a]"
                            />
                          )}

                          {!noteOpen && state.notes && <p className="mt-1.5 truncate text-xs italic text-[#475569]">📝 {state.notes}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-between pb-10 pt-2 print:hidden">
          <Link href={backHref} className="flex items-center gap-1 text-sm text-[#475569] transition-colors hover:text-[#0f172a]">
            <ArrowLeft className="h-4 w-4" /> {pack.differentVisa}
          </Link>
          <button onClick={() => window.print()} className="rounded-sm bg-[#53917E] px-4 py-2 text-sm font-medium text-[#ffffff] transition-colors hover:opacity-90">
            <Printer className="mr-2 inline-block h-4 w-4" /> {pack.printButton}
          </button>
        </div>

        {/* Print output intentionally stays plain black-on-white regardless
            of theme -- print:bg-white above forces a white page, so this
            block's text must stay literal gray/black to remain legible on
            actual paper, not follow --cf-fg (which could be near-white). */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{pack.pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {visaCopy.title} — {visaCopy.description} | {progress.checked}/{progress.total} {pack.savedSuffix} | {new Date().toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'zh-Hans' ? 'zh-CN' : 'en-AU')}
          </p>
        </div>
      </div>
    </div>
  )
}
