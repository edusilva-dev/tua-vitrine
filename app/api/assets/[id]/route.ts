import { z } from "zod";
import { AppError, handle } from "@/lib/server/http";
import { readAsset } from "@/lib/server/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, route: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = z
      .string()
      .uuid()
      .parse((await route.params).id);
    const asset = await readAsset(id);

    if (!asset) throw new AppError(404, "NOT_FOUND", "Imagem não encontrada.");

    return new Response(new Uint8Array(asset.data), {
      headers: {
        "Content-Type": asset.mime,
        "Content-Length": String(asset.data.length),
        "Cache-Control": asset.publiclyVisible
          ? "public, max-age=3600, s-maxage=2592000, immutable"
          : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
