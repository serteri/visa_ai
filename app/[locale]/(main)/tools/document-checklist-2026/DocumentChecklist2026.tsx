'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import {
  ChevronDown, ChevronUp, Printer, AlertCircle, Info,
  Calendar, Stamp, Languages, LogIn, ArrowLeft,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisaDocument {
  id: string
  category: string
  name: string
  description: string
  required: boolean
  expiryTracking: boolean
  expiryMonths?: number
  warningMonths?: number
  tips: string
  apostilleRequired: boolean
  naatiRequired: boolean
}

interface DocState {
  checked: boolean
  expiryDate: string
  notes: string
}

type ChecklistState = Record<string, DocState>
type VisaSubclass = '189' | '190' | '491' | '482' | '485'

export type DocumentChecklist2026Dictionary = {
  pageTitle: string
  pageSubtitle: string
  viewChecklist: string
  autoSaveNotice: string
  visas: Record<VisaSubclass, {
    title: string
    description: string
  }>
}

const EMPTY: DocState = { checked: false, expiryDate: '', notes: '' }

// ─── Document data ────────────────────────────────────────────────────────────

const COMMON_DOCS: VisaDocument[] = [
  {
    id: 'passport',
    category: 'Kimlik',
    name: 'Geçerli Pasaport',
    description: 'Biyometrik sayfa + tüm vize damgası sayfaları',
    required: true,
    expiryTracking: true,
    expiryMonths: 120,
    warningMonths: 6,
    tips: 'Tüm sayfaların net fotoğrafını çek ve buluta yükle. Vize başvurusu sırasında en az 12 ay geçerliliği olmalı. Yenileme için 6-8 hafta önceden başvur.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'national_id',
    category: 'Kimlik',
    name: 'Nüfus Cüzdanı (T.C. Kimlik Kartı)',
    description: 'Ön ve arka yüz — son 6 ay içinde alınmış olmalı',
    required: true,
    expiryTracking: false,
    tips: "Son 6 ay içinde alınmış olmalı. Apostil için önce noterden onaylat, ardından Dışişleri Bakanlığı'ndan apostil al. Sonra NAATI çevirisi yaptır.",
    apostilleRequired: true,
    naatiRequired: true,
  },
  {
    id: 'birth_certificate',
    category: 'Kimlik',
    name: 'Doğum Belgesi',
    description: 'Nüfus müdürlüğünden uluslararası format doğum belgesi',
    required: true,
    expiryTracking: false,
    tips: 'Nüfus müdürlüğünden "uluslararası format" talep et. Apostil + NAATI onaylı çeviri zorunlu.',
    apostilleRequired: true,
    naatiRequired: true,
  },
  {
    id: 'english_test',
    category: 'İngilizce Testi',
    name: 'İngilizce Test Sonucu (IELTS / PTE / TOEFL)',
    description: 'Resmi sınav kurumundan skor raporu',
    required: true,
    expiryTracking: true,
    expiryMonths: 36,
    warningMonths: 6,
    tips: 'IELTS & PTE Academic: 3 yıl geçerli. TOEFL iBT: 2 yıl. Skilled migration için Competent English gerekli (IELTS her bant min. 6.0 veya PTE 50+). Proficient için +10 puan, Superior için +20 puan.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'police_clearance_tr',
    category: 'Adli Sicil',
    name: 'Türkiye Adli Sicil Belgesi',
    description: 'e-Devlet veya adliyeden alınan güncel adli sicil kaydı',
    required: true,
    expiryTracking: true,
    expiryMonths: 6,
    warningMonths: 2,
    tips: 'e-Devlet (turkiye.gov.tr) üzerinden veya herhangi bir adliyeden ücretsiz alınır. Apostil + NAATI onaylı çeviri zorunlu. Geçerlilik: 6 ay — başvuru öncesi yenile.',
    apostilleRequired: true,
    naatiRequired: true,
  },
]

const SKILLED_DOCS: VisaDocument[] = [
  {
    id: 'skills_assessment_letter',
    category: 'Beceri Değerlendirmesi',
    name: 'Beceri Değerlendirme Sonuç Mektubu',
    description: 'ACS / Engineers Australia / VETASSESS pozitif sonuç mektubu',
    required: true,
    expiryTracking: true,
    expiryMonths: 36,
    warningMonths: 6,
    tips: 'Pozitif değerlendirme tarihinden 3 yıl geçerli. Invitation almadan önce geçerliliği bitmemeli. IT için ACS, Mühendislik için EA, diğerleri için VETASSESS veya ilgili kurum.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'skills_assessment_ref',
    category: 'Beceri Değerlendirmesi',
    name: 'Değerlendirme Referans Numarası',
    description: 'ACS / EA / VETASSESS başvuru veya sonuç referans numarası',
    required: true,
    expiryTracking: false,
    tips: 'Bu numarayı not alanına yaz — EOI (Expression of Interest) güncellemesinde zorunlu.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'university_diploma',
    category: 'Eğitim',
    name: 'Üniversite Diploması',
    description: 'Lisans / Yüksek Lisans / Doktora diploması',
    required: true,
    expiryTracking: false,
    tips: "Orijinal + noter onaylı kopya. Dışişleri Bakanlığı Konsüler İşler GM'den apostil al, ardından NAATI onaylı çeviriciye gönder.",
    apostilleRequired: true,
    naatiRequired: true,
  },
  {
    id: 'transcripts',
    category: 'Eğitim',
    name: 'Üniversite Transkriptleri (Tüm Dönemler)',
    description: 'Resmi not dökümü — kapalı zarflı ve mühürlü',
    required: true,
    expiryTracking: false,
    tips: 'Her sayfanın NAATI çevirisi gerekli. ACS kapalı zarflı resmi transkript ister. Tüm dönemler dahil olmalı.',
    apostilleRequired: true,
    naatiRequired: true,
  },
  {
    id: 'reference_letter',
    category: 'İş Deneyimi',
    name: 'İşveren Referans Mektupları',
    description: 'Her işveren için ayrı imzalı referans mektubu',
    required: true,
    expiryTracking: false,
    tips: 'Antetli kağıt + imzalı + İngilizce. İçermeli: pozisyon adı (ANZSCO uyumlu), başlangıç-bitiş tarihleri, haftalık saat, temel görevler, imzalayanın unvanı.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'payslips',
    category: 'İş Deneyimi',
    name: 'Maaş Bordroları (Son 3+ Ay)',
    description: 'Tüm işverenlerden maaş bordroları',
    required: true,
    expiryTracking: false,
    tips: 'En az son 3 ay. Şirket mühürlü veya e-imzalı olmalı. Türkçe bordrolara NAATI çevirisi gerekebilir. Her işveren için ayrı set hazırla.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'sgk_records',
    category: 'İş Deneyimi',
    name: 'SGK Hizmet Dökümü',
    description: "e-Devlet'ten alınan sosyal güvenlik hizmet kaydı",
    required: true,
    expiryTracking: false,
    tips: 'e-Devlet üzerinden SGK Hizmet Dökümü indir. Tüm işverenler ve tarihler görünmeli. NAATI onaylı çeviri zorunlu.',
    apostilleRequired: false,
    naatiRequired: true,
  },
]

const NOMINATION_DOCS: VisaDocument[] = [
  {
    id: 'nomination_letter',
    category: 'Eyalet Adaylığı',
    name: 'Eyalet / Bölge Adaylık Mektubu',
    description: 'State/Territory nomination onay mektubu',
    required: true,
    expiryTracking: true,
    expiryMonths: 24,
    warningMonths: 3,
    tips: "190 için +5 puan, 491 için +15 puan ekler. Mektubu aldıktan SONRA EOI'deki puanı güncelle — aksi halde invitation gelmez!",
    apostilleRequired: false,
    naatiRequired: false,
  },
]

const VISA_482_DOCS: VisaDocument[] = [
  {
    id: 'employer_sponsorship',
    category: 'İşveren Belgeleri',
    name: 'Onaylı İşveren Sponsorluğu',
    description: 'Standard Business Sponsor (SBS) onay belgesi',
    required: true,
    expiryTracking: false,
    tips: 'İşvereninizin önce Standard Business Sponsorship başvurusu yapması gerekiyor. Onay genellikle 2-4 haftada çıkar.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'position_nomination',
    category: 'İşveren Belgeleri',
    name: 'Pozisyon Adaylık Belgesi (Nomination)',
    description: 'Belirli pozisyon için onaylı occupation nomination',
    required: true,
    expiryTracking: false,
    tips: "Pozisyonun ANZSCO kodu Core Skills Occupation List'te olmalı. MLTSSL listesindeki meslekler PR yolunu açar.",
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'employment_contract',
    category: 'İşveren Belgeleri',
    name: 'İş Sözleşmesi',
    description: 'İmzalı iş sözleşmesi — maaş TSMIT eşiğinin üzerinde',
    required: true,
    expiryTracking: false,
    tips: "2025-26 TSMIT: ~AUD 73,150/yıl. Base salary açıkça yazılmalı ve TSMIT'i geçmeli.",
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'skills_assessment_482',
    category: 'Beceri (482)',
    name: 'Beceri Değerlendirmesi (gerekiyorsa)',
    description: 'Bazı meslekler için zorunlu — ANZSCO koduna göre kontrol et',
    required: false,
    expiryTracking: true,
    expiryMonths: 36,
    warningMonths: 6,
    tips: "Tüm meslekler için gerekli değil. immi.homeaffairs.gov.au'da skilled occupation list kontrol et.",
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'tsmit_evidence',
    category: 'Mali Belgeler',
    name: 'TSMIT Eşiği Kanıtı',
    description: 'Geçici Nitelikli Göçmen Gelir Eşiği üstünde maaş kanıtı',
    required: true,
    expiryTracking: false,
    tips: "Genellikle iş sözleşmesi yeterli. Hem base salary hem paket TSMIT'in üzerinde olmalı.",
    apostilleRequired: false,
    naatiRequired: false,
  },
]

const VISA_485_DOCS: VisaDocument[] = [
  {
    id: 'au_degree',
    category: 'Avustralya Eğitim Belgeleri',
    name: 'Avustralya Üniversite Diploması',
    description: 'CRICOS kayıtlı kurumdan diploma / degree belgesi',
    required: true,
    expiryTracking: false,
    tips: 'Diploma CRICOS kayıtlı kurumdan olmalı. Tören öncesi başvuruyorsan "testamur" belgesi kullanılabilir.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'au_transcripts',
    category: 'Avustralya Eğitim Belgeleri',
    name: 'Resmi Akademik Transkript',
    description: 'Avustralya üniversitesinden mühürlü resmi not dökümü',
    required: true,
    expiryTracking: false,
    tips: 'Student Services / Registrar ofisinden resmi mühürlü transkript talep et. Online portaldan indirilen PDF genellikle kabul edilmez.',
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'coe_485',
    category: 'Kayıt Belgeleri',
    name: 'Kayıt Onay Belgesi (CoE)',
    description: 'Son tamamlanan eğitim programından Confirmation of Enrolment',
    required: true,
    expiryTracking: false,
    tips: "Son 500 öğrenci vizesiyle tamamladığın programın CoE'si. Kaybedildiyse kurumdan tekrar talep et.",
    apostilleRequired: false,
    naatiRequired: false,
  },
  {
    id: 'oshc_485',
    category: 'Sağlık Sigortası',
    name: 'OSHC Sağlık Sigortası',
    description: 'Overseas Student Health Cover — tüm vize süresince geçerli',
    required: true,
    expiryTracking: true,
    expiryMonths: 24,
    warningMonths: 3,
    tips: 'Medibank, Bupa, OSHC Worldcare, AHM gibi sağlayıcılardan. 485 için OSHC veya OVHC zorunlu. Tüm vize süresi kadar kapsamalı.',
    apostilleRequired: false,
    naatiRequired: false,
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const VISA_OPTIONS: Array<{
  subclass: VisaSubclass
  emoji: string
  border: string
  bg: string
}> = [
  { subclass: '189', emoji: '🌏', border: 'border-blue-400',   bg: 'bg-blue-50 hover:bg-blue-100' },
  { subclass: '190', emoji: '🏛️', border: 'border-indigo-400', bg: 'bg-indigo-50 hover:bg-indigo-100' },
  { subclass: '491', emoji: '🌾', border: 'border-violet-400', bg: 'bg-violet-50 hover:bg-violet-100' },
  { subclass: '482', emoji: '💼', border: 'border-green-400',  bg: 'bg-green-50 hover:bg-green-100' },
  { subclass: '485', emoji: '🎓', border: 'border-orange-400', bg: 'bg-orange-50 hover:bg-orange-100' },
]

const VISA_DOCS: Record<string, VisaDocument[]> = {
  '189': [...COMMON_DOCS, ...SKILLED_DOCS],
  '190': [...COMMON_DOCS, ...SKILLED_DOCS, ...NOMINATION_DOCS],
  '491': [...COMMON_DOCS, ...SKILLED_DOCS, ...NOMINATION_DOCS],
  '482': [...COMMON_DOCS, ...VISA_482_DOCS],
  '485': [...COMMON_DOCS, ...VISA_485_DOCS],
}

const CAT_COLORS = [
  { header: 'bg-blue-600',    light: 'bg-blue-50',    border: 'border-blue-200' },
  { header: 'bg-purple-600',  light: 'bg-purple-50',  border: 'border-purple-200' },
  { header: 'bg-orange-600',  light: 'bg-orange-50',  border: 'border-orange-200' },
  { header: 'bg-green-600',   light: 'bg-green-50',   border: 'border-green-200' },
  { header: 'bg-indigo-600',  light: 'bg-indigo-50',  border: 'border-indigo-200' },
  { header: 'bg-amber-600',   light: 'bg-amber-50',   border: 'border-amber-200' },
  { header: 'bg-teal-600',    light: 'bg-teal-50',    border: 'border-teal-200' },
  { header: 'bg-sky-600',     light: 'bg-sky-50',     border: 'border-sky-200' },
  { header: 'bg-rose-600',    light: 'bg-rose-50',    border: 'border-rose-200' },
  { header: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function getExpiryStatus(expiryDate: string, warningMonths = 6) {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  if (isNaN(expiry.getTime())) return null
  const diffMs = expiry.getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86400000)
  const diffMonths = Math.round(diffDays / 30)
  if (diffDays < 0)          return { status: 'expired' as const, diffDays, diffMonths }
  if (diffMonths < 3)        return { status: 'danger'  as const, diffDays, diffMonths }
  if (diffMonths < warningMonths) return { status: 'warning' as const, diffDays, diffMonths }
  return                            { status: 'ok'      as const, diffDays, diffMonths }
}

// ─── Component ────────────────────────────────────────────────────────────────

type DocumentChecklist2026Props = {
  locale: string
  dictionary: DocumentChecklist2026Dictionary
  initialVisa?: string
}

function isVisaSubclass(value: string | undefined): value is VisaSubclass {
  return !!value && value in VISA_DOCS
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

export function DocumentChecklist2026({ locale, dictionary, initialVisa }: DocumentChecklist2026Props) {
  const { data: session } = useSession()
  const [selectedVisa] = useState<VisaSubclass | null>(
    isVisaSubclass(initialVisa) ? initialVisa : null,
  )
  const [docStates, setDocStates] = useState<ChecklistState>(() => loadChecklistState(
    isVisaSubclass(initialVisa) ? initialVisa : null,
  ))
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!selectedVisa) return
    localStorage.setItem(`visa-checklist-${selectedVisa}`, JSON.stringify(docStates))
  }, [docStates, selectedVisa])

  const currentDocs = useMemo(
    () => (selectedVisa ? (VISA_DOCS[selectedVisa] ?? []) : []),
    [selectedVisa],
  )

  const categories = useMemo(() => {
    const map = new Map<string, VisaDocument[]>()
    for (const doc of currentDocs) {
      if (!map.has(doc.category)) map.set(doc.category, [])
      map.get(doc.category)!.push(doc)
    }
    return [...map.entries()]
  }, [currentDocs])

  const progress = useMemo(() => {
    const total   = currentDocs.length
    const checked = currentDocs.filter(d => docStates[d.id]?.checked).length
    const byCategory = categories.map(([cat, docs]) => ({
      cat,
      total:   docs.length,
      checked: docs.filter(d => docStates[d.id]?.checked).length,
    }))
    const expiryAlerts = currentDocs.flatMap(d => {
      if (!d.expiryTracking || !docStates[d.id]?.expiryDate) return []
      const s = getExpiryStatus(docStates[d.id].expiryDate, d.warningMonths)
      return s && s.status !== 'ok' ? [{ doc: d, status: s }] : []
    })
    return { total, checked, byCategory, expiryAlerts }
  }, [currentDocs, docStates, categories])

  const updateDoc = useCallback((id: string, patch: Partial<DocState>) => {
    setDocStates(prev => ({ ...prev, [id]: { ...EMPTY, ...prev[id], ...patch } }))
  }, [])

  const toggleTip = useCallback((id: string) => {
    setExpandedTips(prev => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
      } else {
        n.add(id)
      }
      return n
    })
  }, [])

  const toggleNote = useCallback((id: string) => {
    setExpandedNotes(prev => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
      } else {
        n.add(id)
      }
      return n
    })
  }, [])

  // ── Visa selector ─────────────────────────────────────────────────────────────
  if (!selectedVisa) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
          <div className="mb-8 text-center md:mb-10">
            <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
              {dictionary.pageTitle}
            </h1>
            <p className="mx-auto max-w-2xl text-base text-gray-500 md:text-lg">
              {dictionary.pageSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VISA_OPTIONS.map(v => (
              <Link
                key={v.subclass}
                href={`/${locale}/tools/document-checklist-2026/${v.subclass}`}
                className={`group rounded-lg border-2 ${v.border} ${v.bg} p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm`}
              >
                <div className="text-3xl mb-3">{v.emoji}</div>
                <div className="font-bold text-gray-900 text-lg">{dictionary.visas[v.subclass].title}</div>
                <div className="text-sm text-gray-600 mt-1">{dictionary.visas[v.subclass].description}</div>
                <div className="mt-3 text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                  {dictionary.viewChecklist}
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            {dictionary.autoSaveNotice}
          </p>
        </div>
      </div>
    )
  }

  const visaOption = VISA_OPTIONS.find(v => v.subclass === selectedVisa)!
  const selectedVisaCopy = dictionary.visas[visaOption.subclass]
  const pct = progress.total > 0 ? (progress.checked / progress.total) * 100 : 0

  // ── Checklist view ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* Sticky progress dashboard */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Link
                href={`/${locale}/tools/document-checklist-2026`}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-900 transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Vize Seçimi</span>
              </Link>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="font-semibold text-sm text-gray-800 truncate">
                {visaOption.emoji} {selectedVisaCopy.title} — {selectedVisaCopy.description}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {progress.expiryAlerts.length > 0 && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {progress.expiryAlerts.length} uyarı
                </span>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">Yazdır</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Progress value={pct} className="flex-1 h-2.5" />
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap tabular-nums">
              {progress.checked} / {progress.total} hazır
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {progress.byCategory.map(({ cat, total, checked }) => (
              <span key={cat} className="text-xs text-gray-400">
                {checked === total ? '✅' : checked === 0 ? '❌' : '⚠️'} {cat}: {checked}/{total}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Login banner */}
        {!session && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 print:hidden">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Info className="h-4 w-4 shrink-0" />
              <span>İlerlemeniz tarayıcı hafızasına kaydediliyor. Oturum açarak kalıcı olarak kaydedin.</span>
            </div>
            <a
              href={`/${locale}/sign-in`}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 border border-amber-300 rounded px-2 py-1 hover:bg-amber-100 whitespace-nowrap transition-colors shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" /> Giriş Yap
            </a>
          </div>
        )}

        {/* Expiry alerts */}
        {progress.expiryAlerts.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 print:hidden">
            <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-2 text-sm">
              <AlertCircle className="h-4 w-4" /> Son Kullanma Tarihi Uyarıları
            </h3>
            <div className="space-y-1.5">
              {progress.expiryAlerts.map(({ doc, status }) => (
                <div key={doc.id} className="flex items-baseline gap-2 text-sm">
                  <span>{status.status === 'expired' || status.status === 'danger' ? '🔴' : '🟠'}</span>
                  <span className="text-gray-700 font-medium">{doc.name}</span>
                  <span className="text-gray-400 text-xs">
                    {status.diffDays < 0
                      ? `${Math.abs(status.diffDays)} gün önce doldu`
                      : `${status.diffDays} gün kaldı`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category sections */}
        {categories.map(([cat, docs], catIdx) => {
          const colors     = CAT_COLORS[catIdx % CAT_COLORS.length]
          const catChecked = docs.filter(d => docStates[d.id]?.checked).length

          return (
            <div key={cat} className={`rounded-xl border ${colors.border} overflow-hidden shadow-sm`}>
              <div className={`${colors.header} text-white px-4 py-3 flex items-center justify-between`}>
                <h2 className="font-bold text-sm uppercase tracking-wide">{cat}</h2>
                <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">
                  {catChecked}/{docs.length}
                </span>
              </div>

              <div className={`${colors.light} divide-y divide-gray-100`}>
                {docs.map(doc => {
                  const state = docStates[doc.id] ?? EMPTY
                  const expiryStatus = doc.expiryTracking && state.expiryDate
                    ? getExpiryStatus(state.expiryDate, doc.warningMonths)
                    : null
                  const tipOpen  = expandedTips.has(doc.id)
                  const noteOpen = expandedNotes.has(doc.id)

                  return (
                    <div
                      key={doc.id}
                      className={`bg-white px-4 py-4 transition-opacity duration-150 ${state.checked ? 'opacity-55' : ''}`}
                    >
                      <div className="flex gap-3">
                        {/* Checkbox */}
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            id={`chk-${doc.id}`}
                            checked={state.checked}
                            onChange={e => updateDoc(doc.id, { checked: e.target.checked })}
                            className="h-5 w-5 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <label htmlFor={`chk-${doc.id}`} className="cursor-pointer">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`font-semibold text-sm ${state.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {doc.name}
                              </span>
                              {!doc.required && (
                                <span className="text-xs text-gray-400 italic">(isteğe bağlı)</span>
                              )}
                              {doc.apostilleRequired && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-700 bg-red-100 rounded px-1.5 py-0.5">
                                  <Stamp className="h-3 w-3" /> Apostil
                                </span>
                              )}
                              {doc.naatiRequired && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded px-1.5 py-0.5">
                                  <Languages className="h-3 w-3" /> NAATI
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                          </label>

                          {/* Expiry tracking */}
                          {doc.expiryTracking && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="h-3.5 w-3.5" /> Son kullanma:
                              </span>
                              <input
                                type="date"
                                value={state.expiryDate}
                                onChange={e => updateDoc(doc.id, { expiryDate: e.target.value })}
                                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              {expiryStatus && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  expiryStatus.status === 'expired' ? 'bg-red-100 text-red-700' :
                                  expiryStatus.status === 'danger'  ? 'bg-red-100 text-red-600' :
                                  expiryStatus.status === 'warning' ? 'bg-orange-100 text-orange-700' :
                                                                      'bg-green-100 text-green-700'
                                }`}>
                                  {expiryStatus.status === 'expired'
                                    ? `Süresi doldu (${Math.abs(expiryStatus.diffDays)} gün önce)`
                                    : expiryStatus.status === 'danger'
                                    ? `⚠️ ${expiryStatus.diffDays} gün kaldı`
                                    : expiryStatus.status === 'warning'
                                    ? `${expiryStatus.diffMonths} ay kaldı`
                                    : `✓ ${expiryStatus.diffMonths} ay geçerli`}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Tip / note toggle buttons */}
                          <div className="mt-2.5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => toggleTip(doc.id)}
                              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 transition-colors"
                            >
                              <Info className="h-3.5 w-3.5" />
                              {tipOpen ? 'İpucunu gizle' : '💡 İpucu'}
                              {tipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleNote(doc.id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              📝 {noteOpen ? 'Notu gizle' : state.notes ? 'Notu düzenle' : 'Not ekle'}
                              {noteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>

                          {tipOpen && (
                            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 leading-relaxed">
                              {doc.tips}
                            </div>
                          )}

                          {noteOpen && (
                            <textarea
                              value={state.notes}
                              onChange={e => updateDoc(doc.id, { notes: e.target.value })}
                              placeholder="Referans numarası, sipariş tarihi, NAATI gönderim tarihi..."
                              rows={2}
                              className="mt-2 w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                            />
                          )}

                          {!noteOpen && state.notes && (
                            <p className="mt-1.5 text-xs text-gray-400 italic truncate">📝 {state.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-2 pb-10 print:hidden">
          <Link
            href={`/${locale}/tools/document-checklist-2026`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Farklı vize seç
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            <Printer className="h-4 w-4" /> Kontrol listesini yazdır
          </button>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{dictionary.pageTitle}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {selectedVisaCopy.title} — {selectedVisaCopy.description} | {progress.checked}/{progress.total} belge hazır |{' '}
            Tarih: {new Date().toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>
    </div>
  )
}
