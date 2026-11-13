import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandLogo variant="mark" priority className="mb-6 size-16" />
      <h1 className="font-heading text-3xl font-semibold">Essa vitrine não está por aqui.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Confira o endereço. A loja pode ainda não ter sido publicada.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Ir para o início</Link>
      </Button>
    </main>
  );
}
