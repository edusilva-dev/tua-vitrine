import { SupportList } from "@/modules/platform-admin/components/support-list";
import { supportListInputSchema } from "@/modules/platform-admin/contracts/support";
import { listSupportRequests } from "@/modules/platform-admin/server/support";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SupportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const filters = supportListInputSchema.parse({
    q: first(p.q),
    status: first(p.status) === "ALL" ? undefined : first(p.status),
    category: first(p.category) === "ALL" ? undefined : first(p.category),
    storeId: first(p.storeId),
    period: first(p.period) === "ALL" ? undefined : first(p.period),
    page: first(p.page),
  });
  const result = await listSupportRequests(filters);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Suporte</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Acompanhe solicitações registradas pelo painel dos lojistas.
        </p>
      </div>
      <SupportList result={result} filters={filters} />
    </div>
  );
}
