# 04 — Identificar e agrupar por loja

## Objetivo

Associar eventos à loja correta, permitindo análise por tenant sem misturar a identidade do usuário
com a identidade do negócio.

## Contexto

Um usuário autenticado é uma pessoa; uma loja é o tenant. O contexto atual já resolve a loja no
servidor. `StoreDTO.signupPlan` é o plano escolhido no cadastro, não necessariamente o plano vigente;
o valor correto vem de `getEntitlements`. `store_id` continua obrigatório para auditoria e consultas
HogQL, mas um simples breakdown por essa propriedade não substitui um funil agregado por grupo.

## Implementação esperada

- chamar `group("store", store.id, propriedades_seguras)` no admin e na vitrine pública;
- resolver `plan` por `getEntitlements({ storeId })` e entregá-lo ao componente de identidade sem
  alterar o significado de `signupPlan`;
- incluir `store_id` e o plano efetivo nos eventos relevantes;
- limitar propriedades do grupo a `plan`, `status`, `onboarding_step` e datas não sensíveis aprovadas;
- não enviar nome, slug, WhatsApp ou URL da loja;
- atualizar associação quando a loja selecionada mudar;
- garantir que preview não seja contado como uso público;
- suportar captura server-side com `groups: { store: storeId }`;
- documentar consultas HogQL por `store_id` quando Group Analytics não estiver disponível.

## Arquivos/áreas afetadas

- `app/(admin)/admin/layout.tsx`
- `app/(storefront)/[slug]/page.tsx`
- `modules/storefront/server-page.tsx`
- `modules/billing/server/entitlements.ts`
- layout/service do admin necessário para resolver entitlements
- `modules/observability/components/analytics-identity.tsx`
- wrappers cliente/servidor
- contratos de eventos e testes

## Critérios de aceite

- [ ] todo evento de loja contém `store_id` correto;
- [ ] eventos suportados carregam o grupo `store`;
- [ ] troca de loja atualiza o grupo sem alterar o `distinct_id` da pessoa;
- [ ] vitrine pública agrupa por loja sem identificar o visitante;
- [ ] preview não emite `catalog_viewed` nem eventos públicos;
- [ ] nenhuma propriedade sensível aparece no grupo;
- [ ] `plan` corresponde a `Entitlements.plan` após upgrade, trial, downgrade e cancelamento;
- [ ] isolamento entre duas lojas é coberto por teste.

## Validação

- testes unitários do contexto de identidade/grupo;
- E2E com duas lojas autorizadas quando a fixture permitir;
- inspeção de eventos de duas lojas no PostHog de teste;
- consulta por grupo e, se necessária, consulta HogQL explicitamente agregada por `store_id`;
- lint e typecheck.

## Observações

Se o plano PostHog não oferecer Group Analytics, preservar `store_id`. Não tratar filtro ou breakdown
como agregação: o funil de loja exige uma consulta HogQL validada ou fica bloqueado.
