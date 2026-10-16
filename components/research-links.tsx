import Link from "next/link";
import {
  researchLinks,
  researchText,
  type ResearchLink,
} from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";
export function ResearchLinks({
  locale,
  code,
  links,
}: {
  locale: string;
  code?: string;
  links?: ResearchLink[];
}) {
  return (
    <nav
      aria-label={researchText(
        locale,
        "Continue your research",
        "Araştırmaya devam",
        "继续研究",
      )}
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <h2 className="text-xl font-semibold text-slate-900">
        {researchText(
          locale,
          "Continue your research",
          "Araştırmaya devam",
          "继续研究",
        )}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(links ?? researchLinks(locale, code)).map((link) => (
          <Link
            key={link.path}
            href={publicPath(locale, link.path)}
            data-tool-destination={link.destination}
            className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-cyan-900 hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {link.label}
            <span aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
export function ProfessionalHelp({ locale }: { locale: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">
        {researchText(
          locale,
          "Need professional migration advice?",
          "Profesyonel göçmenlik danışmanlığı mı arıyorsunuz?",
          "需要专业移民咨询？",
        )}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {researchText(
          locale,
          "LogiVisa provides information and research tools, not personalised immigration advice. An appropriately authorised migration professional can advise on your individual circumstances.",
          "LogiVisa bilgi ve araştırma araçları sunar; kişisel göçmenlik danışmanlığı vermez. Bireysel durumunuz için yetkili bir göçmenlik uzmanından danışmanlık alabilirsiniz.",
          "LogiVisa 提供信息与研究工具，不提供个性化移民咨询。具备适当资质的移民专业人士可就您的个人情况提供咨询。",
        )}
      </p>
      <a
        data-professional-help
        href="https://portal.mara.gov.au/search-the-register-of-migration-agents/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block py-2 text-sm font-medium text-cyan-900 underline underline-offset-4"
      >
        {researchText(
          locale,
          "Search the official registered migration agent register",
          "Resmî kayıtlı göçmenlik danışmanı sicilini ara",
          "查询官方注册移民代理名册",
        )}
      </a>
    </section>
  );
}
