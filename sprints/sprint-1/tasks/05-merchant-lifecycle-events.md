# 05 — Instrumentar eventos do ciclo do lojista

## Objetivo

Registrar os marcos de conta, criação/publicação da loja e gestão de produtos com semântica confiável.

## Contexto

As operações de resultado devem ser capturadas no servidor após persistência. O onboarding atual
ativa a loja na mesma transação que salva o primeiro produto. A abertura do formulário é uma intenção
de UI e permanece no browser.

## Implementação esperada

Instrumentar:

- `account_created` — conforme decisão da tarefa 03;
- `store_created` — após a loja existir e o contexto ser definido;
- `product_creation_started` — uma vez por abertura real do formulário de novo produto;
- `product_created` — após criação, distinguindo `manual` e `import`;
- `store_published` — somente na transição inicial `DRAFT` → `ACTIVE`;
- `product_deleted` — após arquivamento simples ou em lote, com contagem e operação.

Preservar idempotência das rotas e não emitir sucesso em validação rejeitada, conflito, retry
idempotente já processado ou edição de produto existente. Eventos server-side do onboarding devem
receber o `distinct_id` do lojista responsável, além do grupo da loja, para alimentar os dois funis
sem misturar identidades.

## Arquivos/áreas afetadas

- `modules/auth/components/auth-form.tsx` ou hook de servidor escolhido
- `app/api/admin/stores/route.ts`
- `app/api/admin/onboarding/store/route.ts`
- `modules/stores/server/service.ts`
- `modules/catalog/components/product-manager.tsx`
- `modules/catalog/server/service.ts`
- `modules/catalog/server/import/service.ts`
- rotas de produtos/importação, se necessárias para fornecer contexto
- testes unitários e de integração de catálogo/lojas/auth

## Critérios de aceite

- [ ] cada evento ocorre somente após o marco correspondente;
- [ ] edição não emite `product_created`;
- [ ] primeiro produto emite `product_created` e uma única `store_published`;
- [ ] produtos posteriores não repetem `store_published`;
- [ ] importação informa `creation_method = "import"` sem evento por linha se isso gerar volume
  desnecessário; a decisão fica documentada;
- [ ] exclusão em lote não envia lista de IDs nem nomes;
- [ ] retry com idempotency key não duplica eventos;
- [ ] `store_created`, primeiro `product_created` e `store_published` preservam o `distinct_id` do
  lojista responsável;
- [ ] falha do PostHog não reverte criação, publicação ou exclusão;
- [ ] evento de outra loja nunca recebe `store_id` do contexto errado.

## Validação

- testes de integração para primeiro produto, produto subsequente, edição e retry;
- testes de exclusão simples e em lote;
- teste de importação;
- fluxo manual de onboarding no projeto PostHog não produtivo;
- lint, typecheck e testes de catálogo/lojas/auth relacionados.

## Observações

Quando captura e transação não puderem ser atômicas, preferir pequena chance de perda a bloquear ou
duplicar a operação. Registrar essa característica; um outbox só será considerado se dados reais
mostrarem necessidade.
