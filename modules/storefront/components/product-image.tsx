import { PackageOpen } from "lucide-react";
import Image from "next/image";
import type { AssetDTO } from "@/modules/catalog/contracts";

export function ProductImage({
  image,
  name,
  className = "",
}: {
  image?: AssetDTO | undefined;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex aspect-square items-center justify-center overflow-hidden bg-muted ${className}`}
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
        <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
          <PackageOpen className="size-12 stroke-1" />
          <span className="text-xs">Imagem em breve</span>
        </div>
      )}
    </div>
  );
}
