"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

type PreviewImage = {
  src: string
  alt: string
}

const PREVIEW_IMAGES: PreviewImage[] = [
  { src: "/images/report-previews/report-preview-1.png", alt: "Report preview 1" },
  { src: "/images/report-previews/report-preview-2.png", alt: "Report preview 2" },
  { src: "/images/report-previews/report-preview-3.png", alt: "Report preview 3" },
  { src: "/images/report-previews/report-preview-4.png", alt: "Report preview 4" },
  { src: "/images/report-previews/report-preview-5.png", alt: "Report preview 5" },
]

export function ReportPreviewGallery({ images = PREVIEW_IMAGES }: { images?: PreviewImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const activeImage = activeIndex !== null ? images[activeIndex] : null

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-md ring-offset-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            />
          </button>
        ))}
      </div>

      <Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-5xl items-center justify-center border-none bg-black/90 p-2 sm:p-6">
          <DialogTitle className="sr-only">{activeImage?.alt ?? "Report preview"}</DialogTitle>
          {activeImage && (
            <div className="relative h-full w-full">
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                sizes="95vw"
                className="object-contain"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
