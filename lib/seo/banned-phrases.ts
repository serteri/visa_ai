/**
 * Wording an information page must not carry (occupation pages, and the scan of the points calculator): eligibility
 * verdicts, recommendations, directives about visa steps, readiness / strategy / "chances" framing, upsell unlocks.
 * Every locale.
 */
export const BANNED_INFORMATION_PAGE_PHRASES: Array<{ id: string; re: RegExp }> = [
  { id: "eligib*", re: /eligib/i },
  { id: "you qualify / qualified for", re: /\byou (?:may |might |will |can )?qualif|\bqualif(?:y|ies|ied) for\b/i },
  { id: "best", re: /\bbest\b/i },
  { id: "recommend*", re: /recommend/i },
  { id: "chances", re: /\b(?:your )?chances?\b/i },
  { id: "readiness", re: /readiness|\bready to\b/i },
  { id: "strategy", re: /\bstrateg(?:y|ies)\b/i },
  { id: "you should / you must / you need", re: /\byou (?:should|must|need to|ought)\b/i },
  { id: "check your / find out", re: /\bcheck your\b|\bfind out\b|\btry a fast\b/i },
  { id: "unlock / upsell", re: /\bunlock\b/i },
  { id: "apply now / start your", re: /\bapply (?:now|today)\b|\bstart your\b/i },
  { id: "AI-powered", re: /\bAI[- ](?:powered|check|analysis)\b/i },
  { id: "tr: uygunluk / öneri / hazırlık / strateji", re: /uygunluk|uygun olup|\böner|hazırlık|hazirlik|strateji|şansınız|sansiniz|kontrol edin|inceleyin|\bkilid/i },
  { id: "zh: 资格 / 建议 / 准备度 / 策略 / 机会", re: /资格|建议|推荐|准备度|策略|机会|是否适合|你的.{0,4}路径|解锁|立即|检查你的/ },
];

export function findBannedPhrases(text: string): string[] {
  return BANNED_INFORMATION_PAGE_PHRASES.filter((p) => p.re.test(text)).map((p) => p.id);
}
