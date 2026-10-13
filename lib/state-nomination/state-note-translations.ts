import type { Locale } from "@/lib/readiness/types";
import { STATE_RULES } from "@/lib/state-nomination/state-rules-config";

/**
 * Turkish and Simplified Chinese versions of the state nomination notes shown in the report's State Nomination Tracker:
 * each state's note (lib/state-nomination/state-rules-config.ts) and special conditions
 * (src/data/state-nomination-status.json). Keyed by the exact English text, so a change to the English note without a
 * matching translation is caught by scripts/test-state-note-translations.ts. Figures, dates and official program
 * names (Canberra Matrix, State Nominated Migration Program (SNMP), WASMOL, Live in Melbourne, ...) are unchanged.
 */
export const STATE_NOTE_TRANSLATIONS: Record<string, { tr: string; zh: string }> = {
  // ── state-rules-config.ts notes (keyed by the rule's own text so they cannot drift) ───────────────────────────
  [STATE_RULES.ACT.note]: {
    tr: "ACT adaylığı basit bir puan barajıyla değil, liyakate göre sıralama yapan Canberra Matrix üzerinden yürür -- ACT'nin 2026-27 kontenjanı henüz Avustralya Hükümeti tarafından onaylanmamıştır (2025-26'da subclass 190 için 800 ve subclass 491 için 800 yer vardı ve hepsi kullanıldı), 2026-27'nin ilk davet turu 12 Ekim 2026 haftası için planlanmıştır (yalnızca subclass 190) ve talep sürekli olarak kontenjanı aşmaktadır.",
    zh: "ACT 提名通过按择优排名的 Canberra Matrix 进行，而非简单的分数线——ACT 2026-27 年度名额尚未获澳大利亚联邦政府确认（2025-26 年度为 subclass 190 800 个、subclass 491 800 个，且已全部用完），2026-27 年度首轮邀请定于 2026 年 10 月 12 日当周（仅 subclass 190），且申请需求一直超过名额。",
  },
  [STATE_RULES.NT.note]: {
    tr: "Yeni başvurulara kapalı (2026-27), dar kapsamlı bir Avustralya içi 491 istisnasıyla. NT'nin 2026-27 programı, subclass 190 ve tüm yurt dışı akışları için yeni başvurulara kapalıdır (\"sufficient applications received\"). İstisna, NT Graduate veya NT Resident ölçütlerini karşılayan ve vize son tarihi 30 Eylül 2027'den önce olan Avustralya içindeki başvuru sahipleri için subclass 491'dir: 30 Eylül 2027 veya öncesinde sona eren ve subclass 485 için uygun olmayan bir esas vize; 30 Eylül 2027 veya öncesinde 45 yaşına girmek; ya da 30 Eylül 2027 veya öncesindeki bir doğum günü nedeniyle 491 puanının 65'in altına düşmesi.",
    zh: "不接受新申请（2026-27），仅对境内 491 设有狭窄例外。NT 2026-27 年度项目对 subclass 190 及所有境外类别均不接受新申请（\"sufficient applications received\"）。例外仅限于满足 NT Graduate 或 NT Resident 条件、且签证期限在 2027 年 9 月 30 日之前的境内 subclass 491 申请人：主签证于 2027 年 9 月 30 日或之前到期且不符合 subclass 485 资格；在 2027 年 9 月 30 日或之前年满 45 岁；或因在 2027 年 9 月 30 日或之前的生日而使 491 分数低于 65 分。",
  },
  [STATE_RULES.TAS.note]: {
    tr: "Migration Tasmania'nın 2026-27 programı 17 Ağustos 2026'da yeni Registrations of Interest (ROI) başvurularına açıldı; 2,050 kontenjan (subclass 190 için 1,250, subclass 491 için 800) ve 20 Ağustos 2026'dan itibaren haftalık davetler söz konusu. ROI'ler dört Avustralya içi yolda (Skilled Employment, Skilled Graduate, Established Resident, Business Operator) Gold/Green/Orange-Plus/Orange/Red geçiş sistemine göre sıralanır; yurt dışından yalnızca Overseas Applicant (sağlık veya eğitim sektörü iş teklifi) yolu subclass 190 için devam eder ve 2026-27'de subclass 491 Overseas Skilled Occupation Profiles yolu için davet planlanmamaktadır.",
    zh: "Migration Tasmania 的 2026-27 年度项目已于 2026 年 8 月 17 日开始接受新的 Registrations of Interest (ROI)，名额共 2,050 个（subclass 190 为 1,250 个，subclass 491 为 800 个），自 2026 年 8 月 20 日起每周发出邀请。ROI 在四个境内途径（Skilled Employment、Skilled Graduate、Established Resident、Business Operator）中按 Gold/Green/Orange-Plus/Orange/Red 通行等级排序；境外方面仅保留 subclass 190 的 Overseas Applicant（医疗或教育行业工作邀约）途径，且 2026-27 年度不计划向 subclass 491 的 Overseas Skilled Occupation Profiles 途径发出邀请。",
  },
  [STATE_RULES.NSW.note]: {
    tr: "New South Wales'in Skilled Nominated (190) ve Skilled Work Regional (491) sayfalarının ikisinde de, tüm adaylık yerleri tamamen dağıtıldığı için başvuruların mevcut program yılı için kapalı olduğunu belirten bir duyuru vardır (duyuru program yılını belirtmez). Önceden gönderilmiş başvurular değerlendirilmeye devam eder; NSW bir sonraki program yılı için program ayarlarını ve uygunluk ölçütlerini gözden geçirmektedir ve 13 Ekim 2026 itibarıyla yeni ayarlar yayımlamamıştır.",
    zh: "New South Wales 的 Skilled Nominated (190) 和 Skilled Work Regional (491) 页面均发布公告称，由于所有可用提名名额已全部分配，本计划年度的申请已关闭（公告未注明具体计划年度）。已提交的申请继续评估；NSW 正在审查下一计划年度的项目设置和资格标准，截至 2026 年 10 月 13 日尚未公布新设置。",
  },
  [STATE_RULES.QLD.note]: {
    tr: "Queensland'in 2025-26 State Nominated Migration Program (SNMP) için Registrations of Interest (ROI) başvuruları kapalıdır. 2026-27 uygunluk koşulları ve açılış tarihi 13 Ekim 2026 itibarıyla Migration Queensland web sitesinde yayımlanmamıştır; subclass 190 ve 491 için 2026-27 başvuru ücretleri 'to be advised' (daha sonra bildirilecek) olarak listelenmiştir.",
    zh: "Queensland 2025-26 年度 State Nominated Migration Program (SNMP) 的 Registrations of Interest (ROI) 已关闭。截至 2026 年 10 月 13 日，Migration Queensland 网站尚未公布 2026-27 年度的资格要求和开放日期，subclass 190 和 491 的 2026-27 年度申请费用列为 'to be advised'（待通知）。",
  },
  [STATE_RULES.SA.note]: {
    tr: "South Australia'nın Skilled & Business Migration birimi, 2025-26 program yılı için Registrations of Interest (ROI) başvurularını 2 Haziran 2026 saat 09:00'da kapattı ve 2026-27 programı başladığında tüm uygun adaylardan ROI kabul etmeye yeniden başlayacağını belirtiyor. 13 Ekim 2026 itibarıyla 2026-27 program bilgisi yayımlanmamıştır; akış sayfaları hâlâ 2025-26 ayarlarını anlatmaktadır.",
    zh: "South Australia 的 Skilled & Business Migration 已于 2026 年 6 月 2 日上午 9 点关闭 2025-26 计划年度的 Registrations of Interest (ROI)，并表示 2026-27 项目开始后将恢复接受所有符合条件的候选人的 ROI。截至 2026 年 10 月 13 日尚未公布 2026-27 项目信息；各类别页面仍在描述 2025-26 年度的设置。",
  },
  [STATE_RULES.WA.note]: {
    tr: "Western Australia'nın State Nominated Migration Program sayfası hâlâ yalnızca 2025-26 programını göstermektedir; 2026-27 ayarları veya alımı yayımlanmamıştır ve programa ilişkin en son haber 8 Aralık 2025 tarihlidir. Gösterilen son davetler 20 Mayıs 2026'da öncelikli zanaat meslekleri için gönderilmiştir: 167 General stream (WASMOL Schedule 2) ve 42 Graduate stream; hepsi subclass 190 içindir, subclass 491 için hiç yoktur. WA'nın 2026-27'de davet gönderip göndermediği burada doğrulanmamıştır -- resmi sayfayı kontrol edin.",
    zh: "Western Australia 的 State Nominated Migration Program 页面仍然只显示 2025-26 年度项目，尚未公布 2026-27 年度的设置或开放安排，该项目最新的新闻发布于 2025 年 12 月 8 日。页面显示的最近一次邀请于 2026 年 5 月 20 日针对优先技术行业职业发出：General stream（WASMOL Schedule 2）167 份、Graduate stream 42 份，均为 subclass 190，subclass 491 没有。WA 在 2026-27 年度是否在发出邀请，此处无法确认——请查看官方页面。",
  },
  "Victoria's 2025-26 skilled visa nomination program (subclasses 190 and 491) is closed -- Live in Melbourne states all places have been filled. Information about the 2026-27 program has not yet been published.": {
    tr: "Victoria'nın 2025-26 nitelikli vize adaylık programı (subclass 190 ve 491) kapalıdır -- Live in Melbourne tüm yerlerin dolduğunu belirtmektedir. 2026-27 programı hakkında bilgi henüz yayımlanmamıştır.",
    zh: "Victoria 2025-26 年度技术签证提名项目（subclass 190 和 491）已关闭——Live in Melbourne 称所有名额均已用完。2026-27 年度项目信息尚未公布。",
  },

  // ── state-nomination-status.json special conditions ───────────────────────────────────────────────────────────
  "Strong preference for applicants already contributing in Victoria": {
    tr: "Victoria'da halihazırda katkı sağlayan başvuru sahipleri güçlü biçimde tercih edilir",
    zh: "明显优先已在 Victoria 作出贡献的申请人",
  },
  "Regional flexibility strengthens the nomination case": {
    tr: "Bölgesel esneklik adaylık başvurusunu güçlendirir",
    zh: "愿意前往偏远地区可增强提名申请",
  },
  "Closed for the current program year -- all nomination places fully allocated (the notice does not name the year)": {
    tr: "Mevcut program yılı için kapalı -- tüm adaylık yerleri tamamen dağıtıldı (duyuru yılı belirtmiyor)",
    zh: "本计划年度已关闭——提名名额已全部分配（公告未注明具体年度）",
  },
  "Invitation-only: no direct applications, and no announced invitation-round dates": {
    tr: "Yalnızca davetle: doğrudan başvuru yok ve duyurulmuş davet turu tarihi yok",
    zh: "仅限受邀：不接受直接申请，也没有公布邀请轮次日期",
  },
  "2026-27 intake not confirmed -- check the official page": {
    tr: "2026-27 alımı doğrulanmadı -- resmi sayfayı kontrol edin",
    zh: "2026-27 年度招收未确认——请查看官方页面",
  },
  "2026-27 program not yet published -- ROI intake resumes when it commences": {
    tr: "2026-27 programı henüz yayımlanmadı -- ROI alımı program başladığında yeniden başlar",
    zh: "2026-27 年度项目尚未公布——ROI 受理将在项目开始后恢复",
  },
  "Closed to new applications (2026-27), with a narrow onshore 491 exception": {
    tr: "Yeni başvurulara kapalı (2026-27), dar kapsamlı bir Avustralya içi 491 istisnasıyla",
    zh: "不接受新申请（2026-27），仅对境内 491 设有狭窄例外",
  },
  "Exception: onshore subclass 491 for NT Graduate or NT Resident applicants with a visa deadline before 30 September 2027 (substantive visa expiring on or before 30 Sep 2027 and not eligible for subclass 485; turning 45 on or before 30 Sep 2027; or 491 points below 65 because of a birthday on or before 30 Sep 2027)": {
    tr: "İstisna: vize son tarihi 30 Eylül 2027'den önce olan NT Graduate veya NT Resident başvuru sahipleri için Avustralya içi subclass 491 (30 Eylül 2027 veya öncesinde sona eren ve subclass 485 için uygun olmayan esas vize; 30 Eylül 2027 veya öncesinde 45 yaşına girmek; ya da 30 Eylül 2027 veya öncesindeki bir doğum günü nedeniyle 491 puanının 65'in altına düşmesi)",
    zh: "例外：签证期限在 2027 年 9 月 30 日之前的 NT Graduate 或 NT Resident 境内 subclass 491 申请人（主签证于 2027 年 9 月 30 日或之前到期且不符合 subclass 485 资格；在 2027 年 9 月 30 日或之前年满 45 岁；或因在 2027 年 9 月 30 日或之前的生日而使 491 分数低于 65 分）",
  },
  "Subclass 491 Overseas Skilled Occupation Profiles pathway: no invitations planned for 2026-27": {
    tr: "Subclass 491 Overseas Skilled Occupation Profiles yolu: 2026-27 için davet planlanmıyor",
    zh: "Subclass 491 Overseas Skilled Occupation Profiles 途径：2026-27 年度不计划发出邀请",
  },
  "Overseas Applicant (health or education sector job offer) pathway remains for subclass 190": {
    tr: "Overseas Applicant (sağlık veya eğitim sektörü iş teklifi) yolu subclass 190 için devam ediyor",
    zh: "Overseas Applicant（医疗或教育行业工作邀约）途径仍适用于 subclass 190",
  },
  "Offshore pathways usually need stronger work experience evidence": {
    tr: "Yurt dışı yolları genellikle daha güçlü iş deneyimi kanıtı gerektirir",
    zh: "境外途径通常需要更充分的工作经验证明",
  },
  "Program settings can reopen, but current intake is treated as closed": {
    tr: "Program ayarları yeniden açılabilir, ancak mevcut alım kapalı kabul edilir",
    zh: "项目设置可能重新开放，但目前的招收按关闭处理",
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
