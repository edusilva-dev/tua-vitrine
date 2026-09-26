import type { ProductDTO, VariantDTO } from "./contracts";

type PriceSource = Pick<ProductDTO | VariantDTO, "priceCents" | "discountPriceCents">;

export type PricePresentation = {
  currentPriceCents: number;
  originalPriceCents: number | null;
  discountPercent: number | null;
};

function presentPrice(source: PriceSource): PricePresentation {
  if (source.discountPriceCents === null || source.discountPriceCents >= source.priceCents)
    return {
      currentPriceCents: source.priceCents,
      originalPriceCents: null,
      discountPercent: null,
    };

  return {
    currentPriceCents: source.discountPriceCents,
    originalPriceCents: source.priceCents,
    discountPercent: Math.round(
      ((source.priceCents - source.discountPriceCents) / source.priceCents) * 100
    ),
  };
}

export function productPrice(product: ProductDTO, variant?: VariantDTO): PricePresentation {
  if (variant) return presentPrice(variant);

  if (!product.variants.length) return presentPrice(product);

  return product.variants
    .map(presentPrice)
    .reduce((lowest, price) =>
      price.currentPriceCents < lowest.currentPriceCents ? price : lowest
    );
}
