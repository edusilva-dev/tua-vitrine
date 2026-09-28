import {
  ArrowRight,
  CalendarDays,
  Eye,
  Heart,
  LockKeyhole,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MetricsDTO } from "@/modules/analytics/contracts";
import type { StoreDTO } from "@/modules/stores/contracts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);

  value.setTime(value.getTime() + days * DAY_IN_MILLISECONDS);

  return value.toISOString().slice(0, 10);
}

function periodHref(from: string, to: string): string {
  return `/admin/metrics?from=${from}&to=${to}`;
}

function formatPeriodDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

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
  const maximumTimelineValue = Math.max(
    1,
    ...metrics.timeline.flatMap((item) => [item.impressions, item.productViews])
  );
  const freeHistory = metrics.period.metricsHistoryDays !== null;

  return (
    <div className="min-w-0 space-y-8">
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
      {detailed && (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-primary" />
                <h2 className="font-semibold">Período analisado</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPeriodDate(metrics.period.from)} até {formatPeriodDate(metrics.period.to)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link
                  href={
                    freeHistory
                      ? periodHref(
                          shiftDate(metrics.period.availableTo, -6),
                          metrics.period.availableTo
                        )
                      : "/admin/metrics"
                  }
                >
                  {freeHistory ? "Últimos 7 dias" : "Este mês"}
                </Link>
              </Button>
              {!freeHistory && (
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={periodHref(
                        shiftDate(metrics.period.availableTo, -6),
                        metrics.period.availableTo
                      )}
                    >
                      7 dias
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={periodHref(
                        shiftDate(metrics.period.availableTo, -29),
                        metrics.period.availableTo
                      )}
                    >
                      30 dias
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <form action="/admin/metrics" className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="grid gap-1.5">
              <Label htmlFor="metrics-from">Data inicial</Label>
              <Input
                id="metrics-from"
                type="date"
                name="from"
                defaultValue={metrics.period.from}
                min={metrics.period.availableFrom ?? undefined}
                max={metrics.period.availableTo}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="metrics-to">Data final</Label>
              <Input
                id="metrics-to"
                type="date"
                name="to"
                defaultValue={metrics.period.to}
                min={metrics.period.availableFrom ?? undefined}
                max={metrics.period.availableTo}
                required
              />
            </div>
            <Button type="submit" className="self-end">
              Aplicar período
            </Button>
          </form>
          {freeHistory && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-muted p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-muted-foreground">
                <LockKeyhole size={15} className="shrink-0" />O plano Free mantém o histórico dos
                últimos 7 dias.
              </p>
              <Link href="/admin/billing" className="font-medium text-primary hover:underline">
                Ver planos com histórico completo
              </Link>
            </div>
          )}
        </section>
      )}
      {!detailed && (
        <section className="relative overflow-hidden rounded-2xl bg-brand-mist p-7 sm:p-9">
          <div className="absolute -right-10 -top-12 size-64 rounded-full border-[40px] border-white/25" />
          <div className="relative max-w-lg">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/65 px-3 py-1 text-xs font-medium text-brand-ink-green">
              <Sparkles size={13} />
              Seu próximo cliente está por aí
            </span>
            <h2 className="font-heading text-2xl font-semibold leading-tight text-brand-ink-strong">
              Sua vitrine aberta.
              <br />
              Seu negócio indo mais longe.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-copy-strong">
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
          <article key={label} className="min-w-0 overflow-hidden rounded-xl border bg-card p-5">
            <div className="mb-6 flex items-center justify-between">
              <p className="min-w-0 text-xs font-medium text-muted-foreground">{label}</p>
              <span className="rounded-lg bg-brand-soft p-2 text-brand-icon">
                <Icon size={17} />
              </span>
            </div>
            <p className="font-heading text-3xl font-semibold">{value.toLocaleString("pt-BR")}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>
      {detailed && (
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="font-semibold">Evolução no período</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.period.interval === "DAY"
                  ? "Acompanhamento diário das visitas e visualizações."
                  : "Acompanhamento mensal para períodos mais longos."}
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" /> Visitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-brand-sage" /> Produtos
              </span>
            </div>
          </div>
          <div className="mt-7 overflow-x-auto pb-2">
            <div className="flex h-56 min-w-max items-end gap-2 border-b px-1">
              {metrics.timeline.map((item) => (
                <div key={item.key} className="flex w-12 shrink-0 flex-col items-center gap-2">
                  <div
                    className="flex h-44 w-full items-end justify-center gap-1"
                    role="img"
                    aria-label={`${item.label}: ${item.impressions} visitas e ${item.productViews} visualizações de produtos`}
                  >
                    <span
                      className="w-3 rounded-t bg-primary"
                      style={{
                        height: `${Math.max(2, (item.impressions / maximumTimelineValue) * 100)}%`,
                      }}
                    />
                    <span
                      className="w-3 rounded-t bg-brand-sage"
                      style={{
                        height: `${Math.max(2, (item.productViews / maximumTimelineValue) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
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
          <section key={title} className="min-w-0 overflow-hidden rounded-xl border bg-card p-6">
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
                  <li key={item.id} className="flex min-w-0 items-center gap-3 py-4 text-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <strong className="shrink-0">{item.count}</strong>
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
        {detailed
          ? `Resultados do período selecionado. ${freeHistory ? "O histórico do Free é limitado a 7 dias. " : ""}`
          : `Resumo de ${formatPeriodDate(metrics.period.from)} até ${formatPeriodDate(metrics.period.to)}. `}
        A prévia do lojista não entra nas estatísticas.
      </p>
    </div>
  );
}
