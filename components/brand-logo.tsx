import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "full" | "mark";
};

export function BrandLogo({ className, priority = false, variant = "full" }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/assets/icone-tua-vitrine.png"
        alt=""
        width={1254}
        height={1254}
        priority={priority}
        className={cn("size-10 object-contain", className)}
      />
    );
  }

  return (
    <Image
      src="/assets/tua-vitrine-logo.png"
      alt="Tua Vitrine"
      width={2172}
      height={724}
      priority={priority}
      className={cn("h-auto w-40 object-contain", className)}
    />
  );
}
