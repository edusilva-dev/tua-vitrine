import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando página" className="mx-auto max-w-7xl space-y-6 p-8">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-52 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
