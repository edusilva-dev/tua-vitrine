import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { AppError, handle } from "@/lib/server/http";
import { saveAsset } from "@/lib/server/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const size = Number(request.headers.get("content-length") ?? 0);

    if (size > 6 * 1024 * 1024) throw new AppError(413, "IMAGE", "O envio excede 5 MB.");

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) throw new AppError(422, "IMAGE", "Selecione uma imagem.");

    return Response.json({ data: await saveAsset(await getAdminContext(), file) }, { status: 201 });
  });
}
