import ExcelJS from "exceljs";
import type { z } from "zod";
import {
  type ImportProductRow,
  type ImportRowPreview,
  importProductRowSchema,
  type ProductImportPreviewDTO,
} from "../../contracts/import";

export const MAX_IMPORT_ROWS = 500;

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

const expectedHeaders = ["nome", "descricao", "preco", "categoria", "disponibilidade"];

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();

  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function parsePrice(value: unknown): { cents?: number; display: string } {
  if (typeof value === "number" && Number.isFinite(value))
    return { cents: Math.round(value * 100), display: value.toFixed(2) };

  const display = normalizeText(value);
  const compact = display.replace(/\s/g, "").replace(/^R\$/i, "");
  const decimal = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  const parsed = Number(decimal);

  return Number.isFinite(parsed) ? { cents: Math.round(parsed * 100), display } : { display };
}

function parseAvailability(value: unknown): { value?: boolean; display: string } {
  if (typeof value === "boolean") return { value, display: value ? "Sim" : "Não" };

  if (typeof value === "number" && (value === 0 || value === 1))
    return { value: value === 1, display: String(value) };

  const display = normalizeText(value);

  if (!display) return { value: true, display: "Sim" };

  const normalized = normalizeHeader(display);

  if (["sim", "true", "1", "disponivel"].includes(normalized)) return { value: true, display };

  if (["nao", "false", "0", "indisponivel"].includes(normalized)) return { value: false, display };

  return { display };
}

function zodMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const field = issue.path.at(-1);
    const labels: Record<string, string> = {
      name: "Nome",
      description: "Descrição",
      priceCents: "Preço",
      categoryName: "Categoria",
      available: "Disponibilidade",
    };

    return `${labels[String(field)] ?? "Campo"}: ${issue.message}`;
  });
}

export async function parseProductWorkbook(bytes: Uint8Array): Promise<ProductImportPreviewDTO> {
  if (!bytes.byteLength) throw new Error("A planilha está vazia.");

  if (bytes.byteLength > MAX_IMPORT_FILE_BYTES)
    throw new Error("A planilha deve ter no máximo 5 MB.");

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(bytes as never);
  } catch {
    throw new Error("Não foi possível ler o arquivo .xlsx.");
  }

  const sheet = workbook.worksheets[0];

  if (!sheet) throw new Error("A planilha não possui abas.");

  const headers = expectedHeaders.map((_, index) =>
    normalizeHeader(sheet.getRow(1).getCell(index + 1).value)
  );

  if (headers.some((header, index) => header !== expectedHeaders[index]))
    throw new Error("Use o modelo oficial sem alterar os nomes das colunas.");

  const nonEmptyRows = Array.from(
    { length: Math.max(0, sheet.rowCount - 1) },
    (_, index) => index + 2
  ).filter((rowNumber) => {
    const row = sheet.getRow(rowNumber);

    return expectedHeaders.some((_, column) => normalizeText(row.getCell(column + 1).value));
  });

  if (!nonEmptyRows.length) throw new Error("A planilha não possui produtos.");

  if (nonEmptyRows.length > MAX_IMPORT_ROWS)
    throw new Error(`Importe no máximo ${MAX_IMPORT_ROWS} produtos por arquivo.`);

  const rows: ImportRowPreview[] = nonEmptyRows.map((rowNumber) => {
    const row = sheet.getRow(rowNumber);
    const price = parsePrice(row.getCell(3).value);
    const availability = parseAvailability(row.getCell(5).value);
    const values = {
      name: normalizeText(row.getCell(1).value),
      description: normalizeText(row.getCell(2).value),
      price: price.display,
      categoryName: normalizeText(row.getCell(4).value),
      available: availability.display,
    };
    const parsed = importProductRowSchema.safeParse({
      row: rowNumber,
      name: values.name,
      description: values.description,
      priceCents: price.cents,
      categoryName: values.categoryName,
      available: availability.value,
    });

    return {
      row: rowNumber,
      values,
      product: parsed.success ? parsed.data : null,
      errors: parsed.success ? [] : zodMessages(parsed.error),
    };
  });

  return {
    rows,
    validCount: rows.filter((row) => row.product).length,
    invalidCount: rows.filter((row) => !row.product).length,
  };
}

export async function createProductImportTemplate(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Produtos");

  sheet.columns = [
    { header: "Nome", key: "name", width: 32 },
    { header: "Descrição", key: "description", width: 48 },
    { header: "Preço", key: "price", width: 14 },
    { header: "Categoria", key: "category", width: 24 },
    { header: "Disponibilidade", key: "available", width: 20 },
  ];
  sheet.addRow({
    name: "Camiseta básica",
    description: "Algodão, modelagem confortável",
    price: 49.9,
    category: "Camisetas",
    available: "Sim",
  });
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(3).numFmt = "R$ #,##0.00";
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export function validImportRows(preview: ProductImportPreviewDTO): ImportProductRow[] {
  return preview.rows.flatMap((row) => (row.product ? [row.product] : []));
}
