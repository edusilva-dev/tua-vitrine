import { AppError, handle } from "@/lib/server/http";
import { getPlatformStoreDetail } from "@/modules/platform-admin/server/store-detail";

export async function GET(_request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  return handle(async () => {
    const { storeId } = await params;
    const store = await getPlatformStoreDetail(storeId);

    if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

    return Response.json({ data: store });
  });
}
