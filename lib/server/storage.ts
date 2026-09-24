import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { getAdminContext, type StoreContext } from "./context";
import { db } from "./db";
import { getEnv } from "./env";
import { AppError } from "./http";
import { localStorageAdapter } from "./storage-adapter";

export async function saveAsset(context: StoreContext, file: File) {
  if (getEnv().STORAGE_DRIVER === "disabled") {
    throw new AppError(
      503,
      "STORAGE_UNAVAILABLE",
      "O envio de imagens estará disponível após a configuração do storage."
    );
  }

  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new AppError(422, "IMAGE", "Envie JPG, PNG ou WebP com até 5 MB.");
  }

  let result: { data: Buffer; info: OutputInfo };

  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 4096 * 4096,
      animated: false,
    });
    const metadata = await source.metadata();
    const expected: Record<string, string> = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    };

    if (
      metadata.format !== expected[file.type] ||
      (metadata.pages ?? 1) > 1 ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 4096 ||
      metadata.height > 4096
    ) {
      throw new Error("format");
    }

    result = await source
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError(
      422,
      "IMAGE",
      "Use uma imagem válida, não animada, de até 4096 × 4096 pixels."
    );
  }

  const storageKey = `${randomUUID()}.webp`;

  await localStorageAdapter.put(storageKey, result.data);

  try {
    const asset = await db.asset.create({
      data: {
        storeId: context.storeId,
        storageKey,
        mime: "image/webp",
        bytes: result.info.size,
        width: result.info.width,
        height: result.info.height,
      },
    });

    return {
      id: asset.id,
      url: `/api/assets/${asset.id}`,
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    await localStorageAdapter.remove(storageKey);
    throw error;
  }
}

export async function readAsset(id: string): Promise<{ data: Buffer; mime: string } | null> {
  if (getEnv().STORAGE_DRIVER === "disabled") return null;

  const asset = await db.asset.findUnique({
    where: { id },
    include: { store: true, images: { where: { product: { archivedAt: null } }, take: 1 } },
  });

  if (!asset) return null;

  const publiclyVisible =
    asset.store.status === "ACTIVE" && (asset.store.logoAssetId === id || asset.images.length > 0);

  if (!publiclyVisible) {
    try {
      const context = await getAdminContext();

      if (context.storeId !== asset.storeId) return null;
    } catch {
      return null;
    }
  }

  const data = await localStorageAdapter.get(asset.storageKey);

  return data ? { data, mime: asset.mime } : null;
}
