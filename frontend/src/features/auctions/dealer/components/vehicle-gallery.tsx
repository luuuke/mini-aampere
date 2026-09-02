"use client";

import { useState } from "react";
import Image from "next/image";
import { CarFront, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VehicleGallery({
  photoUrls,
  vehicleName,
}: {
  photoUrls: string[];
  vehicleName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const activePhoto = photoUrls[activeIndex];
  const activePhotoFailed = !activePhoto || failedUrls.has(activePhoto);
  const hasMultiplePhotos = photoUrls.length > 1;

  function markPhotoFailed(photoUrl: string) {
    setFailedUrls((current) => new Set(current).add(photoUrl));
  }

  function showPrevious() {
    setActiveIndex((current) =>
      current === 0 ? photoUrls.length - 1 : current - 1,
    );
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % photoUrls.length);
  }

  return (
    <section aria-label={`${vehicleName} photos`}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
        {activePhotoFailed ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <div className="text-center">
              <CarFront aria-hidden="true" className="mx-auto size-12" />
              <p className="mt-3 text-sm">Vehicle photo unavailable</p>
            </div>
          </div>
        ) : (
          <Image
            key={activePhoto}
            src={activePhoto}
            alt={`${vehicleName}, photo ${activeIndex + 1} of ${photoUrls.length}`}
            fill
            priority
            sizes="(min-width: 1024px) 65vw, 100vw"
            className="object-cover"
            onError={() => markPhotoFailed(activePhoto)}
          />
        )}

        {hasMultiplePhotos ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous photo"
              className="absolute top-1/2 left-3 -translate-y-1/2 border-white/80 bg-white/90 shadow-sm hover:bg-white"
              onClick={showPrevious}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next photo"
              className="absolute top-1/2 right-3 -translate-y-1/2 border-white/80 bg-white/90 shadow-sm hover:bg-white"
              onClick={showNext}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <span className="absolute right-3 bottom-3 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-medium text-background">
              {activeIndex + 1} / {photoUrls.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultiplePhotos ? (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {photoUrls.map((photoUrl, index) => (
            <button
              key={photoUrl}
              type="button"
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={cn(
                "relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                index === activeIndex ? "border-primary" : "border-transparent",
              )}
              onClick={() => setActiveIndex(index)}
            >
              {failedUrls.has(photoUrl) ? (
                <CarFront
                  aria-hidden="true"
                  className="absolute inset-0 m-auto size-5 text-muted-foreground"
                />
              ) : (
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  onError={() => markPhotoFailed(photoUrl)}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
