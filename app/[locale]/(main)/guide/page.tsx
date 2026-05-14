import { prisma } from "@/lib/prisma"
import { getDictionary, Dictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import { DownloadForm } from "../rehber/DownloadForm"
import { unstable_noStore as noStore } from "next/cache"
import { Metadata } from "next"

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
  noStore() // Opt-out of static rendering
  const dictionary = await getDictionary(locale)

  const guideConfig = await prisma.guideConfig.findUnique({
    where: { id: "main" },
  })
  const currentDownloads = await prisma.guideDownload.count()

  const maxDownloads = guideConfig?.maxDownloads || 20
  const remainingDownloads = Math.max(0, maxDownloads - currentDownloads)

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
