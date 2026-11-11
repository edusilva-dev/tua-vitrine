"use client";

import { useRef, useState } from "react";
import type { AssetDTO } from "@/modules/catalog/contracts";
import { ProductImage } from "./product-image";

export function ProductGallery({
  images,
  name,
  layout = "square",
  className = "",
  onOpen,
}: {
  images: AssetDTO[];
  name: string;
  layout?: "square" | "fill";
  className?: string;
  onOpen?: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className={`relative min-w-0 overflow-hidden ${className}`}>
      <div
        data-testid="product-gallery"
        ref={viewport}
        className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${layout === "fill" ? "h-full" : ""}`}
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;

          if (width) setActiveIndex(Math.round(event.currentTarget.scrollLeft / width));
        }}
      >
        {(images.length ? images : [undefined]).map((image, index) => {
          const content = (
            <ProductImage
              key={image?.id ?? "placeholder"}
              image={image}
              name={images.length > 1 ? `${name}, foto ${index + 1}` : name}
              layout={layout}
              className="size-full"
            />
          );

          return onOpen ? (
            <button
              key={image?.id ?? "placeholder"}
              type="button"
              className="w-full shrink-0 snap-center text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              onClick={onOpen}
              aria-label={`Ver ${name}${images.length > 1 ? `, foto ${index + 1}` : ""}`}
            >
              {content}
            </button>
          ) : (
            <div key={image?.id ?? "placeholder"} className="w-full shrink-0 snap-center">
              {content}
            </div>
          );
        })}
      </div>
      {images.length > 1 ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
          aria-hidden="true"
        >
          {images.map((image, index) => (
            <span
              key={image.id}
              className={`size-1.5 rounded-full shadow-sm ring-1 ring-black/10 transition-colors ${index === activeIndex ? "bg-white" : "bg-white/50"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
