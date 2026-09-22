"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">Não conseguimos abrir esta página.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tente novamente em instantes. Seus dados salvos continuam seguros.
      </p>
      <Button className="mt-6" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
