"use client";

import { CalendarDays, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MetricsDTO } from "../contracts";

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

export function MetricsPeriodFilter({
  period,
  initialError,
}: {
  period: MetricsDTO["period"];
  initialError?: string | undefined;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [error, setError] = useState(initialError ?? "");
  const freeHistory = period.metricsHistoryDays !== null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!from || !to) {
      setError("Informe a data inicial e a data final.");

      return;
    }

    if (from > to) {
      setError("A data final deve ser igual ou posterior à data inicial.");

      return;
    }

    setError("");
    router.push(periodHref(from, to));
  }

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <h2 className="font-semibold">Período analisado</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPeriodDate(period.from)} até {formatPeriodDate(period.to)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              href={
                freeHistory
                  ? periodHref(shiftDate(period.availableTo, -6), period.availableTo)
                  : "/admin/metrics"
              }
            >
              {freeHistory ? "Últimos 7 dias" : "Este mês"}
            </Link>
          </Button>
          {!freeHistory && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={periodHref(shiftDate(period.availableTo, -6), period.availableTo)}>
                  7 dias
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={periodHref(shiftDate(period.availableTo, -29), period.availableTo)}>
                  30 dias
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="metrics-from">Data inicial</Label>
          <Input
            id="metrics-from"
            type="date"
            name="from"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setError("");
            }}
            min={period.availableFrom ?? undefined}
            max={to || period.availableTo}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="metrics-to">Data final</Label>
          <Input
            id="metrics-to"
            type="date"
            name="to"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setError("");
            }}
            min={from || period.availableFrom || undefined}
            max={period.availableTo}
            required
          />
        </div>
        <Button type="submit" className="self-end">
          Aplicar período
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
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
  );
}
