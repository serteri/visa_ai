import type { Locale } from "@/lib/readiness/types";

/**
 * Turkish and Simplified Chinese versions of the state nomination notes shown in the report's State Nomination Tracker:
 * each state's note (lib/state-nomination/state-rules-config.ts) and special conditions
 * (src/data/state-nomination-status.json). Keyed by the exact English text, so a change to the English note without a
 * matching translation is caught by scripts/test-state-note-translations.ts. Figures, dates and official program
 * names (Canberra Matrix, State Nominated Migration Program (SNMP), WASMOL, Live in Melbourne, ...) are unchanged.
 */
export const STATE_NOTE_TRANSLATIONS: Record<string, { tr: string; zh: string }> = {
  // ── state-rules-config.ts notes ───────────────────────────────────────────────────────────────────────────────
  "ACT nomination runs through the merit-ranked Canberra Matrix, not a simple points cutoff -- the 2025-26 allocation is 800 places for subclass 190 and 800 for subclass 491, and demand for the program consistently exceeds this allocation.": {
    tr: "ACT adaylığı basit bir puan barajıyla değil, liyakate göre sıralama yapan Canberra Matrix üzerinden yürür -- 2025-26 kontenjanı subclass 190 için 800 ve subclass 491 için 800 yerdir ve programa talep bu kontenjanı sürekli olarak aşmaktadır.",
    zh: "ACT 提名通过按择优排名的 Canberra Matrix 进行，而非简单的分数线——2025-26 年度名额为 subclass 190 800 个、subclass 491 800 个，且申请需求一直超过该名额。",
  },
  "The Northern Territory's 2025-26 General Skilled Migration nomination allocation has been fully exhausted. Applications already in the queue are still assessed, and will be considered for nomination once the 2026-27 allocation is received, but new applicants should treat NT nomination as closed for the remainder of the current program year.": {
    tr: "Northern Territory'nin 2025-26 General Skilled Migration adaylık kontenjanı tamamen dolmuştur. Sırada bekleyen başvurular değerlendirilmeye devam eder ve 2026-27 kontenjanı alındığında adaylık için ele alınır; ancak yeni başvuru sahipleri NT adaylığını mevcut program yılının geri kalanı için kapalı kabul etmelidir.",
    zh: "Northern Territory 2025-26 年度 General Skilled Migration 提名名额已全部用完。已在排队的申请仍会评估，并将在收到 2026-27 年度名额后考虑提名；但新申请人应将 NT 提名视为在本计划年度剩余时间内关闭。",
  },
  "Migration Tasmania ranks Registrations of Interest (ROI) into a Gold/Green/Orange-Plus/Orange/Red pass system across four onshore pathways (Skilled Employment, Skilled Graduate, Established Resident, Business Operator) plus a narrow Overseas Applicant (health/education job-offer) pathway -- the general offshore-only 491 pathway is currently paused for the 2026-27 program year.": {
    tr: "Migration Tasmania, Registrations of Interest (ROI) başvurularını dört Avustralya içi yolda (Skilled Employment, Skilled Graduate, Established Resident, Business Operator) ve dar kapsamlı bir Overseas Applicant (sağlık/eğitim iş teklifi) yolunda Gold/Green/Orange-Plus/Orange/Red geçiş sistemine göre sıralar -- genel, yalnızca yurt dışından başvurulan 491 yolu 2026-27 program yılı için şu anda askıdadır.",
    zh: "Migration Tasmania 将 Registrations of Interest (ROI) 按 Gold/Green/Orange-Plus/Orange/Red 通行等级排序，涵盖四个境内途径（Skilled Employment、Skilled Graduate、Established Resident、Business Operator）以及范围有限的 Overseas Applicant（医疗/教育工作邀约）途径——一般性的仅限境外 491 途径在 2026-27 计划年度暂停。",
  },
  "New South Wales' Skilled Nominated (190) and Skilled Work Regional (491) programs are both closed for the current program year -- an 'Important Notice: Closure' banner on both program documents states all 2025-26 nomination places have been fully allocated. Already-submitted applications continue to be assessed; updated 2026-27 settings are not yet published.": {
    tr: "New South Wales'in Skilled Nominated (190) ve Skilled Work Regional (491) programlarının ikisi de mevcut program yılı için kapalıdır -- her iki programın yayımlanan bilgilerindeki 'Important Notice: Closure' duyurusu, 2025-26 adaylık yerlerinin tamamen dağıtıldığını belirtir. Önceden gönderilmiş başvurular değerlendirilmeye devam eder; güncellenmiş 2026-27 ayarları henüz yayımlanmamıştır.",
    zh: "New South Wales 的 Skilled Nominated (190) 和 Skilled Work Regional (491) 项目在本计划年度均已关闭——两个项目公布信息中的 'Important Notice: Closure' 公告称 2025-26 年度提名名额已全部分配。已提交的申请继续评估；2026-27 年度的更新设置尚未公布。",
  },
  "Victoria's 2025-26 skilled visa nomination program (subclasses 190 and 491) is closed -- Live in Melbourne states all places have been filled. Information about the 2026-27 program has not yet been published.": {
    tr: "Victoria'nın 2025-26 nitelikli vize adaylık programı (subclass 190 ve 491) kapalıdır -- Live in Melbourne tüm yerlerin dolduğunu belirtmektedir. 2026-27 programı hakkında bilgi henüz yayımlanmamıştır.",
    zh: "Victoria 2025-26 年度技术签证提名项目（subclass 190 和 491）已关闭——Live in Melbourne 称所有名额均已用完。2026-27 年度项目信息尚未公布。",
  },
  "Queensland's 2025-26 State Nominated Migration Program (SNMP) Registrations of Interest are closed across every pathway (offshore skilled workers, building/construction, university graduates, small business owners, and the National Innovation Visa) -- updated 2026-27 settings and an opening date have not yet been published.": {
    tr: "Queensland'in 2025-26 State Nominated Migration Program (SNMP) Registrations of Interest başvuruları tüm yollarda kapalıdır (yurt dışındaki nitelikli çalışanlar, inşaat, üniversite mezunları, küçük işletme sahipleri ve National Innovation Visa) -- güncellenmiş 2026-27 ayarları ve açılış tarihi henüz yayımlanmamıştır.",
    zh: "Queensland 2025-26 年度 State Nominated Migration Program (SNMP) 的 Registrations of Interest 在所有途径均已关闭（境外技术人员、建筑业、大学毕业生、小企业主以及 National Innovation Visa）——2026-27 年度的更新设置和开放日期尚未公布。",
  },
  "South Australia's Skilled & Business Migration invites Registrations of Interest / EOIs on an ongoing basis throughout 2025-26 for both subclass 190 and 491, prioritising Building & Construction, Defence, Education, Engineering, Health and Manufacturing; the state's published information (as of September 2026) shows no closure or allocation-exhausted notice.": {
    tr: "South Australia'nın Skilled & Business Migration birimi, 2025-26 boyunca hem subclass 190 hem 491 için sürekli olarak Registrations of Interest / EOI davet eder ve Building & Construction, Defence, Education, Engineering, Health ve Manufacturing sektörlerine öncelik verir; eyaletin yayımladığı bilgiler (Eylül 2026 itibarıyla) herhangi bir kapanış veya kontenjan dolması duyurusu göstermemektedir.",
    zh: "South Australia 的 Skilled & Business Migration 在 2025-26 年度持续邀请 subclass 190 和 491 的 Registrations of Interest / EOI，优先 Building & Construction、Defence、Education、Engineering、Health 和 Manufacturing 行业；该州公布的信息（截至 2026 年 9 月）未显示任何关闭或名额用尽的通知。",
  },
  "Western Australia is issuing invitations under its 2025-26 State Nominated Migration Program (SNMP). Based on the state's published information as of 22 August 2026, skilled-trade occupations were invited as recently as 16 May 2026, with 8,162 invitations issued across all streams in the 2025-26 program year. Occupation eligibility follows WA's 2025-26 occupation lists (WASMOL Schedule 1, Schedule 2 and the Graduate list).": {
    tr: "Western Australia, 2025-26 State Nominated Migration Program (SNMP) kapsamında davet göndermektedir. Eyaletin 22 Ağustos 2026 itibarıyla yayımladığı bilgilere göre nitelikli zanaat meslekleri en son 16 Mayıs 2026'da davet edilmiş ve 2025-26 program yılında tüm akışlarda 8,162 davet gönderilmiştir. Meslek uygunluğu WA'nın 2025-26 meslek listelerine (WASMOL Schedule 1, Schedule 2 ve Graduate listesi) göre belirlenir.",
    zh: "Western Australia 正在其 2025-26 年度 State Nominated Migration Program (SNMP) 下发出邀请。根据该州截至 2026 年 8 月 22 日公布的信息，技术行业职业最近一次获邀是在 2026 年 5 月 16 日，2025-26 计划年度各类别共发出 8,162 份邀请。职业资格以 WA 2025-26 年度职业清单（WASMOL Schedule 1、Schedule 2 和 Graduate 清单）为准。",
  },

  // ── state-nomination-status.json special conditions ───────────────────────────────────────────────────────────
  "Competitive invitation environment": { tr: "Rekabetçi davet ortamı", zh: "邀请竞争激烈" },
  "Occupation ceilings can move during the program year": {
    tr: "Meslek tavanları program yılı içinde değişebilir",
    zh: "职业配额上限可能在计划年度内变动",
  },
  "Strong preference for applicants already contributing in Victoria": {
    tr: "Victoria'da halihazırda katkı sağlayan başvuru sahipleri güçlü biçimde tercih edilir",
    zh: "明显优先已在 Victoria 作出贡献的申请人",
  },
  "Regional flexibility strengthens the nomination case": {
    tr: "Bölgesel esneklik adaylık başvurusunu güçlendirir",
    zh: "愿意前往偏远地区可增强提名申请",
  },
  "Offshore pathways usually need stronger work experience evidence": {
    tr: "Yurt dışı yolları genellikle daha güçlü iş deneyimi kanıtı gerektirir",
    zh: "境外途径通常需要更充分的工作经验证明",
  },
  "Program settings can reopen, but current intake is treated as closed": {
    tr: "Program ayarları yeniden açılabilir, ancak mevcut alım kapalı kabul edilir",
    zh: "项目设置可能重新开放，但目前的招收按关闭处理",
  },
  "2025-26 nomination allocation exhausted -- no new places until 2026-27 allocation is confirmed": {
    tr: "2025-26 adaylık kontenjanı doldu -- 2026-27 kontenjanı onaylanana kadar yeni yer yok",
    zh: "2025-26 年度提名名额已用完——在 2026-27 年度名额确认前没有新名额",
  },
  "Offshore applicants generally only considered for subclass 491": {
    tr: "Yurt dışındaki başvuru sahipleri genellikle yalnızca subclass 491 için değerlendirilir",
    zh: "境外申请人一般只会被考虑 subclass 491",
  },
  "3-year commitment to live and work in the NT required from visa grant": {
    tr: "Vize verildikten sonra NT'de 3 yıl yaşama ve çalışma taahhüdü gerekir",
    zh: "须承诺自签证获批起在 NT 居住和工作 3 年",
  },
  "Tasmanian ties or local activity normally improve eligibility": {
    tr: "Tasmanya ile bağlar veya yerel faaliyet genellikle uygunluğu artırır",
    zh: "与 Tasmania 的联系或当地活动通常会提高资格",
  },
  "Ranked by the Canberra Matrix (merit-based, not first-come-first-served) -- invitation is never guaranteed even if eligibility criteria are met": {
    tr: "Canberra Matrix ile sıralanır (liyakate dayalı, ilk gelen önce değil) -- uygunluk koşulları karşılansa bile davet asla garanti değildir",
    zh: "按 Canberra Matrix 排名（择优，而非先到先得）——即使满足资格条件也不保证获邀",
  },
  "Two-year commitment to live and work in Canberra after visa grant": {
    tr: "Vize verildikten sonra Canberra'da iki yıl yaşama ve çalışma taahhüdü",
    zh: "须承诺在签证获批后于 Canberra 居住和工作两年",
  },
};

/** The note in the report's language; English when no translation exists (e.g. an admin-entered note). */
export function localizeStateNote(locale: Locale, en: string): string {
  const t = STATE_NOTE_TRANSLATIONS[en];
  if (!t) return en;
  return locale === "tr" ? t.tr : locale === "zh-Hans" ? t.zh : en;
}
