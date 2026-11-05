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

- [ ] lint, typecheck, testes relacionados, suíte completa e build passam;
- [ ] busca confirma SDK restrito aos adaptadores/bootstrap;
- [ ] os 11 eventos foram exercitados com resultado esperado;
- [ ] eventos não duplicam em retries previstos;
- [ ] PostHog indisponível não bloqueia fluxos;
- [ ] rejeição/revogação interrompe captura client-side/replay e a política server-side aprovada é
  respeitada;
- [ ] auditoria não encontra PII, segredo, query string ou conteúdo livre;
- [ ] funil e dashboard refletem a coorte sintética;
- [ ] retenção, acesso, owner e kill switch estão documentados;
- [ ] produção tem aprovação de produto/privacidade ou permanece desabilitada;
- [ ] revisão independente não possui achados P0/P1/P2 abertos.

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
