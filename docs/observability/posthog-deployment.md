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

O SDK do browser não captura automaticamente pageviews, interações, heatmaps, dead clicks, Web
Vitals, exceções ou replay. A escolha do navegador é entregue na Tarefa 05; a captura em produção
continua desabilitada até a auditoria e liberação da Tarefa 11. O SDK do servidor permanece em `noop`
na produção: não existe base legal server-side aprovada, e uma preferência local do browser não pode
ser usada para autorizar webhooks. Retenção, responsável pelo acesso, processo de oposição e hipótese
legal ainda precisam de decisão registrada antes de habilitar esse canal.
`NEXT_PUBLIC_POSTHOG_DISABLED=1` funciona como kill switch para ambos os SDKs e é definido
obrigatoriamente pelos servidores dos testes E2E.

## Desligamento e retomada

O kill switch é uma configuração de deploy, não um controle instantâneo de sessões já abertas:

1. defina `NEXT_PUBLIC_POSTHOG_DISABLED=1` apenas no ambiente/branch afetado da Vercel e faça novo
   deploy; o browser e o servidor passam a operar em `noop` no novo deployment;
2. confira no deployment novo que aceitar análises não gera requests de ingestão e que cadastro,
   catálogo, WhatsApp e cobrança continuam funcionando;
3. compare a contagem de eventos por `environment` e `release` no projeto PostHog antes e depois da
   troca. Requisições já iniciadas e abas com bundle antigo podem terminar; comunique esse limite;
4. para retomar, remova o flag ou defina `0`, faça outro deploy e repita o smoke test não produtivo.

Na ausência de configuração do PostHog, os adaptadores também operam em `noop`. Remova conjuntos
completos de token e host; retirar apenas uma variável faz a validação do ambiente falhar. Em
produção, o código mantém a captura desabilitada mesmo sem o kill switch até a aprovação e liberação
registradas no sprint. Não habilite produção apenas para gerar dados de teste.

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
