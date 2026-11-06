import { publicPath } from "@/lib/seo/urls";

const TEXT: Record<string, { before: string; link: string; after: string }> = {
  en: { before: "By continuing, you confirm that you have read the ", link: "Privacy Policy", after: "." },
  tr: { before: "Devam ederek ", link: "Gizlilik Politikası", after: "'nı okuduğunuzu kabul edersiniz." },
  "zh-Hans": { before: "继续即表示您已阅读", link: "隐私政策", after: "。" },
};

/**
 * One short line under a form's submit button or a checkout button: a note with a link, not a checkbox. The link opens in a new tab so a half-filled form or a
 * checkout in progress is not lost.
 */
export function PrivacyNotice({ locale, className }: { locale?: string; className?: string }) {
  const loc = locale === "tr" || locale === "zh-Hans" ? locale : "en";
  const text = TEXT[loc];
  return (
    <p className={className ?? "text-center text-xs text-slate-600"} data-privacy-notice>
      {text.before}
      <a href={publicPath(loc, "/privacy")} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
        {text.link}
      </a>
      {text.after}
    </p>
  );
}
