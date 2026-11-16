import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportDetailForm } from "@/modules/platform-admin/components/support-detail-form";
import { getSupportRequest } from "@/modules/platform-admin/server/support";
import { supportCategoryLabels } from "@/modules/support/contracts";

const statusLabels = { NEW: "Novo", IN_PROGRESS: "Em atendimento", RESOLVED: "Resolvido" } as const;
const format = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v));

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const request = await getSupportRequest(requestId);

  if (!request) notFound();

  const mailto = `mailto:${request.replyEmail}?subject=${encodeURIComponent(`Re: ${request.subject}`)}`;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/super-admin/support">
          <ArrowLeft />
          Voltar para suporte
        </Link>
      </Button>
      <header className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge>{statusLabels[request.status]}</Badge>
          <Badge variant="outline">{supportCategoryLabels[request.category]}</Badge>
          <Badge variant={request.notificationStatus === "FAILED" ? "destructive" : "secondary"}>
            {request.notificationStatus === "SENT"
              ? "E-mail enviado"
              : request.notificationStatus === "FAILED"
                ? "Falha no e-mail"
                : "E-mail pendente"}
          </Badge>
        </div>
        <h1 className="mt-4 break-words font-heading text-2xl font-semibold">{request.subject}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recebido em {format(request.createdAt)}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Mensagem do lojista</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">{request.message}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tratamento</CardTitle>
          </CardHeader>
          <CardContent>
            <SupportDetailForm request={request} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contexto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Loja</p>
              <Link
                className="font-medium text-primary hover:underline"
                href={`/super-admin/stores/${request.store.id}`}
              >
                {request.store.name} · /{request.store.slug}
              </Link>
            </div>
            <div>
              <p className="text-muted-foreground">Solicitante</p>
              <p className="font-medium">{request.requesterName}</p>
              <p className="break-all">{request.replyEmail}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={mailto}>
                <Mail />
                Responder por e-mail
                <ExternalLink />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
