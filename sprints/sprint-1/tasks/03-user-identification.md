# 03 — Identificar o usuário autenticado

**Status:** implementação concluída em 2026-11-25; inspeção no PostHog depende do consentimento da
tarefa 05.

## Objetivo

Associar sessões do painel ao ID interno estável do lojista e limpar corretamente a identidade no
logout.

## Contexto

O Better Auth já resolve `userId` verificado em `lib/server/context.ts`. O layout do admin é o ponto
central para entregar essa identidade a um componente cliente. A sessão anônima consentida da LP deve
ser preservada ao identificar a conta criada para viabilizar o funil de conversão. Visitantes da
vitrine continuam anônimos. A identificação não deve enviar nome ou e-mail.

## Implementação esperada

- expor apenas `userId` necessário no layout do admin;
- criar `AnalyticsIdentity` client component idempotente;
- chamar `identify(userId)` apenas quando a identidade conhecida mudar;
- preservar a sessão anônima consentida da LP quando ela se torna uma conta identificada;
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

- [x] lojista autenticado usa `distinct_id = user.id`;
- [x] cadastro consentido identifica a conta sem resetar antes a sessão anônima da LP;
- [x] e-mail, nome e telefone não são propriedades de pessoa;
- [x] identify não dispara repetidamente a cada render;
- [x] logout chama reset e a próxima sessão recebe identidade independente;
- [x] visitante público continua anônimo;
- [x] falha do PostHog não impede cadastro, login ou logout;
- [x] fluxo local sem auth não cria uma pessoa fictícia.

## Validação

- teste unitário do componente com mudanças de identidade;
- E2E login → painel → logout → novo visitante;
- inspeção no PostHog de uma pessoa de teste sem PII;
- lint, typecheck e testes de autenticação relacionados.

## Observações

A emissão de `account_created` pertence à tarefa 06, depois da decisão de privacidade. Não capturar o
evento apenas no clique do formulário.

## Evidências

- o layout administrativo entrega somente o ID interno ao componente cliente de identidade;
- cadastro e login identificam antes da navegação, preservando a sessão anônima consentida;
- uma identidade já conhecida e diferente é resetada antes da troca de conta para não misturar
  históricos;
- logout limpa a identidade somente após o encerramento bem-sucedido da sessão;
- o wrapper ignora repetição do mesmo ID, exige consentimento para identificar e isola falhas do SDK;
- testes unitários cobrem sessão anônima, repetição, troca de conta, ausência de consentimento, reset e
  indisponibilidade do fornecedor.
