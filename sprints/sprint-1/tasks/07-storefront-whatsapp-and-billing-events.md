# 07 — Instrumentar vitrine, WhatsApp e billing

## Objetivo

Registrar descoberta de catálogo, interesse em produto, intenção de contato e ciclo de assinatura.

## Contexto

A vitrine já envia métricas próprias ao PostgreSQL. O PostHog não substitui esse caminho. Eventos de
UX são client-side; assinatura nasce do webhook Stripe para representar estado confirmado e lidar com
redelivery.

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
