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

const CAT_COLORS = [
  { header: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
  { header: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
  { header: 'bg-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
  { header: 'bg-green-600', light: 'bg-green-50', border: 'border-green-200' },
  { header: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' },
  { header: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-200' },
  { header: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200' },
  { header: 'bg-sky-600', light: 'bg-sky-50', border: 'border-sky-200' },
  { header: 'bg-rose-600', light: 'bg-rose-50', border: 'border-rose-200' },
  { header: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
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
    <div className={`bg-white px-4 py-4 transition-opacity duration-150 ${checked ? 'opacity-55' : ''}`}>
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <input
            type="checkbox"
            id={`chk-${doc.id}`}
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-indigo-600"
          />
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`break-words text-sm font-semibold ${checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {doc.name}
              </span>
              {!doc.required && <span className="text-xs italic text-gray-400">({categoryLabel})</span>}
              {doc.apostilleRequired && (
                <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                  <Stamp className="h-3 w-3" /> Apostille
                </span>
              )}
              {doc.naatiRequired && (
                <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                  <Languages className="h-3 w-3" /> NAATI
                </span>
              )}
            </div>
            <p className="mt-0.5 break-words text-xs whitespace-normal text-gray-400">{doc.description}</p>
          </label>

          {doc.expiryTracking && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="h-3.5 w-3.5" /> Expiry:
              </span>
              <input
                type="date"
                value={state.expiryDate}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {expiryStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    expiryStatus.status === 'expired'
                      ? 'bg-red-100 text-red-700'
                      : expiryStatus.status === 'danger'
                        ? 'bg-red-100 text-red-600'
                        : expiryStatus.status === 'warning'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
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
              className="flex items-center gap-1 text-xs text-amber-700 transition-colors hover:text-amber-900"
            >
              <Info className="h-3.5 w-3.5" />
              {tipOpen ? 'Hide tip' : 'Show tip'}
              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={onToggleNote}
              className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700"
            >
              📝 {noteOpen ? 'Hide note' : state.notes ? 'Edit note' : 'Add note'}
              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {tipOpen && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{doc.tips}</div>}

          {noteOpen && (
            <textarea
              value={state.notes}
              onChange={() => onToggleNote()}
              placeholder="Reference number, submission date, translation note..."
              rows={2}
              className="mt-2 w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          )}

          {!noteOpen && state.notes && <p className="mt-1.5 truncate text-xs italic text-gray-400">📝 {state.notes}</p>}
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
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 md:py-16">
          <div className="mb-8 text-center md:mb-10">
            <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">{pack.pageTitle}</h1>
            <p className="mx-auto max-w-2xl text-base text-gray-500 md:text-lg">{pack.pageSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VISA_ORDER.map((visa) => (
              <Link
                key={visa}
                href={`/${locale}/tools/document-checklist-2026/${visa}`}
                className="group rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="mb-3 text-3xl">📄</div>
                <div className="text-lg font-bold text-gray-900">{pack.visaTitle[visa].title}</div>
                <div className="mt-1 text-sm text-gray-600">{pack.visaTitle[visa].description}</div>
                <div className="mt-3 text-xs text-gray-400 transition-colors group-hover:text-gray-600">{pack.viewChecklist}</div>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-gray-400">{pack.autoSaveNotice}</p>
        </div>
      </div>
    )
  }

  const visaCopy = pack.visaTitle[selectedVisa]
  const pct = progress.total > 0 ? (progress.checked / progress.total) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm print:hidden">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={backHref} className="flex shrink-0 items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{pack.backButton}</span>
              </Link>
              <span className="hidden text-gray-300 sm:inline">|</span>
              <span className="truncate text-sm font-semibold text-gray-800">{visaCopy.title} — {visaCopy.description}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {progress.expiryAlerts.length > 0 && (
                <span className="hidden items-center gap-1 text-xs font-medium text-amber-600 sm:flex">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {progress.expiryAlerts.length} warnings
                </span>
              )}
              <button onClick={() => window.print()} className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors hover:text-gray-900">
                <Printer className="h-3.5 w-3.5" />
                <span className="ml-1 hidden sm:inline">{pack.printButton}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-2.5 flex-1" />
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-700">
              {progress.checked} / {progress.total} {pack.savedSuffix}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {progress.byCategory.map(({ cat, total, checked }) => (
              <span key={cat} className="text-xs text-gray-400">
                {checked === total ? '✅' : checked === 0 ? '❌' : '⚠️'} {pack.categories[cat] ?? cat}: {checked}/{total}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12">
        {!session && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 print:hidden">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Info className="h-4 w-4 shrink-0" />
              <span className="break-words whitespace-normal">{pack.loginNotice}</span>
            </div>
            <a href={`/${locale}/sign-in`} className="flex shrink-0 items-center gap-1 rounded border border-amber-300 px-2 py-1 text-xs font-medium whitespace-nowrap text-amber-700 transition-colors hover:bg-amber-100">
              <LogIn className="h-3.5 w-3.5" /> {pack.loginButton}
            </a>
          </div>
        )}

        {progress.expiryAlerts.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 print:hidden">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-800">
              <AlertCircle className="h-4 w-4" /> {pack.expiryTitle}
            </h3>
            <div className="space-y-1.5">
              {progress.expiryAlerts.map(({ doc, status }) => (
                <div key={doc.id} className="flex items-baseline gap-2 text-sm">
                  <span>{status.status === 'expired' || status.status === 'danger' ? '🔴' : '🟠'}</span>
                  <span className="break-words font-medium text-gray-700">{doc.name}</span>
                  <span className="text-xs text-gray-400">
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
            <div key={cat} className={`overflow-hidden rounded-xl border ${colors.border} shadow-sm`}>
              <div className={`${colors.header} flex items-center justify-between px-4 py-3 text-white`}>
                <h2 className="text-sm font-bold uppercase tracking-wide">{pack.categories[cat] ?? cat}</h2>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{catChecked}/{docs.length}</span>
              </div>

              <div className={`${colors.light} divide-y divide-gray-100`}>
                {docs.map((doc) => {
                  const state = docStates[doc.id] ?? EMPTY
                  const tipOpen = expandedTips.has(doc.id)
                  const noteOpen = expandedNotes.has(doc.id)

                  return (
                    <div key={doc.id} className={`bg-white px-4 py-4 transition-opacity duration-150 ${state.checked ? 'opacity-55' : ''}`}>
                      <div className="flex gap-3">
                        <div className="shrink-0 pt-0.5">
                          <input
                            type="checkbox"
                            id={`chk-${doc.id}`}
                            checked={state.checked}
                            onChange={(e) => updateDoc(doc.id, { checked: e.target.checked })}
                            className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-indigo-600"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`break-words text-sm font-semibold whitespace-normal ${state.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {doc.name}
                              </span>
                              {!doc.required && <span className="text-xs italic text-gray-400">(optional)</span>}
                              {doc.apostilleRequired && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                                  <Stamp className="h-3 w-3" /> Apostille
                                </span>
                              )}
                              {doc.naatiRequired && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                                  <Languages className="h-3 w-3" /> NAATI
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 break-words whitespace-normal text-xs text-gray-400">{doc.description}</p>
                          </label>

                          {doc.expiryTracking && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="h-3.5 w-3.5" /> Expiry:
                              </span>
                              <input
                                type="date"
                                value={state.expiryDate}
                                onChange={(e) => updateDoc(doc.id, { expiryDate: e.target.value })}
                                className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              {getExpiryStatus(state.expiryDate, doc.warningMonths) && (() => {
                                const expiryStatus = getExpiryStatus(state.expiryDate, doc.warningMonths)!
                                return (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    expiryStatus.status === 'expired'
                                      ? 'bg-red-100 text-red-700'
                                      : expiryStatus.status === 'danger'
                                        ? 'bg-red-100 text-red-600'
                                        : expiryStatus.status === 'warning'
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-green-100 text-green-700'
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
                            <button type="button" onClick={() => toggleTip(doc.id)} className="flex items-center gap-1 text-xs text-amber-700 transition-colors hover:text-amber-900">
                              <Info className="h-3.5 w-3.5" />
                              {tipOpen ? 'Hide tip' : '💡 Tip'}
                              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button type="button" onClick={() => toggleNote(doc.id)} className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700">
                              📝 {noteOpen ? 'Hide note' : state.notes ? 'Edit note' : 'Add note'}
                              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>

                          {tipOpen && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{doc.tips}</div>}

                          {noteOpen && (
                            <textarea
                              value={state.notes}
                              onChange={(e) => updateDoc(doc.id, { notes: e.target.value })}
                              placeholder="Reference number, submission date, translation note..."
                              rows={2}
                              className="mt-2 w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          )}

                          {!noteOpen && state.notes && <p className="mt-1.5 truncate text-xs italic text-gray-400">📝 {state.notes}</p>}
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
          <Link href={backHref} className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> {pack.differentVisa}
          </Link>
          <button onClick={() => window.print()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
            <Printer className="mr-2 inline-block h-4 w-4" /> {pack.printButton}
          </button>
        </div>

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
