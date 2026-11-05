# 11 — Validar e liberar o rollout

## Objetivo

Revisar a implementação integrada, provar a qualidade dos dados e liberar produção de forma
controlada, reversível e observável.

## Contexto

SDK funcionando não significa dados confiáveis. Esta tarefa fecha o sprint com validação técnica,
funcional, de privacidade, custos e operação.

## Implementação esperada

- executar a matriz canônica de eventos em desenvolvimento/staging;
- conferir nomes, propriedades, identidade, grupo, ambiente e release;
- testar indisponibilidade do PostHog e ad blocker;
- testar login/logout, troca de loja, preview e reentrega de webhook;
- validar plano efetivo após trial, upgrade, downgrade e cancelamento;
- concluir auditoria de payloads e replays;
- validar funil e dashboard com dados conhecidos;
- definir amostragem/retention e alertas de volume/custo disponíveis;
- documentar kill switch: remover/desativar tokens ou flag de configuração sem quebrar o app;
- habilitar produção gradualmente após aprovações;
- revisar volume após 24 horas, 7 dias e 30 dias;
- atualizar o status das tarefas e o documento mestre.

## Arquivos/áreas afetadas

- testes unitários, integração e E2E de observability
- documentação de operações/deploy/privacidade
- configuração Vercel/PostHog
- `sprints/sprint-1/index.md` e tarefas

## Critérios de aceite

- [x] lint, typecheck, testes relacionados, suíte completa e build passam no pré-rollout local;
- [x] busca confirma SDK restrito aos adaptadores/bootstrap;
- [ ] os 11 eventos foram exercitados com resultado esperado;
- [x] eventos não duplicam em retries previstos nos testes de integração;
- [x] PostHog indisponível não bloqueia fluxos nos testes de integração;
- [ ] rejeição/revogação interrompe captura client-side/replay e a política server-side aprovada é
  respeitada;
- [ ] auditoria não encontra PII, segredo, query string ou conteúdo livre;
- [x] funil e dashboard de desenvolvimento refletem a coorte sintética nas consultas individuais;
- [ ] retenção, acesso, owner e kill switch estão documentados;
- [x] produção tem aprovação de produto/privacidade ou permanece desabilitada;
- [x] revisão independente do SHA `1e85881` não possui achados P0/P1/P2 abertos.

## Validação

Executar, no mínimo:

1. cadastro → verificação/login → criação da loja → primeiro produto → publicação;
2. criação, edição, importação e exclusão simples/em lote de produtos;
3. vitrine → produto → WhatsApp por hero, card, detalhe e carrinho;
4. assinatura iniciada, reentrega de webhook e cancelamento;
5. consentimento aceito, rejeitado e revogado, mais oposição/política server-side;
6. logout e nova conta no mesmo navegador;
7. preview do admin;
8. PostHog bloqueado/indisponível;
9. desktop e 390 px;
10. inspeção de eventos brutos, pessoas, grupos e replays.

## Observações

Não habilitar produção parcialmente para “gerar dados” se os controles de privacidade estiverem
pendentes. Se o rollout for bloqueado apenas por decisão externa, deixar o código desabilitado por
configuração e registrar a pendência de forma explícita.

## Pré-rollout local — 05/11/2026

- O PR [#19](https://github.com/edusilva-dev/tua-vitrine/pull/19) permanece em draft contra
  `staging`. As duas execuções de Quality do SHA `36bd21e` passaram. A branch `staging` ainda não
  recebeu essa cadeia; o check do Vercel Preview permanecia pendente na última consulta.
- Com Bun 1.4.4, `bun run check` passou (lint, typecheck e 155 testes) e `bun run build` passou.
  Os 52 testes de observabilidade relacionados também passaram isoladamente.
- `E2E_OBSERVABILITY=1` executou em desktop e mobile os quatro cenários de vitrine e replay, com
  ingestão interceptada em `posthog.invalid`: quatro passaram. A inspeção inclui as quatro origens
  de WhatsApp, preview sem captura, aceite/revogação, máscara de sentinelas e remoção de query string.
  O teste passou a decodificar também o envio `sendBeacon` em base64; a rodada inicial falhou por
  assumir apenas gzip. Um replay mobile excedeu o prazo na rodada inicial, mas passou isolado e na
  rodada completa seguinte. Essa instabilidade ainda precisa ser observada em staging.
- A busca de imports encontrou `posthog-js` somente em `modules/observability/client` e
  `posthog-node` somente em `modules/observability/server/posthog.ts`. Os testes de integração
  cobrem retries, concorrência, idempotência de billing e telemetria best-effort.
- O [dashboard de desenvolvimento](https://us.posthog.com/project/710815/dashboard/2308370) e
  os dois funis reproduzem a coorte sintética nas consultas individuais. Sete dos onze eventos
  constam nos dados do projeto; `product_creation_started`, `product_deleted`,
  `subscription_started` e `subscription_cancelled` ainda não possuem evidência de ingestão real.
- O [procedimento de desligamento](../../../docs/observability/posthog-deployment.md#desligamento-e-retomada)
  usa `NEXT_PUBLIC_POSTHOG_DISABLED=1` e novo deploy. Produção permanece em `noop` para browser e
  servidor; a decisão da tarefa 05 sobre base legal server-side continua pendente.

## Pendências bloqueantes

1. Integrar a cadeia em `staging`, configurar somente o projeto PostHog não produtivo, conferir
   `environment = staging` e `release`, e executar a matriz dos onze eventos com dados conhecidos.
2. Inspecionar eventos brutos e replays no projeto de staging, comparar vitrine com métricas internas
   e auditar cadastro, login, onboarding, produtos, settings, suporte, billing e carrinho. Não
   registrar payloads ou dados pessoais neste documento.
3. Definir e aprovar política, responsável pelo acesso, retenção e oposição do canal server-side;
   revisar permissões e retenção do projeto de produção e só então considerar a ativação.
4. Validar filtros e números do dashboard/funis em staging, revisar visualmente com o administrador,
   definir alertas de volume/custo e programar avaliações após 24 horas, 7 dias e 30 dias.

Nenhuma captura de produção foi habilitada neste pré-rollout.

## Acompanhamento — 05/11/2026

- O [PR #20](https://github.com/edusilva-dev/tua-vitrine/pull/20) está em draft contra `staging`.
  As duas execuções de Quality do SHA `1e85881` passaram, incluindo E2E e autenticação. O revisor
  independente aprovou o SHA sem achados P0–P3.
- O status do deploy da Vercel permanece `pending` desde 19h46 UTC; não há Preview validado. A
  conexão disponível não permite inspecionar esse projeto Vercel (403). Isso não altera o resultado
  dos checks de Quality nem comprova o deploy em staging.
- A leitura do esquema de eventos do [projeto PostHog de desenvolvimento](https://us.posthog.com/project/710815)
  confirma `account_created`, `store_created`, `store_published`, `product_created`, `catalog_viewed`,
  `product_viewed` e `whatsapp_clicked`. `product_creation_started`, `product_deleted`,
  `subscription_started` e `subscription_cancelled` ainda não aparecem. Os testes locais validam os
  pontos de emissão, mas a ingestão real desses quatro eventos continua pendente.
