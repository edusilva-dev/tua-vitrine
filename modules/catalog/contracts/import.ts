import { z } from "zod";

const cents = z.number().int().min(0).max(999999999);

export const importProductRowSchema = z.object({
  row: z.number().int().min(2).max(502),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000),
  priceCents: cents,
  categoryName: z.string().trim().max(60),
  available: z.boolean(),
});

export const productImportConfirmSchema = z.object({
  rows: z.array(importProductRowSchema).min(1).max(500),
});

export type ImportProductRow = z.infer<typeof importProductRowSchema>;

export type ImportRowPreview = {
  row: number;
  values: {
    name: string;
    description: string;
    price: string;
    categoryName: string;
    available: string;
  };
  product: ImportProductRow | null;
  errors: string[];
};

export type ProductImportPreviewDTO = {
  rows: ImportRowPreview[];
  validCount: number;
  invalidCount: number;
};

export type ProductImportResultDTO = {
  importedCount: number;
  alreadyImported: boolean;
};
