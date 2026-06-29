const TR_FALLBACK = "Resmi kaynak metni icin Turkce ceviri guncelleniyor.";
const ZH_FALLBACK = "该官方内容的中文翻译正在更新中。";

const EN_WORD_HINT = /\b(the|and|or|must|with|for|from|into|without|required|application|apply|program|pilot|process|step|document|forms?|work|permit|family|sponsor|spouse|partner|child|medical|doctor|community|province|eligibility|deadline|language|registration|portal|residence|immigration|official|guide|open|closed|status|fee|processing)\b/i;
const URL_OR_EMAIL = /https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const CJK = /[\u3400-\u9FFF]/;
const UPPER_CODE = /^[A-Z0-9\-_/().\s]{1,14}$/;

function shouldReplaceForZh(value: string) {
  if (CJK.test(value)) return false;
  if (URL_OR_EMAIL.test(value)) return false;
  if (UPPER_CODE.test(value.trim())) return false;

  const hasLatin = /[A-Za-z]/.test(value);
  if (!hasLatin) return false;

  const hasLower = /[a-z]/.test(value);
  return hasLower && value.trim().length >= 4;
}

function shouldReplaceForTr(value: string) {
  if (URL_OR_EMAIL.test(value)) return false;
  if (UPPER_CODE.test(value.trim())) return false;
  if (value.trim().length < 12) return false;

  return EN_WORD_HINT.test(value);
}

function sanitizeString(value: string, locale: string) {
  if (locale === "en") return value;

  if (locale === "zh-Hans") {
    return shouldReplaceForZh(value) ? ZH_FALLBACK : value;
  }

  if (locale === "tr") {
    return shouldReplaceForTr(value) ? TR_FALLBACK : value;
  }

  return value;
}

export function sanitizeLocaleContent<T>(input: T, locale: string): T {
  if (input === null || input === undefined) return input;

  if (typeof input === "string") {
    return sanitizeString(input, locale) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeLocaleContent(item, locale)) as T;
  }

  if (typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = sanitizeLocaleContent(value, locale);
    }
    return result as T;
  }

  return input;
}
