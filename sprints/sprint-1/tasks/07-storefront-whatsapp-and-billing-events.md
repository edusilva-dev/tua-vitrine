# 07 — Instrumentar vitrine, WhatsApp e billing

## Objetivo

Registrar descoberta de catálogo, interesse em produto, intenção de contato e ciclo de assinatura.

## Contexto

A vitrine já envia métricas próprias ao PostgreSQL. O PostHog não substitui esse caminho. Eventos de
UX são client-side; assinatura nasce do webhook Stripe ou da reconciliação confirmada com a API do
Stripe, conforme qual aplicar a transição primeiro. A reentrega do webhook não repete o evento.

## Implementação esperada

Instrumentar:

- `catalog_viewed` — uma vez por montagem da vitrine pública real;
- `product_viewed` — ao abrir detalhe do produto;
- `whatsapp_clicked` — nos quatro pontos: hero, card, detalhe e carrinho;
- `subscription_started` — após transição confirmada para plano pago/trialing/active;
- `subscription_cancelled` — após cancelamento confirmado ou agendado, com semântica explícita.

Para WhatsApp, capturar antes da navegação com transporte apropriado, sem aguardar/bloquear a UX.
Para Stripe, usar `event.id`/registro `StripeWebhookEvent` para impedir duplicidade. O processamento
deve informar se o webhook foi aplicado pela primeira vez antes de capturar, evitando que uma
reentrega que retornou cedo em `P2002` repita o evento. Captura server-side de billing permanece noop
em produção até a política definida no documento mestre ser aprovada e implementada.

## Arquivos/áreas afetadas

- `modules/storefront/components/storefront.tsx`
- `modules/storefront/components/product-detail.tsx`
- `modules/storefront/components/cart-sheet.tsx`
- `modules/storefront/server-page.tsx`
- `modules/billing/server/service.ts`
- `app/api/webhooks/stripe/route.ts`, apenas se necessário
- testes de storefront, analytics e billing/webhook

## Critérios de aceite

- [ ] preview não gera eventos de storefront;
- [ ] `catalog_viewed` não substitui nem duplica o `STORE_VIEW` interno;
- [ ] `whatsapp_clicked` cobre as quatro localizações com enum válido;
- [ ] evento de WhatsApp não contém telefone, mensagem, nome, preço ou carrinho;
- [ ] navegação para WhatsApp continua mesmo se analytics falhar;
- [ ] reentrega do mesmo webhook não duplica assinatura;
- [ ] o adaptador server-side respeita a política de habilitação/base legal aprovada;
- [ ] mudança de plano/cancelamento informa plano e estado corretos;
- [ ] falha de captura não faz o webhook retornar erro após a atualização ter sido aplicada;
- [ ] eventos de vitrine mantêm visitante anônimo e grupo da loja.

## Validação

- testes de componentes para cada origem do clique;
- E2E vitrine → produto → WhatsApp e vitrine → carrinho → WhatsApp;
- testes de integração de webhook duplicado e transições de assinatura;
- comparação amostral entre evento interno e PostHog, documentando que contagens podem divergir por
  consentimento/ad blockers;
- lint, typecheck, testes relacionados e build.

## Observações

Ad blockers e rejeição de consentimento tornam a telemetria client-side incompleta. O dashboard não
deve ser apresentado como contabilidade financeira nem substituir a fonte de billing.

## Implementação técnica em 01/11/2026

- A vitrine pública recebe o plano efetivo do servidor e emite `catalog_viewed` uma vez por montagem.
  Abrir um detalhe emite `product_viewed`. A prévia administrativa não emite eventos PostHog nem
  altera esse comportamento das métricas internas.
- Hero, card sem variantes, detalhe e carrinho usam `whatsapp_clicked` antes de abrir o WhatsApp.
  O card com variantes abre o detalhe; o clique para WhatsApp é contado quando o visitante escolhe
  uma combinação comprável. O carrinho só captura depois de revalidar disponibilidade e preços.
  Somente loja, localização, ID interno do produto quando aplicável e tamanho do carrinho são enviados.
- O webhook registra `event.id` na mesma transação que aplica o estado. Após commit, uma passagem
  de estado não pago para `TRIALING`/`ACTIVE` emite `subscription_started`. Mudanças entre planos
  pagos atualizam o estado, sem chamar novamente um início de assinatura. Um agendamento de
  cancelamento emite `subscription_cancelled` com `effective_immediately = false`; o encerramento
  posterior não duplica esse marco. Um cancelamento direto usa `true`. A linha da assinatura é
  bloqueada durante a transição para que dois webhooks distintos simultâneos não dupliquem o início.
  O processamento recupera a assinatura atual da API Stripe pelo ID do evento antes de aplicá-la;
  snapshots antigos entregues fora de ordem não revertem uma reconciliação mais recente.
- A consulta ao Stripe no retorno do checkout ou na reconciliação do painel pode aplicar a mesma
  transição antes do webhook. Nesse caso, o evento nasce após o commit da reconciliação confirmada,
  com `source = stripe_reconciliation`; o webhook posterior encontra o estado já aplicado e não
  duplica a captura. Essa origem é distinta de `stripe_webhook`.
- Captura do servidor segue em `noop` em produção até a aprovação da política no índice. A captura
  client-side requer concordância válida. A fonte de métricas do lojista no PostgreSQL permanece
  separada; contagens podem divergir por consentimento, bloqueadores e falhas best-effort.
- Antes do envio pelo SDK web, propriedades automáticas de URL, caminho, busca, referrer e campanhas
  são removidas, inclusive quando a vitrine recebe parâmetros de busca.
- Inspeção externa no PostHog de desenvolvimento/staging e comparação amostral seguem pendentes.
  A validação local usa o SDK real com host interceptado, sem enviar dados externos, e compara uma
  visita PostHog com uma nova visita interna `STORE_VIEW` por montagem da vitrine.
