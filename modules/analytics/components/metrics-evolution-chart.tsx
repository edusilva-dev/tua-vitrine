"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MetricsDTO } from "../contracts";

type MetricKey = "impressions" | "productViews";
type ActiveMetric = MetricKey | "all";

const chartConfig = {
  impressions: { label: "Visitas à vitrine", color: "var(--chart-1)" },
  productViews: { label: "Produtos visualizados", color: "var(--chart-2)" },
} satisfies ChartConfig;

function calculateGrowth(timeline: MetricsDTO["timeline"], key: MetricKey): number | null {
  if (timeline.length < 2) return null;

  const midpoint = Math.ceil(timeline.length / 2);
  const firstHalf = timeline.slice(0, midpoint);
  const secondHalf = timeline.slice(midpoint);
  const firstAverage = firstHalf.reduce((total, item) => total + item[key], 0) / firstHalf.length;
  const secondAverage =
    secondHalf.reduce((total, item) => total + item[key], 0) / secondHalf.length;

  if (firstAverage === 0) return secondAverage > 0 ? Number.POSITIVE_INFINITY : 0;

  return Math.round(((secondAverage - firstAverage) / firstAverage) * 100);
}

function Growth({ value }: { value: number | null }) {
  if (value === null) return <span>Período curto para comparar</span>;

  if (value === Number.POSITIVE_INFINITY) return <span>Começou a crescer neste período</span>;

  if (value === 0) return <span>Sem variação entre as metades</span>;

  const Icon = value > 0 ? TrendingUp : TrendingDown;

  return (
    <span className="flex items-center gap-1">
      <Icon size={13} />
      {value > 0 ? "+" : ""}
      {value}% na segunda metade
    </span>
  );
}

export function MetricsEvolutionChart({
  timeline,
  interval,
}: {
  timeline: MetricsDTO["timeline"];
  interval: MetricsDTO["period"]["interval"];
}) {
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>("all");
  const metrics = [
    {
      key: "impressions" as const,
      label: "Visitas",
      total: timeline.reduce((total, item) => total + item.impressions, 0),
      growth: calculateGrowth(timeline, "impressions"),
    },
    {
      key: "productViews" as const,
      label: "Produtos vistos",
      total: timeline.reduce((total, item) => total + item.productViews, 0),
      growth: calculateGrowth(timeline, "productViews"),
    },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="font-semibold">Evolução no período</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {interval === "DAY"
            ? "Passe pelo gráfico para acompanhar a evolução diária."
            : "Passe pelo gráfico para acompanhar a evolução mensal."}
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {metrics.map((metric) => {
          const focused = activeMetric === metric.key;
          const visible = activeMetric === "all" || focused;

          return (
            <Button
              key={metric.key}
              type="button"
              variant="outline"
              aria-pressed={visible}
              onClick={() => setActiveMetric(focused ? "all" : metric.key)}
              className="h-auto min-w-0 justify-start px-4 py-3 text-left aria-pressed:border-primary/40 aria-pressed:bg-muted"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: `var(--color-${metric.key})` }}
                  />
                  {metric.label}
                </span>
                <span className="mt-1 block font-heading text-xl font-semibold text-foreground">
                  {metric.total.toLocaleString("pt-BR")}
                </span>
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  <Growth value={metric.growth} />
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      <ChartContainer config={chartConfig} className="mt-6 h-72 w-full aspect-auto">
        <BarChart
          data={timeline}
          margin={{ left: -14, right: 12, top: 8 }}
          barCategoryGap="24%"
          barGap={4}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={42} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.65 }}
            content={
              <ChartTooltipContent labelFormatter={(label) => `Período: ${String(label)}`} />
            }
          />
          {(activeMetric === "all" || activeMetric === "impressions") && (
            <Bar
              dataKey="impressions"
              fill="var(--color-impressions)"
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
              activeBar={{ fillOpacity: 0.75 }}
            />
          )}
          {(activeMetric === "all" || activeMetric === "productViews") && (
            <Bar
              dataKey="productViews"
              fill="var(--color-productViews)"
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
              activeBar={{ fillOpacity: 0.75 }}
            />
          )}
        </BarChart>
      </ChartContainer>
    </section>
  );
}
