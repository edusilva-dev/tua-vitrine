import { z } from "zod";

const cents = z.number().int().min(0).max(999999999);

export const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  // Kept optional for backwards compatibility with clients that still send it.
  // The server derives the persisted label from the selected option values.
  label: z.string().trim().max(120).optional(),
  options: z.record(z.string().min(1).max(40), z.string().min(1).max(60)),
  priceCents: cents,
  available: z.boolean(),
});

export function variantLabel(options: Record<string, string>): string {
  return Object.entries(options)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, value]) => value.trim())
    .filter(Boolean)
    .join(" / ");
}

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(120),
    description: z.string().trim().max(5000),
    priceCents: cents,
    available: z.boolean(),
    categoryName: z.string().trim().max(60),
    assetIds: z.array(z.string().uuid()).max(5),
    variants: z.array(variantInputSchema).max(100),
  })
  .superRefine((value, ctx) => {
    const keys = value.variants.map((variant) =>
      JSON.stringify(Object.entries(variant.options).sort(([a], [b]) => a.localeCompare(b)))
    );

    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "As combinações devem ser únicas.",
      });
    }

    const dimensions = value.variants[0]
      ? Object.keys(value.variants[0].options).sort().join("|")
      : "";

    for (const [index, variant] of value.variants.entries()) {
      if (
        !Object.keys(variant.options).length ||
        Object.keys(variant.options).sort().join("|") !== dimensions
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index],
          message: "Preencha as mesmas opções em todas as variantes.",
        });
      }
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export type VariantDTO = {
  id: string;
  label: string;
  options: Record<string, string>;
  priceCents: number;
  available: boolean;
};

export type AssetDTO = { id: string; url: string; width: number; height: number };

export type CategoryDTO = { id: string; name: string };

export type ProductDTO = {
  id: string;
  storeId: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  published: boolean;
  category: CategoryDTO | null;
  images: AssetDTO[];
  variants: VariantDTO[];
  createdAt: string;
  updatedAt: string;
};

export type ProductListDTO = {
  data: ProductDTO[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ProductFilters = { q?: string; category?: string; available?: string; page?: number };
