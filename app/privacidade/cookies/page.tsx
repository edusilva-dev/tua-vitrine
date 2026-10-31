import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade e cookies · tua vitrine",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12 text-foreground">
      <Link href="/" className="w-fit text-sm underline underline-offset-4">
        Voltar para tua vitrine
      </Link>
      <h1 className="font-heading text-3xl font-semibold">Privacidade e cookies</h1>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Análises opcionais</h2>
        <p>
          Usamos PostHog Cloud como fornecedor de análises para entender a ativação, a usabilidade e
          a confiabilidade do produto. A captura no navegador depende da sua aceitação. Não
          concordar não impede o uso da loja, da vitrine ou do WhatsApp.
        </p>
        <p>
          A captura analítica em produção permanece desativada enquanto a política final, o prazo de
          retenção, o responsável pelo acesso e a auditoria de privacidade não forem aprovados.
          Aceitar registra sua preferência; isso não ativa recursos ainda indisponíveis.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Dados e armazenamento</h2>
        <p>
          As análises previstas usam identificadores internos de usuário, loja e produto, plano e
          ações permitidas, como visualizar a vitrine e clicar no WhatsApp. Identificadores de
          dispositivo e IP também podem ser dados pessoais. Não enviamos nome, e-mail, telefone,
          mensagens, conteúdo do carrinho ou dados de pagamento nessas análises.
        </p>
        <p>
          A preferência de análises fica no armazenamento local deste navegador até ser alterada,
          apagada por você ou substituída por uma nova versão da escolha. Os identificadores do SDK
          de análises ficam em memória durante a página e são resetados ao revogar. Não há captura
          automática de páginas, interações ou gravação de sessão habilitada.
        </p>
        <p>
          Cookies necessários de autenticação e a seleção de loja permitem usar a conta. Carrinho e
          favoritos ficam no armazenamento local por loja. Esses recursos são independentes da
          escolha de análises opcionais.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Alterar ou revogar</h2>
        <p>
          Após concordar, abra “Preferências de privacidade” no rodapé de qualquer página. “Revogar
          consentimento” interrompe novas capturas e limpa a identidade e a persistência aplicável
          do PostHog neste navegador. A escolha vale para este navegador; ela não exclui dados que
          já tenham sido enviados ao fornecedor.
        </p>
        <p>
          A política final e o processo de acesso, exclusão ou anonimização no fornecedor ainda
          dependem da definição do responsável e da retenção. A telemetria do servidor também
          permanece desativada em produção até a aprovação de uma base legal e dos controles
          correspondentes. A preferência local não é usada como consentimento para webhooks.
        </p>
      </section>
    </main>
  );
}
