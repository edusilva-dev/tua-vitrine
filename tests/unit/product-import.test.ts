import { describe, expect, test } from "bun:test";
import ExcelJS from "exceljs";
import {
  createProductImportTemplate,
  MAX_IMPORT_ROWS,
  parseProductWorkbook,
  validImportRows,
} from "@/modules/catalog/server/import/parser";

async function workbookWith(rows: unknown[][]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Produtos");

  sheet.addRow(["Nome", "Descrição", "Preço", "Categoria", "Disponibilidade"]);

  for (const row of rows) sheet.addRow(row);

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe("importação de produtos", () => {
  test("gera um modelo oficial que pode ser lido", async () => {
    const preview = await parseProductWorkbook(await createProductImportTemplate());

    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(0);
    expect(preview.rows[0]?.product).toMatchObject({
      name: "Camiseta básica",
      priceCents: 4990,
      categoryName: "Camisetas",
      available: true,
    });
  });

  test("aceita moeda brasileira e disponibilidade em português", async () => {
    const preview = await parseProductWorkbook(
      await workbookWith([
        ["Prancha", "Modelo 6 pés", "R$ 1.299,90", "Surf", "Sim"],
        ["Quilha", "", "89,50", "Acessórios", "Não"],
      ])
    );

    expect(validImportRows(preview)).toEqual([
      {
        row: 2,
        name: "Prancha",
        description: "Modelo 6 pés",
        priceCents: 129990,
        categoryName: "Surf",
        available: true,
      },
      {
        row: 3,
        name: "Quilha",
        description: "",
        priceCents: 8950,
        categoryName: "Acessórios",
        available: false,
      },
    ]);
  });

  test("mantém linhas inválidas fora da confirmação e relata seus erros", async () => {
    const preview = await parseProductWorkbook(
      await workbookWith([
        ["A", "", "sem preço", "", "talvez"],
        ["Produto válido", "", 10, "", ""],
      ])
    );

    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows[0]?.product).toBeNull();
    expect(preview.rows[0]?.errors.length).toBeGreaterThanOrEqual(3);
    expect(validImportRows(preview)).toHaveLength(1);
  });

  test("recusa mais de 500 linhas preenchidas", async () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => [
      `Produto ${index}`,
      "",
      10,
      "",
      "Sim",
    ]);

    await expect(parseProductWorkbook(await workbookWith(rows))).rejects.toThrow(
      "Importe no máximo 500 produtos"
    );
  });

  test("recusa cabeçalhos alterados", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Produtos");

    sheet.addRow(["Produto", "Descrição", "Preço", "Categoria", "Disponibilidade"]);
    sheet.addRow(["Camiseta", "", 10, "", "Sim"]);

    await expect(
      parseProductWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()))
    ).rejects.toThrow("modelo oficial");
  });
});
