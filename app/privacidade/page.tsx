import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacidade e cookies | tua vitrine",
  description: "Como a Tua Vitrine usa métricas e protege os dados de quem usa o produto.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-foreground/8">
        <div className="mx-auto flex h-18 max-w-4xl items-center justify-between px-5">
          <Link href="/" aria-label="Voltar para a página inicial">
            <BrandLogo className="h-8 text-primary sm:h-10" />
          </Link>
          <Button asChild variant="outline">
            <Link href="/">Voltar</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <p className="eyebrow">PRIVACIDADE E COOKIES</p>
        <h1 className="mt-3 max-w-2xl font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Métricas claras, sob o seu controle
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-brand-copy-subtle">
          Esta página explica o uso de métricas de produto pela Tua Vitrine. Ela complementa os
          demais avisos de privacidade aplicáveis à conta e à loja.
        </p>

        <div className="mt-12 space-y-10 text-sm leading-7 text-brand-copy">
          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">O que medimos</h2>
            <p className="mt-3">
              Depois do seu aceite, registramos eventos controlados, como visita à landing page,
              clique em chamada para ação, criação de produto, visualização de catálogo e clique no
              WhatsApp. Os eventos podem conter identificadores internos de usuário, loja e produto,
              plano, etapa do cadastro, origem e ambiente da aplicação.
            </p>
            <p className="mt-3">
              Não enviamos para as métricas nome, e-mail, telefone, mensagens do WhatsApp, texto de
              busca, nome de produto ou conteúdo livre digitado nos formulários. A gravação de
              sessão está desativada.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Para que usamos e quem fornece
            </h2>
            <p className="mt-3">
              Usamos essas informações para entender uso e conversão, localizar etapas confusas e
              priorizar melhorias. O fornecedor de analytics é o PostHog Cloud. O acesso ao projeto
              é restrito às pessoas responsáveis por produto e engenharia da Tua Vitrine.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">Sua escolha</h2>
            <p className="mt-3">
              A captura no navegador começa somente depois de você selecionar “Aceitar métricas”. A
              recusa não bloqueia nenhum recurso. O botão “Privacidade”, disponível no canto da
              tela, permite revisar ou revogar a escolha a qualquer momento. Ao revogar,
              interrompemos a captura e limpamos a identidade e a persistência analítica aplicável
              no navegador.
            </p>
            <p className="mt-3">
              Guardamos no armazenamento local somente a versão e o resultado dessa escolha para não
              perguntar novamente a cada acesso. Uma alteração material nesta política usa uma nova
              versão e solicita uma nova decisão.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Eventos enviados pelo servidor
            </h2>
            <p className="mt-3">
              A captura server-side permanece desativada em produção. Ela só poderá ser ativada após
              a aprovação e o registro da base aplicável, da minimização, da retenção e de um
              mecanismo de oposição que também alcance rotinas administrativas e webhooks.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Retenção, acesso e exclusão
            </h2>
            <p className="mt-3">
              A regra operacional das métricas do navegador é manter eventos por até 90 dias. A
              pessoa responsável pela administração do produto revisa mensalmente a retenção e os
              membros com acesso ao PostHog. Pedidos de acesso, exclusão ou anonimização podem ser
              enviados para{" "}
              <a
                className="font-medium text-foreground underline underline-offset-4"
                href="mailto:suporte@usetuavitrine.com.br"
              >
                suporte@usetuavitrine.com.br
              </a>
              .
            </p>
            <p className="mt-3">
              Após validar o solicitante, localizamos os identificadores internos relacionados,
              executamos a exclusão ou anonimização no PostHog e registramos a conclusão. Se não for
              possível localizar os eventos com segurança, explicamos a limitação e mantemos a
              minimização e o prazo de retenção como proteção adicional.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">Atualizações</h2>
            <p className="mt-3">Última atualização: 26 de novembro de 2026.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
