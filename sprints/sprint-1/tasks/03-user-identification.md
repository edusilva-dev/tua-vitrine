# 03 — Identificar o usuário autenticado

## Objetivo

Associar sessões do painel ao ID interno do lojista e limpar corretamente a identidade no logout.

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

- [x] lojista autenticado é identificado com `distinct_id = user.id` após consentimento;
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

## Resultado da implementação

- `contracts/identity.ts` é a fonte única para validar o ID alfanumérico de 32 caracteres gerado pela
  configuração atual do Better Auth;
- `client/identity.ts` encapsula `identify` e `reset`, exige consentimento para identificar e não
  aceita propriedades pessoais;
- `AnalyticsIdentity` recebe somente `userId` do layout do admin e mantém a sincronização
  idempotente durante a sessão;
- troca de pessoa no mesmo navegador executa `reset` antes do novo `identify`; se a limpeza falhar, a
  nova identidade não é aplicada para evitar unir duas pessoas;
- logout bem-sucedido limpa a identidade antes do redirecionamento; falha do SDK é isolada e não
  impede a saída;
- o fluxo local com autenticação desabilitada recebe `userId = null` e permanece anônimo;
- a vitrine pública não monta o componente de identidade.

O `reset()` do PostHog também limpa o estado de consentimento mantido pelo SDK. A tarefa 05 deve
persistir a preferência fora desse estado efêmero e reaplicá-la depois do reset, sempre na ordem
`reset` e depois `opt_in_capturing` quando a preferência continuar válida. Esta tarefa não antecipa a
interface nem a política de consentimento. Ao conceder consentimento dentro de uma sessão já aberta,
a tarefa 05 também deve solicitar uma nova sincronização da identidade atual.

A inspeção de uma pessoa real no PostHog continua dependente da tarefa 05 e das credenciais do
ambiente. Até lá, a identificação permanece corretamente bloqueada quando não há consentimento.

Validação executada em 2026-10-30:

- lint e TypeScript aprovados;
- suíte completa com 121 testes aprovados;
- 8 testes unitários específicos de identidade aprovados;
- build de produção aprovado com o Bun 1.3.14 exigido pelo projeto;
- E2E de autenticação aprovado no Chromium, cobrindo cadastro verificado, login, logout e troca de
  conta no mesmo navegador;
- inspeção externa no PostHog pendente até a tarefa 05 habilitar consentimento no ambiente.
