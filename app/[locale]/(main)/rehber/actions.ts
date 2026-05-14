"use server"

import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { getDictionary, Dictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitDownloadForm(data: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  locale: Locale
  ipAddress?: string
}) {
  const headersList = await headers()
  const ipAddress = data.ipAddress || headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
  const dictionary = await getDictionary(data.locale)

  // 1. Check download count
  const guideConfig = await prisma.guideConfig.findUnique({
    where: { id: "main" },
    select: { maxDownloads: true },
  })
  const maxDownloads = guideConfig?.maxDownloads || 20

  const currentDownloads = await prisma.guideDownload.count()
  if (currentDownloads >= maxDownloads) {
    return { success: false, error: "limit_reached" }
  }

  // 2. Check if email already downloaded or IP already downloaded
  const existingByEmail = await prisma.guideDownload.findFirst({
    where: { email: data.email },
  })
  if (existingByEmail) {
    return { success: true, alreadyDownloaded: true }
  }

  const existingByIp = await prisma.guideDownload.findFirst({
    where: { ipAddress: ipAddress },
  })
  if (existingByIp) {
    return { success: false, error: "ip_limit_reached" }
  }

  // 3. Save to DB
  await prisma.guideDownload.create({
    data: { ...data, ipAddress },
  })

  // 4. Send email via Resend with download link
  try {
    await resend.emails.send({
      from: "LogiVisa <no-reply@logivisa.com>",
      to: [data.email],
      subject: dictionary.guidePage.email.subject,
      html: `
        <p>${dictionary.guidePage.email.greeting} ${data.firstName},</p>
        <p>${dictionary.guidePage.email.body1}</p>
        <p>
          <a href="https://www.logivisa.com/avustralya-pr-rehberi-2026.pdf"
             style="display: inline-block; padding: 10px 20px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;"
          >
            📥 ${dictionary.guidePage.email.downloadButton}
          </a>
        </p>
        <p>${dictionary.guidePage.email.body2}</p>
        <ul>
          <li>${dictionary.guidePage.bullet1}</li>
          <li>${dictionary.guidePage.bullet2}</li>
          <li>${dictionary.guidePage.bullet3}</li>
          <li>${dictionary.guidePage.bullet4}</li>
        </ul>
        <p>${dictionary.guidePage.email.body3}</p>
        <p>LogiVisa Ekibi</p>
        <p><a href="https://www.logivisa.com">logivisa.com</a></p>
      `,
    })
  } catch (emailError) {
    console.error("Failed to send email:", emailError)
    return { success: false, error: "email_send_failed" }
  }

  // 5. Also save to leads table (reuse existing UserReport/leads system)
  // Assuming UserReport is the leads table
  await prisma.userReport.create({
    data: {
      fullName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      ipAddress: ipAddress,
      locale: data.locale,
      source: "guide_download",
      reportJson: { guide: "Avustralya PR Rehberi 2026" }, // Placeholder
      inputJson: {},
    },
  })
  
  return { success: true }
}
