"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AssetDTO } from "@/modules/catalog/contracts";
import { ProductImage } from "./product-image";

export function ProductGallery({
  images,
  name,
  layout = "square",
  className = "",
  onImageClick,
}: {
  images: AssetDTO[];
  name: string;
  layout?: "square" | "fill";
  className?: string;
  onImageClick?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const hasMultipleImages = images.length > 1;

  const select = (nextIndex: number) => {
    if (!images.length) return;

    setIndex((nextIndex + images.length) % images.length);
  };

  const image = (
    <ProductImage image={images[index]} name={name} layout={layout} className={className} />
  );

  return (
    <section
      className="group/gallery relative h-full min-w-0"
      aria-label={`Galeria de imagens de ${name}`}
      tabIndex={onImageClick ? undefined : 0}
      onKeyDown={(event) => {
        if (!hasMultipleImages) return;

        if (event.key === "ArrowLeft") select(index - 1);

        if (event.key === "ArrowRight") select(index + 1);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;

        const endX = event.changedTouches[0]?.clientX;

        if (endX === undefined) return;

        const distance = endX - touchStartX.current;

        touchStartX.current = null;

        if (Math.abs(distance) < 40) return;

        select(distance > 0 ? index - 1 : index + 1);
      }}
    >
      {onImageClick ? (
        <button
          type="button"
          onClick={onImageClick}
          className="block h-full w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          aria-label={`Ver ${name}`}
        >
          {image}
        </button>
      ) : (
        image
      )}

      {hasMultipleImages ? (
        <>
          <div className="absolute left-2 top-1/2 z-10 -translate-y-1/2">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="border border-white/60 bg-black/55 text-white shadow-md hover:bg-black/70 hover:text-white"
              onClick={() => select(index - 1)}
              aria-label="Ver foto anterior"
            >
              <ChevronLeft />
            </Button>
          </div>
          <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="border border-white/60 bg-black/55 text-white shadow-md hover:bg-black/70 hover:text-white"
              onClick={() => select(index + 1)}
              aria-label="Ver próxima foto"
            >
              <ChevronRight />
            </Button>
          </div>
          <div
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-black/55 px-2 py-1"
            role="status"
            aria-label={`Foto ${index + 1} de ${images.length}`}
          >
            {images.map((item, dotIndex) => (
              <span
                key={item.id}
                className={`size-1.5 rounded-full ${dotIndex === index ? "bg-white" : "bg-white/45"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
