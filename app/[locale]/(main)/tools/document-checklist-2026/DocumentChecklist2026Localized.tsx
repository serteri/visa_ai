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
const VISA_ORDER: VisaSubclass[] = ['189', '190', '491', '482', '485']

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
    <div className={`bg-[var(--cf-cover-bg)] px-4 py-4 transition-opacity duration-150 ${checked ? 'opacity-55' : ''}`}>
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <input
            type="checkbox"
            id={`chk-${doc.id}`}
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-[var(--cf-cover-line)] accent-[var(--cf-accent)]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`break-words text-sm font-semibold ${checked ? 'text-[var(--cf-cover-muted)] line-through' : 'text-[var(--cf-cover-fg)]'}`}>
                {doc.name}
              </span>
              {!doc.required && <span className="text-xs italic text-[var(--cf-cover-muted)]">({categoryLabel})</span>}
              {doc.apostilleRequired && (
                <span className="inline-flex items-center gap-0.5 rounded bg-[var(--cf-flag-rust-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--cf-flag-rust-fg)]">
                  <Stamp className="h-3 w-3" /> Apostille
                </span>
              )}
              {doc.naatiRequired && (
                <span className="inline-flex items-center gap-0.5 rounded bg-[var(--cf-flag-brass-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--cf-flag-brass-fg)]">
                  <Languages className="h-3 w-3" /> NAATI
                </span>
              )}
            </div>
            <p className="mt-0.5 break-words text-xs whitespace-normal text-[var(--cf-cover-muted)]">{doc.description}</p>
          </label>

          {doc.expiryTracking && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-[var(--cf-cover-muted)]">
                <Calendar className="h-3.5 w-3.5" /> Expiry:
              </span>
              <input
                type="date"
                value={state.expiryDate}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="rounded border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] px-2 py-1 text-xs text-[var(--cf-cover-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--cf-accent-dim)]"
              />
              {expiryStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    expiryStatus.status === 'expired'
                      ? 'bg-[var(--cf-flag-rust-bg)] text-[var(--cf-flag-rust-fg)]'
                      : expiryStatus.status === 'danger'
                        ? 'bg-[var(--cf-flag-rust-bg)] text-[var(--cf-flag-rust-fg)]'
                        : expiryStatus.status === 'warning'
                          ? 'bg-[var(--cf-flag-brass-bg)] text-[var(--cf-flag-brass-fg)]'
                          : 'bg-[var(--cf-flag-sage-bg)] text-[var(--cf-flag-sage-fg)]'
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
              className="flex items-center gap-1 text-xs text-[var(--cf-accent)] transition-colors hover:opacity-80"
            >
              <Info className="h-3.5 w-3.5" />
              {tipOpen ? 'Hide tip' : 'Show tip'}
              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={onToggleNote}
              className="flex items-center gap-1 text-xs text-[var(--cf-cover-muted)] transition-colors hover:text-[var(--cf-cover-fg)]"
            >
              📝 {noteOpen ? 'Hide note' : state.notes ? 'Edit note' : 'Add note'}
              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {tipOpen && <div className="mt-2 rounded-lg border border-[var(--cf-accent-dim)] bg-[var(--cf-accent-dim)] px-3 py-2 text-xs leading-relaxed text-[var(--cf-cover-fg)]">{doc.tips}</div>}

          {noteOpen && (
            <textarea
              value={state.notes}
              onChange={() => onToggleNote()}
              placeholder="Reference number, submission date, translation note..."
              rows={2}
              className="mt-2 w-full resize-none rounded border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] px-2 py-1.5 text-xs text-[var(--cf-cover-fg)] placeholder:text-[var(--cf-cover-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--cf-accent-dim)]"
            />
          )}

          {!noteOpen && state.notes && <p className="mt-1.5 truncate text-xs italic text-[var(--cf-cover-muted)]">📝 {state.notes}</p>}
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

  useEffect(() => {
    if (!selectedVisa) return
    localStorage.setItem(`visa-checklist-${selectedVisa}`, JSON.stringify(docStates))
  }, [docStates, selectedVisa])

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
      <div className="min-h-screen bg-[var(--cf-bg)]">
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 md:py-16">
          <div className="mb-8 text-center md:mb-10">
            <h1 className="cf-serif mb-3 text-2xl font-medium text-[var(--cf-fg)] md:text-3xl">{pack.pageTitle}</h1>
            <p className="mx-auto max-w-2xl text-base text-[var(--cf-muted)] md:text-lg">{pack.pageSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VISA_ORDER.map((visa) => (
              <Link
                key={visa}
                href={`/${locale}/tools/document-checklist-2026/${visa}`}
                className="group rounded-sm border-2 border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg)] p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="mb-3 text-3xl">📄</div>
                <div className="text-lg font-bold text-[var(--cf-cover-fg)]">{pack.visaTitle[visa].title}</div>
                <div className="mt-1 text-sm text-[var(--cf-cover-muted)]">{pack.visaTitle[visa].description}</div>
                <div className="mt-3 text-xs text-[var(--cf-cover-muted)] transition-colors group-hover:text-[var(--cf-cover-fg)]">{pack.viewChecklist}</div>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-[var(--cf-muted)]">{pack.autoSaveNotice}</p>
        </div>
      </div>
    )
  }

  const visaCopy = pack.visaTitle[selectedVisa]
  const pct = progress.total > 0 ? (progress.checked / progress.total) * 100 : 0

  return (
    <div className="min-h-screen bg-[var(--cf-bg)] print:bg-white">
      <div className="sticky top-0 z-40 border-b border-[var(--cf-line)] bg-[var(--cf-bg)] shadow-sm print:hidden">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={backHref} className="flex shrink-0 items-center gap-1 text-sm text-[var(--cf-muted)] transition-colors hover:text-[var(--cf-fg)]">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{pack.backButton}</span>
              </Link>
              <span className="hidden text-[var(--cf-line)] sm:inline">|</span>
              <span className="truncate text-sm font-semibold text-[var(--cf-fg)]">{visaCopy.title} — {visaCopy.description}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {progress.expiryAlerts.length > 0 && (
                <span className="hidden items-center gap-1 text-xs font-medium text-[var(--cf-accent)] sm:flex">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {progress.expiryAlerts.length} warnings
                </span>
              )}
              <button onClick={() => window.print()} className="flex items-center gap-1 rounded border border-[var(--cf-line)] px-2 py-1 text-xs text-[var(--cf-muted)] transition-colors hover:text-[var(--cf-fg)]">
                <Printer className="h-3.5 w-3.5" />
                <span className="ml-1 hidden sm:inline">{pack.printButton}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-2.5 flex-1" />
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[var(--cf-fg)]">
              {progress.checked} / {progress.total} {pack.savedSuffix}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {progress.byCategory.map(({ cat, total, checked }) => (
              <span key={cat} className="text-xs text-[var(--cf-muted)]">
                {checked === total ? '✅' : checked === 0 ? '❌' : '⚠️'} {pack.categories[cat] ?? cat}: {checked}/{total}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12">
        {!session && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cf-accent-dim)] bg-[var(--cf-accent-dim)] px-4 py-3 print:hidden">
            <div className="flex items-center gap-2 text-sm text-[var(--cf-fg)]">
              <Info className="h-4 w-4 shrink-0" />
              <span className="break-words whitespace-normal">{pack.loginNotice}</span>
            </div>
            <a href={`/${locale}/sign-in`} className="flex shrink-0 items-center gap-1 rounded border border-[var(--cf-accent)] px-2 py-1 text-xs font-medium whitespace-nowrap text-[var(--cf-accent)] transition-colors hover:bg-[var(--cf-accent-dim)]">
              <LogIn className="h-3.5 w-3.5" /> {pack.loginButton}
            </a>
          </div>
        )}

        {progress.expiryAlerts.length > 0 && (
          <div className="rounded-lg border border-[var(--cf-flag-brass-bg)] bg-[var(--cf-flag-brass-bg)] p-4 print:hidden">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--cf-flag-brass-fg)]">
              <AlertCircle className="h-4 w-4" /> {pack.expiryTitle}
            </h3>
            <div className="space-y-1.5">
              {progress.expiryAlerts.map(({ doc, status }) => (
                <div key={doc.id} className="flex items-baseline gap-2 text-sm">
                  <span>{status.status === 'expired' || status.status === 'danger' ? '🔴' : '🟠'}</span>
                  <span className="break-words font-medium text-[var(--cf-fg)]">{doc.name}</span>
                  <span className="text-xs text-[var(--cf-muted)]">
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
              <div className={`${colors.header} flex items-center justify-between px-4 py-3 text-[var(--cf-case-fg)]`}>
                <h2 className="text-sm font-bold uppercase tracking-wide">{pack.categories[cat] ?? cat}</h2>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{catChecked}/{docs.length}</span>
              </div>

              <div className={`${colors.light} divide-y divide-[var(--cf-cover-line)]`}>
                {docs.map((doc) => {
                  const state = docStates[doc.id] ?? EMPTY
                  const tipOpen = expandedTips.has(doc.id)
                  const noteOpen = expandedNotes.has(doc.id)

                  return (
                    <div key={doc.id} className={`bg-[var(--cf-cover-bg)] px-4 py-4 transition-opacity duration-150 ${state.checked ? 'opacity-55' : ''}`}>
                      <div className="flex gap-3">
                        <div className="shrink-0 pt-0.5">
                          <input
                            type="checkbox"
                            id={`chk-${doc.id}`}
                            checked={state.checked}
                            onChange={(e) => updateDoc(doc.id, { checked: e.target.checked })}
                            className="h-5 w-5 cursor-pointer rounded border-[var(--cf-cover-line)] accent-[var(--cf-accent)]"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`break-words text-sm font-semibold whitespace-normal ${state.checked ? 'line-through text-[var(--cf-cover-muted)]' : 'text-[var(--cf-cover-fg)]'}`}>
                                {doc.name}
                              </span>
                              {!doc.required && <span className="text-xs italic text-[var(--cf-cover-muted)]">(optional)</span>}
                              {doc.apostilleRequired && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-[var(--cf-flag-rust-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--cf-flag-rust-fg)]">
                                  <Stamp className="h-3 w-3" /> Apostille
                                </span>
                              )}
                              {doc.naatiRequired && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-[var(--cf-flag-brass-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--cf-flag-brass-fg)]">
                                  <Languages className="h-3 w-3" /> NAATI
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 break-words whitespace-normal text-xs text-[var(--cf-cover-muted)]">{doc.description}</p>
                          </label>

                          {doc.expiryTracking && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-[var(--cf-cover-muted)]">
                                <Calendar className="h-3.5 w-3.5" /> Expiry:
                              </span>
                              <input
                                type="date"
                                value={state.expiryDate}
                                onChange={(e) => updateDoc(doc.id, { expiryDate: e.target.value })}
                                className="rounded border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] px-2 py-1 text-xs text-[var(--cf-cover-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--cf-accent-dim)]"
                              />
                              {getExpiryStatus(state.expiryDate, doc.warningMonths) && (() => {
                                const expiryStatus = getExpiryStatus(state.expiryDate, doc.warningMonths)!
                                return (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    expiryStatus.status === 'expired'
                                      ? 'bg-[var(--cf-flag-rust-bg)] text-[var(--cf-flag-rust-fg)]'
                                      : expiryStatus.status === 'danger'
                                        ? 'bg-[var(--cf-flag-rust-bg)] text-[var(--cf-flag-rust-fg)]'
                                        : expiryStatus.status === 'warning'
                                          ? 'bg-[var(--cf-flag-brass-bg)] text-[var(--cf-flag-brass-fg)]'
                                          : 'bg-[var(--cf-flag-sage-bg)] text-[var(--cf-flag-sage-fg)]'
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
                            <button type="button" onClick={() => toggleTip(doc.id)} className="flex items-center gap-1 text-xs text-[var(--cf-accent)] transition-colors hover:opacity-80">
                              <Info className="h-3.5 w-3.5" />
                              {tipOpen ? 'Hide tip' : '💡 Tip'}
                              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button type="button" onClick={() => toggleNote(doc.id)} className="flex items-center gap-1 text-xs text-[var(--cf-cover-muted)] transition-colors hover:text-[var(--cf-cover-fg)]">
                              📝 {noteOpen ? 'Hide note' : state.notes ? 'Edit note' : 'Add note'}
                              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>

                          {tipOpen && <div className="mt-2 rounded-lg border border-[var(--cf-accent-dim)] bg-[var(--cf-accent-dim)] px-3 py-2 text-xs leading-relaxed text-[var(--cf-cover-fg)]">{doc.tips}</div>}

                          {noteOpen && (
                            <textarea
                              value={state.notes}
                              onChange={(e) => updateDoc(doc.id, { notes: e.target.value })}
                              placeholder="Reference number, submission date, translation note..."
                              rows={2}
                              className="mt-2 w-full resize-none rounded border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] px-2 py-1.5 text-xs text-[var(--cf-cover-fg)] placeholder:text-[var(--cf-cover-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--cf-accent-dim)]"
                            />
                          )}

                          {!noteOpen && state.notes && <p className="mt-1.5 truncate text-xs italic text-[var(--cf-cover-muted)]">📝 {state.notes}</p>}
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
          <Link href={backHref} className="flex items-center gap-1 text-sm text-[var(--cf-muted)] transition-colors hover:text-[var(--cf-fg)]">
            <ArrowLeft className="h-4 w-4" /> {pack.differentVisa}
          </Link>
          <button onClick={() => window.print()} className="rounded-sm bg-[var(--cf-accent)] px-4 py-2 text-sm font-medium text-[var(--cf-bg-deep)] transition-colors hover:opacity-90">
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
