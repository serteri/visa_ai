import { getDictionary, Dictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import { DownloadForm } from "../rehber/DownloadForm"
import { Metadata } from "next"
import { getCachedGuideDownloadStats } from "@/lib/cache/public-read-models"

export const revalidate = 3600

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const dictionary = await getDictionary(locale)
  return {
    title: dictionary.guidePage.title,
    description: dictionary.guidePage.subtitle,
  }
}

export default async function GuidePage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { maxDownloads, currentDownloads, remainingDownloads } = await getCachedGuideDownloadStats()

  return (
    <div className="container mx-auto px-4 py-8">
      <DownloadForm
        translations={dictionary}
        maxDownloads={maxDownloads}
        currentDownloads={currentDownloads}
        remainingDownloads={remainingDownloads}
        locale={locale}
      />
    </div>
  )
}
