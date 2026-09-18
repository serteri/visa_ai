import type { Locale } from "../types";
import { CURRENT_CSIT } from "../constants";

type Country = "AU" | "CA";

interface UserProfile {
  name?: string;
  occupation?: string;
  age?: string;
  englishLevel?: string;
  mainGoal?: string;
  currentCountry?: string;
}

/**
 * Country-appropriate name for "the thing blocking EOI lodgement" and
 * whether the AU-style fixed-points-threshold framing applies at all.
 *
 * AU: a positive Skills Assessment is a real, named legal requirement (DHA),
 * separate from and in addition to the fixed 65-point EOI threshold.
 *
 * CA: there is no "Skills Assessment" concept in Express Entry, and no
 * fixed minimum CRS score required to create a profile -- invitation
 * cutoffs vary by draw (see the Historical Invitation Trends section for
 * recent cutoffs). The one real CA hard gate modeled today (see engine.ts's
 * buildCanadaPointsEstimate) is a valid language test result -- CEC/FSW/FSTP
 * all require one to create a profile at all.
 */
function blockingRequirementNoun(country: Country, locale: Locale): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  if (country === "CA") {
    return isTr ? "geçerli bir dil testi sonucu" : isZh ? "有效的语言考试成绩" : "a valid language test result";
  }
  return isTr ? "olumlu bir Beceri Değerlendirmesi" : isZh ? "积极的技能评估结果" : "a positive Skills Assessment";
}

/**
 * Generates a PERSONALIZED executive overview for the PDF.
 * This is the first thing the user sees — it must be compelling and specific.
 */
export function getPersonalizedOverview(
  locale: Locale,
  country: Country,
  profile: UserProfile,
  estimatedPoints: number,
  threshold: number,
  targetVisa: string,
  skillsAssessmentDone: boolean,
  matchPercentage?: number,
  migrationGoals?: string[],
  annualSalary?: string,
  /**
   * Canonical assessmentState.isEoiEligible -- broader than
   * skillsAssessmentDone (also covers age/English/points blocks for AU, and
   * is the ONLY meaningful blocking signal for CA, which has no skills
   * assessment concept). Optional for backward compatibility with existing
   * call sites; when omitted, falls back to skillsAssessmentDone && gap <= 0
   * for AU (CA callers should always pass this explicitly).
   */
  isEoiEligible?: boolean,
): {
  title: string;
  userName: string;
  executiveSummary: string[];
  keyFindings: string[];
  recommendation: string;
  confidenceNote: string;
  riskAssessment: string[];
  nextMilestones: string[];
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const isCA = country === "CA";
  const name = profile.name || (isTr ? "Değerli Başvuru Sahibi" : isZh ? "尊敬的申请人" : "Applicant");
  const gap = threshold - estimatedPoints;
  const blockingNoun = blockingRequirementNoun(country, locale);
  // AU: skillsAssessmentDone is the specific legal requirement, checked in
  // addition to the points threshold. CA: there is no separate "assessment"
  // step -- isEoiEligible (language-test gate) IS the whole story, so use it
  // directly rather than the AU-only skillsAssessmentDone signal (which is
  // always false for CA, since occupationConfirmed isn't a CA form field).
  const requirementMet = isCA ? (isEoiEligible ?? true) : skillsAssessmentDone;

  // ── Title ─────────────────────────────────────────────────────────────
  const title = isTr
    ? `${name} — Hazırlık Raporu Özeti`
    : isZh
      ? `${name} — 准备报告摘要`
      : `${name} — Readiness Report Summary`;

  // ── Executive Summary (goal-adaptive) ────────────────────────────────
  const goals = migrationGoals ?? [];
  const hasDirectPR = goals.includes("direct_pr");
  const hasEmployer = goals.includes("employer_sponsorship");
  const hasRegional = goals.includes("regional");

  // Goal-specific opening paragraph
  let goalIntro: string;
  if (goals.length === 0) {
    // Fallback: generic
    goalIntro = isTr
      ? `${name}, bu rapor ${profile.occupation || 'mesleğiniz'} mesleğindeki profilinizi ${country === 'AU' ? 'Avustralya' : 'Kanada'} göçmenlik sistemine göre değerlendirmektedir.`
      : isZh
        ? `${name}，本报告根据${country === 'AU' ? '澳大利亚' : '加拿大'}移民系统评估您在${profile.occupation || '您选择的'}职业方面的档案。`
        : `${name}, this report evaluates your profile for ${profile.occupation || 'your occupation'} against the ${country === 'AU' ? 'Australian' : 'Canadian'} immigration system.`;
  } else {
    const goalNames: string[] = [];
    if (isCA) {
      // CA has no 189/190/491/482/186 subclasses -- name the actual
      // Express Entry programs and PNP instead of AU visa codes.
      if (hasDirectPR) goalNames.push(isTr ? "Express Entry kalıcı oturum (CEC/FSW/FSTP)" : isZh ? "Express Entry 永久居留（CEC/FSW/FSTP）" : "permanent residency via Express Entry (CEC/FSW/FSTP)");
      if (hasEmployer) goalNames.push(isTr ? "işveren destekli yollar (LMIA / PNP)" : isZh ? "雇主相关途径（LMIA / 省提名）" : "employer-linked pathways (LMIA / PNP)");
      if (hasRegional) goalNames.push(isTr ? "eyalet adaylığı (PNP)" : isZh ? "省提名（PNP）" : "provincial nomination (PNP)");
    } else {
      if (hasDirectPR) goalNames.push(isTr ? "bağımsız/eyalet adaylığı kalıcı oturum (189/190)" : isZh ? "独立/州担保永久居留(189/190)" : "permanent residency via skilled migration (189/190)");
      if (hasEmployer) goalNames.push(isTr ? "işveren sponsorluğu (482/186)" : isZh ? "雇主担保(482/186)" : "employer sponsorship (482/186)");
      if (hasRegional) goalNames.push(isTr ? "bölgesel yol (491)" : isZh ? "偏远地区路径(491)" : "regional pathway (491)");
    }
    const goalStr = goalNames.join(isTr ? " ve " : isZh ? "和" : " and ");

    goalIntro = isTr
      ? `${name}, bu rapor ${profile.occupation || 'mesleğiniz'} mesleğinizle ilgili ${goalStr} seçeneklerini değerlendirmektedir.`
      : isZh
        ? `${name}，本报告评估您的${profile.occupation || '所选'}职业在${goalStr}方面的可行性。`
        : `${name}, this report evaluates ${profile.occupation || 'your occupation'} for ${goalStr}.`;
  }

  // ── Score / threshold framing ───────────────────────────────────────
  // AU has a real, fixed 65-point EOI minimum (POINTS_THRESHOLD). CA's
  // Express Entry has NO fixed minimum CRS score to create a profile --
  // invitation cutoffs vary by draw (see the report's Historical Invitation
  // Trends section for recent cutoffs). Presenting a fixed "target: 65
  // points" / "gap to threshold" for CA would be factually wrong, not just
  // mislabeled -- so CA gets a structurally different sentence here instead
  // of a country ternary on the same AU-shaped claim.
  const scoreLine = isCA
    ? (isTr
        ? `Tahmini CRS puanınız ${estimatedPoints}. Express Entry'de profil oluşturmak için sabit bir asgari puan yoktur -- davet eşikleri her turda değişir; yakın dönem eşikler için bu rapordaki Tarihsel Davet Trendleri bölümüne bakın.`
        : isZh
          ? `您的预估 CRS 分数为 ${estimatedPoints} 分。创建 Express Entry 档案没有固定的最低分数要求——邀请门槛因每轮抽签而异；近期门槛请参阅本报告的历史邀请趋势部分。`
          : `Your estimated CRS score is ${estimatedPoints}. There is no fixed minimum score required to create an Express Entry profile -- invitation cutoffs vary by draw; see this report's Historical Invitation Trends section for recent cutoffs.`)
    : (isTr
        ? `Tahmini puanınız ${estimatedPoints} puandır. ${targetVisa} vizesi için gereken minimum baraj ${threshold} puandır.`
        : isZh
          ? `您的预估积分为${estimatedPoints}分。${targetVisa}签证的最低门槛为${threshold}分。`
          : `Your estimated score is ${estimatedPoints} points. The minimum threshold for ${targetVisa} is ${threshold} points.`);

  const requirementSentence = isTr
    ? `Potansiyel puanınız ${estimatedPoints}. Ancak EOI başvurusu yapmadan önce ${blockingNoun} yasal olarak zorunludur. Öncelikli adımınız, bu gereksinimi karşılamaktır.`
    : isZh
      ? `您的潜在积分为${estimatedPoints}。但是，在提交EOI之前，法律要求必须提供${blockingNoun}。您当前的首要任务是满足该要求。`
      : `Your potential score is ${estimatedPoints}. However, ${blockingNoun} is legally required before lodging an EOI. Your immediate priority is meeting this requirement.`;

  const executiveSummary: string[] = isCA
    ? [
        goalIntro,
        scoreLine,
        requirementMet
          ? (isTr
              ? `Dil testi gereksinimini karşıladınız. Şimdi Express Entry havuzunuzu güçlendirmeye ve davet almaya odaklanabilirsiniz.`
              : isZh
                ? `您已满足语言测试要求。现在可以专注于提升您的 Express Entry 分数池排名并获得邀请。`
                : `You meet the language test requirement. You can now focus on strengthening your Express Entry pool ranking and receiving an invitation.`)
          : (isTr
              ? `EOI/profil oluşturmadan önce ${blockingNoun} zorunludur. Öncelikli adımınız bu gereksinimi karşılamaktır.`
              : isZh
                ? `在创建 Express Entry 档案之前，${blockingNoun}是法律强制要求。您当前的首要任务是满足该要求。`
                : `${blockingNoun[0].toUpperCase()}${blockingNoun.slice(1)} is legally required before creating an Express Entry profile. Your immediate priority is meeting this requirement.`),
      ]
    : [
        goalIntro,
        scoreLine,
        gap > 0
          ? (isTr
              ? `Puan barajının ${gap} puan altındasınız. Ancak puanınızı artırmak için net yollar mevcuttur.`
              : isZh
                ? `您距离积分门槛还差${gap}分。但提高积分的明确途径是存在的。`
                : `You are ${gap} points below the threshold. However, clear pathways to improve your score exist.`)
          // Hard gate: a score at/above threshold is NOT a congratulatory result
          // on its own -- without a positive Skills Assessment, DHA won't accept
          // an EOI at any score, so "you can now focus on the application
          // process" would be legally false. requirementMet takes priority
          // over the points comparison here.
          : !requirementMet
            ? requirementSentence
            // gap === 0 means estimatedPoints === threshold exactly -- "exceeded"
            // is mathematically wrong for that case (65/65 is met, not exceeded).
            : gap === 0
              ? (isTr
                  ? `Minimum puan barajını karşıladınız! Şimdi başvuru sürecine odaklanabilirsiniz.`
                  : isZh
                    ? `您已达到最低积分门槛！现在可以专注于申请流程。`
                    : `You have met the minimum points threshold! You can now focus on the application process.`)
              : (isTr
                  ? `Puan barajını aştınız! Şimdi başvuru sürecine odaklanabilirsiniz.`
                  : isZh
                    ? `您已超过积分门槛！现在可以专注于申请流程。`
                    : `You have exceeded the threshold! You can now focus on the application process.`),
      ];

  // ── Key Findings ──────────────────────────────────────────────────────
  const keyFindings: string[] = [];

  // Blocking requirement (Skills Assessment for AU, language test for CA)
  keyFindings.push(
    isCA
      ? (requirementMet
          ? (isTr ? "✅ Dil testi gereksinimi karşılandı." : isZh ? "✅ 已满足语言测试要求。" : "✅ Language test requirement met.")
          : (isTr ? "❌ Geçerli bir dil testi sonucu sunulmadı — bu zorunlu bir adımdır." : isZh ? "❌ 未提交有效的语言考试成绩——这是必要步骤。" : "❌ No valid language test result submitted — this is a mandatory step."))
      : (skillsAssessmentDone
          ? (isTr ? "✅ Beceri değerlendirmesi tamamlandı." : isZh ? "✅ 技能评估已完成。" : "✅ Skills assessment completed.")
          : (isTr ? "❌ Beceri değerlendirmesi henüz yapılmadı — bu zorunlu bir adımdır." : isZh ? "❌ 技能评估尚未完成——这是必要步骤。" : "❌ Skills assessment not yet completed — this is a mandatory step.")),
  );

  // English level
  if (profile.englishLevel) {
    const isStrong = /superior|advanced|79|8\.0|clb9|clb10/i.test(profile.englishLevel);
    keyFindings.push(
      isStrong
        ? (isTr ? "✅ Güçlü dil seviyesi — ekstra puan kazanıyorsunuz." : isZh ? "✅ 语言水平较高——可获得额外积分。" : "✅ Strong English level — earning extra points.")
        : (isTr ? "⚠️ Dil seviyenizi yükseltmek +20 puana kadar kazandırabilir." : isZh ? "⚠️ 提高语言分数可获得最多+20分加分。" : "⚠️ Upgrading English could earn up to +20 more points."),
    );
  }

  // Salary viability -- AU-only CSIT (Core Skills Income Threshold, subclass
  // 482/186) has no CA equivalent modeled here. CA's employer-linked route
  // (LMIA) uses province/occupation-specific wage floors, not a single
  // national AUD-denominated figure, and the product doesn't collect enough
  // to state one accurately -- so this bullet simply doesn't apply to CA
  // rather than showing an AUD figure against a Canadian salary.
  if (!isCA && annualSalary && hasEmployer) {
    const salaryNum = Number(annualSalary);
    if (Number.isFinite(salaryNum) && salaryNum > 0) {
      const meetsCsit = salaryNum >= CURRENT_CSIT.value;
      keyFindings.push(
        meetsCsit
          ? (isTr ? `✅ Maaş (AUD $${salaryNum.toLocaleString("en-AU")}) CSIT eşiğini karşılıyor.`
              : isZh ? `✅ 薪资(AUD $${salaryNum.toLocaleString("en-AU")})已达CSIT门槛。`
              : `✅ Salary (AUD $${salaryNum.toLocaleString("en-AU")}) meets CSIT threshold.`)
          : (isTr ? `❌ Maaş (AUD $${salaryNum.toLocaleString("en-AU")}) CSIT eşiğinin altında.`
              : isZh ? `❌ 薪资(AUD $${salaryNum.toLocaleString("en-AU")})低于CSIT门槛。`
              : `❌ Salary (AUD $${salaryNum.toLocaleString("en-AU")}) is below CSIT threshold.`)
      );
    }
  }

  // Age
  if (profile.age) {
    const ageNum = parseInt(profile.age, 10);
    if (!isNaN(ageNum)) {
      keyFindings.push(
        ageNum <= 32
          ? (isTr ? "✅ Yaş puanlaması iyi durumda." : isZh ? "✅ 年龄积分状况良好。" : "✅ Age points are in good shape.")
          : ageNum <= 39
            ? (isTr ? "⚠️ Yaş puanınız orta seviyede — diğer kategorilerde telafi edin." : isZh ? "⚠️ 年龄积分中等——建议在其他类别中弥补。" : "⚠️ Age points are moderate — compensate in other categories.")
            : (isTr ? "❌ Yaş puanınız düşük — dil ve deneyim puanlarınızı artırın." : isZh ? "❌ 年龄积分较低——建议提高语言和工作经验积分。" : "❌ Age points are low — boost language and experience points."),
      );
    }
  }

  // Match percentage -- never claim a "strong profile" while EOI lodgement
  // is blocked (falls back to skillsAssessmentDone/gap when the caller
  // hasn't been updated to pass the canonical isEoiEligible flag yet).
  const eoiEligibleForMatch = isEoiEligible ?? (skillsAssessmentDone && gap <= 0);
  if (matchPercentage !== undefined) {
    keyFindings.push(
      matchPercentage >= 70 && eoiEligibleForMatch
        ? (isTr ? `✅ ${matchPercentage}% eşleşme oranı — güçlü bir profil.` : isZh ? `✅ 匹配率${matchPercentage}%——档案较强。` : `✅ ${matchPercentage}% match rate — strong profile.`)
        : matchPercentage >= 40 || !eoiEligibleForMatch
          ? (isTr ? `⚠️ ${matchPercentage}% eşleşme oranı — geliştirilebilir.` : isZh ? `⚠️ 匹配率${matchPercentage}%——有提升空间。` : `⚠️ ${matchPercentage}% match rate — improvable.`)
          : (isTr ? `❌ ${matchPercentage}% eşleşme oranı — ciddi iyileştirme gerekli.` : isZh ? `❌ 匹配率${matchPercentage}%——需要大幅改进。` : `❌ ${matchPercentage}% match rate — significant improvement needed.`),
    );
  }

  // ── Recommendation ────────────────────────────────────────────────────
  // Mirrors the executiveSummary branching above: a met/exceeded points
  // threshold (AU) or a satisfied language-test gate (CA) is NOT itself a
  // green light to apply if the OTHER country-appropriate requirement is
  // still unmet -- "proceed directly to the application process" must never
  // appear while requirementMet is false.
  const nominationLabel = isTr ? (isCA ? 'PNP adaylığı' : 'eyalet adaylığı') : isZh ? (isCA ? 'PNP省提名' : '州提名') : (isCA ? 'provincial' : 'state');
  const recommendation = isCA
    ? (requirementMet
        ? (isTr
            ? `${name}, dil testi gereksiniminizi karşıladınız. Express Entry havuz sıralamanızı güçlendirmeye ve gerekli belgeleri toplamaya odaklanın.`
            : isZh
              ? `${name}，您已满足语言测试要求。请专注于提升您的 Express Entry 分数池排名并准备所需文件。`
              : `${name}, you meet the language test requirement. Focus on strengthening your Express Entry pool ranking and gathering the required documents.`)
        : (isTr
            ? `${name}, Express Entry profili oluşturmadan önce ${blockingNoun} sunmanız zorunludur. Öncelikli adımınız bu gereksinimi karşılamaktır.`
            : isZh
              ? `${name}，在创建 Express Entry 档案之前，您必须提供${blockingNoun}。您当前的首要任务是满足该要求。`
              : `${name}, you must provide ${blockingNoun} before creating an Express Entry profile. Your immediate priority is meeting this requirement.`))
    : (gap > 0
        ? (isTr
            ? `${name}, en kritik önceliğiniz ${gap} puanlık kapatılacak. En hızlı yol: dil seviyenizi 'Superior' seviyesine çıkarmak (+20 puan) veya ${nominationLabel} almak.`
            : isZh
              ? `${name}，当务之急是弥补${gap}分的差距。最快的方法：将语言水平提高到'优秀'级别（+20分）或获得${nominationLabel}。`
              : `${name}, your top priority is closing the ${gap}-point gap. Fastest path: upgrade English to Superior (+20 pts) or obtain ${nominationLabel} nomination.`)
        : !requirementMet
          ? (isTr
              ? `${name}, potansiyel puanınız yeterli olsa da, EOI sunmadan önce ${blockingNoun} yasal olarak zorunludur. Öncelikli adımınız bu gereksinimi tamamlamaktır.`
              : isZh
                ? `${name}，尽管您的潜在积分已足够，但在提交EOI之前，法律要求必须提供${blockingNoun}。您当前的首要任务是完成该要求。`
                : `${name}, your potential score meets the threshold, but ${blockingNoun} is legally required before lodging an EOI. Your immediate priority is completing this requirement.`)
          : (isTr
              ? `${name}, profiliniz güçlü! Hemen başvuru sürecine geçebilirsiniz. Belgelerinizi toplamaya başlayın.`
              : isZh
                ? `${name}，您的档案较强！可以立即开始申请流程。请开始准备文件。`
                : `${name}, your profile is strong! You can proceed directly to the application process. Start gathering your documents.`));

  // ── Confidence Note ───────────────────────────────────────────────────
  const confidenceNote = isTr
    ? "Bu analiz, profile girdiğiniz bilgilere dayanmaktadır. Eksik bilgi, analizin doğruluğunu etkileyebilir."
    : isZh
      ? "此分析基于您输入的档案信息。信息不完整可能影响分析的准确性。"
      : "This analysis is based on the information you provided. Missing data may affect accuracy.";

  // ── Risk Assessment ───────────────────────────────────────────────────
  const requirementRiskBullet = isCA
    ? (requirementMet
        ? (isTr ? "✅ Dil testi gereksinimi karşılandı" : isZh ? "✅ 已满足语言测试要求" : "✅ Language test requirement met")
        : (isTr ? "❌ Geçerli dil testi sonucu sunulmadı" : isZh ? "❌ 未提交有效语言考试成绩" : "❌ No valid language test result submitted"))
    : (skillsAssessmentDone
        ? (isTr ? "✅ Beceri değerlendirmesi tamamlandı" : isZh ? "✅ 技能评估已完成" : "✅ Skills assessment completed")
        : (isTr ? "❌ Beceri değerlendirmesi yapılmadı" : isZh ? "❌ 技能评估未完成" : "❌ Skills assessment not done"));

  const riskAssessment = isTr
    ? [
        isCA
          ? (gap > 20 ? "⚠️ Yüksek risk: Tahmini puan düşük" : gap > 10 ? "🟡 Orta risk: Geliştirilebilir" : "✅ Düşük risk: Rekabetçi puan")
          : (gap > 20 ? "⚠️ Yüksek risk: Puan barajından uzakta" : gap > 10 ? "🟡 Orta risk: Kapatılabilir fark" : gap > 0 ? "🟢 Düşük risk: Küçük iyileştirmeler yeterli" : "✅ Düşük risk: Baraj aşıldı"),
        requirementRiskBullet,
        profile.englishLevel ? "✅ Dil kanıtı mevcut" : "❌ Dil kanıtı eksik",
      ]
    : isZh
      ? [
          isCA
            ? (gap > 20 ? "⚠️ 高风险：预估分数偏低" : gap > 10 ? "🟡 中等风险：仍有提升空间" : "✅ 低风险：分数具有竞争力")
            : (gap > 20 ? "⚠️ 高风险：距离积分门槛较远" : gap > 10 ? "🟡 中等风险：差距可弥补" : gap > 0 ? "🟢 低风险：小幅改进即可" : "✅ 低风险：已超过门槛"),
          requirementRiskBullet,
          profile.englishLevel ? "✅ 语言证明已提供" : "❌ 语言证明缺失",
        ]
      : [
          isCA
            ? (gap > 20 ? "⚠️ High risk: Estimated score is low" : gap > 10 ? "🟡 Medium risk: Room to improve" : "✅ Low risk: Competitive score")
            : (gap > 20 ? "⚠️ High risk: Far from threshold" : gap > 10 ? "🟡 Medium risk: Gap is closable" : gap > 0 ? "🟢 Low risk: Minor improvements needed" : "✅ Low risk: Threshold exceeded"),
          requirementRiskBullet,
          profile.englishLevel ? "✅ English evidence provided" : "❌ English evidence missing",
        ];

  // ── Next Milestones ───────────────────────────────────────────────────
  const nextMilestones = isCA
    ? (isTr
        ? [
            "Dil testi sonucunu edinme",
            "Express Entry profili oluşturma",
            "Davet alma (ITA)",
            "Başvuru belgelerini hazırlama",
          ]
        : isZh
          ? [
              "获取语言考试成绩",
              "创建 Express Entry 档案",
              "获得邀请（ITA）",
              "准备申请文件",
            ]
          : [
              "Obtain language test result",
              "Create Express Entry profile",
              "Receive invitation to apply (ITA)",
              "Prepare application documents",
            ])
    : (isTr
        ? [
            "Beceri değerlendirmesi tamamlama",
            "Dil testi puanını yükseltme",
            "EOI oluşturma ve sunma",
            "Davet alma",
            "Başvuru hazırlığı",
          ]
        : isZh
          ? [
              "完成技能评估",
              "提高语言分数",
              "创建并提交EOI",
              "收到邀请",
              "准备申请材料",
            ]
          : [
              "Complete skills assessment",
              "Improve English score",
              "Create and lodge EOI",
              "Receive invitation",
              "Prepare application",
            ]);

  return {
    title,
    userName: name,
    executiveSummary,
    keyFindings,
    recommendation,
    confidenceNote,
    riskAssessment,
    nextMilestones,
  };
}
