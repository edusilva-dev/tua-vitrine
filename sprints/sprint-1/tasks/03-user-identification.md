# 03 — Identificar o usuário autenticado

## Objetivo

Associar sessões do painel ao UUID interno do lojista e limpar corretamente a identidade no logout.

## Contexto

O Better Auth já resolve `userId` verificado em `lib/server/context.ts`. O layout do admin é o ponto
central para entregar essa identidade a um componente cliente. Visitantes da vitrine devem continuar
anônimos. A identificação não deve enviar nome ou e-mail.

## Implementação esperada

- expor apenas `userId` necessário no layout do admin;
- criar `AnalyticsIdentity` client component idempotente;
- chamar `identify(userId)` apenas quando a identidade conhecida mudar;
- configurar perfis como `identified_only`;
- resetar o PostHog após logout bem-sucedido e antes de redirecionar;
- cobrir transições login, logout, nova conta e troca de pessoa no mesmo navegador;
- preparar o contexto de identidade necessário para que a tarefa 06 emita `account_created` conforme
  a política definida na tarefa 05;
- não identificar sessões locais com `AUTH_ENABLED = false` como uma pessoa real.

## Arquivos/áreas afetadas

- `app/(admin)/admin/layout.tsx`
- `modules/observability/components/analytics-identity.tsx` (novo)
- `components/auth-account-menu.tsx`
- `modules/auth/components/auth-form.tsx` ou hook do Better Auth, conforme decisão
- `lib/server/auth.ts`, apenas se o evento usar hook suportado
- testes de auth/observability relacionados

## Critérios de aceite

- [ ] lojista autenticado aparece com `distinct_id = user.id`;
- [ ] e-mail, nome e telefone não são propriedades de pessoa;
- [ ] identify não dispara repetidamente a cada render;
- [ ] logout chama reset e a próxima sessão recebe identidade independente;
- [ ] visitante público continua anônimo;
- [ ] falha do PostHog não impede cadastro, login ou logout;
- [ ] fluxo local sem auth não cria uma pessoa fictícia.

## Validação

- teste unitário do componente com mudanças de identidade;
- E2E login → painel → logout → novo visitante;
- inspeção no PostHog de uma pessoa de teste sem PII;
- lint, typecheck e testes de autenticação relacionados.

## Observações

A emissão de `account_created` pertence à tarefa 06, depois da decisão de privacidade. Não capturar o
evento apenas no clique do formulário.
