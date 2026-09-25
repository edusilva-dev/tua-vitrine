import { assertAdminAccess } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { createProductImportTemplate } from "@/modules/catalog/server/import/parser";

export async function GET() {
  return handle(async () => {
    await assertAdminAccess();
    const template = await createProductImportTemplate();

    return new Response(Uint8Array.from(template).buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modelo-produtos-tua-vitrine.xlsx"',
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
