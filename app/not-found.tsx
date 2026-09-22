import { Store } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Store size={40} className="mb-6 text-primary" />
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
