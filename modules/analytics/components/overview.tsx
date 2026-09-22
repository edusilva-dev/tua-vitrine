import { ArrowRight, Eye, Heart, Package, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { MetricsDTO } from "@/modules/analytics/contracts";
import type { StoreDTO } from "@/modules/stores/contracts";

export function MetricsOverview({
  metrics,
  store,
  detailed = false,
}: {
  metrics: MetricsDTO;
  store: StoreDTO;
  detailed?: boolean;
}) {
  const cards = [
    {
      label: "Visitas à vitrine",
      value: metrics.impressions,
      icon: Eye,
      detail: "Vezes que sua loja foi aberta",
    },
    {
      label: "Visualizações de produtos",
      value: metrics.productViews,
      icon: ShoppingBag,
      detail: "Interesse nos seus produtos",
    },
    {
      label: "Curtidas recebidas",
      value: metrics.totalLikes,
      icon: Heart,
      detail: "Produtos que conquistaram clientes",
    },
    {
      label: "Produtos cadastrados",
      value: metrics.productCount,
      icon: Package,
      detail: "Seu catálogo em um só lugar",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">{detailed ? "OLHE MAIS DE PERTO" : "SEU NEGÓCIO EM MOVIMENTO"}</p>
        <h1 className="page-title">
          {detailed ? "Estatísticas da vitrine" : "Que bom ter você por aqui."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {detailed ? (
            "Acompanhe o que desperta interesse nos seus clientes."
          ) : (
            <>
              Tudo pronto para fazer a{" "}
              <strong className="font-medium text-foreground">{store.name}</strong> acontecer?
            </>
          )}
        </p>
      </div>
      {!detailed && (
        <section className="relative overflow-hidden rounded-2xl bg-[#dfe8dc] p-7 sm:p-9">
          <div className="absolute -right-10 -top-12 size-64 rounded-full border-[40px] border-white/25" />
          <div className="relative max-w-lg">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 text-xs font-medium text-[#31574a]">
              <Sparkles size={13} />
              Seu próximo cliente está por aí
            </span>
            <h2 className="font-heading text-2xl font-semibold leading-tight text-[#193d35]">
              Sua vitrine aberta.
              <br />
              Seu negócio indo mais longe.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#456455]">
              Capriche nos produtos e compartilhe sua loja. As próximas conversas começam aqui.
            </p>
            <Button asChild className="mt-5">
              <Link href="/admin/products">
                Gerenciar meus produtos
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      )}
      <section aria-label="Métricas da loja" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, detail }) => (
          <article key={label} className="rounded-xl border bg-card p-5">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <span className="rounded-lg bg-[#eef1e9] p-2 text-[#446255]">
                <Icon size={17} />
              </span>
            </div>
            <p className="font-heading text-3xl font-semibold">{value.toLocaleString("pt-BR")}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: "Os mais vistos",
            subtitle: "Produtos que chamam a atenção",
            items: metrics.mostViewed,
            icon: Eye,
          },
          {
            title: "Os favoritos dos clientes",
            subtitle: "Os queridinhos da sua vitrine",
            items: metrics.mostLiked,
            icon: Heart,
          },
        ].map(({ title, subtitle, items, icon: Icon }) => (
          <section key={title} className="rounded-xl border bg-card p-6">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <Icon size={18} className="text-muted-foreground" />
            </div>
            {items.length ? (
              <ol className="mt-5 divide-y">
                {items.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 py-4 text-sm">
                    <span className="grid size-8 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-12 text-center">
                <Icon className="mx-auto mb-3 text-muted-foreground/40" size={30} />
                <p className="text-sm text-muted-foreground">
                  Os primeiros interesses vão aparecer aqui.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Compartilhe sua vitrine para começar.
                </p>
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Dados acumulados desde a criação da loja. A prévia do lojista não entra nas estatísticas.
      </p>
    </div>
  );
}
