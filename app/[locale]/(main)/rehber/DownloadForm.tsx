'use client'

import { useState } from 'react'
import { Locale } from "@/lib/i18n/config"
import { submitDownloadForm } from "./actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/components/icons"
import Link from "next/link"
import type { Dictionary } from "@/lib/i18n/get-dictionary"

interface DownloadFormProps {
  translations: Dictionary
  maxDownloads: number
  currentDownloads: number
  remainingDownloads: number
  locale: Locale
}

export function DownloadForm({
  translations,
  maxDownloads,
  currentDownloads,
  remainingDownloads,
  locale,
}: DownloadFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const progressValue = (currentDownloads / maxDownloads) * 100
  const limitReached = remainingDownloads <= 0

  const remainingCopiesText = translations.guidePage.remainingCopies
    .replace('{{remaining}}', String(remainingDownloads))
    .replace('{{max}}', String(maxDownloads))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await submitDownloadForm({
      firstName,
      lastName,
      email,
      phone,
      locale,
    })

    if (!result.success) {
      if (result.error === "limit_reached") {
        setError(translations.guidePage.limitReachedError)
      } else {
        setError(translations.guidePage.genericError)
      }
    } else {
      setIsSubmitted(true)
    }
    setIsSubmitting(false)
  }

  if (isSubmitted) {
    return (
      <div className="text-center mt-8">
        <h2 className="text-2xl font-bold text-green-600">
          {translations.guidePage.successMessage}
        </h2>
        <p className="mt-4">
          <a
            href="/avustralya-pr-rehberi-2026.pdf"
            download
            className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Icons.download className="mr-2 h-4 w-4" />
            {translations.guidePage.downloadButton}
          </a>
        </p>
        <p className="mt-4 text-gray-600">
          <Link href={`/${locale}/tools`} className="text-blue-600 hover:underline">
            {translations.guidePage.exploreToolsCta}
            <span aria-hidden="true"> →</span>
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
          {translations.guidePage.title}
        </h1>
        <p className="mt-2 text-xl text-gray-600">{translations.guidePage.subtitle}</p>

        <div className="mt-6 flex justify-center">
          <div className="w-48 h-64 bg-blue-800 flex items-center justify-center rounded-lg shadow-md">
            <Icons.book className="text-white h-24 w-24" />
          </div>
        </div>

        <p className="mt-4 text-lg font-semibold text-orange-500 flex items-center justify-center">
          <Icons.gift className="mr-2 h-5 w-5" />
          {translations.guidePage.limitedCopiesBadge}
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {translations.guidePage.whatsInsideTitle}
        </h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-center">
            <Icons.check className="text-green-500 mr-2 h-5 w-5 shrink-0" />
            {translations.guidePage.bullet1}
          </li>
          <li className="flex items-center">
            <Icons.check className="text-green-500 mr-2 h-5 w-5 shrink-0" />
            {translations.guidePage.bullet2}
          </li>
          <li className="flex items-center">
            <Icons.check className="text-green-500 mr-2 h-5 w-5 shrink-0" />
            {translations.guidePage.bullet3}
          </li>
          <li className="flex items-center">
            <Icons.check className="text-green-500 mr-2 h-5 w-5 shrink-0" />
            {translations.guidePage.bullet4}
          </li>
        </ul>
      </div>

      <div className="mt-8">
        {limitReached ? (
          <p className="text-center text-red-600 font-semibold text-lg">
            {translations.guidePage.limitReachedMessage}
          </p>
        ) : (
          <>
            <p className="text-center text-gray-700 text-lg font-semibold">
              {remainingCopiesText}
            </p>
            <Progress value={progressValue} className="mt-2 w-full" />
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">{translations.guidePage.form.firstName}</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={limitReached || isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="lastName">{translations.guidePage.form.lastName}</Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={limitReached || isSubmitting}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">{translations.guidePage.form.email}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={limitReached || isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="phone">{translations.guidePage.form.phone}</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={limitReached || isSubmitting}
          />
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={limitReached || isSubmitting}
        >
          {isSubmitting ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.download className="mr-2 h-4 w-4" />
          )}
          {translations.guidePage.form.submitButton}
          {!isSubmitting && <span aria-hidden="true"> →</span>}
        </Button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {translations.guidePage.spamDisclaimer}
        </p>
      </form>
    </div>
  )
}
