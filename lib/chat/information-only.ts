import type { Locale } from "@/lib/readiness/types";

/**
 * The chat is information-only, like the report. It explains published rules, requirements, fees, processes and state program
 * information with sources and dates, and it may do arithmetic on the visitor's own figures. It never says which visa, state or
 * pathway is best / recommended / most realistic / likely, never gives chances or probabilities, never tells the visitor what to do
 * ("you should", "apply", "next step"), and never says "you are eligible" / "you are not eligible".
 *
 * Three parts, all in en / tr / zh-Hans:
 *   1. INFORMATION_ONLY_RULES: the rules the system prompt carries (every chat path);
 *   2. findBannedPatterns: the detector the answer check uses;
 *   3. sanitizeAnswer: rewrites a finished answer so no banned pattern remains and the factual content stays (every rewrite is reported).
 */

export type BannedId =
  | "best_pick"
  | "recommend"
  | "chance"
  | "should"
  | "next_step"
  | "eligibility_verdict"
  | "permission"
  | "imperative"
  | "state_verdict"
  | "legal_claim"
  | "ielts_equation";

/** Ids a rewrite can carry: the banned patterns above, plus the clean-ups that are not a banned pattern. */
export type RewriteId = BannedId | "scope_line" | "general_note" | "recap_repeat" | "numbered_steps" | "state_claim" | "points_figure";

type Rule = { id: BannedId; re: Record<Locale, RegExp> };

const P = (s: string) => new RegExp(s, "iu");
// A word that starts here / ends here (letters and digits; Chinese has no word boundaries).
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";

const RULES: Rule[] = [
  {
    id: "best_pick",
    re: {
      en: P(`${B}(?:(?:the |your |a )?(?:best|ideal|optimal|strongest|top|easiest|fastest|safest|quickest|better)(?: \\w+){0,2} (?:visa|option|pathway|path|route|choice|state|bet|fit|way)|(?:most|more) (?:realistic|suitable|promising|viable|likely|achievable|feasible|appropriate)|highly recommended|good fit|strong candidate|well[- ]positioned|(?:right|suitable|ideal) (?:visa|choice|state|pathway) for you|realistic (?:option|pathway|path|route|choice))${E}`),
      tr: P(`en (?:iyi|uygun|mantıklı|gerçekçi|güçlü|kolay|hızlı|doğru|avantajlı|olası)\\p{L}*|daha (?:gerçekçi|uygun|mantıklı|avantajlı|olası)\\p{L}*|(?:ideal|en ideal) (?:vize|yol|seçenek|rota|eyalet)|güçlü (?:aday|profil)|size (?:uygun|en uygun) (?:vize|yol|seçenek|rota|eyalet)`),
      "zh-Hans": P("最(?:好|佳|适合|合适|现实|容易|快|有可能|稳妥|理想|优)|首选|更(?:现实|适合|合适|有可能)|强(?:有力的)?候选|适合(?:您|你)的(?:签证|途径|州|选择)|较好的(?:选择|途径)"),
    },
  },
  {
    id: "recommend",
    re: {
      en: P(`${B}(?:recommend\\w*|I (?:would )?(?:suggest|advise)|we (?:suggest|advise)|advisable|it is wise|you would be wise|my advice|my suggestion)${E}`),
      tr: P(`${B}(?:öner\\p{L}*|tavsiye\\p{L}*|akıllıca|salık)${E}`),
      "zh-Hans": P("推荐|建议(?:您|你|先|优先|选择|申请)|我的建议|不妨|明智"),
    },
  },
  {
    id: "chance",
    re: {
      en: P(`${B}(?:chances?|odds|probabilit\\w*|likelihood|likely|unlikely|prospects?|(?:good|poor|strong|slim|high|low|better) (?:chance|odds)|(?:will|would) (?:probably|most likely|very likely|almost certainly)|probably|in all likelihood)${E}`),
      tr: P(`${B}(?:şans\\p{L}*|olasılık\\p{L}*|ihtimal\\p{L}*|muhtemel\\p{L}*|büyük ihtimalle|olası(?:lıkla)?|yüksek olasılık\\p{L}*)${E}`),
      "zh-Hans": P("机会|几率|概率|可能性|很可能|大概率|极有可能|成功率|胜算|有望|希望很大"),
    },
  },
  {
    id: "should",
    re: {
      en: P(`${B}(?:you (?:should|ought to|had better|would be better off|are advised to|are best (?:to|off))|should you|you(?:'d| would) (?:better|want to)|you (?:may|might) want to|I(?:'d| would) (?:start|begin|go) (?:with|by)|make sure (?:you|to)|don't forget to|do not forget to)${E}`),
      tr: P(`${B}\\p{L}*(?:malısın(?:ız)?|melisin(?:iz)?|malısınız|melisiniz)${E}|yapmanız (?:gerekir|gerekiyor|gerekmektedir|lazım)|başvurmanız (?:gerekir|gerekiyor|gerekmektedir|lazım)|sizin için (?:en )?(?:doğru|iyi) (?:olan|olur)|${B}emin ol(?:un|unuz)${E}|${B}mutlaka \\p{L}+(?:ın|in|un|ün)${E}`),
      "zh-Hans": P("(?:您|你)(?:应该|应当|最好|务必|需要先|得先|可以考虑|不妨)|应该(?:先|去|申请|提交)|务必|建议(?:您|你)"),
    },
  },
  {
    id: "next_step",
    re: {
      en: P(`${B}(?:next steps?|(?:your|the) first step|first step (?:is|would be)|(?:your |the )?(?:action plan|game plan|roadmap for you)|what to do next|plan b|plan a|step[- ]by[- ]step plan)${E}`),
      tr: P(`${B}(?:(?:bir )?sonraki adım\\p{L}*|ilk adım\\p{L}*|eylem planı\\p{L}*|yol haritası\\p{L}*|a planı|b planı|sırada)${E}`),
      "zh-Hans": P("下一步|第一步|行动计划|行动方案|路线图|接下来(?:您|你)?(?:需要|应该|可以)|备选方案|B计划|A计划"),
    },
  },
  {
    id: "eligibility_verdict",
    re: {
      en: P(`${B}(?:you(?:'re| are| were| would be| will be)? (?:currently |now |probably |likely |not |no longer |still )*(?:eligible|ineligible|qualified|not qualified|a good candidate)|you (?:do not|don't|cannot|can't|can not|would not|won't|will not|would|will|do|already) (?:currently )?(?:qualify|meet (?:all |the |these |every )?(?:requirements?|criteria|conditions|thresholds?|minimum))|you (?:meet|satisfy|fulfil\\w*|pass|fail|clear) (?:all |the |these |every )?(?:requirements?|criteria|conditions|thresholds?|minimum|test)|your profile (?:is|looks|meets|qualifies|does not)|eligible to pursue|not eligible now|(?:is|are) (?:not )?(?:eligible|ineligible) for you)${E}`),
      tr: P(`${B}(?:(?:vize )?(?:için )?uygun(?:sunuz| değilsiniz| değilsin|sun)|uygun değilsiniz|hak kazan(?:ıyorsunuz|amazsınız|abilirsiniz|mıyorsunuz|ırsınız)|şartları (?:karşılıyorsunuz|karşılamıyorsunuz|sağlıyorsunuz|sağlamıyorsunuz)|koşulları (?:karşılıyorsunuz|karşılamıyorsunuz|sağlıyorsunuz|sağlamıyorsunuz)|gereklilikleri (?:karşılıyorsunuz|karşılamıyorsunuz)|yeterlisiniz|yetersizsiniz|uygun aday)${E}|şu an uygun değil|uygun olarak değerlendir`),
      "zh-Hans": P("(?:您|你)(?:目前|现在|已经|仍)?(?:不)?(?:符合|满足|具备|够|有)(?:条件|资格|要求|标准|门槛)|(?:您|你)(?:不)?(?:满足|符合|达到|通过)[^。！？]{0,14}(?:要求|条件|标准|门槛)|(?:您|你)(?:没有|不具备|不符合)|有资格(?:申请|获得)|不符合(?:条件|资格|要求)|(?:您|你)(?:是|不是)合格"),
    },
  },
  {
    id: "permission",
    re: {
      en: P(`${B}(?:you (?:can|could|may|are able to) (?:use|go for|choose|pursue|target|get|qualify (?:for|via)|apply (?:for|to|via|through|under|in)|take|rely on|opt for|proceed|lodge|submit|nominate)|(?:is|are) (?:open|available|accessible|a (?:good|viable|possible) option) (?:to|for) you|(?:use|try|target|choose|pick|go for|aim for|opt for) (?:the )?(?:WA|NSW|VIC|QLD|SA|TAS|NT|ACT|Western Australia|New South Wales|Victoria|Queensland|South Australia|Tasmania|Northern Territory|Canberra)\\b|open for you|available to you|worth (?:applying|pursuing|trying|considering))${E}`),
      tr: P(`${B}(?:(?:\\p{L}+ )?(?:başvurabilir|kullanabilir|seçebilir|hedefleyebilir|alabilir|yönelebilir|tercih edebilir)(?:siniz|sin)|size (?:açık|uygun|mümkün)|(?:için|ile) başvurabilirsiniz|denemeye değer|başvurmaya değer)${E}`),
      "zh-Hans": P("(?:您|你)(?:可以|能够|能)(?:申请|选择|使用|走|争取|考虑|通过|尝试|获得|选|报)|对(?:您|你)(?:开放|可用)|(?:您|你)可选|值得(?:申请|尝试|考虑|争取)|可以走(?:这条|该)"),
    },
  },
  {
    id: "imperative",
    re: {
      en: P(`^(?:(?:first|then|next|finally|also|now|so|and|but|once (?:that is done|done)|after that|please|just|simply|ideally)[,:]? +)*(?:apply|submit|lodge|file|register|book|obtain|get|start|begin|prepare|gather|consider|choose|pick|target|focus|aim|improve|increase|boost|retake|take|contact|make sure|ensure|use|go for|opt for|try|pursue|secure|upload|send|create|lock in|move|relocate|talk|speak)\\b|${B}you (?:need|have|must|will need|will have|'ll need|'ll have) to (?:apply|submit|lodge|file|register|book|obtain|get|start|begin|prepare|gather|take|retake|contact|improve|increase|boost|complete|upload|secure|find|move|relocate|do|take)\\b`),
      tr: P(`^(?:(?:önce|sonra|ardından|ayrıca|şimdi|lütfen|daha sonra|ilk olarak|son olarak)[,:]? +)*(?:başvur|gönder|sun|tamamla|al|yap|kaydol|hazırla|topla|düşün|seç|odaklan|artır|geliştir|dene|gir|yenile|rezerve et|iletişime geç|ilerle|hedefle|güvenceye al|yükle|oluştur|taşın|emin ol|bul|git|kullan|devam et)(?:ın|in|un|ün|ınız|iniz|unuz|ünüz|ınız)${E}|${B}\\p{L}*(?:başvurun|gönderin|sunun|tamamlayın|hazırlayın|toplayın|seçin|odaklanın|artırın|girin)${E}`),
      "zh-Hans": P("^(?:(?:请|先|首先|然后|接着|再|最后|现在|另外|同时)[，,:：]?)*(?:申请|提交|递交|注册|预约|准备|考虑|选择|专注|提高|提升|重考|联系|获取|取得|完成|开始|争取|瞄准|搬到|迁往|上传|创建|锁定)|^请[^，。]{0,14}?(?:申请|提交|递交|注册|预约|准备|联系|完成|开始|取得|获取)|(?:您|你)(?:需要|必须|得)(?:先)?(?:申请|提交|递交|注册|预约|准备|获取|取得|完成|提高|提升|重考|联系|开始|找)"),
    },
  },
  // A conclusion that a state / territory is or is not open, available or applicable TO THIS VISITOR, or an invented residence rule.
  // The chat shows each state's published status and conditions with their date; the visitor compares.
  {
    id: "state_verdict",
    re: {
      en: P(
        `${B}(?:(?:is|are) (?:not )?(?:open|available|accessible|closed|unavailable) (?:to|for) (?:you|your (?:profile|situation|case))|(?:closed|unavailable|not available|not open|not accessible|not suitable|not possible) (?:to|for) you|(?:does|do|did) not (?:give|grant|allow|offer|provide) (?:you )?(?:a |the |any )?(?:right|ability|opportunity|chance|way|access)(?: to| of)? (?:apply|applying|nominat\\w*)|(?:no|not a|without a) right to apply|because you (?:currently )?(?:live|reside|are living|are based|are located) in [^.!?]{0,60}?(?:not|cannot|can't|closed|unavailable|only)|(?:only|exclusively) (?:for|to|available to|open to|available for) (?:\\w+ ){0,2}(?:residents|people living|those living|locals)|you (?:are|'re) (?:not )?(?:able|allowed|permitted) to (?:apply|use|access|be nominated))${E}`,
      ),
      tr: P(
        `başvuru hakkı (?:vermemektedir|vermiyor|vermez|tanımamaktadır|tanımıyor|tanımaz|sunmamaktadır|verir|veriyor|tanır|sunar|sunmaktadır)|(?:sizin için|size|profilinize|profiliniz için) (?:uygun değil|açık değil|kapalı|uygun olmayan|uygun bir seçenek)|(?:yaşadığınız|bulunduğunuz|ikamet ettiğiniz|olduğunuz) için[^.!?]{0,90}?(?:açık değil|kapalı|uygun değil|hak|başvuramaz|yalnızca|sadece)|(?:yalnızca|sadece) (?:\\p{L}+ ){0,2}(?:ikamet|yerleşik|oturum sahibi|sakin|yerel)\\p{L}*`,
      ),
      "zh-Hans": P(
        "(?:你|您)(?:不符合|不满足|不具备|无法申请|不能申请|没有资格申请)|对(?:你|您)(?:来说)?(?:不)?(?:开放|可用|适用|关闭)|不对(?:你|您)开放|不适合(?:你|您)|(?:因为|由于)(?:你|您)(?:目前)?(?:住在|居住在|位于|在)[^。！？]{0,20}(?:不|无法|没有|仅|只)|仅(?:限|对|适用于)[^。！？]{0,8}(?:居民|居住者|常住|本地)",
      ),
    },
  },
  // Legal claims used to predict or recommend ("migration law does not allow", "it is illegal"): never made. The scope line replaces them.
  {
    id: "legal_claim",
    re: {
      en: P(
        `${B}(?:(?:migration|immigration|australian|the|federal) law (?:does not|doesn't|do not|don't|prohibits|forbids|bars|prevents|disallows|makes it)|(?:is|are|would be|will be|be|it's|it is) (?:illegal|unlawful|against the law|prohibited by law|a criminal offen[cs]e)|(?:illegal|unlawful) (?:to|for you)|not (?:legally )?(?:allowed|permitted|legal) (?:by law|under (?:the |australian )?(?:law|migration law))|legally (?:cannot|can't|can not|not allowed|prohibited|barred|impossible|required|obliged|not permitted)|by law (?:you|applicants|this)|(?:law|legislation) does not allow|not legal)${E}`,
      ),
      tr: P(
        `yasal değildir|yasal değil|yasal olarak (?:mümkün değil|izin verilmiyor|yasak|zorunlu)|yasa dışı|yasadışı|gayri ?yasal|yasaya aykırı|(?:göçmenlik|vize) (?:yasası|hukuku|kanunu|mevzuatı) [^.!?]{0,30}(?:izin ver(?:mez|miyor|memektedir)|yasakl|engel)|${B}kanunen${E}|${B}hukuken${E}|mevzuat(?:a göre)? (?:izin vermiyor|izin vermemektedir|yasaklıyor)`,
      ),
      "zh-Hans": P("违法|不合法|非法|法律(?:不允许|禁止|不准|上不|上无法)|移民法(?:不允许|禁止|不准)|依法(?:不能|不得)"),
    },
  },
  // An English level equated with an IELTS score ("IELTS at least Competent English"). The chat names the level; the accepted tests are set by Home Affairs.
  {
    id: "ielts_equation",
    re: {
      en: P(
        `${B}(?:(?:Competent|Proficient|Superior)(?: English)?\\b[^.!?]{0,25}\\b(?:is|means|equals|equivalent to|=|corresponds to|corresponding to|requires)\\b[^.!?]{0,12}\\bIELTS|IELTS\\b[^.!?]{0,20}\\b(?:at least|minimum|min\\.?|of|equals|=|is)\\b[^.!?]{0,10}\\b(?:Competent|Proficient|Superior))`,
      ),
      tr: P(
        `${B}(?:(?:Competent|Proficient|Superior)(?: English)?\\b[^.!?]{0,25}IELTS[^.!?]{0,12}(?:eşdeğer|demektir|karşılık|=)|IELTS[^.!?]{0,20}(?:en az|asgari|eşittir|=)[^.!?]{0,10}(?:Competent|Proficient|Superior))`,
      ),
      "zh-Hans": P(
        "雅思[^。！？；;，,]{0,12}(?:Competent|Proficient|Superior)|(?:Competent|Proficient|Superior)(?: ?English)?[^。！？]{0,10}(?:相当于|等于|即|就是|对应|=|＝)[^。！？]{0,6}雅思",
      ),
    },
  },
];

/** The single scope line an answer carries (once), in the conversation language. */
export const ADVICE_NOTE: Record<Locale, string> = {
  en: "This chat gives published information only; for advice on your own situation, consult a registered migration agent or an Australian legal practitioner.",
  tr: "Bu sohbet yalnızca yayımlanmış bilgi verir; kendi durumunuza ilişkin tavsiye için kayıtlı bir göçmenlik danışmanına (MARA) veya Avustralya'da çalışan bir hukuk uzmanına başvurun.",
  "zh-Hans": "本聊天仅提供已公布的信息；针对您自身情况的建议，请咨询注册移民代理或澳大利亚执业法律人士。",
};

/** Canada mode of the assistant: the same line, naming the regulated consultant (RCIC) instead of MARA. */
export const ADVICE_NOTE_CA: Record<Locale, string> = {
  en: "This chat gives published information only; for advice on your own situation, consult a regulated Canadian immigration consultant (RCIC) or a Canadian legal practitioner.",
  tr: "Bu sohbet yalnızca yayımlanmış bilgi verir; kendi durumunuza ilişkin tavsiye için düzenlenmiş bir Kanada göçmenlik danışmanına (RCIC) veya Kanada'da çalışan bir hukuk uzmanına başvurun.",
  "zh-Hans": "本聊天仅提供已公布的信息；针对您自身情况的建议，请咨询受监管的加拿大移民顾问（RCIC）或加拿大执业法律人士。",
};

/** What replaces a sentence that equates an English level with an IELTS score (the level named, the tests left to Home Affairs). */
const ENGLISH_LEVEL_LINE: Record<Locale, (level?: string) => string> = {
  en: (level) => `${level ? `The required English level is ${level} English` : "The English level is set by the visa requirements"}; the accepted English tests and the scores that meet it are set by the Department of Home Affairs.`,
  tr: (level) => `${level ? `Gereken İngilizce düzeyi ${level} English'tir` : "İngilizce düzeyi vize şartlarında belirlenir"}; kabul edilen İngilizce testleri ve bu düzeyi karşılayan puanlar İçişleri Bakanlığı (Department of Home Affairs) tarafından belirlenir.`,
  "zh-Hans": (level) => `${level ? `所需的英语水平为 ${level} English` : "英语水平由签证要求规定"}；可接受的英语考试及对应分数由内政部（Department of Home Affairs）规定。`,
};

/** A sentence that is the referral itself (or names a registered agent / legal practitioner as the source of advice) is never rewritten. */
const REFERRAL = /\bRCIC\b|immigration consultant|migration agent|\bMARA\b|legal practitioner|registered (?:migration|agent)|göçmenlik danışman|MARA|hukuk uzman|hukukçu|移民代理|法律(?:从业|人士|专业)/i;

export type BannedHit = { id: BannedId; sentence: string };

/** Strips list markers and lead-ins so a bullet like "- 1. Apply ..." is read from its first word. */
const stripMarker = (s: string) => s.replace(/^[\s>*\-–—•·\d.)(#]+/, "").trim();

const ABBREVIATION = /\b(?:approx|e\.g|i\.e|vs|etc|incl|excl|est|no|ca)\.$/i;

/** One line as [sentence, whitespace that followed it] pairs: a Latin full stop ends a sentence only before whitespace (not in "4.5", "approx."), a Chinese one always. */
export function tokenize(line: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let start = 0;
  const re = /([.!?]+|[。！？]+)(\s*)/gu;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    const cjk = /[。！？]/.test(m[1]);
    const end = m.index + m[1].length;
    if (!cjk && m[2] === "" && end < line.length) continue; // "4.5", "e.g.x"
    if (!cjk && ABBREVIATION.test(line.slice(start, end))) continue;
    out.push([line.slice(start, end), m[2]]);
    start = end + m[2].length;
  }
  if (start < line.length) out.push([line.slice(start), ""]);
  return out;
}

export function splitSentences(text: string): string[] {
  return text.split("\n").flatMap((line) => tokenize(line).map(([s]) => s.trim())).filter(Boolean);
}

/** The banned patterns one sentence contains (a referral sentence contains none). */
export function bannedIn(sentence: string, locale: Locale): BannedId[] {
  const referral = REFERRAL.test(sentence);
  const body = stripMarker(sentence);
  const found = new Set<BannedId>();
  // All three languages are checked on every answer: the model may mix, and a Chinese answer can quote an English phrase.
  for (const rule of RULES) {
    if (referral && !["legal_claim", "state_verdict", "eligibility_verdict"].includes(rule.id)) continue;
    for (const l of [locale, ...(["en", "tr", "zh-Hans"] as Locale[]).filter((x) => x !== locale)]) {
      if (rule.re[l].test(rule.id === "imperative" ? body : sentence)) {
        found.add(rule.id);
        break;
      }
    }
  }
  return [...found];
}

export function findBannedPatterns(text: string, locale: Locale): BannedHit[] {
  return splitSentences(text).flatMap((sentence) => bannedIn(sentence, locale).map((id) => ({ id, sentence })));
}

const LABEL = {
  en: (subs: string[], clauses: string) => `${subs.length ? `Subclass ${subs.join("/")}: ` : ""}${clauses}.`,
  tr: (subs: string[], clauses: string) => `${subs.length ? `Alt sınıf ${subs.join("/")}: ` : ""}${clauses}.`,
  "zh-Hans": (subs: string[], clauses: string) => `${subs.length ? `${subs.join("/")} 子类：` : ""}${clauses}。`,
} as const;

const SUBCLASS = /\b(189|190|191|482|485|491|500|186|820|801|494)\b/g;
const CLAUSE_SPLIT = /\s*(?:(?<!\d),|,(?!\d)|[;:，；、：—–]|\s-\s|\bwhich\b|\bbecause\b|\bsince\b|\bwhere\b|\bwhile\b|\bbut\b|\band\b|\bve\b|\bçünkü\b|\bancak\b|\bfakat\b|因为|而且|但是|并且)\s*/i;

/**
 * What a flagged sentence leaves behind: the clauses that carry a figure (a fee, a threshold, a points total, a date) and none of the
 * banned wording, tied to the subclass(es) the sentence names. A flagged sentence without any figure is dropped.
 */
function residue(sentence: string, locale: Locale): string | null {
  const clauses = sentence
    .replace(/[.!?。！？]+$/, "")
    .split(CLAUSE_SPLIT)
    .map((c) => stripMarker(c))
    .filter((c) => /\d/.test(c) && bannedIn(c, locale).length === 0 && c.replace(/[^\p{L}\p{N}]/gu, "").length > 3);
  if (clauses.length === 0) return null;
  const subs = [...new Set(Array.from(sentence.matchAll(SUBCLASS), (m) => m[1]))];
  // A clause that is only the subclass number adds nothing.
  const kept = clauses.filter((c) => !/^(?:subclass |alt sınıf |vize )?\d{3}$/i.test(c));
  if (kept.length === 0) return null;
  return LABEL[locale](subs, kept.join(locale === "zh-Hans" ? "；" : "; "));
}

/** The visitor asks for a pick, a verdict, a chance or an instruction about their own situation (en / tr / zh-Hans). */
const PERSONAL_QUESTION = new RegExp(
  [
    "\\bwhich (?:visa|state|pathway|path|route|option)\\b",
    "\\b(?:best|better|easiest|fastest|safest|right) (?:visa|state|pathway|path|route|option|choice|way)\\b",
    "\\b(?:what|which) (?:should|do|can|would) i\\b",
    "\\bshould i\\b",
    "\\b(?:can|could|will|would|do|am) i (?:get|apply|qualify|be (?:invited|eligible|nominated|approved)|use|go|meet)\\b",
    "\\b(?:am i|are we) eligible\\b",
    "\\b(?:my|what are my) (?:chances?|odds|options|eligibility)\\b",
    "\\bnext steps?\\b|\\bwhat (?:next|now)\\b|\\bwhere do i start\\b|\\bhow do i (?:get|apply|start)\\b",
    "(?<![\\p{L}])(?:hangi (?:vize|eyalet|yol)|ne yapmalı|yapmalı mıyım|şansım|şanslarım|alabilir miyim|başvurabilir miyim|davet alır mıyım|uygun muyum|sıradaki adım|bir sonraki adım|en iyi|en uygun)",
    "哪个(?:签证|州|途径)|哪种|我(?:该|应该|能|可以|会)(?:不会|否|选|申请|怎么)|我的(?:机会|几率|概率|资格|选择)|我能(?:拿到|获得|申请)|能不能|下一步|最好|最适合|符合条件吗|会不会被邀请",
  ].join("|"),
  "iu",
);
export const isPersonalSituationQuestion = (text: string): boolean => PERSONAL_QUESTION.test(text);

export type Rewrite = { id: RewriteId; sentence: string; action: "dropped" | "kept_figures" | "replaced" | "de_numbered"; replacement?: string };
export type Sanitized = { text: string; rewrites: Rewrite[]; noteAdded: boolean };

/** A sentence that is the scope line (a referral to a registered agent / legal practitioner as the source of advice): the answer carries ONE, ours, at the end. */
const SCOPE_WORDS = /advice|advise|consult|seek (?:advice|help|guidance)|should come from|must come from|published information only|not (?:a|an) (?:registered|licensed|licenced)|i am not|tavsiye|danış|yalnızca yayımlanmış|değilim|başvurun|başvurmalı|咨询|仅提供|建议|不是注册|我不是|必须来自/i;
const isScopeSentence = (s: string) => REFERRAL.test(s) && SCOPE_WORDS.test(s);
const ALL_NOTES = new Set<string>([...Object.values(ADVICE_NOTE), ...Object.values(ADVICE_NOTE_CA)]);

/** The "not covered by my sources / general information" note (all three languages) and what counts as a citation in an answer. */
const GENERAL_NOTE_RE = /not covered by my sources|kaynaklarımda yer almıyor|不在我的资料中/i;
const CITATION = /https?:\/\/|\[S\d+\]|\b(?:sources?|kaynak(?:lar)?)\s*:|来源[:：]/i;

/** A heading that only announces the profile recap ("Profile summary:", "Profil özeti"). */
const RECAP_HEADING = /^(?:#+\s*)?[*_]*(?:your profile|profile (?:summary|recap)|summary of your profile|profil(?:iniz)?(?: özeti)?|profil özeti|档案摘要|个人资料摘要|您的资料)[*_]*\s*[:：]?\s*$/iu;

const STOP = new Set(["the", "and", "for", "are", "was", "has", "have", "been", "its", "with", "that", "this", "from", "will", "may", "any", "you", "your", "bir", "için", "olan", "veya", "ile"]);
/** Words (first 5 letters), numbers and Chinese character pairs: enough to tell a restatement from new content. */
export function contentTokens(text: string): Set<string> {
  const t = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-zçğıöşü]{3,}|\d+(?:[-.,]\d+)*/gu) ?? []) if (!STOP.has(w)) t.add(/^\d/.test(w) ? w : w.slice(0, 5));
  const han = text.match(/\p{Script=Han}+/gu) ?? [];
  for (const run of han) for (let i = 0; i + 1 < run.length; i++) t.add(run.slice(i, i + 2));
  return t;
}
/** True when the sentence says (nearly) nothing the recap shown with this answer does not already say: most of its words and every number are in the recap. */
function repeatsRecap(sentence: string, recap: string): boolean {
  const s = contentTokens(sentence);
  if (s.size < 4) return false;
  const base = contentTokens(recap);
  let shared = 0;
  for (const w of s) if (base.has(w)) shared++;
  const numbers = [...s].filter((w) => /^\d/.test(w));
  return shared / s.size >= 0.7 && numbers.length > 0 && numbers.every((n) => base.has(n));
}

const NUMBERED = /^(\s*)(?:\d{1,2}[.)、](?!\d)|[（(]\d{1,2}[）)]|(?:step|adım|步骤)\s*\d{1,2}\b[:.)]?|第\s*\d{1,2}\s*步[:：.]?)\s*/i;

/** Numbered instructions become plain bullets: a process may be described, never given as numbered steps for the visitor to follow. */
function deNumber(lines: string[], rewrites: Rewrite[], locale: Locale): string[] {
  const idx = lines.map((l, i) => (NUMBERED.test(l) ? i : -1)).filter((i) => i >= 0);
  const out = [...lines];
  let group: number[] = [];
  const flush = () => {
    if (group.length >= 2) {
      const process = group.map((i) => lines[i]).join(" ");
      if (/EOI|SkillSelect/i.test(process) && /invitation|davet|邀请/i.test(process) && /visa application|vize|签证/i.test(process)) {
        out[group[0]] = locale === "tr"
          ? "Nitelikli bir vize süreci genellikle SkillSelect'te bir EOI, ardından davet ve ardından vize başvurusunu içerir."
          : locale === "zh-Hans"
            ? "技术签证流程通常包括：在 SkillSelect 中提交的 EOI，随后是邀请，再随后是签证申请。"
            : "A skilled visa usually involves: an EOI in SkillSelect, then an invitation, then the visa application.";
        for (const i of group.slice(1)) out[i] = "";
        rewrites.push({ id: "numbered_steps", sentence: process, action: "replaced", replacement: out[group[0]] });
      } else {
        for (const i of group) out[i] = out[i].replace(NUMBERED, (_m, indent: string) => `${indent}- `);
        rewrites.push({ id: "numbered_steps", sentence: lines[group[0]].trim(), action: "de_numbered" });
      }
    }
    group = [];
  };
  for (const i of idx) {
    if (group.length > 0 && i - group[group.length - 1] > 3) flush();
    group.push(i);
  }
  flush();
  return out;
}

/**
 * Rewrites a finished answer so that it contains no banned pattern: a flagged sentence is replaced by its figures (subclass + the
 * clauses that carry a number) or dropped; a sentence that equates an English level with an IELTS score is replaced by the level
 * and the pointer to Home Affairs; numbered steps become bullets; the answer carries ONE scope line (ours, at the end), never the
 * model's own, and not the "not covered by my sources" note when it has citations; a sentence that only repeats the profile recap
 * shown with this answer is dropped. The factual sentences are untouched. Idempotent: a clean answer comes back unchanged (and
 * gets no note unless the question asked for one).
 */
/** A pass over the answer text after the sentence clean-up and before the scope line is added (state claims, points figures). */
export type AnswerPass = (text: string) => { text: string; rewrites: Rewrite[] };

export function sanitizeAnswer(answer: string, opts: { locale: Locale; userText?: string; country?: "AU" | "CA"; recap?: string; passes?: AnswerPass[] }): Sanitized {
  const { locale } = opts;
  const rewrites: Rewrite[] = [];
  const hasCitation = CITATION.test(answer);
  let scopeSeen = false;
  let canonicalSeen = false;
  let levelLineDone = false;
  const lines = deNumber(answer.split("\n"), rewrites, locale);
  const outLines: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      outLines.push(line);
      continue;
    }
    if (opts.recap && RECAP_HEADING.test(line.trim())) {
      rewrites.push({ id: "recap_repeat", sentence: line.trim(), action: "dropped" });
      continue;
    }
    // Rebuild the line sentence by sentence, keeping the original spacing between kept sentences.
    let rebuilt = "";
    let pendingSpace = "";
    for (const [sentence, space] of tokenize(line)) {
      const trimmed = sentence.trim();
      if (!trimmed) {
        rebuilt += pendingSpace + sentence;
        pendingSpace = space;
        continue;
      }
      const bullet = (sentence.match(/^[\s>*\-–—•·]+/) ?? [""])[0];
      if (isScopeSentence(trimmed)) {
        // The model's own scope line: removed; the one canonical line is added at the end.
        scopeSeen = true;
        if (ALL_NOTES.has(trimmed)) canonicalSeen = true;
        else rewrites.push({ id: "scope_line", sentence: trimmed, action: "dropped" });
        continue;
      }
      if (hasCitation && GENERAL_NOTE_RE.test(trimmed)) {
        rewrites.push({ id: "general_note", sentence: trimmed, action: "dropped" });
        continue;
      }
      if (opts.recap && /entered|your (?:profile|points|age)|points from|girilen|girişleriniz|profiliniz|puanınız|yaşınız|已填写|您的(?:资料|分数|年龄)|根据您的填写/i.test(trimmed) && /\d/.test(trimmed) && repeatsRecap(trimmed, opts.recap)) {
        rewrites.push({ id: "recap_repeat", sentence: trimmed, action: "dropped" });
        continue;
      }
      const ids = bannedIn(sentence, locale);
      if (ids.length === 0) {
        rebuilt += pendingSpace + sentence;
        pendingSpace = space;
        continue;
      }
      if (ids.includes("ielts_equation")) {
        const level = trimmed.match(/\b(Competent|Proficient|Superior)\b/i)?.[1];
        const named = level ? level[0].toUpperCase() + level.slice(1).toLowerCase() : undefined;
        if (!levelLineDone) {
          levelLineDone = true;
          const line2 = ENGLISH_LEVEL_LINE[locale](named);
          rewrites.push({ id: "ielts_equation", sentence: trimmed, action: "replaced", replacement: line2 });
          rebuilt += pendingSpace + bullet + line2;
          pendingSpace = space;
        } else rewrites.push({ id: "ielts_equation", sentence: trimmed, action: "dropped" });
        continue;
      }
      const left = ids.some((id) => ["state_verdict", "legal_claim", "eligibility_verdict"].includes(id)) ? null : residue(sentence, locale);
      for (const id of ids) rewrites.push({ id, sentence: trimmed, action: left ? "kept_figures" : "dropped", ...(left ? { replacement: left } : {}) });
      if (left) {
        rebuilt += pendingSpace + bullet + left;
        pendingSpace = space;
      }
    }
    if (rebuilt.trim()) outLines.push(rebuilt);
    else if (rewrites.length > 0 && outLines.length > 0 && !outLines[outLines.length - 1].trim()) continue; // a dropped line leaves no stray blank
  }
  let text = outLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  for (const pass of opts.passes ?? []) {
    const r = pass(text);
    text = r.text;
    rewrites.push(...r.rewrites);
  }
  const asked = opts.userText ? isPersonalSituationQuestion(opts.userText) : false;
  const substantive = rewrites.some((r) => !["numbered_steps", "recap_repeat", "general_note", "scope_line", "state_claim", "points_figure"].includes(r.id));
  const needNote = scopeSeen || asked || substantive;
  const note = (opts.country === "CA" ? ADVICE_NOTE_CA : ADVICE_NOTE)[locale];
  if (needNote) text = `${text}${text ? "\n\n" : ""}${note}`;
  return { text, rewrites, noteAdded: needNote && !canonicalSeen };
}

/** The log line for the rewrites of one answer (console.warn by default): every rewrite, with the pattern and the sentence. */
export function logRewrites(rewrites: readonly Rewrite[], ctx: { path: string; locale: Locale }): void {
  if (rewrites.length === 0) return;
  console.warn("[chat_information_only_rewrite]", JSON.stringify({ path: ctx.path, locale: ctx.locale, rewrites }));
}

/**
 * The rules block of every chat system prompt. It comes after the other instructions and outranks them: where an older rule
 * above asks for a plan, a recommendation, a status label or a state suggestion, this block applies instead.
 */
export const INFORMATION_ONLY_RULES = `INFORMATION-ONLY RULES (these outrank every instruction above and below; where an earlier rule asks for a plan, a recommendation, a ranking, a status label, a state suggestion or advice, follow this block instead):
1. You explain PUBLISHED rules, requirements, fees, processes and state program information, each with its source and, for state programs, the date the data was checked (the date is in the state lines of block-1). You may do arithmetic on the visitor's own figures: points totals, the nomination points added for subclass 190 (+5) and 491 (+15), and a side-by-side "your figure / published figure".
2. You NEVER say which visa, state or pathway is best, recommended, most realistic, easiest, fastest or likely; NEVER give a chance, odds, probability or likelihood; NEVER tell the visitor what to do ("you should", "apply", "submit your EOI", "lodge", "get a skills assessment first", "next step", "action plan", "Plan A / Plan B"); NEVER say "you are eligible", "you are not eligible", "you qualify", "you meet the requirements" or "you can use <state>" / "<state> is open to you". Do not use the labels "Eligible to pursue", "Not eligible now", "Next step required".
3. When the visitor asks about their own situation ("which visa should I choose?", "can I get 190 in WA?", "will I get invited?", "what should I do next?", "what are my chances?", "which state sponsors me?"), do not answer the question as asked. Instead: (a) set out the relevant published criteria with sources (what the visa or state program requires), (b) show the arithmetic from the figures the visitor entered next to the published figures, and (c) say that advice on their own situation must come from a registered migration agent (MARA) or an Australian legal practitioner. Say (c) ONCE, as one short line at the end; do not add any other referral, disclaimer or scope sentence.
4. State information comes ONLY from the state lines of block-1 (each state's published status, published conditions and the date they were checked) ONLY. Retrieved documents and the profile cannot supply additional state rules. Quote the structured facts. Do NOT state any state rule that is not in that data: no residence rule, no "only for residents", no "needs a job in the state" unless the line says so, nothing inferred from where the visitor lives. NEVER conclude that a state is or is not available, open, closed, suitable or applicable "for you" / "for your profile" / "because you live in <state>", and never say a state "does not give a right to apply" to the visitor, in any language. When asked which state, list each state's published status and conditions with the date, briefly, and let the visitor compare. A state's listing of an occupation or a condition (for example a six-month WA employment contract for the WA 190 General stream) is a published condition, not a conclusion about the visitor.
5. Neutral wording: "the published minimum is 65; your entered figures add up to 60" (arithmetic) instead of "you are 5 points short and should ...". "The 190 stream states ... " instead of "you need to ...". A generic process may be DESCRIBED in one sentence ("A skilled visa usually involves: an EOI in SkillSelect, then an invitation, then the visa application"); never as numbered or bulleted instructions to the visitor.
6. If a source gives a figure, give it exactly. If a source does not cover the point, say so once and point to the official page (Department of Home Affairs or the state government); do not guess. Add the "not covered by my sources" note ONLY when the answer has no citation at all; an answer with citations never carries it.
7. NEVER make legal claims to predict or recommend: do not write "migration law does not allow", "it is illegal / unlawful", "yasal değildir", "违法" or similar. The scope line in rule 3 is the only reference to the law or to legal advice.
8. If the visitor states a figure that differs from the saved profile (for example "I have 75 points" while their entries add up to 70), show both and say which one the arithmetic uses (the profile entries, unless they change them).
9. English levels: name the required level (Competent English, Proficient English, Superior English). NEVER equate a level with an IELTS score or write "IELTS at least Competent"; if needed, say the accepted English tests and scores are set by the Department of Home Affairs.
10. The profile recap is shown by the system once per conversation, at the top of the first answer. NEVER write your own recap of the visitor's details or points, and never repeat it.
`;
