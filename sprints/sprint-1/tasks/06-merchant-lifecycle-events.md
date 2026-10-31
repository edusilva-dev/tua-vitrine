# 06 — Instrumentar eventos do ciclo do lojista

## Objetivo

Registrar os marcos de conta, criação/publicação da loja e gestão de produtos com semântica confiável.

## Contexto

As operações de resultado devem ser capturadas no servidor após persistência. O onboarding atual
ativa a loja na mesma transação que salva o primeiro produto. A abertura do formulário é uma intenção
de UI e permanece no browser.

## Implementação esperada

Instrumentar:

- `account_created` — conforme identidade da tarefa 03 e política da tarefa 05; preferir hook de
  servidor autorizado ou, quando consentimento do browser for exigido, retorno de cadastro concluído
  com UUID e idempotência documentada;
- `store_created` — após a loja existir e o contexto ser definido;
- `product_creation_started` — uma vez por abertura real do formulário de novo produto;
- `product_created` — após criação, distinguindo `manual` e `import`;
- `store_published` — somente na transição inicial `DRAFT` → `ACTIVE`;
- `product_deleted` — após arquivamento simples ou em lote, com contagem e operação.

Preservar idempotência das rotas e não emitir sucesso em validação rejeitada, conflito, retry
idempotente já processado ou edição de produto existente. Eventos server-side do onboarding devem
receber o `distinct_id` do lojista responsável, além do grupo da loja, para alimentar os dois funis
sem misturar identidades. Uma importação emite um `product_created` por produto persistido, cada um
com seu `product_id` e `creation_method = "import"`; o serviço deve disponibilizar internamente os IDs
criados sem expô-los desnecessariamente na resposta pública.

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
- [ ] `account_created` ocorre uma vez por conta criada com sucesso e respeita a política aprovada;
- [ ] edição não emite `product_created`;
- [ ] primeiro produto emite `product_created` e uma única `store_published`;
- [ ] produtos posteriores não repetem `store_published`;
- [ ] importação emite um `product_created` por produto, com `product_id` singular e sem lista de IDs
  em uma propriedade agregada;
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

## Implementação técnica em 31/10/2026

- O hook `user.create.after` do Better Auth captura `account_created` após a criação da conta.
  `signup_plan` vem do plano escolhido no retorno do cadastro e usa `FREE` quando ausente. O hook
  executa uma vez por registro criado; uma tentativa rejeitada não cria outro registro.
- `store_created` ocorre após a criação da loja e de seu vínculo com o proprietário. O formulário
  de novo produto registra `product_creation_started` em cada abertura, inclusive ao retomar a
  etapa do primeiro produto no onboarding.
- A criação manual emite `product_created` após o commit e, na primeira ativação da loja, também
  `store_published`. A transição condicional `DRAFT` → `ACTIVE` impede duas publicações simultâneas.
  Edição e retry com chave já processada não emitem esses eventos. A importação preserva os IDs apenas
  internamente e emite um evento por produto persistido.
- Exclusão simples e em lote emitem somente contagem e operação após o arquivamento; nenhuma lista
  de IDs ou nomes vai ao PostHog. Um retry concorrente sem arquivamento efetivo não emite evento.
  Falhas de captura são registradas sem payload e não bloqueiam as operações principais. Sem outbox,
  uma falha após o commit pode perder o evento.
- A captura server-side permanece em `noop` em produção até a aprovação da política registrada no
  índice do sprint. Testes automatizados usam observador local; a inspeção manual no projeto PostHog
  de desenvolvimento/staging continua pendente.
