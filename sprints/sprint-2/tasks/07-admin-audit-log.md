# 07 — Criar a trilha de auditoria administrativa

## Objetivo

Registrar e consultar todas as mutações do Super Admin de forma suficiente para explicar quem alterou
um recurso, quando, como e por quê.

## Contexto

A auditoria é uma condição das ações administrativas, não um log técnico. Seu contrato deve ser
definido antes de concluir as mutações de cobrança, suporte e loja.

## Implementação esperada

- criar modelo e migração para eventos administrativos;
- definir catálogo fechado de ações;
- registrar administrador, loja opcional, recurso, resultado, motivo e data;
- armazenar estado anterior e posterior com campos mínimos e permitidos;
- oferecer helper server-only para escrita consistente;
- integrar o helper a todas as mutações das tarefas 04, 05 e 06;
- criar lista paginada com filtros por loja, administrador, ação, resultado e período;
- mostrar eventos recentes no detalhe da loja;
- impedir edição e exclusão pela aplicação;
- criar política de retenção documentada, ainda que a limpeza automática fique para outro sprint.

## Regras de privacidade

- não registrar senha, token, segredo, cookie ou dados de cartão;
- não copiar mensagem de suporte ou nota interna para o evento;
- não armazenar resposta completa da Stripe ou Resend;
- usar IDs internos e snapshots pequenos de estado operacional;
- registrar falha sem expor detalhes sensíveis da exceção.

## Critérios de aceite

- [ ] toda mutação do Super Admin gera um evento de sucesso ou falha;
- [ ] evento identifica administrador, ação, alvo, data e motivo;
- [ ] snapshots permitem entender a mudança sem duplicar objetos completos;
- [ ] registros não podem ser alterados ou apagados pela UI/API;
- [ ] filtros e paginação funcionam sem carregar o histórico inteiro;
- [ ] nenhuma informação proibida aparece em fixtures, banco ou respostas;
- [ ] testes garantem cobertura das ações e sanitização dos snapshots.

## Validação

- executar uma amostra de cada ação e conferir os eventos;
- simular falhas antes e depois de chamadas externas;
- revisar payloads persistidos em busca de dados sensíveis;
- rodar lint, typecheck, testes relacionados e build.

## Fora do escopo

- substituir logs da aplicação;
- enviar auditoria a um SIEM;
- permitir comentários ou edição do evento;
- analytics de produtividade da equipe.
