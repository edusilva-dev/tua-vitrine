import { StoreList } from "@/modules/platform-admin/components/store-list";
import { platformStoreListInputSchema } from "@/modules/platform-admin/contracts/stores";
import { listPlatformStores } from "@/modules/platform-admin/server/stores";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = platformStoreListInputSchema.parse({
    q: first(params.q),
    status: first(params.status) || undefined,
    plan: first(params.plan) || undefined,
    subscription: first(params.subscription) || undefined,
    page: first(params.page),
  });
  const result = await listPlatformStores(filters);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Lojas</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Localize uma loja para consultar seu estado operacional.
        </p>
      </div>
      <StoreList result={result} filters={filters} />
    </div>
  );
}
