import { ShieldCheck } from "lucide-react";

export default function PlatformAdminPage() {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Operação da plataforma
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        O acesso interno está protegido e pronto. A busca de lojas será adicionada na próxima tarefa
        da Sprint 2.
      </p>
    </section>
  );
}
