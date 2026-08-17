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
  const name = profile.name || (isTr ? "Değerli Başvuru Sahibi" : isZh ? "尊敬的申请人" : "Applicant");
  const gap = threshold - estimatedPoints;

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
    if (hasDirectPR) goalNames.push(isTr ? "bağımsız/eyalet adaylığı kalıcı oturum (189/190)" : isZh ? "独立/州担保永久居留(189/190)" : "permanent residency via skilled migration (189/190)");
    if (hasEmployer) goalNames.push(isTr ? "işveren sponsorluğu (482/186)" : isZh ? "雇主担保(482/186)" : "employer sponsorship (482/186)");
    if (hasRegional) goalNames.push(isTr ? "bölgesel yol (491)" : isZh ? "偏远地区路径(491)" : "regional pathway (491)");
    const goalStr = goalNames.join(isTr ? " ve " : isZh ? "和" : " and ");

    goalIntro = isTr
      ? `${name}, bu rapor ${profile.occupation || 'mesleğiniz'} mesleğinizle ilgili ${goalStr} seçeneklerini değerlendirmektedir.`
      : isZh
        ? `${name}，本报告评估您的${profile.occupation || '所选'}职业在${goalStr}方面的可行性。`
        : `${name}, this report evaluates ${profile.occupation || 'your occupation'} for ${goalStr}.`;
  }

  const executiveSummary: string[] = [goalIntro,

    isTr
      ? `Tahmini puanınız ${estimatedPoints} puandır. ${targetVisa} vizesi için gereken minimum baraj ${threshold} puandır.`
      : isZh
        ? `您的预估积分为${estimatedPoints}分。${targetVisa}签证的最低门槛为${threshold}分。`
        : `Your estimated score is ${estimatedPoints} points. The minimum threshold for ${targetVisa} is ${threshold} points.`,

    gap > 0
      ? (isTr
          ? `Puan barajının ${gap} puan altındasınız. Ancak puanınızı artırmak için net yollar mevcuttur.`
          : isZh
            ? `您距离积分门槛还差${gap}分。但提高积分的明确途径是存在的。`
            : `You are ${gap} points below the threshold. However, clear pathways to improve your score exist.`)
      // Hard gate: a score at/above threshold is NOT a congratulatory result
      // on its own -- without a positive Skills Assessment, DHA won't accept
      // an EOI at any score, so "you can now focus on the application
      // process" would be legally false. skillsAssessmentDone takes priority
      // over the points comparison here.
      : !skillsAssessmentDone
        ? (isTr
            ? `Potansiyel puanınız ${estimatedPoints}. Ancak EOI başvurusu yapmadan önce olumlu bir Beceri Değerlendirmesi yasal olarak zorunludur. Öncelikli adımınız, bu puanları geçerli kılmak için değerlendirmeyi almaktır.`
            : isZh
              ? `您的潜在积分为${estimatedPoints}。但是，在提交EOI之前，法律要求必须获得积极的技能评估结果。您当前的首要任务是获得该评估，以使这些积分生效。`
              : `Your potential score is ${estimatedPoints}. However, a positive Skills Assessment is legally required before lodging an EOI. Your immediate priority is to obtain this assessment to validate these points.`)
        : (isTr
            ? `Puan barajını aştınız! Şimdi başvuru sürecine odaklanabilirsiniz.`
            : isZh
              ? `您已超过积分门槛！现在可以专注于申请流程。`
              : `You have exceeded the threshold! You can now focus on the application process.`),
  ];

  // ── Key Findings ──────────────────────────────────────────────────────
  const keyFindings: string[] = [];

  // Skills assessment
  keyFindings.push(
    skillsAssessmentDone
      ? (isTr ? "✅ Beceri değerlendirmesi tamamlandı." : isZh ? "✅ 技能评估已完成。" : "✅ Skills assessment completed.")
      : (isTr ? "❌ Beceri değerlendirmesi henüz yapılmadı — bu zorunlu bir adımdır." : isZh ? "❌ 技能评估尚未完成——这是必要步骤。" : "❌ Skills assessment not yet completed — this is a mandatory step."),
  );

  // English level
  if (profile.englishLevel) {
    const isStrong = /superior|advanced|79|8\.0/i.test(profile.englishLevel);
    keyFindings.push(
      isStrong
        ? (isTr ? "✅ Güçlü dil seviyesi — ekstra puan kazanıyorsunuz." : isZh ? "✅ 语言水平较高——可获得额外积分。" : "✅ Strong English level — earning extra points.")
        : (isTr ? "⚠️ Dil seviyenizi yükseltmek +20 puana kadar kazandırabilir." : isZh ? "⚠️ 提高语言分数可获得最多+20分加分。" : "⚠️ Upgrading English could earn up to +20 more points."),
    );
  }

  // Salary viability (for employer-sponsored goals)
  if (annualSalary && hasEmployer) {
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

  // Match percentage
  if (matchPercentage !== undefined) {
    keyFindings.push(
      matchPercentage >= 70
        ? (isTr ? `✅ ${matchPercentage}% eşleşme oranı — güçlü bir profil.` : isZh ? `✅ 匹配率${matchPercentage}%——档案较强。` : `✅ ${matchPercentage}% match rate — strong profile.`)
        : matchPercentage >= 40
          ? (isTr ? `⚠️ ${matchPercentage}% eşleşme oranı — geliştirilebilir.` : isZh ? `⚠️ 匹配率${matchPercentage}%——有提升空间。` : `⚠️ ${matchPercentage}% match rate — improvable.`)
          : (isTr ? `❌ ${matchPercentage}% eşleşme oranı — ciddi iyileştirme gerekli.` : isZh ? `❌ 匹配率${matchPercentage}%——需要大幅改进。` : `❌ ${matchPercentage}% match rate — significant improvement needed.`),
    );
  }

  // ── Recommendation ────────────────────────────────────────────────────
  const recommendation = isTr
    ? gap > 0
      ? `${name}, en kritik önceliğiniz ${gap} puanlık kapatılacak. En hızlı yol: dil seviyenizi 'Superior' seviyesine çıkarmak (+20 puan) veya ${country === 'AU' ? 'eyalet adaylığı' : 'PNP adaylığı'} almak.`
      : `${name}, profiliniz güçlü! Hemen başvuru sürecine geçebilirsiniz. Belgelerinizi toplamaya başlayın.`
    : isZh
      ? gap > 0
        ? `${name}，当务之急是弥补${gap}分的差距。最快的方法：将语言水平提高到'优秀'级别（+20分）或获得${country === 'AU' ? '州提名' : 'PNP省提名'}。`
        : `${name}，您的档案较强！可以立即开始申请流程。请开始准备文件。`
      : gap > 0
        ? `${name}, your top priority is closing the ${gap}-point gap. Fastest path: upgrade English to Superior (+20 pts) or obtain ${country === 'AU' ? 'state' : 'provincial'} nomination.`
        : `${name}, your profile is strong! You can proceed directly to the application process. Start gathering your documents.`;

  // ── Confidence Note ───────────────────────────────────────────────────
  const confidenceNote = isTr
    ? "Bu analiz, profile girdiğiniz bilgilere dayanmaktadır. Eksik bilgi, analizin doğruluğunu etkileyebilir."
    : isZh
      ? "此分析基于您输入的档案信息。信息不完整可能影响分析的准确性。"
      : "This analysis is based on the information you provided. Missing data may affect accuracy.";

  // ── Risk Assessment ───────────────────────────────────────────────────
  const riskAssessment = isTr
    ? [
        gap > 20 ? "⚠️ Yüksek risk: Puan barajından uzakta" : gap > 10 ? "🟡 Orta risk: Kapatılabilir fark" : gap > 0 ? "🟢 Düşük risk: Küçük iyileştirmeler yeterli" : "✅ Düşük risk: Baraj aşıldı",
        skillsAssessmentDone ? "✅ Beceri değerlendirmesi tamamlandı" : "❌ Beceri değerlendirmesi yapılmadı",
        profile.englishLevel ? "✅ Dil kanıtı mevcut" : "❌ Dil kanıtı eksik",
      ]
    : isZh
      ? [
          gap > 20 ? "⚠️ 高风险：距离积分门槛较远" : gap > 10 ? "🟡 中等风险：差距可弥补" : gap > 0 ? "🟢 低风险：小幅改进即可" : "✅ 低风险：已超过门槛",
          skillsAssessmentDone ? "✅ 技能评估已完成" : "❌ 技能评估未完成",
          profile.englishLevel ? "✅ 语言证明已提供" : "❌ 语言证明缺失",
        ]
      : [
          gap > 20 ? "⚠️ High risk: Far from threshold" : gap > 10 ? "🟡 Medium risk: Gap is closable" : gap > 0 ? "🟢 Low risk: Minor improvements needed" : "✅ Low risk: Threshold exceeded",
          skillsAssessmentDone ? "✅ Skills assessment completed" : "❌ Skills assessment not done",
          profile.englishLevel ? "✅ English evidence provided" : "❌ English evidence missing",
        ];

  // ── Next Milestones ───────────────────────────────────────────────────
  const nextMilestones = isTr
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
        ];

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
