import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformAdminLoading() {
  return (
    <div aria-label="Carregando lojas" role="status">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <Skeleton className="mt-6 h-32 rounded-2xl" />
      <Skeleton className="mt-6 h-80 rounded-2xl" />
    </div>
  );
}
