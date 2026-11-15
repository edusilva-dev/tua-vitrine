import { notFound } from "next/navigation";
import { PlatformStoreDetail } from "@/modules/platform-admin/components/store-detail";
import { getPlatformStoreDetail } from "@/modules/platform-admin/server/store-detail";

export default async function PlatformStoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const store = await getPlatformStoreDetail(storeId);

  if (!store) notFound();

  return <PlatformStoreDetail store={store} />;
}
