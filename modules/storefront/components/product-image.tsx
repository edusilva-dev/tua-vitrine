import { PackageOpen } from "lucide-react";
import Image from "next/image";
import type { AssetDTO } from "@/modules/catalog/contracts";

export function ProductImage({
  image,
  name,
  className = "",
  layout = "square",
  compactPlaceholder = false,
}: {
  image?: AssetDTO | undefined;
  name: string;
  className?: string;
  layout?: "square" | "fill";
  compactPlaceholder?: boolean;
}) {
  return (
    <div
      data-testid="product-image"
      className={`relative flex items-center justify-center overflow-hidden bg-muted ${layout === "square" ? "aspect-square" : "h-full min-h-36 w-full"} ${className}`}
    >
      {image ? (
        <Image
          src={image.url}
          alt={name}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 28vw"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div
          data-testid="product-image-placeholder"
          className={`flex items-center justify-center text-muted-foreground/50 ${compactPlaceholder ? "size-full" : "flex-col gap-3"}`}
        >
          <PackageOpen
            data-testid="product-image-placeholder-icon"
            className={compactPlaceholder ? "size-6 stroke-1" : "size-12 stroke-1"}
          />
          <span className={compactPlaceholder ? "sr-only" : "text-xs"}>Imagem em breve</span>
        </div>
      )}
    </div>
  );
}
