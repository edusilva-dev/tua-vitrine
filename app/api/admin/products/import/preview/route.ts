import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { AppError, handle } from "@/lib/server/http";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import {
  MAX_IMPORT_FILE_BYTES,
  parseProductWorkbook,
} from "@/modules/catalog/server/import/parser";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const context = await getAdminContext();
    const entitlements = await getEntitlements(context);

    if (!entitlements.canImportProducts)
      throw new AppError(
        403,
        "PLAN_REQUIRED",
        "A importação por planilha está disponível nos planos Essencial e Profissional."
      );

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File))
      throw new AppError(422, "FILE_REQUIRED", "Selecione uma planilha .xlsx.");

    if (!file.name.toLowerCase().endsWith(".xlsx"))
      throw new AppError(422, "FILE_TYPE", "Envie um arquivo no formato .xlsx.");

    if (file.size > MAX_IMPORT_FILE_BYTES)
      throw new AppError(413, "FILE_SIZE", "A planilha deve ter no máximo 5 MB.");

    try {
      return Response.json({
        data: await parseProductWorkbook(new Uint8Array(await file.arrayBuffer())),
      });
    } catch (error) {
      throw new AppError(
        422,
        "INVALID_WORKBOOK",
        error instanceof Error ? error.message : "Não foi possível ler a planilha."
      );
    }
  });
}
