import { z } from "zod";
import type { ProductDTO } from "@/modules/catalog/contracts";
import { productPrice } from "@/modules/catalog/pricing";

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int().min(1).max(99),
  name: z.string().max(120),
});

export const cartSchema = z.array(cartLineSchema).max(100);

export const likesSchema = z.array(z.string().uuid()).max(1000);

export type CartLine = z.infer<typeof cartLineSchema>;

export type ResolvedLine = CartLine & {
  product: ProductDTO | null;
  label: string;
  priceCents: number;
  available: boolean;
};

export function selectionKeys(storeId: string) {
  return {
    cart: `tua-vitrine:v1:${storeId}:cart`,
    likes: `tua-vitrine:v1:${storeId}:likes`,
    pending: `tua-vitrine:v1:${storeId}:pending-likes`,
  };
}

export function lineKey(line: Pick<CartLine, "productId" | "variantId">) {
  return `${line.productId}:${line.variantId ?? "base"}`;
}

export function resolveCart(lines: CartLine[], products: ProductDTO[]): ResolvedLine[] {
  const byId = new Map(products.map((product) => [product.id, product]));

  return lines.map((line) => {
    const product = byId.get(line.productId) ?? null;
    const variant = product?.variants.find((item) => item.id === line.variantId);
    const available =
      !!product?.available &&
      (product.variants.length ? !!variant?.available : line.variantId === null);

    return {
      ...line,
      product,
      label: product ? `${product.name}${variant ? ` · ${variant.label}` : ""}` : line.name,
      priceCents: product ? productPrice(product, variant).currentPriceCents : 0,
      available,
    };
  });
}
