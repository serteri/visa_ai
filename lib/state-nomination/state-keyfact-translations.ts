import type { Locale } from "@/lib/readiness/types";
import { STATE_NOTE_TRANSLATIONS } from "./state-note-translations";

/**
 * A state's published statement (its note, a key fact, a stream condition) in the report's language. The translations are machine-assisted
 * drafts that have not been reviewed by a native speaker (listed in docs/compliance-review-pack.md); where there is none the state's own
 * English wording is shown unchanged. Numbers, dates, fees and subclass numbers are carried over exactly as published.
 */
const KEY_FACTS: Record<string, { tr: string; zh: string }> = {
  // Verification statements (11 October 2026 check).
  "These are the latest published settings (2025-26). As of 11 October 2026 New South Wales had not published 2026-27 settings.": {
    tr: "Bunlar yayımlanmış en güncel ayarlardır (2025-26). 11 Ekim 2026 itibarıyla Yeni Güney Galler 2026-27 ayarlarını yayımlamamıştı.",
    zh: "这些是已公布的最新设置（2025-26）。截至 2026 年 10 月 11 日，新南威尔士州尚未公布 2026-27 年度设置。",
  },
  "These are the latest published settings (2025-26). As of 11 October 2026 Victoria had not published 2026-27 settings.": {
    tr: "Bunlar yayımlanmış en güncel ayarlardır (2025-26). 11 Ekim 2026 itibarıyla Victoria 2026-27 ayarlarını yayımlamamıştı.",
    zh: "这些是已公布的最新设置（2025-26）。截至 2026 年 10 月 11 日，维多利亚州尚未公布 2026-27 年度设置。",
  },
  "These are the latest published settings (2025-26). As of 11 October 2026 Queensland had not published 2026-27 settings.": {
    tr: "Bunlar yayımlanmış en güncel ayarlardır (2025-26). 11 Ekim 2026 itibarıyla Queensland 2026-27 ayarlarını yayımlamamıştı.",
    zh: "这些是已公布的最新设置（2025-26）。截至 2026 年 10 月 11 日，昆士兰州尚未公布 2026-27 年度设置。",
  },
  "These are the latest published settings (2025-26). As of 11 October 2026 the Northern Territory had not published 2026-27 settings.": {
    tr: "Bunlar yayımlanmış en güncel ayarlardır (2025-26). 11 Ekim 2026 itibarıyla Northern Territory 2026-27 ayarlarını yayımlamamıştı.",
    zh: "这些是已公布的最新设置（2025-26）。截至 2026 年 10 月 11 日，北领地尚未公布 2026-27 年度设置。",
  },
  "These are the latest published settings (2025-26), checked on 11 October 2026.": {
    tr: "Bunlar yayımlanmış en güncel ayarlardır (2025-26); 11 Ekim 2026'da kontrol edildi.",
    zh: "这些是已公布的最新设置（2025-26），于 2026 年 10 月 11 日核对。",
  },
  "Checked on 11 October 2026: no change since the previous check.": {
    tr: "11 Ekim 2026'da kontrol edildi: önceki kontrolden bu yana değişiklik yok.",
    zh: "于 2026 年 10 月 11 日核对：与上次核对相比没有变化。",
  },
  "Two nomination pathways: Skilled Work Regional (subclass 491, provisional) and Skilled Nominated (subclass 190, permanent).": {
    tr: "İki adaylık yolu: Skilled Work Regional (subclass 491, geçici) ve Skilled Nominated (subclass 190, kalıcı).",
    zh: "两条提名途径：技术工作区域（491 子类，临时）和技术提名（190 子类，永久）。",
  },
  "2025-26 allocation: 800 places for subclass 190 and 800 places for subclass 491.": {
    tr: "2025-26 kontenjanı: subclass 190 için 800, subclass 491 için 800 yer.",
    zh: "2025-26 年度配额：190 子类 800 个名额，491 子类 800 个名额。",
  },
  "General pathway requires the nominated occupation to be on the ACT Nominated Migration Program Occupation List; Doctorate Streamlined and Small Business Owner pathways are exempt from that list requirement.": {
    tr: "Genel yol, aday gösterilen mesleğin ACT Nominated Migration Program Occupation List'te olmasını gerektirir; Doctorate Streamlined ve Small Business Owner yolları bu liste şartından muaftır.",
    zh: "普通途径要求被提名职业列入 ACT 提名移民计划职业清单；博士快速通道（Doctorate Streamlined）和小企业主（Small Business Owner）途径不受该清单要求限制。",
  },
  "Work experience: at least 1 year full-time post-graduate relevant experience in the last 5 years for some pathways, at least 3 years for others (varies by pathway).": {
    tr: "İş deneyimi: bazı yollar için son 5 yılda en az 1 yıl tam zamanlı, mezuniyet sonrası ilgili deneyim; diğerleri için en az 3 yıl (yola göre değişir).",
    zh: "工作经验：部分途径要求最近 5 年内至少 1 年毕业后全职相关工作经验，其他途径至少 3 年（因途径而异）。",
  },
  "English requirement: Competent for subclass 491; Proficient or Superior for subclass 190, unless the occupation is Chef (ANZSCO 351311) or has an ANZSCO skill level of 3-5, in which case Competent applies.": {
    tr: "İngilizce şartı: subclass 491 için Competent; subclass 190 için Proficient veya Superior. Meslek Chef (ANZSCO 351311) ise veya ANZSCO beceri düzeyi 3-5 ise Competent geçerlidir.",
    zh: "英语要求：491 子类为 Competent；190 子类为 Proficient 或 Superior，除非职业为厨师（ANZSCO 351311）或 ANZSCO 技能等级为 3-5，此时适用 Competent。",
  },
  "Two-year commitment to live and work in Canberra after visa grant is mandatory for both subclasses.": {
    tr: "Vize verildikten sonra Canberra'da yaşama ve çalışma yönünde iki yıllık taahhüt her iki subclass için zorunludur.",
    zh: "获批签证后在堪培拉居住和工作两年的承诺，对两个子类均为强制性要求。",
  },
  "Canberra Matrix submissions lapse automatically after 6 months without an invitation (extendable to 12 months on update).": {
    tr: "Canberra Matrix başvuruları, davet gelmezse 6 ay sonra otomatik olarak sona erer (güncellemeyle 12 aya uzatılabilir).",
    zh: "Canberra Matrix 提交在 6 个月内未获邀请则自动失效（更新后可延长至 12 个月）。",
  },
  "Application fees (incl. GST): Canberra Matrix submission AUD 27.50; subclass 190 nomination AUD 357.50; subclass 491 nomination AUD 357.50.": {
    tr: "Başvuru ücretleri (GST dahil): Canberra Matrix başvurusu AUD 27,50; subclass 190 adaylığı AUD 357,50; subclass 491 adaylığı AUD 357,50.",
    zh: "申请费用（含 GST）：Canberra Matrix 提交 AUD 27.50；190 子类提名 AUD 357.50；491 子类提名 AUD 357.50。",
  },
  "Once invited, applicants have 60 days to apply for the visa before the ACT nomination offer lapses.": {
    tr: "Davet edildikten sonra başvuru sahiplerinin, ACT aday gösterme teklifi sona ermeden önce vizeye başvurmak için 60 günü vardır.",
    zh: "获邀后，申请人须在 ACT 提名邀请失效前的 60 天内申请签证。",
  },
  "2025-26 GSM nomination allocation is fully exhausted; further nominations paused until the 2026-27 allocation is confirmed.": {
    tr: "2025-26 GSM aday gösterme kontenjanı tamamen dolmuştur; 2026-27 kontenjanı onaylanana kadar yeni adaylıklar durdurulmuştur.",
    zh: "2025-26 年度 GSM 提名配额已全部用完；在 2026-27 年度配额确认前暂停新的提名。",
  },
  "Minimum points test score required: 65 (Department of Home Affairs points test).": {
    tr: "Gereken asgari puan testi skoru: 65 (İçişleri Bakanlığı puan testi).",
    zh: "所需最低积分测试分数：65（内政部积分测试）。",
  },
  "Age cap: under 45 years at time of nomination.": {
    tr: "Yaş sınırı: aday gösterildiği tarihte 45 yaşın altında.",
    zh: "年龄上限：获提名时未满 45 岁。",
  },
  "Offshore applicants are generally only considered for subclass 491, via one of three streams: NT Priority Occupation (occupation on NTOMOL), NT Job Offer (verifiable NT job offer), or NT Family (eligible relative resident in the NT for 12+ months).": {
    tr: "Yurt dışındaki başvuru sahipleri genellikle yalnızca subclass 491 için ve üç akıştan biriyle değerlendirilir: NT Priority Occupation (meslek NTOMOL'de), NT Job Offer (doğrulanabilir NT iş teklifi) veya NT Family (NT'de 12+ aydır yaşayan uygun bir akraba).",
    zh: "境外申请人通常只考虑 491 子类，经由三条通道之一：NT 优先职业（职业在 NTOMOL 上）、NT 工作邀约（可核实的 NT 工作邀约）或 NT 家庭（在 NT 居住满 12 个月以上的合资格亲属）。",
  },
  "Offshore Priority Occupation stream requires at least 2 years post-qualification work experience in the nominated occupation within the last 5 years.": {
    tr: "Yurt dışı Priority Occupation akışı, son 5 yıl içinde aday gösterilen meslekte nitelik sonrası en az 2 yıllık iş deneyimi gerektirir.",
    zh: "境外优先职业通道要求在过去 5 年内，在被提名职业中有至少 2 年资格取得后的工作经验。",
  },
  "3-year commitment to live and work in the NT from visa grant is mandatory for all nominees.": {
    tr: "Vize verildiği tarihten itibaren NT'de yaşama ve çalışma yönünde 3 yıllık taahhüt, tüm adaylar için zorunludur.",
    zh: "自签证获批起在 NT 居住和工作 3 年的承诺，对所有被提名人均为强制性要求。",
  },
  "Minimum settlement funds guidance: AU$35,000 (individual applicant) up to AU$65,000 (applicant + spouse + 2 children).": {
    tr: "Asgari yerleşim fonu rehberi: AU$35.000 (tek başvuru sahibi) ile AU$65.000 (başvuru sahibi + eş + 2 çocuk) arası.",
    zh: "最低安家资金指引：AU$35,000（单人申请）至 AU$65,000（申请人+配偶+2 名子女）。",
  },
  "Nomination application fee: AU$300 (plus GST where applicable), non-refundable, per application.": {
    tr: "Aday gösterme başvuru ücreti: AU$300 (uygulanıyorsa GST ayrıca), iade edilmez, başvuru başına.",
    zh: "提名申请费：AU$300（适用时另加 GST），不可退还，按每份申请收取。",
  },
  "Once nominated, applicants have 60 days to apply for the relevant visa before the nomination lapses.": {
    tr: "Aday gösterildikten sonra başvuru sahiplerinin, adaylık sona ermeden önce ilgili vizeye başvurmak için 60 günü vardır.",
    zh: "获提名后，申请人须在提名失效前的 60 天内申请相关签证。",
  },
  "DHA baseline for state nomination: under 45, skills-assessed occupation on the relevant list, valid positive skills assessment, at least Competent English, at least 65 DHA points.": {
    tr: "Eyalet adaylığı için İçişleri Bakanlığı temel şartları: 45 yaşın altı, ilgili listede beceri değerlendirmesi yapılmış meslek, geçerli olumlu beceri değerlendirmesi, en az Competent İngilizce, en az 65 İçişleri puanı.",
    zh: "州提名的内政部基本要求：未满 45 岁，职业经技能评估且在相关清单上，有效的正面技能评估，至少 Competent 英语，至少 65 个内政部积分。",
  },
  "Priority income level (needed for Gold/Green/Orange-Plus tiers): $57,000/year or $28.85/hour base rate, excluding overtime, penalties, bonuses or casual loading.": {
    tr: "Öncelikli gelir düzeyi (Gold/Green/Orange-Plus kademeleri için gerekli): yıllık $57.000 veya saatlik $28,85 temel ücret; fazla mesai, cezalar, primler veya geçici (casual) ek ödeme hariç.",
    zh: "优先收入水平（金牌/绿牌/橙牌加级所需）：基本工资年薪 $57,000 或时薪 $28.85，不含加班费、罚金、奖金或临时工加成。",
  },
  "Higher wage tiers used in priority scoring: $71,480/yr ($36.17/hr), $79,423/yr ($40.19/hr) -- the Temporary Skilled Migration Income Threshold -- and $106,600/yr ($53.95/hr).": {
    tr: "Öncelik puanlamasında kullanılan daha yüksek ücret kademeleri: yıllık $71.480 (saatlik $36,17), yıllık $79.423 (saatlik $40,19) -- Geçici Nitelikli Göç Gelir Eşiği -- ve yıllık $106.600 (saatlik $53,95).",
    zh: "优先评分所用的更高工资档次：年薪 $71,480（时薪 $36.17）、年薪 $79,423（时薪 $40.19）——即临时技术移民收入门槛——以及年薪 $106,600（时薪 $53.95）。",
  },
  "Five pass tiers ranked by priority attributes: Gold (1000 pts, immediate nomination), Green (500/300/250 pts, invited within ~6 months), Orange-Plus (30-100 pts, high priority within the Orange band), Orange (lower point attributes), Red (does not meet minimum requirements, cannot apply).": {
    tr: "Öncelik özelliklerine göre sıralanmış beş geçiş kademesi: Gold (1000 puan, hemen aday gösterme), Green (500/300/250 puan, yaklaşık 6 ay içinde davet), Orange-Plus (30-100 puan, Orange bandı içinde yüksek öncelik), Orange (daha düşük puanlı özellikler), Red (asgari şartları karşılamaz, başvuramaz).",
    zh: "按优先属性排序的五个通过等级：Gold（1000 分，立即提名）、Green（500/300/250 分，约 6 个月内邀请）、Orange-Plus（30-100 分，Orange 档内高优先级）、Orange（较低分属性）、Red（不符合最低要求，无法申请）。",
  },
  "Tasmanian Skilled Employment (TSE): requires 6-15 months (subclass 190) or 9-12 months (subclass 491) working in Tasmania at 20+ hrs/week, generally in a role matching the skills assessment, at or above the priority income level for the higher tiers.": {
    tr: "Tasmanian Skilled Employment (TSE): Tasmanya'da haftada 20+ saat çalışarak 6-15 ay (subclass 190) veya 9-12 ay (subclass 491), genellikle beceri değerlendirmesiyle eşleşen bir görevde; üst kademeler için öncelikli gelir düzeyinde veya üzerinde.",
    zh: "塔斯马尼亚技术就业（TSE）：要求在塔斯马尼亚每周工作 20 小时以上，190 子类 6-15 个月，491 子类 9-12 个月，通常在与技能评估相符的职位上；较高等级需达到或高于优先收入水平。",
  },
  "Tasmanian Skilled Graduate (TSG): all skills assessments eligible; requires a CRICOS-registered Tasmanian course (92 weeks min for 190, 40 weeks for 491), full-time on-site study, and 1-2 years living in Tasmania depending on subclass.": {
    tr: "Tasmanian Skilled Graduate (TSG): tüm beceri değerlendirmeleri uygundur; CRICOS kayıtlı bir Tasmanya kursu (190 için en az 92 hafta, 491 için 40 hafta), tam zamanlı yerinde eğitim ve subclass'a göre Tasmanya'da 1-2 yıl yaşama gerektirir.",
    zh: "塔斯马尼亚技术毕业生（TSG）：所有技能评估均可；要求就读 CRICOS 注册的塔斯马尼亚课程（190 至少 92 周，491 至少 40 周），全日制现场学习，并按子类在塔斯马尼亚居住 1-2 年。",
  },
  "Tasmanian Established Resident (TER): requires 2-3 years living in Tasmania (max 50% of total Australian residence elsewhere) plus qualifying employment, remote work (190 only), or a profitable Tasmanian business.": {
    tr: "Tasmanian Established Resident (TER): Tasmanya'da 2-3 yıl yaşama (Avustralya'daki toplam ikametin en fazla %50'si başka yerde) ile birlikte nitelikli istihdam, uzaktan çalışma (yalnızca 190) veya kârlı bir Tasmanya işletmesi gerektirir.",
    zh: "塔斯马尼亚长期居民（TER）：要求在塔斯马尼亚居住 2-3 年（在澳大利亚其他地方的居住时间不超过总居住时间的 50%），并有符合条件的就业、远程工作（仅 190）或盈利的塔斯马尼亚企业。",
  },
  "Tasmanian Business Operator (TBO, 491 only): 12+ months operating a Tasmanian business, in profit after paying yourself at least 85% of the Temporary Skilled Migration Income Threshold (currently $67,509).": {
    tr: "Tasmanian Business Operator (TBO, yalnızca 491): Tasmanya'da 12+ ay işletme yürütme; kendinize Geçici Nitelikli Göç Gelir Eşiği'nin en az %85'ini (şu anda $67.509) ödedikten sonra kârda olma.",
    zh: "塔斯马尼亚企业经营者（TBO，仅 491）：在塔斯马尼亚经营企业 12 个月以上，在向自己支付至少临时技术移民收入门槛的 85%（目前为 $67,509）后仍盈利。",
  },
  "Overseas Applicant (Health/Education job-offer) pathway: automatic Gold Pass for skills-assessed teachers, health/allied-health/medical/nursing professionals (ANZSCO 241/251/252/253/254) with a genuine 30+ hr/week Tasmanian job offer in a matching role.": {
    tr: "Overseas Applicant (Sağlık/Eğitim iş teklifi) yolu: eşleşen bir görevde Tasmanya'da gerçek, haftada 30+ saatlik iş teklifi olan, becerisi değerlendirilmiş öğretmenler ile sağlık/yardımcı sağlık/tıp/hemşirelik uzmanları (ANZSCO 241/251/252/253/254) için otomatik Gold Pass.",
    zh: "海外申请人（卫生/教育工作邀约）途径：对经技能评估的教师、卫生/辅助卫生/医疗/护理专业人员（ANZSCO 241/251/252/253/254），如有在塔斯马尼亚相符职位上每周 30 小时以上的真实工作邀约，自动获得 Gold Pass。",
  },
  "General offshore-only subclass 491 pathway is currently NOT open -- Migration Tasmania is not issuing invitations under it for the 2026-27 program year.": {
    tr: "Genel, yalnızca yurt dışı subclass 491 yolu şu anda AÇIK DEĞİLDİR -- Migration Tasmania 2026-27 program yılı için bu yol kapsamında davet göndermemektedir.",
    zh: "一般的仅限境外 491 子类途径目前未开放——Migration Tasmania 在 2026-27 项目年度不通过该途径发出邀请。",
  },
  "Nomination application fee: AU$387 (plus 10% GST), non-refundable. Once invited, applicants have 28 days to apply for nomination and, once nominated, 60 days to apply for the visa.": {
    tr: "Aday gösterme başvuru ücreti: AU$387 (artı %10 GST), iade edilmez. Davet edildikten sonra başvuru sahiplerinin adaylık için başvurmak üzere 28 günü, aday gösterildikten sonra vizeye başvurmak için 60 günü vardır.",
    zh: "提名申请费：AU$387（另加 10% GST），不可退还。获邀后，申请人有 28 天申请提名，获提名后有 60 天申请签证。",
  },
  "2-year commitment to live and work in Tasmania after nomination approval is mandatory across all pathways; subclass 491 nominees can never later be renominated for subclass 190.": {
    tr: "Aday gösterme onayından sonra Tasmanya'da yaşama ve çalışma yönünde 2 yıllık taahhüt tüm yollar için zorunludur; subclass 491 adayları daha sonra subclass 190 için yeniden aday gösterilemez.",
    zh: "所有途径均强制要求获批提名后在塔斯马尼亚居住和工作 2 年；491 子类被提名人日后不能再被提名 190 子类。",
  },
  "Mandatory documents across all pathways include: passport bio page, SkillSelect EOI, skills assessment (<=3 years old), English test (<=3 years old), 10-year CV, travel/arrival evidence, Tasmanian residence evidence, and bank statements showing Tasmanian living expenses.": {
    tr: "Tüm yollar için zorunlu belgeler şunları içerir: pasaport bilgi sayfası, SkillSelect EOI, beceri değerlendirmesi (<=3 yıllık), İngilizce sınavı (<=3 yıllık), 10 yıllık CV, seyahat/varış kanıtı, Tasmanya ikamet kanıtı ve Tasmanya yaşam giderlerini gösteren banka hesap özetleri.",
    zh: "所有途径的必备文件包括：护照资料页、SkillSelect EOI、技能评估（不超过 3 年）、英语成绩（不超过 3 年）、10 年简历、旅行/入境证明、塔斯马尼亚居住证明，以及显示塔斯马尼亚生活开支的银行流水。",
  },
  "Both the Skilled Nominated (190) and Skilled Work Regional (491) programs are closed for the 2025-26 program year -- all available nomination places have been fully allocated.": {
    tr: "Hem Skilled Nominated (190) hem de Skilled Work Regional (491) programları 2025-26 program yılı için kapalıdır -- mevcut tüm aday gösterme yerleri tamamen dağıtılmıştır.",
    zh: "技术提名（190）和技术工作区域（491）两个项目在 2025-26 项目年度均已关闭——所有可用提名名额已全部分配完毕。",
  },
  "Applications already submitted continue to be assessed; updated eligibility settings for the next program year are not yet published.": {
    tr: "Halihazırda sunulan başvurular değerlendirilmeye devam eder; sonraki program yılı için güncellenmiş uygunluk ayarları henüz yayımlanmamıştır.",
    zh: "已提交的申请继续审理；下一项目年度更新后的资格设置尚未公布。",
  },
  "Invitation-only: candidates cannot apply directly for NSW nomination.": {
    tr: "Yalnızca davetle: adaylar NSW adaylığına doğrudan başvuramaz.",
    zh: "仅限邀请：申请人不能直接申请 NSW 提名。",
  },
  "Occupation must fall within an ANZSCO unit group on the NSW Skills List (subclass 190) or the NSW Regional Skills List (subclass 491).": {
    tr: "Meslek, NSW Skills List (subclass 190) veya NSW Regional Skills List (subclass 491) üzerindeki bir ANZSCO birim grubunda yer almalıdır.",
    zh: "职业必须属于 NSW Skills List（190 子类）或 NSW Regional Skills List（491 子类）上的某个 ANZSCO 单元组。",
  },
  "Subclass 190 residency basis: working 20+ hrs/week in NSW in the nominated occupation, OR 6+ months continuous NSW residence, OR 6+ months continuous offshore residence.": {
    tr: "Subclass 190 ikamet esası: aday gösterilen meslekte NSW'de haftada 20+ saat çalışma VEYA kesintisiz 6+ ay NSW'de ikamet VEYA kesintisiz 6+ ay yurt dışında ikamet.",
    zh: "190 子类居住依据：在 NSW 从事被提名职业且每周工作 20 小时以上，或在 NSW 连续居住 6 个月以上，或在境外连续居住 6 个月以上。",
  },
  "Subclass 491 has three pathways: Pathway 1 (6+ months' current regional-NSW employment paid at least the TSMIT/CSIT rate), Pathway 2 (Investment NSW invitation, ANZSCO unit group on the NSW Regional Skills List), Pathway 3 (recent graduate of a regional NSW institution).": {
    tr: "Subclass 491'in üç yolu vardır: Yol 1 (mevcut bölgesel-NSW istihdamında 6+ ay, en az TSMIT/CSIT oranında ücretle), Yol 2 (Investment NSW daveti, NSW Regional Skills List'te yer alan ANZSCO birim grubu), Yol 3 (bölgesel bir NSW kurumunun yeni mezunu).",
    zh: "491 子类有三条途径：途径 1（目前在 NSW 偏远地区就业 6 个月以上，薪酬不低于 TSMIT/CSIT 标准），途径 2（Investment NSW 邀请，ANZSCO 单元组在 NSW Regional Skills List 上），途径 3（NSW 偏远地区院校的应届毕业生）。",
  },
  "Invitations, once issued, must be responded to within 14 days; nomination assessment typically takes about six weeks after payment.": {
    tr: "Verilen davetlere 14 gün içinde yanıt verilmelidir; adaylık değerlendirmesi, ödemeden sonra genellikle yaklaşık altı hafta sürer.",
    zh: "邀请发出后须在 14 天内回复；付款后提名审理通常约需六周。",
  },
  "No nomination fee figure is published by the state.": {
    tr: "Eyalet tarafından yayımlanmış bir aday gösterme ücreti rakamı yoktur.",
    zh: "该州未公布提名费用金额。",
  },
  "The 2025-26 Victorian skilled visa nomination program (subclasses 190 and 491) is closed -- all places have been filled (confirmed on liveinmelbourne.vic.gov.au).": {
    tr: "2025-26 Victoria nitelikli vize aday gösterme programı (subclass 190 ve 491) kapalıdır -- tüm yerler dolmuştur (liveinmelbourne.vic.gov.au'da teyit edilmiştir).",
    zh: "2025-26 年度维多利亚州技术签证提名项目（190 和 491 子类）已关闭——所有名额已满（已在 liveinmelbourne.vic.gov.au 确认）。",
  },
  "Information about the 2026-27 program has not yet been published.": {
    tr: "2026-27 programına ilişkin bilgiler henüz yayımlanmamıştır.",
    zh: "有关 2026-27 项目的信息尚未公布。",
  },
  "When open: Registration of Interest (ROI) and nomination are free of charge -- only the Department of Home Affairs visa fee applies.": {
    tr: "Açıldığında: İlgi Kaydı (ROI) ve aday gösterme ücretsizdir -- yalnızca İçişleri Bakanlığı vize ücreti uygulanır.",
    zh: "开放时：意向登记（ROI）和提名免费——仅需支付内政部签证费。",
  },
  "When open: subclass 190 has no minimum work experience or hours-of-work requirement.": {
    tr: "Açıldığında: subclass 190 için asgari iş deneyimi veya çalışma saati şartı yoktur.",
    zh: "开放时：190 子类没有最低工作经验或工作时数要求。",
  },
  "When open: subclass 491 offshore applicants are not required to claim earnings in their ROI; onshore applicants must be living and working in regional Victoria.": {
    tr: "Açıldığında: yurt dışındaki subclass 491 başvuru sahiplerinin ROI'lerinde kazanç beyan etmesi gerekmez; Avustralya'daki başvuru sahipleri bölgesel Victoria'da yaşıyor ve çalışıyor olmalıdır.",
    zh: "开放时：境外 491 子类申请人无需在 ROI 中申报收入；境内申请人必须在维多利亚州偏远地区生活和工作。",
  },
  "Occupation must be on the Australian Government's own eligible skilled occupation list -- Victoria does not maintain a separate state list (unlike NSW/SA/WA).": {
    tr: "Meslek, Avustralya Hükümeti'nin kendi nitelikli meslek listesinde yer almalıdır -- Victoria ayrı bir eyalet listesi tutmaz (NSW/SA/WA'nın aksine).",
    zh: "职业必须在澳大利亚联邦政府自己的合资格技术职业清单上——维多利亚州没有单独的州清单（不同于 NSW/SA/WA）。",
  },
  "DHA baseline applies: under 45, at least Competent English, valid skills assessment, at least 65 points.": {
    tr: "İçişleri Bakanlığı temel şartları geçerlidir: 45 yaşın altı, en az Competent İngilizce, geçerli beceri değerlendirmesi, en az 65 puan.",
    zh: "适用内政部基本要求：未满 45 岁，至少 Competent 英语，有效技能评估，至少 65 分。",
  },
  "Registrations of Interest for the 2025-26 State Nominated Migration Program (SNMP) are closed across all pathways: general offshore, building & construction, university graduates, small business owners, and the National Innovation Visa (subclass 858).": {
    tr: "2025-26 Eyalet Adaylıklı Göç Programı (SNMP) için İlgi Kayıtları tüm yollarda kapalıdır: genel yurt dışı, inşaat, üniversite mezunları, küçük işletme sahipleri ve National Innovation Visa (subclass 858).",
    zh: "2025-26 年度州提名移民计划（SNMP）的意向登记在所有途径均已关闭：一般境外、建筑、大学毕业生、小企业主，以及国家创新签证（858 子类）。",
  },
  "2026-27 program settings, eligibility criteria and an opening date have not yet been published.": {
    tr: "2026-27 program ayarları, uygunluk ölçütleri ve açılış tarihi henüz yayımlanmamıştır.",
    zh: "2026-27 项目设置、资格标准和开放日期尚未公布。",
  },
  "Covers subclass 190 (permanent) and subclass 491 (provisional, regional); a dedicated pathway nominates small business owners in regional Queensland for subclass 491 only.": {
    tr: "Subclass 190 (kalıcı) ve subclass 491'i (geçici, bölgesel) kapsar; ayrılmış bir yol, bölgesel Queensland'daki küçük işletme sahiplerini yalnızca subclass 491 için aday gösterir.",
    zh: "涵盖 190 子类（永久）和 491 子类（临时，偏远地区）；另有专门途径仅为 491 子类提名昆士兰偏远地区的小企业主。",
  },
  "Residency/employment test when open: 6 months living and working in regional Queensland (491) or 9 months in Queensland (190), at 20+ hrs/week, after completing the relevant qualification, in the nominated occupation or one sharing its first 3 ANZSCO digits.": {
    tr: "Açıkken ikamet/istihdam testi: ilgili yeterliliğin tamamlanmasından sonra, aday gösterilen meslekte veya ilk 3 ANZSCO hanesini paylaşan bir meslekte, haftada 20+ saat, bölgesel Queensland'da 6 ay yaşama ve çalışma (491) veya Queensland'da 9 ay (190).",
    zh: "开放时的居住/就业测试：在完成相关学历后，在昆士兰偏远地区居住和工作 6 个月（491）或在昆士兰 9 个月（190），每周 20 小时以上，职业为被提名职业或前 3 位 ANZSCO 代码相同的职业。",
  },
  "Small Business Owner pathway: ROIs closed for 2025-26; businesses purchased after 19 September 2025 are not eligible under Pathway 2 at all.": {
    tr: "Small Business Owner yolu: ROI'ler 2025-26 için kapalıdır; 19 Eylül 2025'ten sonra satın alınan işletmeler Yol 2 kapsamında hiç uygun değildir.",
    zh: "小企业主途径：2025-26 年度 ROI 已关闭；2025 年 9 月 19 日之后购买的企业完全不符合途径 2 的条件。",
  },
  "Covers subclass 190 (5 extra DHA points) and subclass 491 (15 extra DHA points); invitations sent on an ongoing basis throughout 2025-26.": {
    tr: "Subclass 190 (5 ek İçişleri puanı) ve subclass 491'i (15 ek İçişleri puanı) kapsar; davetler 2025-26 boyunca sürekli olarak gönderilir.",
    zh: "涵盖 190 子类（额外 5 个内政部积分）和 491 子类（额外 15 个内政部积分）；2025-26 年度全年持续发出邀请。",
  },
  "2025-26 priority sectors for subclass 190 eligibility: Building & Construction, Defence, Education, Engineering, Health, Manufacturing -- other sectors are generally directed to subclass 491 (or considered if high-ranking).": {
    tr: "Subclass 190 uygunluğu için 2025-26 öncelikli sektörler: İnşaat, Savunma, Eğitim, Mühendislik, Sağlık, İmalat -- diğer sektörler genellikle subclass 491'e yönlendirilir (veya üst sıradaysa değerlendirilir).",
    zh: "2025-26 年度 190 子类资格的优先行业：建筑、国防、教育、工程、卫生、制造——其他行业通常被引导至 491 子类（或在排名靠前时予以考虑）。",
  },
  "Nomination is described as 'highly competitive'; ranking factors include English proficiency, years of skilled experience, qualification level, salary and employer assessment.": {
    tr: "Aday gösterme 'son derece rekabetçi' olarak tanımlanır; sıralama etkenleri arasında İngilizce yeterliliği, nitelikli deneyim yılları, yeterlilik düzeyi, maaş ve işveren değerlendirmesi yer alır.",
    zh: "提名被描述为“竞争非常激烈”；排序因素包括英语水平、技术工作年限、学历水平、薪资和雇主评估。",
  },
  "Skilled Employment in South Australia stream (onshore only): 12+ months SA residence AND 12+ months current full-time (30+ hrs/week) employment in the same ANZSCO Sub Major Group as the nominated occupation.": {
    tr: "Güney Avustralya'da Nitelikli İstihdam akışı (yalnızca Avustralya'da bulunanlar): 12+ ay SA'da ikamet VE aday gösterilen meslekle aynı ANZSCO Alt Ana Grubunda 12+ aydır mevcut tam zamanlı (haftada 30+ saat) istihdam.",
    zh: "南澳大利亚技术就业通道（仅限境内）：在南澳居住 12 个月以上，并且在与被提名职业相同的 ANZSCO 次大类中当前全职（每周 30 小时以上）就业 12 个月以上。",
  },
  "Occupation must be on the South Australian Skilled Occupation List and eligible for the relevant subclass.": {
    tr: "Meslek, South Australian Skilled Occupation List'te yer almalı ve ilgili subclass için uygun olmalıdır.",
    zh: "职业必须在南澳大利亚技术职业清单上，且符合相关子类的要求。",
  },
  "SA's published information shows no allocation-exhausted, closure, or suspension notice for nomination, subclass 190, or subclass 491.": {
    tr: "SA'nın yayımlanmış bilgilerinde aday gösterme, subclass 190 veya subclass 491 için kontenjanın tükendiğine, kapatıldığına veya askıya alındığına dair bir duyuru yoktur.",
    zh: "南澳公布的信息显示，没有关于提名、190 子类或 491 子类名额用尽、关闭或暂停的通知。",
  },
  "No nomination fee figure is published -- only that 'application fees paid are not refundable'.": {
    tr: "Aday gösterme ücreti rakamı yayımlanmamıştır -- yalnızca 'ödenen başvuru ücretlerinin iade edilmediği' belirtilmiştir.",
    zh: "未公布提名费用金额——仅说明“已缴申请费不予退还”。",
  },
  "Covers subclass 190 and subclass 491 via a General stream (WASMOL Schedule 1/2 occupation lists) and a Graduate stream (Graduate Occupation List, GOL).": {
    tr: "Subclass 190 ve 491'i, bir Genel akış (WASMOL Schedule 1/2 meslek listeleri) ve bir Mezun akışı (Graduate Occupation List, GOL) üzerinden kapsar.",
    zh: "通过一般通道（WASMOL Schedule 1/2 职业清单）和毕业生通道（Graduate Occupation List，GOL）涵盖 190 和 491 子类。",
  },
  "Both onshore (WA-resident) and offshore (interstate/overseas) candidates are eligible; ranking prioritises WA residents, then priority-industry occupations (building & construction, healthcare & social assistance, hospitality & tourism, education & training), then all other sectors, then EOI points, then submission date.": {
    tr: "Hem Avustralya'da bulunan (WA sakini) hem de yurt dışındaki (eyaletler arası/yurt dışı) adaylar uygundur; sıralama önce WA sakinlerine, sonra öncelikli sektör mesleklerine (inşaat, sağlık ve sosyal yardım, konaklama ve turizm, eğitim), sonra diğer tüm sektörlere, ardından EOI puanına ve başvuru tarihine öncelik verir.",
    zh: "境内（WA 居民）和境外（外州/海外）申请人均可；排序优先考虑 WA 居民，其次是优先行业职业（建筑、医疗保健与社会援助、酒店与旅游、教育与培训），再其次是所有其他行业，然后是 EOI 积分，最后是提交日期。",
  },
  "Minimum work experience: at least 1 year of Australian OR overseas work experience in the nominated (or closely related) occupation within the last 10 years.": {
    tr: "Asgari iş deneyimi: son 10 yıl içinde aday gösterilen (veya yakından ilişkili) meslekte en az 1 yıl Avustralya VEYA yurt dışı iş deneyimi.",
    zh: "最低工作经验：在过去 10 年内，在被提名（或密切相关）职业中至少有 1 年澳大利亚或海外工作经验。",
  },
  "Nomination application fee: AUD $200, non-refundable; applicants have 28 calendar days to lodge the application once invited.": {
    tr: "Aday gösterme başvuru ücreti: AUD $200, iade edilmez; davet edildikten sonra başvuru sahiplerinin başvuruyu yapmak için 28 takvim günü vardır.",
    zh: "提名申请费：AUD $200，不可退还；获邀后申请人有 28 个日历日递交申请。",
  },
  "Invitations are anticipated monthly; WA's published invitation data (as of 22 Aug 2026) records actual invitation activity through 16/05/2026 for General-stream trades (e.g. Electrician (General), 65 points).": {
    tr: "Davetlerin aylık yapılması beklenmektedir; WA'nın yayımlanmış davet verileri (22 Ağustos 2026 itibarıyla), Genel akıştaki meslekler için (ör. Electrician (General), 65 puan) 16/05/2026'ya kadar fiilî davet faaliyetini kaydeder.",
    zh: "预计每月发出邀请；WA 公布的邀请数据（截至 2026 年 8 月 22 日）记录了一般通道职业（如 Electrician (General)，65 分）截至 2026 年 5 月 16 日的实际邀请情况。",
  },
  "2025-26 program-to-date total: 8,162 invitations issued across General and Graduate streams, General/Graduate x 190/491 (per the 'Invitations issued' chart, latest full month March 2026).": {
    tr: "2025-26 programı-bugüne toplam: Genel ve Mezun akışlarında, Genel/Mezun x 190/491 olmak üzere toplam 8.162 davet verilmiştir ('Invitations issued' grafiğine göre, en son tam ay Mart 2026).",
    zh: "2025-26 项目年度累计：一般和毕业生通道共发出 8,162 份邀请，涵盖一般/毕业生 x 190/491（依据“Invitations issued”图表，最近完整月份为 2026 年 3 月）。",
  },
  "If an EOI seeks nomination for both subclass 190 and 491, WA generally invites for subclass 491 first (typically a higher EOI points score).": {
    tr: "Bir EOI hem subclass 190 hem de 491 için aday gösterilmeyi talep ediyorsa, WA genellikle önce subclass 491 için davet eder (tipik olarak daha yüksek EOI puanı).",
    zh: "如果 EOI 同时寻求 190 和 491 子类提名，WA 通常先邀请 491 子类（通常 EOI 积分更高）。",
  },
};

export function localizeStateFact(locale: Locale, en: string): string {
  const t = STATE_NOTE_TRANSLATIONS[en] ?? KEY_FACTS[en];
  if (!t) return en;
  return locale === "tr" ? t.tr : locale === "zh-Hans" ? t.zh : en;
}
