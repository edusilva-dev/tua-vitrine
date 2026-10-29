# Configuração de deploy do PostHog

Este documento complementa a
[Tarefa 01](../../sprints/sprint-1/tasks/01-posthog-installation-and-configuration.md). A referência
principal do trabalho continua sendo o [Sprint 1](../../sprints/sprint-1/index.md).

## Projetos e ambientes

Use um projeto PostHog para produção e outro para desenvolvimento/staging. Se a conta não permitir
essa separação, todo insight deve filtrar a propriedade obrigatória `environment`.

Na Vercel, configure as variáveis por ambiente seguindo `.env.vercel.example`. O token `phc_...` é um
token de ingestão do projeto; não configure Personal API Key, Project Secret API Key ou chave
administrativa na aplicação.

- `NEXT_PUBLIC_APP_ENV=production` somente no deployment de produção;
- `NEXT_PUBLIC_APP_ENV=staging` nos previews usados para homologação;
- `APP_RELEASE` deve receber o SHA ou a versão imutável do deployment;
- browser e servidor devem apontar para o mesmo projeto e host regional.

O SDK do browser não captura automaticamente pageviews, interações, heatmaps, exceções ou replay. Em
produção ele inicia optado para fora e sem persistência em cookie/localStorage. A Tarefa 05 controlará
o opt-in. O SDK do servidor permanece em `noop` na produção até a política server-side ser aprovada.

## Rede e CSP

O projeto não define uma Content Security Policy atualmente. Se uma CSP for adicionada, validar as
diretivas atuais na documentação oficial do PostHog antes do rollout. A configuração publicada hoje
exige permitir os hosts PostHog aplicáveis em `script-src` e `connect-src`; replay também exige
`worker-src blob: data:` quando for habilitado na Tarefa 08.

Antes de declarar a ingestão validada:

1. confirmar no navegador que a requisição usa o host regional configurado;
2. confirmar que nenhum proxy, ad blocker ou regra de firewall a bloqueia;
3. executar o smoke test apenas no projeto não produtivo;
4. remover o evento temporário do código e confirmar que produção não o recebeu.

Allowlist de IP para heatmaps não faz parte desta tarefa e deve ser reavaliada quando esse recurso
entrar em escopo.
