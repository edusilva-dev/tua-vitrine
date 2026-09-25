import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div role="status" aria-label="Carregando conteúdo" className="space-y-7">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
