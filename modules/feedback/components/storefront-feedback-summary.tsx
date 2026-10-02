import { CircleAlert, MessageSquareText, SearchCheck, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorefrontFeedbackSummaryDTO } from "../contracts";
import { storefrontFeedbackKindLabels } from "../contracts";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function StorefrontFeedbackSummary({ summary }: { summary: StorefrontFeedbackSummaryDTO }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow">VOZ DOS CLIENTES</p>
        <h2 className="mt-1 font-heading text-xl font-semibold">Feedback da sua vitrine</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Veja se os visitantes encontraram o que buscavam e onde a experiência pode melhorar.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Respostas</CardDescription>
            <CardTitle className="text-2xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Nota média</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {summary.averageRating?.toFixed(1) ?? "—"}
              <Star className="size-5 fill-primary text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Encontraram o produto</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {summary.found}
              <SearchCheck className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Não encontraram ou tiveram problema</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {summary.notFound + summary.problems}
              <CircleAlert className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="size-5 text-primary" />
            Comentários recentes
          </CardTitle>
          <CardDescription>Os cinco relatos mais recentes com comentário.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.recent.length ? (
            <ul className="divide-y">
              {summary.recent.map((feedback) => (
                <li key={feedback.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{storefrontFeedbackKindLabels[feedback.kind]}</span>
                    <span>
                      {feedback.rating}/5 · {formatDate(feedback.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm leading-relaxed">{feedback.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Os comentários dos visitantes aparecerão aqui.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
