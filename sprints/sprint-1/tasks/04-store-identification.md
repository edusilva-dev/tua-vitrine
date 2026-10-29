# 04 — Identificar e agrupar por loja

## Objetivo

Associar eventos à loja correta, permitindo análise por tenant sem misturar a identidade do usuário
com a identidade do negócio.

## Contexto

Um usuário autenticado é uma pessoa; uma loja é o tenant. O contexto atual já resolve a loja no
servidor e `StoreDTO` traz ID, plano e status. Eventos precisam funcionar mesmo se Group Analytics não
estiver disponível, por isso `store_id` é obrigatório além do grupo.

## Implementação esperada

- chamar `group("store", store.id, propriedades_seguras)` no admin e na vitrine pública;
- incluir `store_id` e `plan` nos eventos relevantes;
- limitar propriedades do grupo a `plan`, `status`, `onboarding_step` e datas não sensíveis aprovadas;
- não enviar nome, slug, WhatsApp ou URL da loja;
- atualizar associação quando a loja selecionada mudar;
- garantir que preview não seja contado como uso público;
- suportar captura server-side com `groups: { store: storeId }`;
- documentar fallback de dashboards por `store_id`.

## Arquivos/áreas afetadas

- `app/(admin)/admin/layout.tsx`
- `app/(storefront)/[slug]/page.tsx`
- `modules/storefront/server-page.tsx`
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
- [ ] isolamento entre duas lojas é coberto por teste.

## Validação

- testes unitários do contexto de identidade/grupo;
- E2E com duas lojas autorizadas quando a fixture permitir;
- inspeção de eventos de duas lojas no PostHog de teste;
- consulta por grupo e consulta equivalente por `store_id`;
- lint e typecheck.

## Observações

Se o plano PostHog não oferecer Group Analytics, não bloquear a instrumentação: preservar
`store_id`, registrar a limitação e configurar os insights por propriedade.
