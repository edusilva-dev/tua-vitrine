import { AuditList } from "@/modules/platform-admin/components/audit-list";
import { adminAuditListInputSchema } from "@/modules/platform-admin/contracts/audit";
import { listAdminAuditEvents } from "@/modules/platform-admin/server/audit-list";

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filters = adminAuditListInputSchema.parse({
    storeId: first(params.storeId) || undefined,
    adminId: first(params.adminId) === "ALL" ? undefined : first(params.adminId),
    action: first(params.action) === "ALL" ? undefined : first(params.action),
    result: first(params.result) === "ALL" ? undefined : first(params.result),
    from: first(params.from) || undefined,
    to: first(params.to) || undefined,
    page: first(params.page),
  });
  const result = await listAdminAuditEvents(filters);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Auditoria
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Consulte quem realizou cada ação operacional, quando ela ocorreu e qual foi o resultado.
        </p>
      </div>
      <AuditList result={result} filters={filters} />
    </div>
  );
}
